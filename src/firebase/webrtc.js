// src/firebase/webrtc.js
import { db } from './config';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// --- WebRTC Configuration with STUN and your Metered TURN server ---
const iceServers = [
  {
    urls: [
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];

// --- CRITICAL FIX: Conditionally add TURN server to prevent errors ---
// This ensures that if the environment variables are missing, the app doesn't crash.
if (
  import.meta.env.VITE_TURN_URL &&
  import.meta.env.VITE_TURN_USERNAME &&
  import.meta.env.VITE_TURN_PASSWORD
) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_PASSWORD,
  });
}

const servers = {
  iceServers,
  iceCandidatePoolSize: 10,
};

// Module-level variables to hold the single connection and listeners
let peerConnection;
let dataChannel;
let unsubscribers = [];

// --- CRITICAL CLEANUP FUNCTION ---
export const cleanupWebRTCConnection = () => {
  console.log('RTC: Cleaning up WebRTC connection and listeners...');
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];
  if (dataChannel) {
    console.log('RTC: Closing data channel.');
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    console.log('RTC: Closing peer connection.');
    peerConnection.close();
    peerConnection = null;
  }
};

// --- MERCHANT-SIDE LOGIC ---
export const createOffer = async (jobId, onFileReceived) => {
  console.log(`%cMERCHANT: Starting offer creation for job ${jobId}`, 'color: blue; font-weight: bold;');
  if (peerConnection) {
    console.warn('MERCHANT: A peer connection already exists. Cleaning up before creating a new one.');
    cleanupWebRTCConnection();
  }
  
  peerConnection = new RTCPeerConnection(servers);
  peerConnection.oniceconnectionstatechange = () => console.log(`%cMERCHANT: ICE Connection State -> ${peerConnection.iceConnectionState}`, 'color: blue');

  peerConnection.ondatachannel = (event) => {
    console.log('%cMERCHANT: Data channel received from user.', 'color: blue; font-weight: bold;');
    const receiveChannel = event.channel;
    receiveChannel.onopen = () => console.log('%cMERCHANT: Data channel OPEN.', 'color: green; font-weight: bold;');
    receiveChannel.onclose = () => console.log('%cMERCHANT: Data channel CLOSED.', 'color: red; font-weight: bold;');
    
    let receivedChunks = [];
    receiveChannel.onmessage = (event) => {
      if (event.data !== 'EOF') {
        receivedChunks.push(event.data);
      } else {
        console.log('%cMERCHANT: End-of-file marker received. File transfer complete.', 'color: green; font-weight: bold;');
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
    if (event.candidate) {
      console.log('MERCHANT: Generated ICE candidate. Sending to Firestore...');
      await addDoc(offerCandidates, event.candidate.toJSON());
    }
  };

  try {
    console.log('MERCHANT: Creating offer...');
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);
    console.log('MERCHANT: Local description (offer) set.');

    const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
    await updateDoc(jobRef, { offer });
    console.log('MERCHANT: Offer successfully saved to Firestore.');

    console.log('MERCHANT: Listening for an answer from the user...');
    const unsubJob = onSnapshot(jobRef, (snapshot) => {
      const data = snapshot.data();
      if (peerConnection && !peerConnection.currentRemoteDescription && data?.answer) {
        console.log('%cMERCHANT: Received answer from user. Setting remote description...', 'color: blue; font-weight: bold;');
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription)
          .then(() => console.log('MERCHANT: Remote description (answer) set successfully.'))
          .catch(e => console.error('MERCHANT: Failed to set remote description.', e));
      }
    });
    unsubscribers.push(unsubJob);

    console.log("MERCHANT: Listening for user's ICE candidates...");
    const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('MERCHANT: Received new ICE candidate from user. Adding it...');
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))
            .catch(e => console.error('MERCHANT: Error adding received ICE candidate.', e));
        }
      });
    });
    unsubscribers.push(unsubAnswerCandidates);
  } catch (error) {
    console.error("MERCHANT: An error occurred during offer creation:", error);
  }
};

// --- USER-SIDE LOGIC ---
export const createAnswer = async (jobId, fileToSend, onTransferProgress) => {
  console.log(`%cUSER: Starting answer creation for job ${jobId}`, 'color: purple; font-weight: bold;');
  if (peerConnection) {
    console.warn('USER: A peer connection already exists. Cleaning up before creating a new one.');
    cleanupWebRTCConnection();
  }

  peerConnection = new RTCPeerConnection(servers);
  peerConnection.oniceconnectionstatechange = () => console.log(`%cUSER: ICE Connection State -> ${peerConnection.iceConnectionState}`, 'color: purple');
  
  console.log('USER: Creating data channel...');
  dataChannel = peerConnection.createDataChannel('fileChannel');
  dataChannel.onopen = async () => {
    console.log('%cUSER: Data channel OPEN. Starting file transfer...', 'color: green; font-weight: bold;');
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
            console.log('%cUSER: End-of-file marker sent.', 'color: purple; font-weight: bold;');
            dataChannel.send('EOF');
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };
    readSlice();
  };
  dataChannel.onclose = () => console.log('%cUSER: Data channel CLOSED.', 'color: red; font-weight: bold;');

  const jobRef = doc(db, 'printJobs', jobId);
  const offerCandidates = collection(jobRef, 'offerCandidates');
  const answerCandidates = collection(jobRef, 'answerCandidates');

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log('USER: Generated ICE candidate. Sending to Firestore...');
      await addDoc(answerCandidates, event.candidate.toJSON());
    }
  };

  try {
    console.log('USER: Fetching offer from Firestore...');
    const jobDoc = await getDoc(jobRef);
    if (!jobDoc.exists() || !jobDoc.data().offer) {
      throw new Error("Offer not found in Firestore document.");
    }
    const offerDescription = jobDoc.data().offer;
    console.log('USER: Offer fetched. Setting remote description...');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));
    console.log('USER: Remote description (offer) set.');

    console.log('USER: Creating answer...');
    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);
    console.log('USER: Local description (answer) set.');
    
    const answer = { sdp: answerDescription.sdp, type: answerDescription.type };
    await updateDoc(jobRef, { answer });
    console.log('USER: Answer successfully saved to Firestore.');

    console.log("USER: Listening for merchant's ICE candidates...");
    const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('USER: Received new ICE candidate from merchant. Adding it...');
          peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))
            .catch(e => console.error('USER: Error adding received ICE candidate.', e));
        }
      });
    });
    unsubscribers.push(unsubOfferCandidates);
  } catch (error) {
    console.error("USER: An error occurred during answer creation:", error);
  }
};