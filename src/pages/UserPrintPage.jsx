// src/pages/UserPrintPage.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert, LinearProgress } from '@mui/material';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { createPrintJob, updatePrintJob } from '../firebase/firestore';
import { useDocument } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/config';

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');

  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useAuth();
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

  // --- NEW: Upload file to Supabase Storage ---
  const uploadFileToSupabase = async (file, index, totalFiles) => {
    const fileName = `${merchantId}/${user.uid}/${Date.now()}_${file.name}`;
    console.log(`Uploading file ${index + 1}/${totalFiles}: ${fileName}`);

    const { data, error } = await supabase.storage
      .from('print-jobs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('print-jobs')
      .getPublicUrl(fileName);

    console.log(`File uploaded. Public URL: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  };

  const handleProceed = async () => {
    if (!merchantId || files.length === 0 || !user) {
      alert('Error: Missing merchant ID, files, or user authentication.');
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const filesForJob = [];
      for (let i = 0; i < files.length; i++) {
        const fileEntry = files[i];
        const publicUrl = await uploadFileToSupabase(fileEntry.file, i, files.length);
        filesForJob.push({
          name: fileEntry.file.name,
          size: fileEntry.file.size,
          specs: fileEntry.specs,
          fileUrl: publicUrl,
        });
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Create a print job document in Firestore with the file URLs
      const newJobRef = await createPrintJob({
        merchantId: merchantId,
        userId: user.uid,
        userName: user.email,
        files: filesForJob,
        status: 'pending', // The job is now waiting for the merchant
      });
      
      console.log('Print job created with ID:', newJobRef.id);
      setJobId(newJobRef.id);
      setFiles([]); // Clear the file list after successful submission

    } catch (error) {
      console.error('Error creating print job:', error);
      alert('There was an error sending your print job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!jobId) return;
    // In a real app, you would integrate with a payment gateway here.
    // For now, we simulate a successful payment.
    alert('This would open a UPI payment app. Simulating successful payment.');
    await updatePrintJob(jobId, { status: 'paid' });
  };

  // --- Render different UI based on job status ---
  const renderJobStatus = () => {
    if (jobError) return <Alert severity="error">{jobError}</Alert>;
    if (!jobData) return <CircularProgress />;

    switch (jobData.status) {
      case 'pending':
        return <Alert severity="info">Job sent! Waiting for the merchant to process it...</Alert>;
      case 'awaitingPayment':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Payment Required</Typography>
            <Typography variant="h4" sx={{ my: 2 }}>Total Cost: ₹{jobData.cost?.toFixed(2) || '0.00'}</Typography>
            {/* In a real app, you'd generate a dynamic UPI QR code here */}
            <Button variant="contained" size="large" onClick={handlePayment}>
              Pay Now (Simulated)
            </Button>
          </Paper>
        );
      case 'paid':
        return <Alert severity="success">Payment successful! Your document is being printed.</Alert>;
      case 'completed':
        return <Alert severity="success">Print Job Complete! Thank you.</Alert>;
      default:
        return <Alert severity="info">Processing... Status: {jobData.status}</Alert>;
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

      {jobId ? (
        // If a job has been submitted, show its status
        renderJobStatus()
      ) : (
        // Otherwise, show the file upload UI
        <>
          <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
            <FileUploader onFilesAdded={handleFilesAdded} />
          </Paper>

          {files.length > 0 && (
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                Your Files
              </Typography>
              <List>
                {files.map(fileEntry => (
                  <UploadedFileItem
                    key={fileEntry.id}
                    fileEntry={fileEntry}
                    onSpecChange={handleSpecChange}
                    onRemove={handleRemoveFile}
                  />
                ))}
              </List>
              {isSubmitting && <LinearProgress variant="determinate" value={uploadProgress} sx={{ my: 2 }} />}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleProceed}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Uploading...' : 'Send to Merchant'}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}