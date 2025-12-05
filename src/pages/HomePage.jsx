// src/pages/HomePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PrintIcon from '@mui/icons-material/Print';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  // If merchant is logged in, redirect to dashboard
  React.useEffect(() => {
    if (user && userData?.role === 'merchant') {
      navigate('/merchant/dashboard', { replace: true });
    }
  }, [user, userData, navigate]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
      {/* Hero Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <QrCodeScannerIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          QuickPrint
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Fast, Secure & Private Printing
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Scan a merchant's QR code to instantly upload and print your documents.
          <br />
          <strong>No login required!</strong>
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/merchant/login')}
          sx={{ px: 4, py: 1.5 }}
        >
          Merchant Login
        </Button>
      </Paper>

      {/* Features Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        How It Works
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <QrCodeScannerIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>1. Scan QR</Typography>
          <Typography variant="body2" color="text.secondary">
            Scan the merchant's QR code with your phone camera
          </Typography>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <PrintIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>2. Upload & Print</Typography>
          <Typography variant="body2" color="text.secondary">
            Select your files and customize print settings
          </Typography>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>3. Pay & Collect</Typography>
          <Typography variant="body2" color="text.secondary">
            Pay via UPI and collect your printouts instantly
          </Typography>
        </Paper>
      </Box>

      {/* Privacy Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <SecurityIcon />
          <Typography variant="h6">Privacy First</Typography>
        </Box>
        <Typography variant="body2">
          Your files are automatically deleted after printing. No account needed, no data stored.
        </Typography>
      </Paper>
    </Container>
  );
}