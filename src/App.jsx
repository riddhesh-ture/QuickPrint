// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

// Pages
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import MerchantAnalyticsPage from './pages/MerchantAnalyticsPage';
import MerchantSettingsPage from './pages/MerchantSettingsPage';

// Layout
import MerchantLayout from './components/Layout/MerchantLayout';

// Protected route for MERCHANTS only
const MerchantProtectedRoute = () => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!user || userData?.role !== 'merchant') {
    return <Navigate to="/merchant/login" replace />;
  }
  
  return <Outlet />;
};

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/print" element={<UserPrintPage />} />
      <Route path="/merchant/login" element={<LoginPage />} />
      <Route path="/merchant/signup" element={<SignupPage />} />

      {/* Protected Merchant Routes with Layout */}
      <Route element={<MerchantProtectedRoute />}>
        <Route element={<MerchantLayout />}>
          <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
          <Route path="/merchant/analytics" element={<MerchantAnalyticsPage />} />
          <Route path="/merchant/settings" element={<MerchantSettingsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}