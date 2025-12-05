import React from 'react';
import {
  Paper, Box, Typography, IconButton, TextField, ToggleButton, ToggleButtonGroup,
  Divider, Chip, Tooltip, Collapse
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FlipIcon from '@mui/icons-material/Flip';

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return <PictureAsPdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  return <DescriptionIcon color="action" />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function UploadedFileItem({ fileEntry, onSpecChange, onRemove }) {
  const { file, specs } = fileEntry;
  const [expanded, setExpanded] = React.useState(true);

  const handleCopiesChange = (e) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
    onSpecChange(fileEntry.id, { copies: value });
  };

  const handlePagesChange = (e) => {
    // Allow formats: "1-5", "1,3,5", "all", or empty
    const value = e.target.value.replace(/[^0-9,-]/g, '');
    onSpecChange(fileEntry.id, { pages: value });
  };

  const handleColorChange = (e, newValue) => {
    if (newValue) onSpecChange(fileEntry.id, { color: newValue });
  };

  const handleSidesChange = (e, newValue) => {
    if (newValue) onSpecChange(fileEntry.id, { sides: newValue });
  };

  const handleOrientationChange = (e, newValue) => {
    if (newValue) onSpecChange(fileEntry.id, { orientation: newValue });
  };

  const handlePaperSizeChange = (e, newValue) => {
    if (newValue) onSpecChange(fileEntry.id, { paperSize: newValue });
  };

  return (
    <Paper elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          bgcolor: 'grey.50',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {getFileIcon(file.name)}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size)}
          </Typography>
        </Box>
        
        {/* Quick specs preview */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip 
            size="small" 
            label={`×${specs.copies || 1}`} 
            icon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={specs.color === 'color' ? 'Color' : 'B&W'} 
            color={specs.color === 'color' ? 'primary' : 'default'}
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={specs.sides === 'double' ? '2-sided' : '1-sided'} 
            variant="outlined"
          />
        </Box>

        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        
        <IconButton 
          size="small" 
          color="error" 
          onClick={(e) => { e.stopPropagation(); onRemove(fileEntry.id); }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* Expanded Settings */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            
            {/* Copies */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                <ContentCopyIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                Copies
              </Typography>
              <TextField
                type="number"
                size="small"
                value={specs.copies || 1}
                onChange={handleCopiesChange}
                inputProps={{ min: 1, max: 100 }}
                fullWidth
              />
            </Box>

            {/* Pages */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Pages (leave empty for all)
              </Typography>
              <TextField
                size="small"
                value={specs.pages || ''}
                onChange={handlePagesChange}
                placeholder="e.g., 1-5 or 1,3,5"
                fullWidth
              />
            </Box>

            {/* Color Mode */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                <ColorLensIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                Color
              </Typography>
              <ToggleButtonGroup
                value={specs.color || 'bw'}
                exclusive
                onChange={handleColorChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="bw">B&W</ToggleButton>
                <ToggleButton value="color">Color</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Sides */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                <FlipIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                Print Sides
              </Typography>
              <ToggleButtonGroup
                value={specs.sides || 'single'}
                exclusive
                onChange={handleSidesChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="single">1-Sided</ToggleButton>
                <ToggleButton value="double">2-Sided</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Paper Size */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Paper Size
              </Typography>
              <ToggleButtonGroup
                value={specs.paperSize || 'a4'}
                exclusive
                onChange={handlePaperSizeChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="a4">A4</ToggleButton>
                <ToggleButton value="a3">A3</ToggleButton>
                <ToggleButton value="letter">Letter</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Orientation */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Orientation
              </Typography>
              <ToggleButtonGroup
                value={specs.orientation || 'portrait'}
                exclusive
                onChange={handleOrientationChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="portrait">Portrait</ToggleButton>
                <ToggleButton value="landscape">Landscape</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}