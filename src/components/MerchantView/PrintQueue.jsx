import React from 'react';
import { Box, Typography, Paper, List, CircularProgress, Divider } from '@mui/material';
import JobItem from './JobItem'; // Import the new component

export default function PrintQueue({ jobs }) {
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
        {jobs.map((job, index) => (
          <React.Fragment key={job.id}>
            <JobItem job={job} />
            {index < jobs.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
}