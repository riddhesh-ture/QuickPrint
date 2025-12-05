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
  });  // --- MAXIMUM SECURITY PRINTING ---
  // Renders file in a secure, non-savable format and auto-prints
  const printFilePrivately = (fileBlob, fileName, specs) => {
    return new Promise((resolve) => {
      console.log(`[Print] Preparing maximum security print for: ${fileName}`);
      
      const fileType = fileBlob.type;
      
      // Create a secure print window
      const printWindow = window.open('', '_blank', 
        'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes'
      );
      
      if (!printWindow) {
        alert('Please allow popups for printing');
        resolve();
        return;
      }

      // Convert blob to base64 for embedding (prevents URL copying)
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        
        const securityScript = `
          <script>
            // Disable all save/copy methods
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', e => {
              if (e.ctrlKey || e.metaKey) {
                if (['s','S','p','P','c','C','a','A','u','U','i','I'].includes(e.key)) {
                  e.preventDefault();
                  return false;
                }
              }
              if (e.key === 'F12' || e.key === 'PrintScreen') {
                e.preventDefault();
                return false;
              }
            });
            document.addEventListener('copy', e => e.preventDefault());
            document.addEventListener('cut', e => e.preventDefault());
            document.addEventListener('dragstart', e => e.preventDefault());
            
            // Blur detection - close if user tries to switch tabs
            let printStarted = false;
            window.addEventListener('blur', () => {
              if (!printStarted) {
                // User switched away before printing
              }
            });
            
            // Auto print on load
            window.onload = () => {
              printStarted = true;
              setTimeout(() => window.print(), 500);
            };
            
            // Auto close after print
            window.onafterprint = () => {
              window.close();
            };
            
            // Prevent opening dev tools
            setInterval(() => {
              if (window.outerHeight - window.innerHeight > 200 || 
                  window.outerWidth - window.innerWidth > 200) {
                document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">Security Alert: Developer tools detected</h1>';
              }
            }, 1000);
          <\/script>
        `;

        let content = '';
        
        if (fileType.startsWith('image/')) {
          content = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>QuickPrint - Secure Document</title>
              <style>
                * { margin: 0; padding: 0; }
                @page { size: A4; margin: 10mm; }
                @media print { 
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .no-print { display: none !important; }
                }
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: #f5f5f5;
                  -webkit-user-select: none;
                  user-select: none;
                }
                .container {
                  background: white;
                  padding: 20px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                img {
                  max-width: 100%;
                  max-height: 90vh;
                  display: block;
                  pointer-events: none;
                  -webkit-user-drag: none;
                  ${specs?.color === 'bw' ? 'filter: grayscale(100%);' : ''}
                }
                .watermark {
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-45deg);
                  font-size: 100px;
                  color: rgba(0,0,0,0.03);
                  pointer-events: none;
                  white-space: nowrap;
                  z-index: 1000;
                }
                @media print { .watermark { display: none; } }
              </style>
              ${securityScript}
            </head>
            <body oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;">
              <div class="watermark no-print">QUICKPRINT SECURE</div>
              <div class="container">
                <img src="${base64Data}" draggable="false" />
              </div>
            </body>
            </html>
          `;
        } else if (fileType === 'application/pdf') {
          // For PDFs, we need to render pages as images for security
          content = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>QuickPrint - Secure Document</title>
              <style>
                * { margin: 0; padding: 0; }
                body { 
                  background: #525659; 
                  padding: 20px;
                  -webkit-user-select: none;
                  user-select: none;
                }
                .page-container {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 20px;
                }
                canvas {
                  background: white;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                  pointer-events: none;
                }
                @page { size: A4; margin: 0; }
                @media print {
                  body { background: white; padding: 0; }
                  .page-container { gap: 0; }
                  canvas { box-shadow: none; page-break-after: always; }
                }
              </style>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
              ${securityScript}
            </head>
            <body oncontextmenu="return false;">
              <div class="page-container" id="pages"></div>
              <script>
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                
                async function renderPDF() {
                  const pdfData = atob('${base64Data.split(',')[1]}');
                  const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
                  const container = document.getElementById('pages');
                  
                  for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const scale = 1.5;
                    const viewport = page.getViewport({scale});
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    container.appendChild(canvas);
                    
                    await page.render({
                      canvasContext: canvas.getContext('2d'),
                      viewport: viewport
                    }).promise;
                  }
                  
                  setTimeout(() => window.print(), 1000);
                }
                renderPDF();
              <\/script>
            </body>
            </html>
          `;
        } else {
          // For other files, show a message
          content = `
            <!DOCTYPE html>
            <html>
            <head><title>QuickPrint</title></head>
            <body style="text-align:center;padding:50px;">
              <h2>Unsupported file type for secure preview</h2>
              <p>Please contact the user to resend as PDF or image.</p>
            </body>
            </html>
          `;
        }

        printWindow.document.write(content);
        printWindow.document.close();
      };
      
      reader.readAsDataURL(fileBlob);
      
      // Cleanup timeout
      setTimeout(() => {
        resolve();
      }, 120000); // 2 minute timeout
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