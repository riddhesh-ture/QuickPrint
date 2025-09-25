// src/pages/UserPrintPage.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert, TextField, LinearProgress } from '@mui/material';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { createPrintJob, updatePrintJob } from '../firebase/firestore';
import { useDocument } from '../hooks/useFirestore';

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  
  const [files, setFiles] = useState([]);
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);

  // Real-time listener for the job document
  const { document: jobData, error: jobError } = useDocument('printJobs', jobId);

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
    if (!merchantId || files.length === 0 || !userName.trim()) {
      alert('Merchant ID is missing, no files are selected, or your name is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const filesForJob = files.map(fileEntry => ({
        name: fileEntry.file.name,
        size: fileEntry.file.size,
        specs: fileEntry.specs,
      }));

      // No longer need userId, as the user is anonymous
      const newJobRef = await createPrintJob({
        merchantId: merchantId,
        userName: userName.trim(),
        files: filesForJob,
        status: 'pending',
      });

      setJobId(newJobRef.id);
    } catch (error) {
      console.error('Error creating print job request:', error);
      alert('There was an error sending your print job request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock payment handler
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
        return <Alert severity="info">Request sent! Waiting for the merchant to accept the job...</Alert>;
      case 'transferring':
        return (
          <Box>
            <Alert severity="info">Merchant has accepted! Transferring file securely via P2P...</Alert>
            <LinearProgress variant="indeterminate" sx={{mt: 2}} />
          </Box>
        );
      case 'awaitingPayment':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Payment Required</Typography>
            <Typography variant="h4" sx={{ my: 2 }}>
              Total Cost: ₹{jobData.cost.toFixed(2)}
            </Typography>
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
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <TextField
              label="Your Name or ID"
              variant="outlined"
              fullWidth
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              helperText="This is how the merchant will identify your job."
            />
          </Paper>
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
                <Button variant="contained" size="large" onClick={handleProceed} disabled={isSubmitting || !userName.trim()}>
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