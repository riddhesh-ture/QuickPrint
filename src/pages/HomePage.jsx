// src/pages/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, IconButton, Alert } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PrintIcon from '@mui/icons-material/Print';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);

  // If merchant is logged in, redirect to dashboard
  useEffect(() => {
    if (user && userData?.role === 'merchant') {
      navigate('/merchant/dashboard', { replace: true });
    }
  }, [user, userData, navigate]);

  // Start QR Scanner
  const startScanner = async () => {
    setScanError(null);
    
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("QR Code scanned:", decodedText);
          stopScanner();
          
          // Check if it's a valid QuickPrint URL
          if (decodedText.includes('/print?merchantId=') || decodedText.includes('merchantId=')) {
            try {
              const url = new URL(decodedText);
              const merchantId = url.searchParams.get('merchantId');
              if (merchantId) {
                navigate(`/print?merchantId=${merchantId}`);
              } else {
                setScanError('Invalid QR code. Please scan a merchant QR code.');
              }
            } catch {
              const match = decodedText.match(/merchantId=([^&]+)/);
              if (match) {
                navigate(`/print?merchantId=${match[1]}`);
              } else {
                setScanError('Invalid QR code format.');
              }
            }
          } else {
            setScanError('This QR code is not a valid QuickPrint merchant code.');
          }
        },
        (errorMessage) => {
          // Ignore continuous scan errors
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setScanError('Could not access camera. Please allow camera permissions.');
    }
  };

  // Stop QR Scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  // Handle dialog open
  const handleOpenScanner = () => {
    setScannerOpen(true);
    setScanError(null);
    setTimeout(() => {
      startScanner();
    }, 500);
  };

  // Handle dialog close
  const handleCloseScanner = () => {
    stopScanner();
    setScannerOpen(false);
    setScanError(null);
  };

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
        
        {/* Scan QR Button */}
        <Button
          variant="contained"
          size="large"
          onClick={handleOpenScanner}
          startIcon={<QrCodeScannerIcon />}
          sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
        >
          Scan QR Code
        </Button>

        {/* Merchant Login - Small link */}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/merchant/login')}
            startIcon={<StorefrontIcon />}
            sx={{ color: 'text.secondary' }}
          >
            Merchant Login
          </Button>
        </Box>
      </Paper>

      {/* QR Scanner Dialog */}
      <Dialog 
        open={scannerOpen} 
        onClose={handleCloseScanner}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon color="primary" />
            Scan Merchant QR Code
          </Box>
          <IconButton onClick={handleCloseScanner} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {scanError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {scanError}
            </Alert>
          )}
          
          {/* QR Scanner Container */}
          <Box 
            id="qr-reader" 
            sx={{ 
              width: '100%',
              minHeight: 300,
              bgcolor: '#000',
              borderRadius: 2,
              overflow: 'hidden'
            }} 
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Point your camera at the merchant's QR code
          </Typography>
        </DialogContent>
      </Dialog>

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
      <Paper sx={{ p: 3, mt: 4, mb: 4, bgcolor: 'success.light' }}>
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
