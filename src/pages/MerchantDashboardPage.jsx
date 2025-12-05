// src/pages/MerchantDashboardPage.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, Alert, CircularProgress, Dialog, DialogContent, LinearProgress } from '@mui/material';
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
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0, fileName: '' });

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
  // --- PRIVACY-FOCUSED PRINTING ---
  // Creates a secure print document that prevents saving
  const printFilePrivately = (fileBlob, fileName, specs) => {
    return new Promise((resolve) => {
      console.log(`[Print] Preparing secure print for: ${fileName}`);
      
      const blobUrl = URL.createObjectURL(fileBlob);
      const fileType = fileBlob.type;
      
      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (fileType.startsWith('image/')) {
        // For images - create a secure print page that blocks saving
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QuickPrint Document</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: A4; margin: 10mm; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
                /* Disable text/image selection */
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
                /* Disable drag */
                -webkit-user-drag: none;
                user-drag: none;
                /* Disable pointer events except for printing */
                pointer-events: none;
                ${specs?.color === 'bw' ? 'filter: grayscale(100%);' : ''}
              }
            </style>
            <script>
              // Block right-click context menu
              document.addEventListener('contextmenu', e => e.preventDefault());
              // Block keyboard shortcuts for saving
              document.addEventListener('keydown', e => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
                  e.preventDefault();
                }
              });
            </script>
          </head>
          <body oncontextmenu="return false;" ondragstart="return false;">
            <img src="${blobUrl}" onload="window.print();" draggable="false" />
          </body>
          </html>
        `);
        iframeDoc.close();
      } else if (fileType === 'application/pdf') {
        // For PDFs - embed with restrictions
        iframe.src = blobUrl + '#toolbar=0&navpanes=0';
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } catch (e) {
              console.warn('[Print] PDF print failed, using secure fallback');
              // Open in new window with toolbar disabled
              const printWindow = window.open('', '_blank', 'toolbar=no,menubar=no,scrollbars=yes');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                  <head><title>QuickPrint Document</title>
                  <style>
                    body { margin: 0; }
                    embed { width: 100%; height: 100vh; }
                  </style>
                  <script>
                    document.addEventListener('contextmenu', e => e.preventDefault());
                    window.onload = () => window.print();
                    window.onafterprint = () => window.close();
                  </script>
                  </head>
                  <body oncontextmenu="return false;">
                    <embed src="${blobUrl}#toolbar=0" type="application/pdf" />
                  </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }
          }, 500);
        };
      } else {
        // For other files
        iframe.src = blobUrl;
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow.print();
          }, 500);
        };
      }

      // Cleanup after printing
      const cleanup = () => {
        console.log(`[Print] Cleaning up secure print: ${fileName}`);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
        resolve();
      };

      // Listen for after print event
      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = cleanup;
      }
      
      // Fallback cleanup after timeout
      setTimeout(cleanup, 60000); // 60 second timeout for printing
    });
  };

  // --- Delete file from Supabase Storage ---
  const deleteFileFromSupabase = async (fileUrl) => {
    try {
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
    setPrintProgress({ current: 0, total: job.files.length, fileName: '' });
    console.log(`[Job ${job.id}] Starting to process ${job.files.length} file(s)...`);

    try {
      await updatePrintJob(job.id, { status: 'processing' });

      let totalCost = 0;
      const pricePerPageBW = 2; // ₹2 per page B&W
      const pricePerPageColor = 5; // ₹5 per page Color

      // Process each file
      for (let i = 0; i < job.files.length; i++) {
        const file = job.files[i];
        setPrintProgress({ current: i + 1, total: job.files.length, fileName: file.name });
        
        console.log(`[Job ${job.id}] Fetching file ${i + 1}/${job.files.length}: ${file.name}`);
        
        // Fetch file into browser memory
        const response = await fetch(file.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${file.name}`);
        }
        const fileBlob = await response.blob();
        console.log(`[Job ${job.id}] File fetched: ${file.name} (${(fileBlob.size / 1024).toFixed(2)} KB)`);

        // Print each copy with privacy-focused method
        const copies = parseInt(file.specs?.copies, 10) || 1;
        for (let c = 0; c < copies; c++) {
          console.log(`[Job ${job.id}] Printing copy ${c + 1}/${copies} of ${file.name}`);
          await printFilePrivately(fileBlob, file.name, file.specs);
        }

        // Calculate cost
        const pricePerPage = file.specs?.color === 'color' ? pricePerPageColor : pricePerPageBW;
        const pages = 1; // Assume 1 page per file
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

    } catch (e) {
      console.error(`[Job ${job.id}] Error processing job:`, e);
      alert(`Error processing job: ${e.message}`);
      await updatePrintJob(job.id, { status: 'pending' });
    } finally {
      setProcessingJobId(null);
      setPrintProgress({ current: 0, total: 0, fileName: '' });
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

      {/* Print Progress Dialog */}
      <Dialog open={!!processingJobId} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Processing Print Job
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Printing file {printProgress.current} of {printProgress.total}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {printProgress.fileName}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(printProgress.current / printProgress.total) * 100} 
            sx={{ mt: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Please complete the print dialog when it appears...
          </Typography>
        </DialogContent>
      </Dialog>
    </Container>
  );
}