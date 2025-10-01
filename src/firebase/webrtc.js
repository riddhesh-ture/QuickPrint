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
    console.log('Data channel received!');
    const receiveChannel = event.channel;
    let receivedChunks = [];
    
    receiveChannel.onopen = () => console.log('Receive channel opened');
    receiveChannel.onerror = (error) => console.error('Receive channel error:', error);
    
    receiveChannel.onmessage = (event) => {
      if (event.data !== 'EOF') {
        receivedChunks.push(event.data);
      } else {
        console.log('File transfer complete, received chunks:', receivedChunks.length);
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
    if (event.candidate) {
      console.log('Merchant: Adding ICE candidate');
      try {
        await addDoc(offerCandidates, event.candidate.toJSON());
      } catch (error) {
        console.error('Error adding offer candidate:', error);
      }
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('Merchant ICE connection state:', peerConnection.iceConnectionState);
  };

  try {
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);
    
    const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
    await updateDoc(jobRef, { offer });
    console.log('Merchant: Offer created and saved to Firestore');

    // Listen for the answer and add the unsubscribe function to our array
    const unsubJob = onSnapshot(jobRef, async (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer) {
        console.log('Merchant: Received answer, setting remote description');
        const answerDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(answerDescription);
      }
    });
    unsubscribers.push(unsubJob);

    // Listen for ICE candidates and add the unsubscribe function to our array
    const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          console.log('Merchant: Adding ICE candidate from user');
          try {
            await peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });
    });
    unsubscribers.push(unsubAnswerCandidates);
  } catch (error) {
    console.error('Error in createOffer:', error);
    throw error;
  }
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

  dataChannel.onopen = async () => {
    console.log('User: Data channel opened, starting file transfer');
    try {
      await updateDoc(doc(db, 'printJobs', jobId), { status: 'transferring' });
    } catch (error) {
      console.error('Error updating status to transferring:', error);
    }
    
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
            console.log('User: File transfer complete');
            onTransferProgress(fileToSend.size, fileToSend.size);
            // Don't clean up here, wait for merchant to confirm payment/completion
          }
        }
      };
      reader.onerror = (error) => console.error('FileReader error:', error);
      reader.readAsArrayBuffer(slice);
    };
    readSlice();
  };

  dataChannel.onerror = (error) => console.error('Data channel error:', error);
  dataChannel.onclose = () => console.log('Data channel closed');

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log('User: Adding ICE candidate');
      try {
        await addDoc(answerCandidates, event.candidate.toJSON());
      } catch (error) {
        console.error('Error adding answer candidate:', error);
      }
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('User ICE connection state:', peerConnection.iceConnectionState);
  };

  try {
    const jobDoc = await getDoc(jobRef);
    const offerDescription = jobDoc.data().offer;
    
    if (!offerDescription) {
      throw new Error('No offer found in Firestore');
    }

    console.log('User: Setting remote description from offer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);
    
    const answer = { sdp: answerDescription.sdp, type: answerDescription.type };
    await updateDoc(jobRef, { answer });
    console.log('User: Answer created and saved to Firestore');

    // Listen for ICE candidates from merchant
    const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          console.log('User: Adding ICE candidate from merchant');
          try {
            await peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });
    });
    unsubscribers.push(unsubOfferCandidates);
  } catch (error) {
    console.error('Error in createAnswer:', error);
    throw error;
  }
};