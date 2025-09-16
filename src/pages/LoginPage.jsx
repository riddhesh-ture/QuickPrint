// src/pages/LoginPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box } from '@mui/material';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    // --- SIMULATED AUTHENTICATION ---
    // In a real app, you'd verify credentials with Firebase Auth here.
    // For now, we just set a flag in localStorage.
    localStorage.setItem('isAuthenticated', 'true');

    // Redirect to the protected dashboard
    navigate('/merchant/dashboard');
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Merchant Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};