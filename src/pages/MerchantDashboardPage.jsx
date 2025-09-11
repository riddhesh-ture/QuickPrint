import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import PrintQueue from '../components/MerchantView/PrintQueue';
import MerchantProfile from '../components/MerchantView/MerchantProfile';
import { useCollection } from '../hooks/useFirestore';

export default function MerchantDashboardPage() {
  // In a real app, you'd get the merchantId from your auth context.
  // For now, we'll hardcode it for demonstration.
  const merchantId = '1'; // IMPORTANT: Use the same ID from your recentShops mock data

  const { documents: jobs, error } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: merchantId,
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Merchant Dashboard
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 3fr' }, gap: 3 }}>
        <MerchantProfile merchantId={merchantId} />
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Incoming Print Jobs
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          <PrintQueue jobs={jobs} />
        </Box>
      </Box>
    </Container>
  );
}