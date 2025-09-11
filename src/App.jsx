import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UserPrintPage from './pages/UserPrintPage';
import MerchantDashboardPage from './pages/MerchantDashboardPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/common/AppLayout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/print" element={<UserPrintPage />} />
          <Route path="/dashboard" element={<MerchantDashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
