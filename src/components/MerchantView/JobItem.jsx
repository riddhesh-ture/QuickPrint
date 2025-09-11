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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { updateJobStatus, deletePrintJob } from '../../firebase/firestore';

const FileSpecDetail = ({ label, value }) => (
  <Typography variant="body2" component="span" sx={{ mr: 2 }}>
    <strong>{label}:</strong> {value}
  </Typography>
);

export default function JobItem({ job }) {
  const [open, setOpen] = React.useState(false);

  const handleStatusChange = (status) => {
    updateJobStatus(job.id, status).catch(console.error);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      deletePrintJob(job.id).catch(console.error);
    }
  };

  return (
    <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <ListItemText
          primary={`Job from ${job.createdAt?.toDate().toLocaleTimeString()}`}
          secondary={`${job.files.length} file(s)`}
        />
        <Chip label={job.status} color={job.status === 'pending' ? 'warning' : 'success'} size="small" />
        <IconButton onClick={() => setOpen(!open)}>{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2, mt: 1 }}>
          {job.files.map((file, index) => (
            <React.Fragment key={index}>
              <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="subtitle1">
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.name}
                  </a>
                </Typography>
                <Box>
                  <FileSpecDetail label="Copies" value={file.specs.copies} />
                  <FileSpecDetail label="Pages" value={file.specs.pages || 'All'} />
                  <FileSpecDetail label="Color" value={file.specs.color === 'bw' ? 'B&W' : 'Color'} />
                  <FileSpecDetail label="Sides" value={file.specs.sides} />
                </Box>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          {job.status === 'pending' && (
            <Button size="small" variant="contained" onClick={() => handleStatusChange('completed')}>
              Mark as Completed
            </Button>
          )}
          <Button size="small" variant="outlined" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </Box>
      </Collapse>
    </ListItem>
  );
}