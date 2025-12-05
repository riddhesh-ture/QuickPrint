import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Allowed file types for printing
const ALLOWED_TYPES = {
  'application/pdf': { icon: 'PictureAsPdfIcon', label: 'PDF' },
  'image/jpeg': { icon: 'ImageIcon', label: 'JPEG' },
  'image/jpg': { icon: 'ImageIcon', label: 'JPG' },
  'image/png': { icon: 'ImageIcon', label: 'PNG' },
  'image/webp': { icon: 'ImageIcon', label: 'WebP' },
  'image/gif': { icon: 'ImageIcon', label: 'GIF' },
  'application/msword': { icon: 'DescriptionIcon', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'DescriptionIcon', label: 'DOCX' },
  'application/vnd.ms-excel': { icon: 'DescriptionIcon', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'DescriptionIcon', label: 'XLSX' },
  'application/vnd.ms-powerpoint': { icon: 'DescriptionIcon', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'DescriptionIcon', label: 'PPTX' },
  'text/plain': { icon: 'DescriptionIcon', label: 'TXT' },
};

const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function FileUploader({ onFilesAdded }) {
  const [error, setError] = React.useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(f => {
        if (f.errors[0]?.code === 'file-too-large') {
          return `${f.file.name}: File too large (max 25MB)`;
        }
        if (f.errors[0]?.code === 'file-invalid-type') {
          return `${f.file.name}: Invalid file type`;
        }
        return `${f.file.name}: ${f.errors[0]?.message}`;
      });
      setError(errors.join(', '));
    }

    // Process accepted files
    if (acceptedFiles.length > 0) {
      onFilesAdded(acceptedFiles);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Supported: PDF, Images (JPG, PNG), Word, Excel, PowerPoint, Text
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Max file size: 25MB
        </Typography>
      </Paper>
    </Box>
  );
}