// src/utils/securePrint.js

/**
 * Generate a secure print window with anti-download protections
 */
export function createSecurePrintWindow() {
  const printWindow = window.open('', '_blank', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for printing.');
  }

  return printWindow;
}

/**
 * Security CSS to prevent downloading and copying
 */
const SECURITY_CSS = `
  /* Disable text selection */
  * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
  }

  /* Disable dragging */
  img, canvas, embed, object {
    -webkit-user-drag: none !important;
    -khtml-user-drag: none !important;
    -moz-user-drag: none !important;
    -o-user-drag: none !important;
    user-drag: none !important;
    pointer-events: none !important;
  }

  /* Watermark styles */
  .watermark-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    overflow: hidden;
  }

  .watermark-text {
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: rgba(128, 128, 128, 0.15);
    transform: rotate(-30deg);
    white-space: nowrap;
    padding: 40px 60px;
    pointer-events: none;
  }

  /* Print-specific styles */
  @media print {
    .watermark-overlay {
      display: none !important;
    }
    .no-print {
      display: none !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  /* Hide in print preview workaround */
  @page {
    margin: 10mm;
  }

  body {
    margin: 0;
    padding: 20px;
    background: #525659;
    overflow-x: hidden;
  }

  .print-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .page-wrapper {
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
  }

  canvas, img {
    display: block;
    max-width: 100%;
  }
`;

/**
 * Security JavaScript to prevent various download methods
 */
const SECURITY_SCRIPT = `
  // Disable right-click context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for saving/copying
  document.addEventListener('keydown', function(e) {
    // Ctrl+S, Ctrl+P (we allow our own print), Ctrl+C, Ctrl+U, F12
    if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'c'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
    // F12 - Dev tools
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C - Dev tools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  });

  // Disable drag
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // Disable copy
  document.addEventListener('copy', function(e) {
    e.preventDefault();
    return false;
  });

  // Detect and close dev tools (basic detection)
  let devToolsOpen = false;
  const threshold = 160;
  
  setInterval(function() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f44336;color:white;font-size:24px;text-align:center;padding:20px;">Developer tools detected.<br>This content is protected.</div>';
      }
    }
  }, 1000);

  // Disable print screen (partial - only works in some browsers)
  document.addEventListener('keyup', function(e) {
    if (e.key === 'PrintScreen') {
      navigator.clipboard.writeText('');
    }
  });

  // Clear clipboard on window blur (when screenshot might be taken)
  window.addEventListener('blur', function() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Small delay to catch screenshot
      setTimeout(function() {
        try {
          navigator.clipboard.writeText('');
        } catch(err) {}
      }, 100);
    }
  });
`;

/**
 * Generate watermark HTML
 */
function generateWatermarkHTML(merchantName = 'QuickPrint') {
  const timestamp = new Date().toLocaleString();
  const watermarkText = `CONFIDENTIAL • ${merchantName} • ${timestamp}`;
  
  // Create multiple watermark texts to fill the page
  let watermarks = '';
  for (let i = 0; i < 50; i++) {
    watermarks += `<span class="watermark-text">${watermarkText}</span>`;
  }
  
  return `<div class="watermark-overlay no-print">${watermarks}</div>`;
}

/**
 * Securely print an image file
 */
export async function securePrintImage(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = reader.result;
      const isColor = specs?.color === 'color';
      const orientation = specs?.orientation || 'portrait';
      const paperSize = specs?.paperSize || 'a4';

      const pageCSS = `
        @page { 
          size: ${paperSize} ${orientation}; 
          margin: 10mm; 
        }
        @media print {
          body { 
            ${!isColor ? 'filter: grayscale(100%);' : ''} 
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
        }
      `;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Print - ${fileName}</title>
          <style>
            ${SECURITY_CSS}
            ${pageCSS}
            .image-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 80vh;
            }
            .print-image {
              max-width: 100%;
              max-height: 90vh;
              object-fit: contain;
              ${!isColor ? 'filter: grayscale(100%);' : ''}
            }
          </style>
        </head>
        <body>
          ${generateWatermarkHTML(merchantName)}
          <div class="print-container">
            <div class="page-wrapper image-container">
              <img src="${base64Data}" class="print-image" alt="Print document" />
            </div>
          </div>
          <script>
            ${SECURITY_SCRIPT}
            
            // Auto print when loaded
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
            
            // Close window after print
            window.onafterprint = function() {
              window.close();
            };
            
            // Auto close after timeout (in case print is cancelled)
            setTimeout(function() {
              window.close();
            }, 300000); // 5 minutes
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Resolve after a delay
      setTimeout(resolve, 120000);
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(fileBlob);
  });
}

/**
 * Securely print a PDF file
 */
export async function securePrintPDF(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = reader.result;
      const base64Content = base64Data.split(',')[1];
      const isColor = specs?.color === 'color';
      const orientation = specs?.orientation || 'portrait';
      const paperSize = specs?.paperSize || 'a4';

      const pageCSS = `
        @page { 
          size: ${paperSize} ${orientation}; 
          margin: 10mm; 
        }
        @media print {
          canvas {
            ${!isColor ? 'filter: grayscale(100%);' : ''}
            page-break-after: always;
          }
          canvas:last-child {
            page-break-after: auto;
          }
        }
      `;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Print - ${fileName}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            ${SECURITY_CSS}
            ${pageCSS}
            canvas {
              ${!isColor ? 'filter: grayscale(100%);' : ''}
            }
          </style>
        </head>
        <body>
          ${generateWatermarkHTML(merchantName)}
          <div class="print-container" id="pages"></div>
          <script>
            ${SECURITY_SCRIPT}
            
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            async function renderPDF() {
              try {
                const pdfData = atob('${base64Content}');
                const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                const container = document.getElementById('pages');
                
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const viewport = page.getViewport({ scale: 1.5 });
                  
                  const wrapper = document.createElement('div');
                  wrapper.className = 'page-wrapper';
                  
                  const canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  
                  wrapper.appendChild(canvas);
                  container.appendChild(wrapper);
                  
                  await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                  }).promise;
                }
                
                // Auto print when all pages rendered
                setTimeout(function() {
                  window.print();
                }, 1000);
                
              } catch (error) {
                console.error('PDF render error:', error);
                document.body.innerHTML = '<div style="padding:20px;color:red;">Error loading PDF. Please try again.</div>';
              }
            }
            
            renderPDF();
            
            // Close window after print
            window.onafterprint = function() {
              window.close();
            };
            
            // Auto close after timeout
            setTimeout(function() {
              window.close();
            }, 300000);
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      setTimeout(resolve, 120000);
    };

    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsDataURL(fileBlob);
  });
}

/**
 * Securely print a DOCX file (converts to images first)
 */
export async function securePrintDOCX(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      const arrayBuffer = reader.result;
      const isColor = specs?.color === 'color';
      const orientation = specs?.orientation || 'portrait';
      const paperSize = specs?.paperSize || 'a4';

      const pageCSS = `
        @page { 
          size: ${paperSize} ${orientation}; 
          margin: 15mm; 
        }
        @media print {
          .docx-content {
            ${!isColor ? 'filter: grayscale(100%);' : ''}
          }
        }
      `;

      // For DOCX, we use mammoth.js to convert to HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Print - ${fileName}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
          <style>
            ${SECURITY_CSS}
            ${pageCSS}
            .docx-content {
              background: white;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              ${!isColor ? 'filter: grayscale(100%);' : ''}
            }
            .docx-content img {
              max-width: 100%;
              height: auto;
            }
            .docx-content p {
              margin: 0 0 10px 0;
              line-height: 1.6;
            }
            .docx-content h1, .docx-content h2, .docx-content h3 {
              margin: 20px 0 10px 0;
            }
            .docx-content table {
              border-collapse: collapse;
              width: 100%;
              margin: 10px 0;
            }
            .docx-content td, .docx-content th {
              border: 1px solid #ddd;
              padding: 8px;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .docx-content {
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${generateWatermarkHTML(merchantName)}
          <div id="content" class="docx-content">Loading document...</div>
          <script>
            ${SECURITY_SCRIPT}
            
            // Convert ArrayBuffer from base64
            const base64 = '${btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))}';
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            
            mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
              .then(function(result) {
                document.getElementById('content').innerHTML = result.value;
                
                // Auto print after rendering
                setTimeout(function() {
                  window.print();
                }, 1000);
              })
              .catch(function(error) {
                document.getElementById('content').innerHTML = '<div style="color:red;">Error loading document: ' + error.message + '</div>';
              });
            
            window.onafterprint = function() {
              window.close();
            };
            
            setTimeout(function() {
              window.close();
            }, 300000);
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      setTimeout(resolve, 120000);
    };

    reader.onerror = () => reject(new Error('Failed to read document file'));
    reader.readAsArrayBuffer(fileBlob);
  });
}

/**
 * Main secure print function - routes to appropriate handler
 */
export async function securePrint(fileBlob, fileName, specs, merchantName = 'QuickPrint') {
  const mimeType = fileBlob.type?.toLowerCase() || '';
  const extension = fileName?.split('.').pop()?.toLowerCase() || '';

  // Determine file type and route to appropriate printer
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return securePrintPDF(fileBlob, fileName, specs, merchantName);
  }
  
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)) {
    return securePrintImage(fileBlob, fileName, specs, merchantName);
  }
  
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || ['doc', 'docx'].includes(extension)) {
    return securePrintDOCX(fileBlob, fileName, specs, merchantName);
  }

  throw new Error(`Unsupported file type: ${mimeType || extension}`);
}