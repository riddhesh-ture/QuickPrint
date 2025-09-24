// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { signOutMerchant } from './firebase/auth';

// Import all your page components
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

// A component to protect merchant routes
const ProtectedRoute = () => {
  const { user, loading } = useAuth(); // Use user and loading state

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user) {
    return <Navigate to="/merchant/login" replace />;
  }

  // Pass merchantId as context
  return <Outlet context={{ merchantId: user.uid }} />;
};

const Layout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOutMerchant();
    navigate('/merchant/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QuickPrint
          </Typography>
          {user ? (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Button color="inherit" onClick={() => navigate('/merchant/login')}>
              Merchant Area
            </Button>
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
        {/* --- Public User Routes --- */}
        <Route index element={<HomePage />} />
        <Route path="/print" element={<UserPrintPage />} />

        {/* --- Merchant Authentication Routes --- */}
        <Route path="/merchant/login" element={<LoginPage />} />
        <Route path="/merchant/signup" element={<SignupPage />} />

        {/* --- Protected Merchant Routes --- */}
        <Route path="/merchant" element={<ProtectedRoute />}>
          <Route path="dashboard" element={<MerchantDashboardPage />} />
        </Route>

        {/* --- Fallback Route --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}