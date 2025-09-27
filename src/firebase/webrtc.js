// src/firebase/webrtc.js
import { db } from './config';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc, deleteDoc } from 'firebase/firestore';

// Configuration for the STUN servers (helps browsers find each other)
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
    let receivedSize = 0;

    receiveChannel.onmessage = (event) => {
      receivedChunks.push(event.data);
      receivedSize += event.data.byteLength;
      // In a real app, you'd calculate progress here
    };

    receiveChannel.onclose = () => {
      console.log('Data channel closed.');
    };
    
    receiveChannel.onopen = () => {
        console.log('Data channel opened! Ready to receive file.');
        updateDoc(doc(db, 'printJobs', jobId), { status: 'transferring' });
    };

    // When the channel indicates the transfer is done
    // We'll use a simple text message "EOF" (End of File)
    const interval = setInterval(() => {
        if (receivedChunks.length > 0 && typeof receivedChunks[receivedChunks.length - 1] === 'string' && receivedChunks[receivedChunks.length - 1] === 'EOF') {
            clearInterval(interval);
            const fileBlob = new Blob(receivedChunks.slice(0, -1)); // Exclude the "EOF" marker
            console.log('File received successfully!', fileBlob);
            onFileReceived(fileBlob);
            peerConnection.close();
        }
    }, 1000);
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  // Listen for new ICE candidates and add them to the connection
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

  // Save the offer to the job document
  await updateDoc(jobRef, { offer });

  // Listen for the answer from the user
  onSnapshot(jobRef, (snapshot) => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  // Listen for ICE candidates from the user
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
  let fileReader;
  const chunkSize = 16384; // 16KB chunks

  dataChannel.onopen = () => {
    console.log('Data channel is open. Starting file transfer.');
    fileReader = new FileReader();
    let offset = 0;

    fileReader.onload = (e) => {
      dataChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      onTransferProgress(offset, fileToSend.size);

      if (offset < fileToSend.size) {
        readSlice(offset);
      } else {
        // Send End-of-File marker
        dataChannel.send('EOF');
        onTransferProgress(fileToSend.size, fileToSend.size); // Mark as complete
      }
    };
    
    const readSlice = o => {
        const slice = fileToSend.slice(o, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
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