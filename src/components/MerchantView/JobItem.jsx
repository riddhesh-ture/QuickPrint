// src/components/MerchantView/JobItem.jsx
import React from 'react';
import {
  ListItem,
  ListItemText,
  Collapse,
  List,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const FileSpecDetail = ({ label, value }) => (
  <Typography variant="body2" component="span" sx={{ mr: 2 }}>
    <strong>{label}:</strong> {value}
  </Typography>
);

export default function JobItem({ job, onAcceptJob, onCompleteJob, onDeleteJob, isProcessing }) {
  const [open, setOpen] = React.useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'awaitingPayment': return 'secondary';
      case 'paid': return 'success';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing & Printing...';
      case 'awaitingPayment': return 'Awaiting Payment';
      case 'paid': return 'Paid';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch', borderBottom: '1px solid #eee' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <ListItemText
          primary={`From: ${job.userName || 'Unknown User'}`}
          secondary={`Received: ${job.createdAt?.toDate().toLocaleString() || 'N/A'} - ${job.files?.length || 0} file(s)`}
        />
        <Chip label={getStatusText(job.status)} color={getStatusColor(job.status)} size="small" sx={{ mr: 1 }} />
        <IconButton onClick={() => setOpen(!open)}>{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2, mt: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ pt: 1, pl: 1 }}>Files to Print:</Typography>
          {job.files?.map((file, index) => (
            <React.Fragment key={index}>
              <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {index + 1}. {file.name}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <FileSpecDetail label="Copies" value={file.specs?.copies || 1} />
                  <FileSpecDetail label="Pages" value={file.specs?.pages || 'All'} />
                  <FileSpecDetail label="Color" value={file.specs?.color === 'color' ? 'Color' : 'B&W'} />
                  <FileSpecDetail label="Sides" value={file.specs?.sides === 'double' ? 'Double-Sided' : 'Single-Sided'} />
                </Box>
              </ListItem>
              {index < job.files.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          {job.status === 'pending' && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
              onClick={() => onAcceptJob(job)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Accept & Print'}
            </Button>
          )}
          {job.status === 'paid' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => onCompleteJob(job.id)}
            >
              Mark Complete
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDeleteJob(job.id)}
          >
            Delete
          </Button>
        </Box>
      </Collapse>
    </ListItem>
  );
}