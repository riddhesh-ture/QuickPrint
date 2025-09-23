// src/pages/MerchantDashboardPage.jsx
import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob } from '../firebase/firestore';
import { useOutletContext } from 'react-router-dom'; // Import useOutletContext

export default function MerchantDashboardPage() {
  // Get merchantId from the Outlet context provided by ProtectedRoute
  const { merchantId } = useOutletContext(); 

  // Fallback if for some reason merchantId isn't available (shouldn't happen with ProtectedRoute)
  if (!merchantId) {
    return <Alert severity="error">Merchant ID not found. Please log in again.</Alert>;
  }

  // Use the real-time hook to listen for new print jobs for this merchant.
  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  const handleCalculateCost = async (jobId, cost) => {
    const parsedCost = parseFloat(cost);
    if (!parsedCost || isNaN(parsedCost) || parsedCost <= 0) {
      alert("Please enter a valid, positive cost.");
      return;
    }
    try {
      await updatePrintJob(jobId, {
        cost: parsedCost,
        status: 'awaitingPayment',
      });
    } catch (e) {
      console.error("Failed to update job with cost:", e);
      alert("Error: Could not update the job.");
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
  }

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
            onCalculateCost={handleCalculateCost}
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
          />
        </Box>
      </Box>
    </Container>
  );
}