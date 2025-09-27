// src/pages/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, TextField, Alert, CircularProgress, Link as MuiLink } from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';
import { signInUser, signUpUser } from '../firebase/auth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const scannerRef = useRef(null);
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to initialize and render the scanner
  const startScanner = () => {
    if (scannerRef.current) return; // Prevent re-initialization
    const scanner = new Html5QrcodeScanner(
      'reader',
      { qrbox: { width: 250, height: 250 }, fps: 5 },
      false
    );

    const onScanSuccess = (decodedText) => {
      scanner.clear().catch(err => console.error("Scanner clear failed", err));
      scannerRef.current = null;
      navigate(decodedText); // decodedText is the full URL from the QR code
    };
    scanner.render(onScanSuccess, () => {});
    scannerRef.current = scanner;
  };

  // When the user is logged in, show the scanner
  useEffect(() => {
    if (user && !loading) {
      startScanner();
    }
    // Cleanup scanner when component unmounts or user logs out
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner clear failed on cleanup", err));
        scannerRef.current = null;
      }
    };
  }, [user, loading]);

  const handleAuthAction = async (event) => {
    event.preventDefault();
    setError(null);
    setIsProcessing(true);
    try {
      if (showLogin) {
        await signInUser(email, password);
      } else {
        await signUpUser(email, password);
        alert('Sign up successful! You are now logged in.');
      }
      // On success, the useAuth hook will update, and the useEffect will show the scanner
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <Container sx={{mt: 4, textAlign: 'center'}}><CircularProgress /></Container>;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
      {user ? (
        // LOGGED-IN VIEW
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Ready to Print?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Scan a merchant's QR code to begin.
          </Typography>
          <Box id="reader" width="100%" />
        </Paper>
      ) : (
        // LOGGED-OUT VIEW
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h5">
            {showLogin ? 'User Login' : 'User Sign Up'}
          </Typography>
          <Box component="form" onSubmit={handleAuthAction} noValidate sx={{ mt: 1 }}>
            <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isProcessing}>
              {isProcessing ? <CircularProgress size={24} /> : (showLogin ? 'Login' : 'Sign Up')}
            </Button>
            <MuiLink component="button" variant="body2" onClick={() => setShowLogin(!showLogin)}>
              {showLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </MuiLink>
          </Box>
        </Paper>
      )}
    </Container>
  );
}