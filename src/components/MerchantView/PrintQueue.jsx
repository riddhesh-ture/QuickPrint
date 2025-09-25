// src/components/MerchantView/PrintQueue.jsx
import React from 'react';
import { Box, Typography, Paper, List, CircularProgress } from '@mui/material';
import JobItem from './JobItem';

export default function PrintQueue({ jobs, onAcceptJob, onCompleteJob, onDeleteJob }) {
  if (!jobs) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (jobs.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No pending print jobs.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2}>
      <List sx={{ p: 0 }}>
        {jobs.map((job) => (
          <JobItem
            key={job.id}
            job={job}
            onAcceptJob={onAcceptJob}
            onCompleteJob={onCompleteJob}
            onDeleteJob={onDeleteJob}
          />
        ))}
      </List>
    </Paper>
  );
}