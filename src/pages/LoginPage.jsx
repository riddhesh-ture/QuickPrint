// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box, Link as MuiLink, Alert, CircularProgress } from '@mui/material';
import { signInMerchant } from '../firebase/auth';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // If a merchant is already logged in, redirect them immediately.
  useEffect(() => {
    if (!loading && user && userData?.role === 'merchant') {
      navigate('/merchant/dashboard', { replace: true });
    }
  }, [user, userData, loading, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setIsProcessing(true);
    try {
      await signInMerchant(email, password);
      // On success, the AuthContext will update, and the useEffect above will trigger the redirect.
    } catch (err) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Merchant Login
        </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isProcessing}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isProcessing}
          />
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1 }}>
            <MuiLink component="button" type="button" variant="body2" onClick={() => navigate('/merchant/signup')} disabled={isProcessing}>
              Don't have an account? Sign Up
            </MuiLink>
            <MuiLink component="button" type="button" variant="body2" onClick={() => navigate('/')} disabled={isProcessing}>
              Go to User Area
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}