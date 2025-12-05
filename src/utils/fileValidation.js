// src/utils/fileValidation.js

// Allowed file types with their MIME types and extensions
export const ALLOWED_FILE_TYPES = {
  // PDFs
  'application/pdf': { ext: 'pdf', name: 'PDF Document' },
  
  // Images
  'image/jpeg': { ext: 'jpg', name: 'JPEG Image' },
  'image/jpg': { ext: 'jpg', name: 'JPEG Image' },
  'image/png': { ext: 'png', name: 'PNG Image' },
  'image/webp': { ext: 'webp', name: 'WebP Image' },
  'image/bmp': { ext: 'bmp', name: 'BMP Image' },
  
  // Word Documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', name: 'Word Document' },
  'application/msword': { ext: 'doc', name: 'Word Document (Legacy)' },
};

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'doc', 'docx'];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total

/**
 * Validate a single file
 */
export function validateFile(file) {
  const errors = [];
  
  // Check if file exists
  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Check file type by MIME
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Validate MIME type
  if (!ALLOWED_FILE_TYPES[mimeType]) {
    // Fallback: check by extension if MIME type is generic
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`File "${file.name}" has unsupported format. Allowed: PDF, DOCX, Images (JPG, PNG, WebP, BMP)`);
    }
  }

  // Additional check: verify extension matches expected type
  if (ALLOWED_FILE_TYPES[mimeType]) {
    const expectedExt = ALLOWED_FILE_TYPES[mimeType].ext;
    if (extension !== expectedExt && !(expectedExt === 'jpg' && extension === 'jpeg')) {
      // Allow jpg/jpeg mismatch
      if (!(mimeType.startsWith('image/') && ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension))) {
        errors.push(`File "${file.name}" extension doesn't match its type`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fileType: getFileCategory(file),
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(files) {
  const results = {
    valid: true,
    errors: [],
    validFiles: [],
    totalSize: 0,
  };

  if (!files || files.length === 0) {
    return { valid: false, errors: ['No files selected'], validFiles: [], totalSize: 0 };
  }

  let totalSize = 0;

  for (const file of files) {
    const validation = validateFile(file);
    totalSize += file.size;

    if (validation.valid) {
      results.validFiles.push(file);
    } else {
      results.errors.push(...validation.errors);
      results.valid = false;
    }
  }

  // Check total size
  if (totalSize > MAX_TOTAL_SIZE) {
    results.errors.push(`Total file size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit`);
    results.valid = false;
  }

  results.totalSize = totalSize;
  return results;
}

/**
 * Get file category (pdf, image, document)
 */
export function getFileCategory(file) {
  const mimeType = file.type?.toLowerCase() || '';
  const extension = file.name?.split('.').pop()?.toLowerCase() || '';

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }
  
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)) {
    return 'image';
  }
  
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || ['doc', 'docx'].includes(extension)) {
    return 'document';
  }

  return 'unknown';
}

/**
 * Get human-readable file type name
 */
export function getFileTypeName(file) {
  const mimeType = file.type?.toLowerCase();
  if (ALLOWED_FILE_TYPES[mimeType]) {
    return ALLOWED_FILE_TYPES[mimeType].name;
  }
  
  const category = getFileCategory(file);
  switch (category) {
    case 'pdf': return 'PDF Document';
    case 'image': return 'Image';
    case 'document': return 'Word Document';
    default: return 'Unknown';
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get accept string for file input
 */
export function getAcceptString() {
  return Object.keys(ALLOWED_FILE_TYPES).join(',') + ',.doc,.docx';
}