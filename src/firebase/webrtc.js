// src/firebase/webrtc.js
import { db } from './config';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// Module-level variables to hold the single connection and listeners
let peerConnection;
let dataChannel;
let unsubscribers = [];

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

// --- CRITICAL CLEANUP FUNCTION ---
// This function will tear down the connection and all listeners to prevent leaks and loops.
export const cleanupWebRTCConnection = () => {
  console.log('Cleaning up WebRTC connection and listeners...');
  // Unsubscribe from all Firestore listeners
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];

  // Close the data channel and peer connection
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
};

// --- MERCHANT-SIDE LOGIC ---
export const createOffer = async (jobId, onFileReceived) => {
  if (peerConnection) {
    console.warn('A peer connection already exists. Cleaning up before creating a new one.');
    cleanupWebRTCConnection();
  }
  
  peerConnection = new RTCPeerConnection(servers);

  peerConnection.ondatachannel = (event) => {
    const receiveChannel = event.channel;
    let receivedChunks = [];
    receiveChannel.onmessage = (event) => {
      if (event.data !== 'EOF') {
        receivedChunks.push(event.data);
      } else {
        const fileBlob = new Blob(receivedChunks);
        onFileReceived(fileBlob);
        cleanupWebRTCConnection(); // Clean up after successful transfer
      }
    };
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) await addDoc(offerCandidates, event.candidate.toJSON());
  };

  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);
  const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
  await updateDoc(jobRef, { offer });

  // Listen for the answer and add the unsubscribe function to our array
  const unsubJob = onSnapshot(jobRef, (snapshot) => {
    const data = snapshot.data();
    if (peerConnection.signalingState === 'have-local-offer' && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });
  unsubscribers.push(unsubJob);

  // Listen for ICE candidates and add the unsubscribe function to our array
  const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
  unsubscribers.push(unsubAnswerCandidates);
};

// --- USER-SIDE LOGIC ---
export const createAnswer = async (jobId, fileToSend, onTransferProgress) => {
  if (peerConnection) {
    console.warn('A peer connection already exists. Cleaning up before creating a new one.');
    cleanupWebRTCConnection();
  }

  peerConnection = new RTCPeerConnection(servers);
  
  dataChannel = peerConnection.createDataChannel('fileChannel');
  const chunkSize = 16384;

  dataChannel.onopen = () => {
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
            dataChannel.send('EOF');
            onTransferProgress(fileToSend.size, fileToSend.size);
            // Don't clean up here, wait for merchant to confirm payment/completion
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };
    readSlice();
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) await addDoc(answerCandidates, event.candidate.toJSON());
  };

  const jobDoc = await getDoc(jobRef);
  const offerDescription = jobDoc.data().offer;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);
  const answer = { sdp: answerDescription.sdp, type: answerDescription.type };
  await updateDoc(jobRef, { answer });

  const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
  unsubscribers.push(unsubOfferCandidates);
};