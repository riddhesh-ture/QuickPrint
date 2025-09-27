// src/pages/UserPrintPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert, LinearProgress } from '@mui/material';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { createPrintJob, updatePrintJob } from '../firebase/firestore';
import { useDocument } from '../hooks/useFirestore';
import { createAnswer } from '../firebase/webrtc';
import { useAuth } from '../hooks/useAuth'; // Get the authenticated user

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [webRTCStarted, setWebRTCStarted] = useState(false);

  const { user } = useAuth(); // Get the user from our context
  const { document: jobData, error: jobError } = useDocument('printJobs', jobId);

  useEffect(() => {
    if (jobData?.offer && jobData.status === 'connecting' && files.length > 0 && !webRTCStarted) {
      setWebRTCStarted(true);
      const fileToSend = files[0].file;
      createAnswer(jobId, fileToSend, (sent, total) => {
        setTransferProgress((sent / total) * 100);
      });
    }
  }, [jobData, files, jobId, webRTCStarted]);

  const handleFilesAdded = (newFiles) => {
    const newFileEntries = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      specs: { copies: 1, pages: '', color: 'bw', sides: 'single' },
    }));
    setFiles(prev => [...prev, ...newFileEntries]);
  };

  const handleSpecChange = (fileId, newSpecs) => {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, specs: { ...f.specs, ...newSpecs } } : f)));
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleProceed = async () => {
    if (!merchantId || files.length === 0 || !user) {
      alert('Error: Missing merchant ID, files, or user authentication.');
      return;
    }

    setIsSubmitting(true);
    try {
      const filesForJob = files.map(fileEntry => ({
        name: fileEntry.file.name,
        size: fileEntry.file.size,
        specs: fileEntry.specs,
      }));

      const newJobRef = await createPrintJob({
        merchantId: merchantId,
        userId: user.uid, // Use the authenticated user's ID
        userName: user.email, // Use email as the display name
        files: filesForJob,
        status: 'pending',
      });
      setJobId(newJobRef.id);
    } catch (error) {
      console.error('Error creating print job request:', error);
      alert('There was an error sending your print job request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!jobId) return;
    alert('This would open a UPI payment app. Simulating successful payment.');
    await updatePrintJob(jobId, { status: 'paid' });
  };

  const renderJobStatus = () => {
    if (jobError) return <Alert severity="error">{jobError}</Alert>;
    if (!jobData) return <CircularProgress />;

    switch (jobData.status) {
      case 'pending':
        return <Alert severity="info">Request sent! Waiting for merchant to accept...</Alert>;
      case 'connecting':
        return <Alert severity="info">Merchant accepted! Establishing secure connection...</Alert>;
      case 'transferring':
        return (
          <Box>
            <Alert severity="info">Connection established! Securely transferring file...</Alert>
            <LinearProgress variant="determinate" value={transferProgress} sx={{ mt: 2 }} />
            <Typography variant="body2" color="text.secondary">{Math.round(transferProgress)}%</Typography>
          </Box>
        );
      case 'awaitingPayment':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Payment Required</Typography>
            <Typography variant="h4" sx={{ my: 2 }}>Total Cost: ₹{jobData.cost.toFixed(2)}</Typography>
            <Button variant="contained" onClick={handlePayment}>Pay Now</Button>
          </Paper>
        );
      case 'paid':
        return <Alert severity="success">Payment successful! Your document is being printed.</Alert>;
      case 'completed':
        return <Alert severity="success">Print Job Complete! Thank you.</Alert>;
      default:
        return <CircularProgress />;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Send a File to Print
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
        Sending to Merchant ID: {merchantId || 'N/A'}
      </Typography>

      {!jobId ? (
        <>
          <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
            <FileUploader onFilesAdded={handleFilesAdded} />
          </Paper>
          {files.length > 0 && (
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>Your Files</Typography>
              <List>
                {files.map(entry => (
                  <UploadedFileItem
                    key={entry.id}
                    fileEntry={entry}
                    onSpecChange={handleSpecChange}
                    onRemove={handleRemoveFile}
                  />
                ))}
              </List>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant="contained" size="large" onClick={handleProceed} disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={24} /> : 'Send Request to Merchant'}
                </Button>
              </Box>
            </Box>
          )}
        </>
      ) : (
        renderJobStatus()
      )}
    </Container>
  );
}