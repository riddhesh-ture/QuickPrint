// src/components/UserView/FileUpload.jsx
import React, { useCallback } from 'react';
import {
  Box, Paper, Typography, IconButton, List, ListItem, ListItemIcon,
  ListItemText, ListItemSecondaryAction, Alert, Chip, Tooltip
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SecurityIcon from '@mui/icons-material/Security';
import {
  validateFiles,
  getFileCategory,
  formatFileSize, 
  getAcceptString,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
} from '../../utils/fileValidation';

const getFileIcon = (file) => {
  const category = getFileCategory(file);
  switch (category) {
    case 'pdf':
      return <PictureAsPdfIcon sx={{ color: '#f44336' }} />;
    case 'image':
      return <ImageIcon sx={{ color: '#4caf50' }} />;
    case 'document':
      return <DescriptionIcon sx={{ color: '#2196f3' }} />;
    default:
      return <InsertDriveFileIcon />;
  }
};

export default function FileUpload({ files, setFiles, maxFiles = 10 }) {
  const [errors, setErrors] = React.useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setErrors([]);
    
    // Handle rejected files from dropzone
    if (rejectedFiles.length > 0) {
      const rejectionErrors = rejectedFiles.map(rejection => {
        const fileName = rejection.file.name;
        const errorMessages = rejection.errors.map(e => e.message).join(', ');
        return `${fileName}: ${errorMessages}`;
      });
      setErrors(rejectionErrors);
    }

    // Validate accepted files
    const validation = validateFiles(acceptedFiles);
    
    if (!validation.valid) {
      setErrors(prev => [...prev, ...validation.errors]);
    }

    if (validation.validFiles.length > 0) {
      // Check total file count
      const newTotal = files.length + validation.validFiles.length;
      if (newTotal > maxFiles) {
        setErrors(prev => [...prev, `Maximum ${maxFiles} files allowed. Remove some files first.`]);
        const allowedCount = maxFiles - files.length;
        if (allowedCount > 0) {
          setFiles(prev => [...prev, ...validation.validFiles.slice(0, allowedCount)]);
        }
      } else {
        setFiles(prev => [...prev, ...validation.validFiles]);
      }
    }
  }, [files, setFiles, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/bmp': ['.bmp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxSize: MAX_FILE_SIZE,
    disabled: files.length >= maxFiles,
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrors([]);
  };

  return (
    <Box>
      {/* File type info */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <SecurityIcon sx={{ color: 'success.main', fontSize: 18 }} />
        <Typography variant="caption" color="text.secondary">
          Accepted formats:
        </Typography>
        {['PDF', 'DOCX', 'JPG', 'PNG'].map(ext => (
          <Chip key={ext} label={ext} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        ))}
        <Typography variant="caption" color="text.secondary">
          • Max {MAX_FILE_SIZE / (1024 * 1024)}MB per file
        </Typography>
      </Box>

      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : files.length >= maxFiles ? 'grey.300' : 'grey.400',
          bgcolor: isDragActive ? 'action.hover' : files.length >= maxFiles ? 'grey.100' : 'background.paper',
          cursor: files.length >= maxFiles ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s',
          '&:hover': files.length < maxFiles ? {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          } : {},
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: files.length >= maxFiles ? 'grey.400' : 'primary.main', mb: 2 }} />
        
        {files.length >= maxFiles ? (
          <Typography color="text.secondary">
            Maximum files reached ({maxFiles})
          </Typography>
        ) : isDragActive ? (
          <Typography color="primary.main" fontWeight="medium">
            Drop files here...
          </Typography>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Drag & drop files here
            </Typography>
            <Typography color="text.secondary">
              or click to browse
            </Typography>
          </>
        )}
      </Paper>

      {/* Errors */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }} onClose={() => setErrors(prev => prev.filter((_, i) => i !== index))}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">
              Selected Files ({files.length}/{maxFiles})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </Typography>
          </Box>
          <List dense>
            {files.map((file, index) => (
              <ListItem key={`${file.name}-${index}`} divider={index < files.length - 1}>
                <ListItemIcon>
                  {getFileIcon(file)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {file.name}
                    </Typography>
                  }
                  secondary={formatFileSize(file.size)}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Remove file">
                    <IconButton edge="end" size="small" onClick={() => removeFile(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}