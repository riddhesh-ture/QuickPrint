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
      const printWindow = window.open('', '_blank', 'width=800,height=600,menubar=no,toolbar=no');
      
      if (!printWindow) { alert('Please allow popups'); resolve(); return; }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        let content = '';
        
        if (fileType.startsWith('image/')) {
          content = `<!DOCTYPE html><html><head><title>Print</title>
            <style>*{margin:0}body{display:flex;justify-content:center;align-items:center;min-height:100vh;-webkit-user-select:none}
            img{max-width:100%;max-height:90vh;${specs?.color === 'bw' ? 'filter:grayscale(100%);' : ''}}</style>
            <script>document.addEventListener('contextmenu',e=>e.preventDefault());window.onload=()=>setTimeout(()=>window.print(),500);window.onafterprint=()=>window.close();<\/script>
            </head><body><img src="${base64Data}" /></body></html>`;
        } else {
          content = `<!DOCTYPE html><html><head><title>Print</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
            <style>*{margin:0}body{background:#525659;padding:20px}.pages{display:flex;flex-direction:column;align-items:center;gap:20px}canvas{background:white}</style>
            </head><body><div class="pages" id="p"></div>
            <script>pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            (async()=>{const d=atob('${base64Data.split(',')[1]}'),pdf=await pdfjsLib.getDocument({data:d}).promise;
            for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.5}),c=document.createElement('canvas');
            c.width=vp.width;c.height=vp.height;document.getElementById('p').appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
            setTimeout(()=>window.print(),1000);window.onafterprint=()=>window.close()})();<\/script></body></html>`;
        }
        printWindow.document.write(content);
        printWindow.document.close();
      };
      reader.readAsDataURL(fileBlob);
      setTimeout(resolve, 60000);
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