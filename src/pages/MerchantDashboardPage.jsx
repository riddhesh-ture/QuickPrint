// src/pages/MerchantDashboardPage.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, Alert, CircularProgress, Dialog, DialogContent, LinearProgress, Tabs, Tab, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import DashboardStats from '../components/MerchantView/DashboardStats';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob, db } from '../firebase/firestore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/config';

export default function MerchantDashboardPage() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [processingJobId, setProcessingJobId] = useState(null);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [activeTab, setActiveTab] = useState(0);

  React.useEffect(() => {
    if (!loading && userData && userData.role !== 'merchant') {
      navigate('/', { replace: true });
    }
  }, [user, userData, loading, navigate]);
  
  if (loading || !userData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (userData.role !== 'merchant') return null;
  
  const merchantId = user.uid;
  const pricePerPageBW = userData?.pricePerPageBW || 2;
  const pricePerPageColor = userData?.pricePerPageColor || 5;

  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  const pendingJobs = jobs?.filter(j => j.status === 'pending').length || 0;
  const printFilePrivately = (fileBlob, fileName, specs) => {
    return new Promise((resolve) => {
      const fileType = fileBlob.type;
      const printWindow = window.open('', '_blank', 'width=900,height=700,menubar=no,toolbar=no');
      
      if (!printWindow) { alert('Please allow popups for printing'); resolve(); return; }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        
        // Build CSS for print specifications
        const paperSize = specs?.paperSize || 'a4';
        const orientation = specs?.orientation || 'portrait';
        const isColor = specs?.color === 'color';
        const isDoubleSided = specs?.sides === 'double';
        const pageRange = specs?.pages || ''; // e.g., "1-5" or "1,3,5"
        
        const pageCSS = `
          @page {
            size: ${paperSize} ${orientation};
            margin: 10mm;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              ${!isColor ? 'filter: grayscale(100%);' : ''}
            }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: auto; }
          }
        `;

        const securityScript = `
          <script>
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', e => {
              if ((e.ctrlKey || e.metaKey) && ['s','S','c','C','u','U'].includes(e.key)) {
                e.preventDefault();
              }
            });
            document.addEventListener('dragstart', e => e.preventDefault());
          <\/script>
        `;

        let content = '';
        
        if (fileType.startsWith('image/')) {
          content = `<!DOCTYPE html>
            <html>
            <head>
              <title>QuickPrint - ${fileName}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                ${pageCSS}
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: #f0f0f0;
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
                  ${!isColor ? 'filter: grayscale(100%);' : ''}
                }
                @media print {
                  body { background: white; }
                  .container { padding: 0; box-shadow: none; }
                }
              </style>
              ${securityScript}
            </head>
            <body oncontextmenu="return false;">
              <div class="container">
                <img src="${base64Data}" draggable="false" />
              </div>
              <script>
                window.onload = () => setTimeout(() => window.print(), 500);
                window.onafterprint = () => window.close();
              <\/script>
            </body>
            </html>`;
        } else if (fileType === 'application/pdf') {
          // For PDFs, render with pdf.js and apply specifications
          content = `<!DOCTYPE html>
            <html>
            <head>
              <title>QuickPrint - ${fileName}</title>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                ${pageCSS}
                body { 
                  background: #525659; 
                  padding: 20px;
                  -webkit-user-select: none;
                  user-select: none;
                }
                .pages {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 20px;
                }
                canvas {
                  background: white;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                  pointer-events: none;
                  ${!isColor ? 'filter: grayscale(100%);' : ''}
                }
                .page-info {
                  color: white;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                  margin-bottom: 5px;
                }
                @media print {
                  body { background: white; padding: 0; }
                  .pages { gap: 0; }
                  canvas { 
                    box-shadow: none; 
                    page-break-after: always;
                    max-width: 100%;
                    height: auto !important;
                  }
                  canvas:last-child { page-break-after: auto; }
                  .page-info { display: none; }
                }
              </style>
              ${securityScript}
            </head>
            <body oncontextmenu="return false;">
              <div class="pages" id="pages"></div>
              <script>
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                
                // Parse page range
                function parsePageRange(rangeStr, totalPages) {
                  if (!rangeStr || rangeStr.trim() === '') {
                    return Array.from({length: totalPages}, (_, i) => i + 1);
                  }
                  const pages = new Set();
                  rangeStr.split(',').forEach(part => {
                    part = part.trim();
                    if (part.includes('-')) {
                      const [start, end] = part.split('-').map(Number);
                      for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                        pages.add(i);
                      }
                    } else {
                      const num = parseInt(part);
                      if (num >= 1 && num <= totalPages) pages.add(num);
                    }
                  });
                  return Array.from(pages).sort((a, b) => a - b);
                }
                
                async function renderPDF() {
                  try {
                    const pdfData = atob('${base64Data.split(',')[1]}');
                    const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
                    const container = document.getElementById('pages');
                    const pageRange = '${pageRange}';
                    const pagesToPrint = parsePageRange(pageRange, pdf.numPages);
                    
                    for (const pageNum of pagesToPrint) {
                      const page = await pdf.getPage(pageNum);
                      const scale = 1.5;
                      const viewport = page.getViewport({scale});
                      
                      const pageInfo = document.createElement('div');
                      pageInfo.className = 'page-info';
                      pageInfo.textContent = 'Page ' + pageNum + ' of ' + pdf.numPages;
                      container.appendChild(pageInfo);
                      
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
                    window.onafterprint = () => window.close();
                  } catch (err) {
                    console.error('PDF render error:', err);
                    document.body.innerHTML = '<h2 style="color:white;text-align:center;margin-top:50px;">Error loading PDF</h2>';
                  }
                }
                renderPDF();
              <\/script>
            </body>
            </html>`;
        } else {
          // For other document types (DOCX, etc.) - show message
          content = `<!DOCTYPE html>
            <html>
            <head><title>QuickPrint</title></head>
            <body style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
              <h2>Document Preview</h2>
              <p>File: ${fileName}</p>
              <p style="color:#666;">This file type requires conversion. Please ask the customer to send as PDF for best results.</p>
              <p style="margin-top:20px;">
                <a href="${base64Data}" download="${fileName}" style="color:blue;">Download Original File</a>
              </p>
            </body>
            </html>`;
        }

        printWindow.document.write(content);
        printWindow.document.close();
      };
      
      reader.readAsDataURL(fileBlob);
      setTimeout(resolve, 120000); // 2 minute timeout
    });
  };

  const deleteFileFromSupabase = async (fileUrl) => {
    try {
      let filePath = '';
      if (fileUrl.includes('/print-jobs/')) {
        filePath = fileUrl.split('/print-jobs/')[1].split('?')[0];
      }
      if (filePath) {
        await supabase.storage.from('print-jobs').remove([decodeURIComponent(filePath)]);
      }
    } catch (e) { console.error(e); }
  };

  const updateMerchantStats = async (cost, pages) => {
    await updateDoc(doc(db, 'users', merchantId), {
      'stats.totalPrints': increment(pages),
      'stats.totalEarnings': increment(cost),
      'stats.todayPrints': increment(pages),
      'stats.todayEarnings': increment(cost),
      'stats.monthPrints': increment(pages),
      'stats.monthEarnings': increment(cost),
    });
  };

  const handleAcceptJob = async (job) => {
    setProcessingJobId(job.id);
    setPrintProgress({ current: 0, total: job.files.length, fileName: '' });

    try {
      await updatePrintJob(job.id, { status: 'processing' });
      let totalCost = 0, totalPages = 0;

      for (let i = 0; i < job.files.length; i++) {
        const file = job.files[i];
        setPrintProgress({ current: i + 1, total: job.files.length, fileName: file.name });
        
        const response = await fetch(file.fileUrl);
        const fileBlob = await response.blob();
        const copies = parseInt(file.specs?.copies, 10) || 1;
        
        for (let c = 0; c < copies; c++) await printFilePrivately(fileBlob, file.name, file.specs);

        const price = file.specs?.color === 'color' ? pricePerPageColor : pricePerPageBW;
        totalCost += copies * price;
        totalPages += copies;
        await deleteFileFromSupabase(file.fileUrl);
      }

      await updateMerchantStats(totalCost, totalPages);
      await updatePrintJob(job.id, {
        status: 'awaitingPayment',
        cost: totalCost,
        merchantUpiId: userData?.upiId || '',
        merchantName: userData?.shopName || 'Merchant',
      });
    } catch (e) {
      alert(`Error: ${e.message}`);
      await updatePrintJob(job.id, { status: 'pending' });
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleCompleteJob = async (jobId) => await updatePrintJob(jobId, { status: 'completed' });
  const handleDeleteJob = async (jobId) => { if (window.confirm('Delete?')) await deletePrintJob(jobId); };

  const pendingJobsList = jobs?.filter(j => ['pending', 'processing'].includes(j.status)) || [];
  const awaitingPaymentJobs = jobs?.filter(j => j.status === 'awaitingPayment') || [];
  const completedJobs = jobs?.filter(j => ['paid', 'completed'].includes(j.status)) || [];

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Welcome, {userData?.ownerName || 'Merchant'}! 👋</Typography>
      
      <DashboardStats stats={userData?.stats} pendingJobs={pendingJobs} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 3 }}>
        <MerchantProfile merchantId={merchantId} />
        <Box>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
              <Tab label={`Pending (${pendingJobsList.length})`} />
              <Tab label={`Awaiting Payment (${awaitingPaymentJobs.length})`} />
              <Tab label={`Completed (${completedJobs.length})`} />
            </Tabs>
          </Paper>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <PrintQueue
            jobs={activeTab === 0 ? pendingJobsList : activeTab === 1 ? awaitingPaymentJobs : completedJobs}
            onAcceptJob={handleAcceptJob}
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
            processingJobId={processingJobId}
          />
        </Box>
      </Box>

      <Dialog open={!!processingJobId} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Processing Print Job</Typography>
          <Typography variant="body2" color="text.secondary">{printProgress.fileName}</Typography>
          <LinearProgress variant="determinate" value={printProgress.total ? (printProgress.current / printProgress.total) * 100 : 0} sx={{ mt: 2 }} />
        </DialogContent>
      </Dialog>
    </Container>
  );
}