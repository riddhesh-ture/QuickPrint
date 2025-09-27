// src/pages/MerchantDashboardPage.jsx
import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob } from '../firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { createOffer } from '../firebase/webrtc'; // Import the new WebRTC function

export default function MerchantDashboardPage() {
  const { merchantId } = useOutletContext();

  if (!merchantId) {
    return <Alert severity="error">Merchant ID not found. Please log in again.</Alert>;
  }

  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  // --- THE VIRTUAL PRINT SERVICE ---
  const printFileWithoutSaving = (fileBlob) => {
    // Create an in-memory URL for the received file blob
    const url = URL.createObjectURL(fileBlob);
    
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Wait for the iframe to load the content, then trigger the print dialog
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // The user now sees the print dialog. After they close it, we clean up.
        // We can't know when they close it, so we use a timeout.
        setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url); // Clean up the in-memory URL
        }, 1000); // 1 second delay for cleanup
      }, 1);
    };
  };

  const handleAcceptJob = async (job) => {
    try {
      await updatePrintJob(job.id, { status: 'connecting' });

      // Create a WebRTC offer and define what happens when the file is received
      createOffer(job.id, (receivedFileBlob) => {
        // --- THIS IS THE CALLBACK THAT RUNS AFTER FILE TRANSFER ---
        console.log(`File for job ${job.id} received. Triggering print.`);
        printFileWithoutSaving(receivedFileBlob);

        // --- Automatic Price Calculation (₹1 per copy) ---
        const totalCost = job.files.reduce((acc, file) => {
          const copies = parseInt(file.specs.copies, 10) || 1;
          return acc + copies;
        }, 0);

        // Update the job to awaiting payment
        updatePrintJob(job.id, {
          cost: totalCost,
          status: 'awaitingPayment',
        });
      });
    } catch (e) {
      console.error("Failed to accept job and create offer:", e);
      alert("Error: Could not accept the job.");
    }
  };

  const handleCompleteJob = async (jobId) => {
    try {
      await updatePrintJob(jobId, { status: 'completed' });
    } catch (e) {
      console.error("Failed to complete job:", e);
      alert("Error: Could not complete the job.");
    }
  };
  
  const handleDeleteJob = async (jobId) => {
    try {
      await deletePrintJob(jobId);
    } catch(e) {
      console.error("Failed to delete job:", e);
      alert("Error: Could not delete the job.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Merchant Dashboard
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 3fr' }, gap: 3 }}>
        <MerchantProfile merchantId={merchantId} />
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Incoming Print Jobs
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <PrintQueue
            jobs={jobs}
            onAcceptJob={handleAcceptJob}
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
          />
        </Box>
      </Box>
    </Container>
  );
}