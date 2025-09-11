import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import HistoryIcon from '@mui/icons-material/History';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Html5QrcodeScanner } from 'html5-qrcode';

// This is mock data. Later, you can fetch this from local storage or your database.
const recentShops = [
  { id: 1, name: 'ABC Print Hub', location: 'Main Street' },
  { id: 2, name: 'Quick Prints & Co.', location: 'Downtown' },
  { id: 3, name: 'The Copy Corner', location: 'College Ave' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  useEffect(() => {
    // Ensure the scanner is only initialized once
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        'reader', // ID of the element to render the scanner in
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 5, // Scans per second
        },
        false // verbose
      );

      const onScanSuccess = (decodedText, decodedResult) => {
        // Stop scanning after a successful scan
        scanner.clear().catch(error => {
          console.error("Failed to clear html5-qrcode-scanner on success.", error);
        });
        console.log(`Scanned merchant ID: ${decodedText}`);
        navigate(`/print?merchantId=${decodedText}`);
      };

      const onScanFailure = (error) => {
        // This callback is called frequently, it's best to ignore it.
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    // Cleanup function to stop the scanner when the component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5-qrcode-scanner on cleanup.", error);
        });
        scannerRef.current = null;
      }
    };
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
      {/* QR Code Scanner Section */}
      <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Ready to Print?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Scan a merchant's QR code to begin.
        </Typography>
        {/* The QR Scanner will be rendered inside this div */}
        <Box id="reader" width="100%" />
      </Paper>

      {/* Recent Shops History Section */}
      <Box>
        <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <HistoryIcon sx={{ mr: 1 }} /> Recent Shops
        </Typography>
        <Paper elevation={2}>
          <List>
            {recentShops.map((shop, index) => (
              <React.Fragment key={shop.id}>
                <ListItem
                  button
                  onClick={() => navigate(`/print?merchantId=${shop.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <ListItemIcon>
                    <StorefrontIcon />
                  </ListItemIcon>
                  <ListItemText primary={shop.name} secondary={shop.location} />
                </ListItem>
                {index < recentShops.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}
