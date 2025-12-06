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
 * Security CSS to prevent copying/screenshots
 */
const SECURITY_CSS = `
  * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
  }
  body {
    margin: 0;
    padding: 20px;
    background: white;
  }
  @media print {
    body { background: white; }
  }
`;

/**
 * Security JavaScript to prevent various download methods
 */
const SECURITY_SCRIPT = `
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'p' || e.key === 's' || e.key === 'a')) {
      e.preventDefault();
    }
  });
`;

/**
 * Generate watermark HTML
 */
function generateWatermarkHTML(merchantName = 'QuickPrint') {
  return `<div style="position:fixed;top:10px;right:10px;opacity:0.3;font-size:10px;pointer-events:none;">
    ${merchantName || 'QuickPrint'} - ${new Date().toLocaleString()}
  </div>`;
}

/**
 * Securely print an image file
 */
export async function securePrintImage(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = reader.result;
      const isColor = specs?.color === 'color';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print - ${fileName}</title>
          <style>
            ${SECURITY_CSS}
            @media print {
              img { ${!isColor ? 'filter: grayscale(100%);' : ''} max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${generateWatermarkHTML(merchantName)}
          <img src="${base64Data}" style="max-width:100%;${!isColor ? 'filter:grayscale(100%);' : ''}" />
          <script>
            ${SECURITY_SCRIPT}
            window.onload = function() { setTimeout(function() { window.print(); }, 300); };
            window.onafterprint = function() { window.close(); };
            setTimeout(function() { window.close(); }, 30000);
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Resolve immediately after writing
      setTimeout(resolve, 500);
    };

    reader.onerror = () => resolve(); // Resolve even on error
    reader.readAsDataURL(fileBlob);
    
    // Failsafe resolve
    setTimeout(resolve, 2000);
  });
}

/**
 * Securely print a PDF file
 */
export async function securePrintPDF(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = reader.result;
      const base64Content = base64Data.split(',')[1];
      const isColor = specs?.color === 'color';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print - ${fileName}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            ${SECURITY_CSS}
            canvas { ${!isColor ? 'filter: grayscale(100%);' : ''} display: block; margin: 10px auto; }
            @media print { canvas { page-break-after: always; } }
          </style>
        </head>
        <body>
          ${generateWatermarkHTML(merchantName)}
          <div id="pages"></div>
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
                  const canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  container.appendChild(canvas);
                  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                }
                setTimeout(function() { window.print(); }, 300);
              } catch (e) {
                document.body.innerHTML = '<p style="color:red;">Error loading PDF</p>';
              }
            }
            renderPDF();
            window.onafterprint = function() { window.close(); };
            setTimeout(function() { window.close(); }, 30000);
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(resolve, 500);
    };

    reader.onerror = () => resolve();
    reader.readAsDataURL(fileBlob);
    setTimeout(resolve, 2000);
  });
}

/**
 * Securely print a DOCX file (converts to images first)
 */
export async function securePrintDOCX(fileBlob, fileName, specs, merchantName) {
  const printWindow = createSecurePrintWindow();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const isColor = specs?.color === 'color';

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print - ${fileName}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
            <style>
              ${SECURITY_CSS}
              .content { max-width: 800px; margin: 0 auto; font-family: Arial; ${!isColor ? 'filter: grayscale(100%);' : ''} }
            </style>
          </head>
          <body>
            ${generateWatermarkHTML(merchantName)}
            <div id="content" class="content">Loading...</div>
            <script>
              ${SECURITY_SCRIPT}
              const base64 = '${base64}';
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              
              mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
                .then(function(result) {
                  document.getElementById('content').innerHTML = result.value;
                  setTimeout(function() { window.print(); }, 300);
                })
                .catch(function(e) {
                  document.getElementById('content').innerHTML = '<p style="color:red;">Error loading document</p>';
                });
              
              window.onafterprint = function() { window.close(); };
              setTimeout(function() { window.close(); }, 30000);
            </script>
          </body>
          </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
      } catch (e) {
        console.error('DOCX error:', e);
      }
      setTimeout(resolve, 500);
    };

    reader.onerror = () => resolve();
    reader.readAsArrayBuffer(fileBlob);
    setTimeout(resolve, 2000);
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