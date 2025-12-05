// src/pages/MerchantSettingsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, TextField, Button, Grid,
  Alert, Divider, InputAdornment, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import SaveIcon from '@mui/icons-material/Save';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentIcon from '@mui/icons-material/Payment';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function MerchantSettingsPage() {
  const { user, userData, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    upiId: '',
    pricePerPageBW: 2,
    pricePerPageColor: 5,
    autoAcceptJobs: false,
    notificationsEnabled: true,
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        shopName: userData.shopName || '',
        ownerName: userData.ownerName || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || '',
        pincode: userData.pincode || '',
        upiId: userData.upiId || '',
        pricePerPageBW: userData.pricePerPageBW || 2,
        pricePerPageColor: userData.pricePerPageColor || 5,
        autoAcceptJobs: userData.autoAcceptJobs || false,
        notificationsEnabled: userData.notificationsEnabled !== false,
      });
    }
  }, [userData]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const printUrl = `${window.location.origin}/print?merchantId=${user?.uid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(printUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('settings-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QuickPrint-QR-${formData.shopName || 'merchant'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading || !userData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Shop Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StorefrontIcon color="primary" />
              <Typography variant="h6">Shop Details</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Shop Name"
                  value={formData.shopName}
                  onChange={handleChange('shopName')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Owner Name"
                  value={formData.ownerName}
                  onChange={handleChange('ownerName')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  value={formData.city}
                  onChange={handleChange('city')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Pincode"
                  value={formData.pincode}
                  onChange={handleChange('pincode')}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <PaymentIcon color="primary" />
              <Typography variant="h6">Payment & Pricing</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="UPI ID"
                  value={formData.upiId}
                  onChange={handleChange('upiId')}
                  fullWidth
                  placeholder="yourname@upi"
                  helperText="Customers will pay directly to this UPI ID"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price per page (B&W)"
                  type="number"
                  value={formData.pricePerPageBW}
                  onChange={handleChange('pricePerPageBW')}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price per page (Color)"
                  type="number"
                  value={formData.pricePerPageColor}
                  onChange={handleChange('pricePerPageColor')}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Preferences */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Preferences</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.notificationsEnabled}
                  onChange={handleChange('notificationsEnabled')}
                />
              }
              label="Enable notifications for new print jobs"
            />
          </Paper>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>

        {/* QR Code Section */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', position: 'sticky', top: 80 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
              <QrCode2Icon color="primary" />
              <Typography variant="h6">Your QR Code</Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Display this QR code in your shop for customers to scan
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 2, mb: 2 }}>
              <QRCodeSVG
                id="settings-qr-code"
                value={printUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </Box>
            
            <Typography variant="subtitle1" fontWeight="bold">
              {formData.shopName || 'Your Shop'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Scan to print instantly
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="contained"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleDownloadQR}
              sx={{ mb: 1 }}
            >
              Download QR Code
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyLink}
            >
              {copied ? '✓ Copied!' : 'Copy Print Link'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
