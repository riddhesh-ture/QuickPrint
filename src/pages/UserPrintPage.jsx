// src/pages/UserPrintPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { uploadFile } from '../firebase/storage';
import { createPrintJob, updatePrintJob } from '../firebase/firestore';
import { useDocument } from '../hooks/useFirestore'; // Assumes you have a real-time hook

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');

  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState(null);

  // This hook listens to real-time changes for the created job
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
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, specs: newSpecs } : f)));
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };
  
  // Step 4: Upload to Firebase & Step 5: Generate Token (Job ID)
  const handleProceed = async () => {
    if (!merchantId || files.length === 0) return;
    setIsUploading(true);
    try {
      const filesForJob = await Promise.all(
        files.map(async (entry) => {
          const path = `uploads/${merchantId}/${Date.now()}-${entry.file.name}`;
          const url = await uploadFile(entry.file, path);
          return { url, name: entry.file.name, specs: entry.specs };
        })
      );

      // Create the job in Firestore and get its ID
      const newJobRef = await createPrintJob({
        merchantId,
        files: filesForJob,
        status: 'pending', // Initial status
        createdAt: new Date(),
      });
      setJobId(newJobRef.id); // Start listening to this job for updates

    } catch (error) {
      console.error('Error creating print job:', error);
      alert('Failed to send print job.');
    } finally {
      setIsUploading(false);
    }
  };

  // Simulates the UPI payment step
  const handlePayment = async () => {
      if (!jobId) return;
      // In a real app, you would integrate a payment gateway.
      // Here, we just update the status to simulate a successful payment.
      await updatePrintJob(jobId, { status: 'paid' });
  };


  // Renders UI based on the job status from the flowchart
  const renderJobStatus = () => {
    if (jobError) return <Alert severity="error">Error loading job status.</Alert>;
    if (!jobData) return <Typography>Waiting for merchant...</Typography>;

    switch (jobData.status) {
      case 'pending':
        return <Alert severity="info">Your job has been sent! Waiting for the merchant to review and calculate the cost.</Alert>;
      
      // Step: Payment Loop
      case 'awaitingPayment':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Payment Required</Typography>
            <Typography variant="h4" sx={{ my: 2 }}>
              Cost: ${jobData.cost.toFixed(2)}
            </Typography>
            <Button variant="contained" onClick={handlePayment}>Pay Now</Button>
          </Paper>
        );

      case 'paid':
         return <Alert severity="info">Payment successful! Your document is being printed.</Alert>;

      // Step: Show green tick
      case 'completed':
        return (
          <Box sx={{ textAlign: 'center', color: 'green' }}>
            <CheckCircleIcon sx={{ fontSize: 60 }} />
            <Typography variant="h5">Print Job Complete!</Typography>
            <Typography>You can now collect your printout from the merchant.</Typography>
          </Box>
        );
      default:
        return <CircularProgress />;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Your Files
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
        Printing for Merchant ID: {merchantId || 'N/A'}
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
                <Button variant="contained" size="large" onClick={handleProceed} disabled={isUploading}>
                  {isUploading ? <CircularProgress size={24} /> : 'Send to Merchant'}
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