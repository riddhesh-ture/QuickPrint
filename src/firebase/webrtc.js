// src/firebase/webrtc.js
import { db } from './config';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// Configuration for the STUN servers (helps browsers find each other across networks)
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// --- MERCHANT-SIDE WEBRTC LOGIC ---

export const createOffer = async (jobId, onFileReceived) => {
  const peerConnection = new RTCPeerConnection(servers);

  // Event handler for when a data channel is received from the user
  peerConnection.ondatachannel = (event) => {
    const receiveChannel = event.channel;
    let receivedChunks = [];

    receiveChannel.onmessage = (event) => {
      // The last message is a simple string "EOF" (End of File)
      if (event.data !== 'EOF') {
        receivedChunks.push(event.data);
      } else {
        const fileBlob = new Blob(receivedChunks);
        console.log('File received successfully!', fileBlob);
        onFileReceived(fileBlob); // Trigger the print function
        peerConnection.close();
      }
    };

    receiveChannel.onopen = () => {
      console.log('Data channel opened! Ready to receive file.');
    };
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  // Listen for new ICE candidates and add them to Firestore
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(offerCandidates, event.candidate.toJSON());
    }
  };

  // Create the offer
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  // Save the offer to the job document for the user to see
  await updateDoc(jobRef, { offer });

  // Listen for the answer from the user
  onSnapshot(jobRef, (snapshot) => {
    const data = snapshot.data();
    // FIX: Only set remote description if it hasn't been set and the state is correct
    if (peerConnection.signalingState === 'have-local-offer' && data?.answer) {
      console.log('Got answer, setting remote description.');
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  // Listen for ICE candidates from the user and add them to the connection
  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });

  return peerConnection;
};


// --- USER-SIDE WEBRTC LOGIC ---

export const createAnswer = async (jobId, fileToSend, onTransferProgress) => {
  const peerConnection = new RTCPeerConnection(servers);
  
  // Create the data channel for sending the file
  const dataChannel = peerConnection.createDataChannel('fileChannel');
  const chunkSize = 16384; // 16KB chunks

  dataChannel.onopen = () => {
    console.log('Data channel is open. Starting file transfer.');
    updateDoc(doc(db, 'printJobs', jobId), { status: 'transferring' });
    
    let offset = 0;
    const readSlice = () => {
      const slice = fileToSend.slice(offset, offset + chunkSize);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (dataChannel.readyState === 'open') {
          dataChannel.send(event.target.result);
          offset += event.target.result.byteLength;
          onTransferProgress(offset, fileToSend.size);

          if (offset < fileToSend.size) {
            readSlice();
          } else {
            dataChannel.send('EOF'); // Send End-of-File marker
            onTransferProgress(fileToSend.size, fileToSend.size);
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };
    readSlice();
  };
  
  dataChannel.onclose = () => {
    console.log('Data channel closed.');
    peerConnection.close();
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(answerCandidates, event.candidate.toJSON());
    }
  };

  const jobDoc = await getDoc(jobRef);
  const offerDescription = jobDoc.data().offer;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  const answer = {
    sdp: answerDescription.sdp,
    type: answerDescription.type,
  };

  await updateDoc(jobRef, { answer });

  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  return peerConnection;
};