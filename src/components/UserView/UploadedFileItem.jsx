import React, { useState } from 'react';
import {
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  Box,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export default function UploadedFileItem({ fileEntry, onSpecChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const { file, specs } = fileEntry;

  const handleSpecChange = (e) => {
    onSpecChange(fileEntry.id, { [e.target.name]: e.target.value });
  };

  return (
    <Paper sx={{ mb: 2, p: 2 }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <ListItemText
          primary={file.name}
          secondary={`${(file.size / 1024).toFixed(2)} KB`}
        />
        <IconButton onClick={() => setOpen(!open)} aria-label="expand">
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <IconButton onClick={() => onRemove(fileEntry.id)} aria-label="delete">
          <DeleteIcon />
        </IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Print Specifications (Optional)
          </Typography>
          <Box component="form" noValidate autoComplete="off" sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Copies"
              name="copies"
              type="number"
              value={specs.copies}
              onChange={handleSpecChange}
              InputProps={{ inputProps: { min: 1 } }}
              variant="outlined"
              fullWidth
            />
            <TextField
              label="Pages (e.g., 1-5, 8, 11-13)"
              name="pages"
              value={specs.pages}
              onChange={handleSpecChange}
              placeholder="All pages"
              variant="outlined"
              fullWidth
            />
            <FormControl component="fieldset">
              <FormLabel component="legend">Color</FormLabel>
              <RadioGroup row name="color" value={specs.color} onChange={handleSpecChange}>
                <FormControlLabel value="bw" control={<Radio />} label="Black & White" />
                <FormControlLabel value="color" control={<Radio />} label="Color" />
              </RadioGroup>
            </FormControl>
            <FormControl component="fieldset">
              <FormLabel component="legend">Sides</FormLabel>
              <RadioGroup row name="sides" value={specs.sides} onChange={handleSpecChange}>
                <FormControlLabel value="single" control={<Radio />} label="Single-Sided" />
                <FormControlLabel value="double" control={<Radio />} label="Double-Sided" />
              </RadioGroup>
            </FormControl>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}