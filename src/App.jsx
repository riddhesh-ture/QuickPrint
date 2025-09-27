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
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

// Protected route for MERCHANTS
const MerchantProtectedRoute = () => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div>Loading...</div>;

  // Must be a logged-in user AND have the 'merchant' role
  if (user && userData?.role === 'merchant') {
    return <Outlet context={{ merchantId: user.uid }} />;
  }
  // If logged in but not a merchant, send to user page. If not logged in, send to merchant login.
  return <Navigate to={user ? '/' : '/merchant/login'} replace />;
};

// Protected route for USERS
const UserProtectedRoute = () => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  
  // Must be a logged-in user AND have the 'user' role
  if (user && userData?.role === 'user') {
    return <Outlet />;
  }
  // If logged in but not a user, send to merchant page. If not logged in, send to user login.
  return <Navigate to={user ? '/merchant/dashboard' : '/'} replace />;
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