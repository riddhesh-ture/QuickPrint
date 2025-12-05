// src/pages/MerchantDashboardPage.jsx
import React, { useState } from 'react';
import {
  Container, Typography, Box, Alert, CircularProgress, Dialog, DialogContent,
  LinearProgress, Tabs, Tab, Paper, Chip, Card, CardContent, Grid, IconButton,
  Tooltip, Fade, Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PrintQueue from '../components/MerchantView/PrintQueue';
import { useCollection } from '../hooks/useFirestore';
import { updatePrintJob, deletePrintJob, db } from '../firebase/firestore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { securePrint } from '../utils/securePrint';
import { getFileCategory } from '../utils/fileValidation';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TodayIcon from '@mui/icons-material/Today';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SecurityIcon from '@mui/icons-material/Security';

const QuickStatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%', borderTop: 3, borderColor: `${color}.main` }}>
    <CardContent sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.lighter`, color: `${color}.main` }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function MerchantDashboardPage() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [processingJobId, setProcessingJobId] = useState(null);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0, fileName: '', status: '' });
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  React.useEffect(() => {
    if (!loading && userData && userData.role !== 'merchant') {
      navigate('/', { replace: true });
    }
  }, [user, userData, loading, navigate]);

  const merchantId = user?.uid;
  const merchantName = userData?.shopName || 'QuickPrint';
  const pricePerPageBW = userData?.pricePerPageBW || 2;
  const pricePerPageColor = userData?.pricePerPageColor || 5;

  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  if (loading || !userData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (userData.role !== 'merchant') return null;

  const pendingJobs = jobs?.filter(j => j.status === 'pending') || [];
  const processingJobs = jobs?.filter(j => j.status === 'processing') || [];
  const awaitingPaymentJobs = jobs?.filter(j => j.status === 'awaitingPayment') || [];
  const completedJobs = jobs?.filter(j => ['paid', 'completed'].includes(j.status)) || [];

  // Securely delete file from Supabase after printing
  const deleteFileFromSupabase = async (fileUrl) => {
    try {
      if (!fileUrl) return;
      
      let filePath = '';
      if (fileUrl.includes('/print-jobs/')) {
        filePath = fileUrl.split('/print-jobs/')[1].split('?')[0];
      }
      
      if (filePath) {
        const { error } = await supabase.storage
          .from('print-jobs')
          .remove([decodeURIComponent(filePath)]);
        
        if (error) {
          console.error('Error deleting file:', error);
        }
      }
    } catch (e) {
      console.error('Delete file error:', e);
    }
  };

  // Update merchant stats in Firestore
  const updateMerchantStats = async (cost, pages) => {
    try {
      await updateDoc(doc(db, 'users', merchantId), {
        'stats.totalPrints': increment(pages),
        'stats.totalEarnings': increment(cost),
        'stats.todayPrints': increment(pages),
        'stats.todayEarnings': increment(cost),
        'stats.monthPrints': increment(pages),
        'stats.monthEarnings': increment(cost),
      });
    } catch (e) {
      console.error('Stats update error:', e);
    }
  };

  // Handle accepting and printing a job
  const handleAcceptJob = async (job) => {
    setProcessingJobId(job.id);
    setPrintProgress({ current: 0, total: job.files.length, fileName: '', status: 'Starting...' });

    try {
      // Update status to processing
      await updatePrintJob(job.id, { status: 'processing' });
      
      let totalCost = 0;
      let totalPages = 0;
      const failedFiles = [];

      for (let i = 0; i < job.files.length; i++) {
        const file = job.files[i];
        setPrintProgress({
          current: i + 1,
          total: job.files.length,
          fileName: file.name,
          status: 'Downloading...'
        });

        try {
          // Fetch the file
          const response = await fetch(file.fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to download: ${response.status}`);
          }
          
          const fileBlob = await response.blob();
          const copies = parseInt(file.specs?.copies, 10) || 1;

          // Validate file type
          const fileCategory = getFileCategory({ name: file.name, type: fileBlob.type });
          if (fileCategory === 'unknown') {
            throw new Error('Unsupported file type');
          }

          setPrintProgress(prev => ({ ...prev, status: 'Printing...' }));

          // Print each copy securely
          for (let c = 0; c < copies; c++) {
            if (copies > 1) {
              setPrintProgress(prev => ({
                ...prev,
                status: `Printing copy ${c + 1} of ${copies}...`
              }));
            }
            
            await securePrint(fileBlob, file.name, file.specs, merchantName);
          }

          // Calculate cost
          const pricePerPage = file.specs?.color === 'color' ? pricePerPageColor : pricePerPageBW;
          const fileCost = copies * pricePerPage;
          totalCost += fileCost;
          totalPages += copies;

          // Delete file from storage after successful print
          setPrintProgress(prev => ({ ...prev, status: 'Cleaning up...' }));
          await deleteFileFromSupabase(file.fileUrl);

        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          failedFiles.push({ name: file.name, error: fileError.message });
        }
      }

      // Update stats
      if (totalPages > 0) {
        await updateMerchantStats(totalCost, totalPages);
      }

      // Update job status
      if (failedFiles.length === 0) {
        await updatePrintJob(job.id, {
          status: 'awaitingPayment',
          cost: totalCost,
          totalPages,
          merchantUpiId: userData?.upiId || '',
          merchantName: merchantName,
          processedAt: new Date(),
        });
        
        setSnackbar({
          open: true,
          message: `Successfully printed ${totalPages} pages. Cost: ₹${totalCost}`,
          severity: 'success'
        });
      } else {
        // Some files failed
        await updatePrintJob(job.id, {
          status: 'awaitingPayment',
          cost: totalCost,
          totalPages,
          merchantUpiId: userData?.upiId || '',
          merchantName: merchantName,
          processedAt: new Date(),
          failedFiles: failedFiles,
        });
        
        setSnackbar({
          open: true,
          message: `Printed ${totalPages} pages with ${failedFiles.length} failed files`,
          severity: 'warning'
        });
      }

    } catch (e) {
      console.error('Job processing error:', e);
      setSnackbar({
        open: true,
        message: `Error: ${e.message}`,
        severity: 'error'
      });
      
      // Revert status on complete failure
      await updatePrintJob(job.id, { status: 'pending' });
    } finally {
      setProcessingJobId(null);
      setPrintProgress({ current: 0, total: 0, fileName: '', status: '' });
    }
  };

  const handleCompleteJob = async (jobId) => {
    try {
      await updatePrintJob(jobId, { status: 'completed', completedAt: new Date() });
      setSnackbar({ open: true, message: 'Job marked as completed', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update job', severity: 'error' });
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await deletePrintJob(jobId);
      setSnackbar({ open: true, message: 'Job deleted', severity: 'info' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to delete job', severity: 'error' });
    }
  };

  const getTabJobs = () => {
    switch (activeTab) {
      case 0: return [...pendingJobs, ...processingJobs];
      case 1: return awaitingPaymentJobs;
      case 2: return completedJobs;
      default: return [];
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Print Jobs
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <SecurityIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Secure printing enabled • Files auto-deleted after print
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => window.location.reload()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            title="Pending"
            value={pendingJobs.length}
            icon={<HourglassEmptyIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            title="Awaiting Payment"
            value={awaitingPaymentJobs.length}
            icon={<PaymentIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            title="Today's Prints"
            value={userData?.stats?.todayPrints || 0}
            icon={<TodayIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            title="Today's Earnings"
            value={`₹${userData?.stats?.todayEarnings || 0}`}
            icon={<AttachMoneyIcon />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ '& .MuiTab-root': { py: 2 } }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PrintIcon fontSize="small" />
                <span>Pending</span>
                {pendingJobs.length > 0 && (
                  <Chip label={pendingJobs.length} size="small" color="warning" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon fontSize="small" />
                <span>Awaiting Payment</span>
                {awaitingPaymentJobs.length > 0 && (
                  <Chip label={awaitingPaymentJobs.length} size="small" color="info" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon fontSize="small" />
                <span>Completed</span>
                <Chip label={completedJobs.length} size="small" color="success" variant="outlined" />
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Error Alert */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Print Queue */}
      <Fade in={true}>
        <Box>
          <PrintQueue
            jobs={getTabJobs()}
            onAcceptJob={handleAcceptJob}
            onCompleteJob={handleCompleteJob}
            onDeleteJob={handleDeleteJob}
            processingJobId={processingJobId}
          />
        </Box>
      </Fade>

      {/* Processing Dialog */}
      <Dialog open={!!processingJobId} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SecurityIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          <CircularProgress size={60} sx={{ mb: 2, display: 'block', mx: 'auto' }} />
          <Typography variant="h6" gutterBottom>
            Secure Print in Progress
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {printProgress.fileName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {printProgress.status}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            File {printProgress.current} of {printProgress.total}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={printProgress.total ? (printProgress.current / printProgress.total) * 100 : 0}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            🔒 Files are printed securely and deleted after completion
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}