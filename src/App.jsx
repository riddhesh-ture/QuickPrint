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

// A simpler protected route that just checks for authentication
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not loading and no user, redirect to the relevant login page
  const isMerchantRoute = window.location.pathname.startsWith('/merchant');
  if (!user) {
    return <Navigate to={isMerchantRoute ? "/merchant/login" : "/"} replace />;
  }

  // If user is logged in, render the child route
  return <Outlet />;
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

        {/* --- Protected Routes (for any logged-in user) --- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/print" element={<UserPrintPage />} />
          <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
        </Route>

        {/* --- Fallback Route --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}