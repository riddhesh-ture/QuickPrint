// src/components/MerchantView/JobItem.jsx
import React from 'react';
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';

export default function JobItem({ job, onAcceptJob, onCompleteJob, onDeleteJob }) {

  const renderActions = () => {
    switch (job.status) {
      case 'pending':
        return (
          <Button
            variant="contained"
            size="small"
            onClick={() => onAcceptJob(job)}
          >
            Accept & Start Transfer
          </Button>
        );
      case 'transferring':
        return (
           <Box sx={{ width: '100%', maxWidth: '200px' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Receiving File...</Typography>
                <LinearProgress />
           </Box>
        );
      case 'awaitingPayment':
        return <Chip label={`Awaiting Payment: ₹${job.cost.toFixed(2)}`} color="warning" size="small" />;
      case 'paid':
        return (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={() => onCompleteJob(job.id)}
          >
            Mark as Printed & Complete
          </Button>
        );
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      default:
        return null;
    }
  };

  return (
    <>
      <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
        <ListItemText
          primary={<Typography variant="subtitle1">User: {job.userName}</Typography>}
          secondary={`Received: ${new Date(job.createdAt?.seconds * 1000).toLocaleString()}`}
        />
        <Box sx={{ my: 1, pl: 2 }}>
          {job.files.map((file, index) => (
            <Typography key={index} variant="body2">
              - <strong>{file.name}</strong> (Copies: {file.specs.copies})
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          {renderActions()}
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => onDeleteJob(job.id)}
          >
            Delete
          </Button>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
}