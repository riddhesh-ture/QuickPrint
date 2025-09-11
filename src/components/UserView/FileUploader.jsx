import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function FileUploader({ onFilesAdded }) {
  const onDrop = useCallback((acceptedFiles) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.400',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'transparent',
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      <input {...getInputProps()} />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
      <Typography variant="h6">
        {isDragActive ? 'Drop the files here ...' : "Drag 'n' drop some files here, or click to select files"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        (Documents, Photos, PDFs, etc.)
      </Typography>
    </Box>
  );
}