import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { QRCode } from 'qrcode.react';

export default function MerchantProfile({ merchantId }) {
  // This creates the URL the user will be sent to after scanning.
  // It dynamically gets the host (e.g., http://localhost:5173)
  const printUrl = `${window.location.origin}/print?merchantId=${merchantId}`;

  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Your QR Code
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Have customers scan this code to send you files.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        {/* The QR Code component */}
        <QRCode value={printUrl} size={200} />
      </Box>
      <Typography variant="caption" display="block" sx={{ mt: 2, wordBreak: 'break-all' }}>
        URL: {printUrl}
      </Typography>
    </Paper>
  );
}