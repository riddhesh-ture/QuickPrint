// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { signOutUser } from './firebase/auth';
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import { AppBar, Toolbar, Typography, Button, Box, CircularProgress } from '@mui/material';

// --- Protected route for MERCHANTS only ---
const MerchantProtectedRoute = () => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }
  if (!user || userData?.role !== 'merchant') {
    return <Navigate to="/merchant/login" replace />;
  }
  return <Outlet context={{ merchantId: user.uid }} />;
};

const Layout = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            QuickPrint
          </Typography>
          {user && userData?.role === 'merchant' ? (
            <Box>
              <Button color="inherit" onClick={() => navigate('/merchant/dashboard')}>
                Dashboard
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          ) : (
            <Box>
              <Button color="inherit" onClick={() => navigate('/merchant/login')}>
                Merchant Login
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* --- Public Routes --- */}
        <Route index element={<HomePage />} />
        <Route path="/print" element={<UserPrintPage />} />
        <Route path="/merchant/login" element={<LoginPage />} />
        <Route path="/merchant/signup" element={<SignupPage />} />

        {/* --- Protected Merchant Routes --- */}
        <Route element={<MerchantProtectedRoute />}>
          <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
        </Route>

        {/* --- Fallback Route --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}