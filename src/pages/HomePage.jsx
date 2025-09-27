// src/pages/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, TextField, Alert, CircularProgress, Link as MuiLink, Button } from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';
import { signInUser, signUpUser, getUserData, signOutUser } from '../firebase/auth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const scannerRef = useRef(null);
  
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startScanner = () => {
    if (scannerRef.current) return;
    
    const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText) => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner clear failed", err));
        scannerRef.current = null;
      }
      try {
        const url = new URL(decodedText);
        navigate(`${url.pathname}${url.search}`);
      } catch (e) {
        console.error("Invalid QR code URL:", e);
        alert("Scanned QR code contains an invalid URL.");
      }
    };
    
    scanner.render(onScanSuccess, () => {});
  };

  useEffect(() => {
    if (user && userData?.role === 'user' && !loading) {
      startScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner clear failed on cleanup", err));
        scannerRef.current = null;
      }
    };
  }, [user, userData, loading]);

  const handleAuthAction = async (event) => {
    event.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (showLogin) {
        const userCredential = await signInUser(email, password);
        const data = await getUserData(userCredential.user.uid);
        
        if (data?.role === 'merchant') {
          await signOutUser();
          setError('This is a merchant account. Please use the "Merchant Area" login.');
        }
        
      } else {
        await signUpUser(email, password);
      }
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
      {user && userData?.role === 'user' ? (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Ready to Print?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Scan a merchant's QR code to begin.
          </Typography>
          <Box id="reader" width="100%" />
        </Paper>
      ) : user && userData?.role === 'merchant' ? (
        <Paper elevation={3} sx={{p: 4}}>
            <Typography variant="h6">You are logged in as a Merchant.</Typography>
            <Button variant="contained" sx={{mt: 2}} onClick={() => navigate('/merchant/dashboard')}>
                Go to Merchant Dashboard
            </Button>
        </Paper>
      ) : (
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
            
            {/* --- CRITICAL FIX HERE --- */}
            {/* Added type="button" to prevent the link from submitting the form */}
            <MuiLink component="button" type="button" variant="body2" onClick={() => setShowLogin(!showLogin)}>
              {showLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </MuiLink>
          </Box>
        </Paper>
      )}
    </Container>
  );
}