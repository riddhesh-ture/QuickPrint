// src/pages/UserPrintPage.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress, Alert, LinearProgress, Divider } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { createPrintJob, updatePrintJob } from '../firebase/firestore';
import { useDocument } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/config';

// UPI Configuration
const UPI_VPA = 'riddheshture@upi';
const UPI_NAME = 'QuickPrint';

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');

  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useAuth();
  const { document: jobData, error: jobError } = useDocument('printJobs', jobId);

  // Generate UPI payment URL
  const generateUPIUrl = (amount) => {
    const params = new URLSearchParams({
      pa: UPI_VPA,
      pn: UPI_NAME,
      am: amount.toFixed(2),
      cu: 'INR',
      tn: `Print Job #${jobId?.slice(-6) || ''}`,
    });
    return `upi://pay?${params.toString()}`;
  };

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

    const { data: publicUrlData } = supabase.storage
      .from('print-jobs')
      .getPublicUrl(fileName);

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

      const newJobRef = await createPrintJob({
        merchantId: merchantId,
        userId: user.uid,
        userName: user.email,
        files: filesForJob,
        status: 'pending',
      });
      
      setJobId(newJobRef.id);
      setFiles([]);

    } catch (error) {
      console.error('Error creating print job:', error);
      alert('There was an error sending your print job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentComplete = async () => {
    if (!jobId) return;
    await updatePrintJob(jobId, { status: 'paid' });
  };

  const renderJobStatus = () => {
    if (jobError) return <Alert severity="error">{jobError}</Alert>;
    if (!jobData) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

    switch (jobData.status) {
      case 'pending':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>Job Submitted!</Typography>
            <Typography color="text.secondary">
              Waiting for the merchant to process your print job...
            </Typography>
          </Paper>
        );
      
      case 'processing':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>Printing in Progress...</Typography>
            <Typography color="text.secondary">
              The merchant is currently printing your documents.
            </Typography>
          </Paper>
        );
      
      case 'awaitingPayment':
        const upiUrl = generateUPIUrl(jobData.cost || 0);
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="primary">
              Payment Required
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h3" sx={{ my: 2, fontWeight: 'bold' }}>
              ₹{jobData.cost?.toFixed(2) || '0.00'}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Scan the QR code or tap the button below to pay
            </Typography>

            <Box sx={{ 
              display: 'inline-block', 
              p: 2, 
              bgcolor: 'white', 
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              mb: 3
            }}>
              <QRCodeSVG 
                value={upiUrl} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </Box>

            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
              UPI ID: {UPI_VPA}
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              href={upiUrl}
              sx={{ 
                mb: 2, 
                py: 1.5,
                bgcolor: '#5f259f',
                '&:hover': { bgcolor: '#4a1d7a' }
              }}
            >
              Pay ₹{jobData.cost?.toFixed(2)} with UPI App
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handlePaymentComplete}
              sx={{ py: 1.5 }}
            >
              I've Completed the Payment
            </Button>
          </Paper>
        );
      
      case 'paid':
        return (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="h5" gutterBottom color="success.main">
              ✓ Payment Received!
            </Typography>
            <Typography color="text.secondary">
              Thank you! Your documents are being printed.
            </Typography>
          </Paper>
        );
      
      case 'completed':
        return (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#4caf50' }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
              🎉 Print Job Complete!
            </Typography>
            <Typography sx={{ color: 'white' }}>
              Your documents have been printed successfully.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2, bgcolor: 'white', color: '#4caf50' }}
              onClick={() => { setJobId(null); setFiles([]); }}
            >
              Print More Documents
            </Button>
          </Paper>
        );
      
      default:
        return <Paper sx={{ p: 3 }}><Typography>Status: {jobData.status}</Typography></Paper>;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {jobId ? 'Your Print Job' : 'Upload Your Files'}
      </Typography>
      
      {!jobId && (
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
          Merchant ID: {merchantId || 'N/A'}
        </Typography>
      )}

      {jobId ? (
        renderJobStatus()
      ) : (
        <>
          <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
            <FileUploader onFilesAdded={handleFilesAdded} />
          </Paper>

          {files.length > 0 && (
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                Your Files ({files.length})
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
              
              {isSubmitting && (
                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Uploading files... {Math.round(uploadProgress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
              
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
