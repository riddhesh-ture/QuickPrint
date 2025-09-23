// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'; // <--- ADDED useNavigate HERE
import { useAuth, signOutMerchant } from './firebase/auth';

// Import all your page components
import HomePage from './pages/HomePage'; // User scan page
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage'; // Merchant login
import SignupPage from './pages/SignupPage'; // Merchant signup
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

// A component to protect merchant routes
const ProtectedRoute = () => {
  const { isAuthenticated, merchantId } = useAuth(); // Use the auth hook

  if (!isAuthenticated) {
    return <Navigate to="/merchant/login" replace />;
  }

  // Pass merchantId as context or prop if needed by child routes
  return <Outlet context={{ merchantId }} />;
};

const Layout = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate(); // <-- This is now correctly defined

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
          {isAuthenticated && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
          {!isAuthenticated && (
            <Button color="inherit" onClick={() => navigate('/merchant/login')}>
              Merchant Area
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Outlet /> {/* Renders the current route's component */}
    </>
  );
};


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* --- Public User Routes --- */}
        <Route index element={<HomePage />} /> {/* User QR Scan page */}
        <Route path="/print" element={<UserPrintPage />} />

        {/* --- Merchant Authentication Routes --- */}
        <Route path="/merchant/login" element={<LoginPage />} />
        <Route path="/merchant/signup" element={<SignupPage />} />

        {/* --- Protected Merchant Routes --- */}
        <Route path="/merchant" element={<ProtectedRoute />}>
          <Route path="dashboard" element={<MerchantDashboardPage />} />
          {/* Add other protected merchant routes here */}
        </Route>

        {/* --- Fallback Route --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}