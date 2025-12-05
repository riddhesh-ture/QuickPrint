// src/components/MerchantView/DashboardStats.jsx
import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';

const StatCard = ({ title, value, subtitle, icon, color = 'primary.main', bgcolor = 'primary.light' }) => (
  <Paper 
    elevation={2} 
    sx={{ 
      p: 2.5, 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      borderLeft: 4,
      borderColor: color,
    }}
  >
    <Box 
      sx={{ 
        p: 1.5, 
        borderRadius: 2, 
        bgcolor: bgcolor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  </Paper>
);

export default function DashboardStats({ stats, pendingJobs = 0 }) {
  const today = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon color="primary" />
        Dashboard Overview
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {today}
        </Typography>
      </Typography>
      
      <Grid container spacing={2}>
        {/* Today's Stats */}
        <Grid item xs={6} md={3}>
          <StatCard
            title="Today's Prints"
            value={stats?.todayPrints || 0}
            icon={<TodayIcon sx={{ color: 'info.main' }} />}
            color="info.main"
            bgcolor="info.lighter"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Today's Earnings"
            value={`₹${stats?.todayEarnings || 0}`}
            icon={<AccountBalanceWalletIcon sx={{ color: 'success.main' }} />}
            color="success.main"
            bgcolor="success.lighter"
          />
        </Grid>
        
        {/* Monthly Stats */}
        <Grid item xs={6} md={3}>
          <StatCard
            title="This Month"
            value={stats?.monthPrints || 0}
            subtitle="prints"
            icon={<CalendarMonthIcon sx={{ color: 'warning.main' }} />}
            color="warning.main"
            bgcolor="warning.lighter"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Monthly Earnings"
            value={`₹${stats?.monthEarnings || 0}`}
            icon={<TrendingUpIcon sx={{ color: 'secondary.main' }} />}
            color="secondary.main"
            bgcolor="secondary.lighter"
          />
        </Grid>

        {/* All Time Stats */}
        <Grid item xs={6} md={3}>
          <StatCard
            title="Total Prints"
            value={stats?.totalPrints || 0}
            subtitle="all time"
            icon={<PrintIcon sx={{ color: 'primary.main' }} />}
            color="primary.main"
            bgcolor="primary.lighter"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Total Earnings"
            value={`₹${stats?.totalEarnings || 0}`}
            subtitle="all time"
            icon={<AccountBalanceWalletIcon sx={{ color: 'success.main' }} />}
            color="success.main"
            bgcolor="success.lighter"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Pending Jobs"
            value={pendingJobs}
            subtitle="waiting"
            icon={<PeopleIcon sx={{ color: 'error.main' }} />}
            color="error.main"
            bgcolor="error.lighter"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Avg per Day"
            value={`₹${stats?.totalPrints > 0 ? Math.round((stats?.totalEarnings || 0) / Math.max(1, stats?.totalPrints)) : 0}`}
            subtitle="per print"
            icon={<TrendingUpIcon sx={{ color: 'info.main' }} />}
            color="info.main"
            bgcolor="info.lighter"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
