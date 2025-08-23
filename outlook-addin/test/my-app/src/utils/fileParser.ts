import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * List of MIME types that can be processed client-side
 */
export const CLIENT_PARSABLE_TYPES = [
  // Text formats
  'text/plain',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  
  // Common document formats that can be parsed as text
  'application/pdf', // PDF can be parsed client-side with pdf.js
];

/**
 * Check if a file can be parsed client-side
 * @param mimeType - The MIME type of the file
 * @returns boolean indicating if the file can be parsed client-side
 */
export const canParseClientSide = (mimeType: string): boolean => {
  // Check exact matches
  if (CLIENT_PARSABLE_TYPES.includes(mimeType)) {
    return true;
  }
  
  // Check starts-with for text types
  if (mimeType.startsWith('text/')) {
    return true;
  }
  
  return false;
};

/**
 * Parse file content client-side based on its type
 * @param content - Base64 encoded content of the file
 * @param mimeType - The MIME type of the file
 * @returns Promise resolving to the extracted text content
 */
export const parseFileContent = async (content: string, mimeType: string, fileName: string): Promise<string> => {
  // Decode base64 content
  const binaryContent = atob(content);
  
  // Handle PDF files
  if (mimeType === 'application/pdf') {
    try {
      return await extractPdfText(binaryContent);
    } catch (error) {
      console.error('Error parsing PDF client-side:', error);
      throw new Error('Failed to parse PDF client-side');
    }
  }
  
  // Handle text-based files
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' || 
      mimeType === 'application/xml') {
    return binaryContent;
  }
  
  // Default case - return as-is if we can't properly parse
  console.warn(`No specific parser for ${mimeType}, treating as plain text`);
  return binaryContent;
};

/**
 * Extract text from a PDF document
 * @param pdfData - Binary PDF data
 * @returns Promise resolving to the extracted text
 */
async function extractPdfText(pdfData: string): Promise<string> {
  try {
    // Convert binary string to Uint8Array
    const data = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
      data[i] = pdfData.charCodeAt(i);
    }
    
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data }).promise;
    let text = '';
    
    // Extract text from each page (limit to first 20 pages for performance)
    const maxPages = Math.min(pdf.numPages, 20);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n\n';
    }
    
    if (pdf.numPages > maxPages) {
      text += `[Note: Only showing content from first ${maxPages} pages of ${pdf.numPages} total pages]`;
    }
    
    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF document');
  }
}
