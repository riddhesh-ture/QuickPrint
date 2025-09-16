import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { QRCodeSVG as QRCode } from 'qrcode.react'; // Corrected import

export default function MerchantProfile({ merchantId }) {
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
        <QRCode value={printUrl} size={200} />
      </Box>
      <Typography variant="caption" display="block" sx={{ mt: 2, wordBreak: 'break-all' }}>
        URL: {printUrl}
      </Typography>
    </Paper>
  );
}