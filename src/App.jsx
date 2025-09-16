// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Import all your page components
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import LoginPage from './pages/LoginPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';

// A component to protect merchant routes
const ProtectedRoute = () => {
  // For this example, we'll use localStorage to simulate an auth state.
  // In a real app, you would use a proper Auth Context.
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  return isAuthenticated ? <Outlet /> : <Navigate to="/merchant/login" replace />;
};

export default function App() {
  return (
    <Routes>
      {/* --- User Facing Routes --- */}
      <Route path="/" element={<HomePage />} />
      <Route path="/print" element={<UserPrintPage />} />

      {/* --- Merchant Facing Routes --- */}
      <Route path="/merchant/login" element={<LoginPage />} />
      <Route path="/merchant/dashboard" element={<ProtectedRoute />}>
        {/* This nested route will only render if the user is authenticated */}
        <Route index element={<MerchantDashboardPage />} />
      </Route>

      {/* --- Fallback Route --- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}