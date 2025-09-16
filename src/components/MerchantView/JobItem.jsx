// src/components/MerchantView/JobItem.jsx
import React, { useState } from 'react';
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  TextField,
  Divider,
  Chip
} from '@mui/material';

// This component receives functions as props. It does NOT call Firestore directly.
export default function JobItem({ job, onCalculateCost, onCompleteJob, onDeleteJob }) {
  const [cost, setCost] = useState('');

  const renderActions = () => {
    switch (job.status) {
      case 'pending':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <TextField
              label="Cost ($)"
              size="small"
              variant="outlined"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              sx={{ width: '100px' }}
            />
            {/* This calls the function passed in via props */}
            <Button
              variant="contained"
              size="small"
              onClick={() => onCalculateCost(job.id, cost)}
            >
              Set Cost
            </Button>
          </Box>
        );
      case 'awaitingPayment':
        return <Chip label="Waiting for payment" color="warning" size="small" sx={{ mt: 1 }} />;
      case 'paid':
        return (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={() => onCompleteJob(job.id)} // Calls the prop function
            sx={{ mt: 1 }}
          >
            Mark as Complete
          </Button>
        );
      case 'completed':
        return <Chip label="Completed" color="success" size="small" sx={{ mt: 1 }} />;
      default:
        return null;
    }
  };

  return (
    <>
      <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
        <ListItemText
          primary={<Typography variant="subtitle1">Job ID: {job.id}</Typography>}
          secondary={`Received: ${new Date(job.createdAt?.seconds * 1000).toLocaleString()}`}
        />
        
        <Box sx={{ my: 1, pl: 2 }}>
          {job.files.map((file, index) => (
            <Typography key={index} variant="body2">
              - <strong>{file.name}</strong> (Copies: {file.specs.copies})
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            {renderActions()}
            <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => onDeleteJob(job.id)} // Calls the prop function
            >
                Delete
            </Button>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
}