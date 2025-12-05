// src/components/MerchantView/StatsCard.jsx
import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

export default function StatsCard({ title, value, icon, color = 'primary' }) {
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.lighter`, color: `${color}.main` }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h5" fontWeight="bold">{value}</Typography>
      </Box>
    </Paper>
  );
}
