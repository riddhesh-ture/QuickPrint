// src/firebase/webrtc.js
import { db } from './config';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// --- NEW: WebRTC Configuration with STUN and TURN servers ---
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
    {
      // --- Free TURN server from Open Relay Project ---
      // In a production app, you would use a paid TURN service like Twilio or Xirsys
      // for better reliability and to avoid potential abuse.
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  ],
  iceCandidatePoolSize: 10,
};

// Module-level variables to hold the single connection and listeners
let peerConnection;
let dataChannel;
let unsubscribers = [];

// --- CRITICAL CLEANUP FUNCTION ---
export const cleanupWebRTCConnection = () => {
  console.log('Cleaning up WebRTC connection and listeners...');
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
};

// The rest of your webrtc.js file remains the same...

// --- MERCHANT-SIDE LOGIC ---
export const createOffer = async (jobId, onFileReceived) => {
  if (peerConnection) {
    console.warn('A peer connection already exists. Cleaning up before creating a new one.');
    cleanupWebRTCConnection();
  }
  
  peerConnection = new RTCPeerConnection(servers); // Use the new config

  peerConnection.ondatachannel = (event) => {
    const receiveChannel = event.channel;
    let receivedChunks = [];
    receiveChannel.onmessage = (event) => {
      if (event.data !== 'EOF') {
        receivedChunks.push(event.data);
      } else {
        const fileBlob = new Blob(receivedChunks);
        onFileReceived(fileBlob);
        cleanupWebRTCConnection();
      }
    };
  };

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) await addDoc(offerCandidates, event.candidate.toJSON());
  };
  
  peerConnection.oniceconnectionstatechange = () => console.log(`MERCHANT: ICE Connection State: ${peerConnection.iceConnectionState}`);

  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);
  const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
  await updateDoc(jobRef, { offer });

  const unsubJob = onSnapshot(jobRef, (snapshot) => {
    const data = snapshot.data();
    if (peerConnection && !peerConnection.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });
  unsubscribers.push(unsubJob);

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

  peerConnection = new RTCPeerConnection(servers); // Use the new config
  
  dataChannel = peerConnection.createDataChannel('fileChannel');
  const chunkSize = 16384;

  dataChannel.onopen = async () => {
    await updateDoc(doc(db, 'printJobs', jobId), { status: 'transferring' });
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

  peerConnection.oniceconnectionstatechange = () => console.log(`USER: ICE Connection State: ${peerConnection.iceConnectionState}`);

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