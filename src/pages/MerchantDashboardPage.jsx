// src/pages/MerchantDashboardPage.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob } from '../firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/config';

export default function MerchantDashboardPage() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [processingJobId, setProcessingJobId] = useState(null);

  // Role-based redirection logic
  React.useEffect(() => {
    if (!loading && userData && userData.role !== 'merchant') {
      console.log("Not a merchant, redirecting...");
      navigate('/', { replace: true });
    }
  }, [user, userData, loading, navigate]);
  
  if (loading || !userData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (userData.role !== 'merchant') {
    return null;
  }
  
  const merchantId = user.uid;

  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  // --- PRIVACY-FOCUSED: Print file in browser without saving to disk ---
  const printFileInBrowser = (fileBlob, fileName) => {
    return new Promise((resolve) => {
      console.log(`[Print] Opening print dialog for: ${fileName}`);
      
      const blobUrl = URL.createObjectURL(fileBlob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            // For cross-origin issues, open in new tab
            console.warn('[Print] iframe print failed, opening in new tab:', e);
            window.open(blobUrl, '_blank');
          }
          
          // Cleanup after print dialog closes (give user time to print)
          setTimeout(() => {
            console.log(`[Print] Cleaning up blob URL for: ${fileName}`);
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
            resolve();
          }, 2000);
        }, 500);
      };

      iframe.onerror = () => {
        console.error(`[Print] Failed to load file: ${fileName}`);
        URL.revokeObjectURL(blobUrl);
        resolve();
      };
    });
  };

  // --- Delete file from Supabase Storage ---
  const deleteFileFromSupabase = async (fileUrl) => {
    try {
      // Extract the file path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/print-jobs/path/to/file.pdf
      const urlParts = fileUrl.split('/storage/v1/object/public/print-jobs/');
      if (urlParts.length < 2) {
        console.error('[Supabase] Could not extract file path from URL:', fileUrl);
        return;
      }
      const filePath = decodeURIComponent(urlParts[1]);
      
      console.log(`[Supabase] Deleting file: ${filePath}`);
      const { error } = await supabase.storage
        .from('print-jobs')
        .remove([filePath]);
      
      if (error) {
        console.error('[Supabase] Error deleting file:', error);
      } else {
        console.log(`[Supabase] Successfully deleted: ${filePath}`);
      }
    } catch (e) {
      console.error('[Supabase] Exception while deleting file:', e);
    }
  };

  // --- MAIN HANDLER: Accept job, fetch, print, delete, calculate cost ---
  const handleAcceptJob = async (job) => {
    setProcessingJobId(job.id);
    console.log(`[Job ${job.id}] Starting to process...`);

    try {
      // Update status to processing
      await updatePrintJob(job.id, { status: 'processing' });

      let totalCost = 0;
      const pricePerPageBW = 1; // ₹1 per page B&W
      const pricePerPageColor = 5; // ₹5 per page Color

      // Process each file
      for (const file of job.files) {
        console.log(`[Job ${job.id}] Fetching file: ${file.name}`);
        
        // Fetch file into browser memory (not saved to disk)
        const response = await fetch(file.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${file.name}`);
        }
        const fileBlob = await response.blob();
        console.log(`[Job ${job.id}] File fetched into memory: ${file.name} (${(fileBlob.size / 1024).toFixed(2)} KB)`);

        // Print each copy
        const copies = parseInt(file.specs?.copies, 10) || 1;
        for (let i = 0; i < copies; i++) {
          console.log(`[Job ${job.id}] Printing copy ${i + 1}/${copies} of ${file.name}`);
          await printFileInBrowser(fileBlob, file.name);
        }

        // Calculate cost
        const pricePerPage = file.specs?.color === 'color' ? pricePerPageColor : pricePerPageBW;
        const pages = 1; // Assume 1 page per file (you could add PDF page counting later)
        totalCost += copies * pages * pricePerPage;

        // Delete file from Supabase for privacy
        console.log(`[Job ${job.id}] Deleting file from storage: ${file.name}`);
        await deleteFileFromSupabase(file.fileUrl);
      }

      // Update job with cost and request payment
      console.log(`[Job ${job.id}] Processing complete. Total cost: ₹${totalCost}`);
      await updatePrintJob(job.id, {
        status: 'awaitingPayment',
        cost: totalCost,
      });

      alert(`Printing complete! Total cost: ₹${totalCost}. Waiting for user payment.`);

    } catch (e) {
      console.error(`[Job ${job.id}] Error processing job:`, e);
      alert(`Error processing job: ${e.message}`);
      // Revert status on error
      await updatePrintJob(job.id, { status: 'pending' });
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleCompleteJob = async (jobId) => {
    try {
      await updatePrintJob(jobId, { status: 'completed' });
      console.log(`[Job ${jobId}] Marked as completed.`);
    } catch (e) {
      console.error("Failed to complete job:", e);
    }
  };
  
  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await deletePrintJob(jobId);
        console.log(`[Job ${jobId}] Deleted.`);
      } catch (e) {
        console.error("Failed to delete job:", e);
      }
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
            processingJobId={processingJobId}
          />
        </Box>
      </Box>
    </Container>
  );
}