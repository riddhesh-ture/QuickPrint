// src/pages/UserPrintPage.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert } from '@mui/material';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { createPrintJob } from '../firebase/firestore';
import { useAuth } from '../hooks/useAuth'; // Import useAuth to get the user's ID

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const { user } = useAuth(); // Get the current user from auth context

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

  // This function now ONLY sends metadata to Firestore.
  const handleProceed = async () => {
    if (!merchantId || !user || files.length === 0) {
      alert('Merchant ID is missing, you are not logged in, or no files are selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the file metadata for the Firestore document.
      const filesForJob = files.map(fileEntry => ({
        name: fileEntry.file.name,
        size: fileEntry.file.size,
        specs: fileEntry.specs,
      }));

      // Create the print job document in Firestore.
      const newJobRef = await createPrintJob({
        merchantId: merchantId,
        userId: user.uid, // Add the user's ID to the job for security rules
        files: filesForJob,
        status: 'pending', // Initial status for the merchant to see
      });

      setJobId(newJobRef.id);
      // The actual file data remains in this component's state, ready for WebRTC.

    } catch (error) {
      console.error('Error creating print job request:', error);
      alert('There was an error sending your print job request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // A placeholder UI to show after the job request is sent.
  const renderWaitingStatus = () => {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Your request has been sent!</Typography>
        <Typography color="text.secondary">Waiting for the merchant to accept and start the file transfer...</Typography>
      </Paper>
    );
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Your Files
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
        renderWaitingStatus()
      )}
    </Container>
  );
}