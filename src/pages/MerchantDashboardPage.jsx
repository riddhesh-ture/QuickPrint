// src/pages/MerchantDashboardPage.jsx
import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob } from '../firebase/firestore';
import { useOutletContext } from 'react-router-dom';

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

  // This function now starts the WebRTC transfer and calculates cost.
  const handleAcceptJob = async (job) => {
    try {
      // Placeholder for starting the WebRTC connection offer
      console.log(`Starting WebRTC connection for job: ${job.id}`);
      // In a real app, this is where you would create a WebRTC offer
      // and save it to the job document in Firestore.

      // For now, we'll just update the status to simulate the transfer starting.
      await updatePrintJob(job.id, { status: 'transferring' });
      
      // Simulate file transfer completion after a few seconds
      setTimeout(async () => {
        // --- Automatic Price Calculation ---
        // Cost is ₹1 per copy.
        const totalCost = job.files.reduce((acc, file) => {
            const copies = parseInt(file.specs.copies, 10) || 1;
            return acc + copies;
        }, 0);

        console.log(`Calculated cost for job ${job.id}: ₹${totalCost}`);

        await updatePrintJob(job.id, {
          cost: totalCost,
          status: 'awaitingPayment',
        });
      }, 5000); // Simulate a 5-second file transfer

    } catch (e) {
      console.error("Failed to accept job:", e);
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
      console.log(`Job ${jobId} has been deleted.`);
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
            onAcceptJob={handleAcceptJob} // Pass the new handler
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
          />
        </Box>
      </Box>
    </Container>
  );
}