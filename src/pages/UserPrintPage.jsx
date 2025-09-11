import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper, List, CircularProgress } from '@mui/material';
import FileUploader from '../components/UserView/FileUploader';
import UploadedFileItem from '../components/UserView/UploadedFileItem';
import { uploadFile } from '../firebase/storage';
import { createPrintJob } from '../firebase/firestore';

export default function UserPrintPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Add new files to the list
  const handleFilesAdded = (newFiles) => {
    const newFileEntries = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}`, // Simple unique ID
      file: file,
      specs: {
        copies: 1,
        pages: '', // Empty means all pages
        color: 'bw', // 'bw' or 'color'
        sides: 'single', // 'single' or 'double'
      },
    }));
    setFiles(prevFiles => [...prevFiles, ...newFileEntries]);
  };

  // Update print specifications for a specific file
  const handleSpecChange = (fileId, newSpecs) => {
    setFiles(prevFiles =>
      prevFiles.map(f => (f.id === fileId ? { ...f, specs: { ...f.specs, ...newSpecs } } : f))
    );
  };

  // Remove a file from the list
  const handleRemoveFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  // Proceed to the next step (e.g., payment)
  const handleProceed = async () => {
    if (!merchantId || files.length === 0) {
      alert('Merchant ID is missing or no files are uploaded.');
      return;
    }

    setIsUploading(true);
    try {
      const filesForJob = await Promise.all(
        files.map(async (fileEntry) => {
          const path = `uploads/${merchantId}/${Date.now()}-${fileEntry.file.name}`;
          const downloadURL = await uploadFile(fileEntry.file, path);
          return {
            url: downloadURL,
            name: fileEntry.file.name,
            specs: fileEntry.specs,
          };
        })
      );

      await createPrintJob({
        merchantId: merchantId,
        files: filesForJob,
      });

      alert('Your print job has been sent to the merchant!');
      setFiles([]); // Clear files after successful upload
    } catch (error) {
      console.error('Error creating print job:', error);
      alert('There was an error sending your print job. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Your Files
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
        Printing for Merchant ID: {merchantId || 'N/A'}
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <FileUploader onFilesAdded={handleFilesAdded} />
      </Paper>

      {files.length > 0 && (
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Your Files
          </Typography>
          <List>
            {files.map(fileEntry => (
              <UploadedFileItem
                key={fileEntry.id}
                fileEntry={fileEntry}
                onSpecChange={handleSpecChange}
                onRemove={handleRemoveFile}
              />
            ))}
          </List>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, position: 'relative' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleProceed}
              disabled={isUploading}
            >
              {isUploading ? 'Sending...' : 'Proceed to Print'}
            </Button>
            {isUploading && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
}