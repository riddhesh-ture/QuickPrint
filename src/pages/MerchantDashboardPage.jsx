// src/pages/MerchantDashboardPage.jsx
import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob } from '../firebase/firestore'; // Ensure you have these functions exported

export default function MerchantDashboardPage() {
  // In a real application, you would get the merchantId from your authentication context.
  // For now, we'll hardcode it for this demonstration.
  const merchantId = 'merchant-abc'; // IMPORTANT: This should be a unique ID for the merchant.

  // Use the real-time hook to listen for new print jobs for this merchant.
  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  /**
   * Handles the "Calculate Cost" action from the merchant.
   * This updates the job in Firestore with a cost and changes its status,
   * which the user will see in real-time.
   */
  const handleCalculateCost = async (jobId, cost) => {
    const parsedCost = parseFloat(cost);
    if (!parsedCost || isNaN(parsedCost) || parsedCost <= 0) {
      alert("Please enter a valid, positive cost.");
      return;
    }
    try {
      await updatePrintJob(jobId, {
        cost: parsedCost,
        status: 'awaitingPayment', // This status triggers the payment UI on the user's side
      });
    } catch (e) {
      console.error("Failed to update job with cost:", e);
      alert("Error: Could not update the job.");
    }
  };

  /**
   * Handles the "Complete Job" action after the file has been printed.
   */
  const handleCompleteJob = async (jobId) => {
    try {
      await updatePrintJob(jobId, { status: 'completed' });
    } catch (e) {
      console.error("Failed to complete job:", e);
      alert("Error: Could not complete the job.");
    }
  };
  
  /**
   * Handles deleting the job from the queue.
   * In a full app, this should also delete the associated file from Firebase Storage.
   */
  const handleDeleteJob = async (jobId) => {
      try {
        await deletePrintJob(jobId);
        console.log(`Job ${jobId} has been deleted.`);
      } catch(e) {
        console.error("Failed to delete job:", e);
        alert("Error: Could not delete the job.");
      }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Merchant Dashboard
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 3fr' }, gap: 3 }}>
        {/* This component will display the merchant's QR code and ID */}
        <MerchantProfile merchantId={merchantId} />
        
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Incoming Print Jobs
          </Typography>
          
          {error && <Alert severity="error">{error}</Alert>}
          
          {/* This component will receive the list of jobs and the functions to act on them */}
          <PrintQueue
            jobs={jobs}
            onCalculateCost={handleCalculateCost}
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
          />
        </Box>
      </Box>
    </Container>
  );
}