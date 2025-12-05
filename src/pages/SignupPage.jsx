// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  Stepper, Step, StepLabel, InputAdornment, Divider
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaymentIcon from '@mui/icons-material/Payment';
import { signUpWithEmail } from '../firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

const steps = ['Account', 'Shop Details', 'Payment'];

export default function SignupPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Shop Details
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 3: Payment & Pricing
  const [upiId, setUpiId] = useState('');
  const [pricePerPageBW, setPricePerPageBW] = useState('2');
  const [pricePerPageColor, setPricePerPageColor] = useState('5');

  const handleNext = () => {
    setError(null);
    
    // Validate current step
    if (activeStep === 0) {
      if (!email || !password || !confirmPassword) {
        setError('Please fill all fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    } else if (activeStep === 1) {
      if (!shopName || !ownerName || !phone || !address || !city || !pincode) {
        setError('Please fill all shop details');
        return;
      }
      if (phone.length !== 10) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!upiId) {
      setError('Please enter your UPI ID for receiving payments');
      return;
    }

    if (!upiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g., yourname@upi)');
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth account
      const userCredential = await signUpWithEmail(email, password);
      const user = userCredential.user;

      // Create merchant profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        role: 'merchant',
        shopName: shopName,
        ownerName: ownerName,
        phone: phone,
        address: address,
        city: city,
        pincode: pincode,
        upiId: upiId,
        pricePerPageBW: parseFloat(pricePerPageBW) || 2,
        pricePerPageColor: parseFloat(pricePerPageColor) || 5,
        createdAt: serverTimestamp(),
        stats: {
          totalPrints: 0,
          totalEarnings: 0,
          todayPrints: 0,
          todayEarnings: 0,
          monthPrints: 0,
          monthEarnings: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          lastResetMonth: new Date().toISOString().slice(0, 7),
        }
      });

      navigate('/merchant/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Create Your Account
            </Typography>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              helperText="At least 6 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              <StorefrontIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Shop Details
            </Typography>
            <TextField
              label="Shop Name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Krishna Xerox & Printing"
            />
            <TextField
              label="Owner Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>,
              }}
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
              Shop Address
            </Typography>
            <TextField
              label="Street Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fullWidth
                required
              />
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Payment & Pricing
            </Typography>
            <Alert severity="info" sx={{ mb: 1 }}>
              Customers will pay directly to your UPI ID. We don't charge any commission!
            </Alert>
            <TextField
              label="Your UPI ID"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value.toLowerCase())}
              fullWidth
              required
              placeholder="yourname@upi"
              helperText="This is where customers will send payments"
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Set Your Printing Prices
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price per page (B&W)"
                value={pricePerPageBW}
                onChange={(e) => setPricePerPageBW(e.target.value.replace(/\D/g, ''))}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
              <TextField
                label="Price per page (Color)"
                value={pricePerPageColor}
                onChange={(e) => setPricePerPageColor(e.target.value.replace(/\D/g, ''))}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <StorefrontIcon sx={{ fontSize: 50, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Merchant Signup
          </Typography>
          <Typography color="text.secondary">
            Join QuickPrint and start receiving print orders
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </form>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" align="center" color="text.secondary">
          Already have an account?{' '}
          <Link to="/merchant/login" style={{ color: 'inherit' }}>
            Login here
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}