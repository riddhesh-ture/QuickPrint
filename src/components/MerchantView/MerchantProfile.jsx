import React, { useState } from 'react';
import { Paper, Typography, Box, Button, Divider, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import StorefrontIcon from '@mui/icons-material/Storefront';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaymentIcon from '@mui/icons-material/Payment';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firestore';

export default function MerchantProfile({ merchantId }) {
  const { userData } = useAuth();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Generate the print URL for customers
  const printUrl = `${window.location.origin}/print?merchantId=${merchantId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(printUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('merchant-qr-code');
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
      downloadLink.download = `QuickPrint-QR-${userData?.shopName || 'merchant'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleEditOpen = () => {
    setEditData({
      shopName: userData?.shopName || '',
      phone: userData?.phone || '',
      address: userData?.address || '',
      upiId: userData?.upiId || '',
      pricePerPageBW: userData?.pricePerPageBW || 2,
      pricePerPageColor: userData?.pricePerPageColor || 5,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', merchantId), editData);
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorefrontIcon color="primary" />
            <Typography variant="h6">Your Shop</Typography>
          </Box>
          <IconButton size="small" onClick={handleEditOpen}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {userData?.shopName || 'Your Shop Name'}
        </Typography>
        
        <Chip 
          label={userData?.ownerName || 'Owner'} 
          size="small" 
          variant="outlined" 
          sx={{ mb: 2 }} 
        />

        <Divider sx={{ my: 2 }} />

        {/* Contact Info */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PhoneIcon fontSize="small" color="action" />
            <Typography variant="body2">+91 {userData?.phone || 'N/A'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {userData?.address || 'Address not set'}
              {userData?.city && `, ${userData.city}`}
              {userData?.pincode && ` - ${userData.pincode}`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentIcon fontSize="small" color="action" />
            <Typography variant="body2">{userData?.upiId || 'UPI not set'}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Pricing */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Your Pricing
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`B&W: ₹${userData?.pricePerPageBW || 2}/page`} size="small" />
          <Chip label={`Color: ₹${userData?.pricePerPageColor || 5}/page`} size="small" color="primary" />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* QR Code Section */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Customer QR Code
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            p: 2, 
            bgcolor: 'grey.100', 
            borderRadius: 2,
            cursor: 'pointer',
            mb: 2
          }}
          onClick={() => setQrDialogOpen(true)}
        >
          <QRCodeSVG value={printUrl} size={120} />
        </Box>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<QrCode2Icon />}
          onClick={() => setQrDialogOpen(true)}
          sx={{ mb: 1 }}
        >
          View Large QR
        </Button>
        
        <Button
          variant="text"
          fullWidth
          startIcon={copied ? null : <ContentCopyIcon />}
          onClick={handleCopyLink}
          size="small"
        >
          {copied ? '✓ Link Copied!' : 'Copy Print Link'}
        </Button>
      </Paper>

      {/* Large QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
        <DialogTitle>Your QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Display this QR code in your shop for customers to scan
          </Typography>
          <Box sx={{ p: 3, bgcolor: 'white', display: 'inline-block', borderRadius: 2 }}>
            <QRCodeSVG 
              id="merchant-qr-code"
              value={printUrl} 
              size={280}
              level="H"
              includeMargin={true}
            />
          </Box>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {userData?.shopName}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Scan to print instantly
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            onClick={handleDownloadQR}
          >
            Download QR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Shop Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Shop Name"
              value={editData.shopName}
              onChange={(e) => setEditData({ ...editData, shopName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="UPI ID"
              value={editData.upiId}
              onChange={(e) => setEditData({ ...editData, upiId: e.target.value })}
              fullWidth
              helperText="Customers will pay to this UPI ID"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="B&W Price/Page"
                type="number"
                value={editData.pricePerPageBW}
                onChange={(e) => setEditData({ ...editData, pricePerPageBW: parseFloat(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Color Price/Page"
                type="number"
                value={editData.pricePerPageColor}
                onChange={(e) => setEditData({ ...editData, pricePerPageColor: parseFloat(e.target.value) })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}