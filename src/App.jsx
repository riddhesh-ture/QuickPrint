// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { signOutUser } from './firebase/auth'; // Using a general sign out
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

// Protected route for MERCHANTS
const MerchantProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/merchant/login" replace />;
  return <Outlet context={{ merchantId: user.uid }} />;
};

// Protected route for USERS
const UserProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />; // Redirect to HomePage to log in
  return <Outlet context={{ userId: user.uid }} />;
};

const Layout = () => {
  const { user } = useAuth();
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
          {user ? (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Box>
              <Button color="inherit" onClick={() => navigate('/')}>
                User Area
              </Button>
              <Button color="inherit" onClick={() => navigate('/merchant/login')}>
                Merchant Area
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
        <Route path="/merchant/login" element={<LoginPage />} />
        <Route path="/merchant/signup" element={<SignupPage />} />

        {/* --- Protected User Route --- */}
        <Route element={<UserProtectedRoute />}>
          <Route path="/print" element={<UserPrintPage />} />
        </Route>
        
        {/* --- Protected Merchant Route --- */}
        <Route path="/merchant" element={<MerchantProtectedRoute />}>
          <Route path="dashboard" element={<MerchantDashboardPage />} />
        </Route>

        {/* --- Fallback Route --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}