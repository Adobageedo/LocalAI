// Attachment utilities for promptLLM serverless handler
// Centralizes attachment-type checks and extraction helpers

export const isTextBased = (filename?: string, mime?: string) => {
  const ext = (filename || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  const textExts = ['.txt', '.md', '.csv', '.json', '.xml', '.log', '.rtf'];
  const textMimes = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/xml'];
  return textExts.some(e => ext.endsWith(e)) || textMimes.includes(m);
};

export const isImage = (filename?: string, mime?: string) => {
  const ext = (filename || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return imageExts.some(e => ext.endsWith(e)) || m.startsWith('image/');
};

export const base64ToUtf8 = (b64: string) => {
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
};

// Optional PDF text extraction via dynamic import of pdf-parse
export const extractPdfText = async (b64: string): Promise<string> => {
  try {
    const pdfParse = await import('pdf-parse').catch(() => null as any);
    if (!pdfParse) return '';
    const buffer = Buffer.from(b64, 'base64');
    const res: any = await (pdfParse as any).default(buffer);
    return (res && res.text) ? String(res.text) : '';
  } catch {
    return '';
  }
};

// Optional DOCX text extraction via dynamic import of mammoth
export const extractDocxText = async (b64: string): Promise<string> => {
  try {
    const mammoth = await import('mammoth').catch(() => null as any);
    if (!mammoth) return '';
    const buffer = Buffer.from(b64, 'base64');
    const result: any = await (mammoth as any).extractRawText({ buffer });
    return (result && result.value) ? String(result.value) : '';
  } catch {
    return '';
  }
};

// Optional: Convert first page of PDF to PNG base64 using pdf2pic
export const convertPdfToPngBase64 = async (b64: string): Promise<string[]> => {
  try {
    const pdf2pic = await import('pdf2pic').catch(() => null as any);
    if (!pdf2pic) return [];
    const { fromBuffer } = (pdf2pic as any);
    const buffer = Buffer.from(b64, 'base64');
    const options = {
      density: 200,
      format: 'png',
      width: 1600,
      height: 1600,
      savePath: undefined,
    };
    const convert = fromBuffer(buffer, options);
    const result = await convert(1, { responseType: 'base64' }).catch(() => null as any);
    if (result?.base64) {
      const base64 = String(result.base64).replace(/\s/g, '');
      return [base64];
    }
    return [];
  } catch {
    return [];
  }
};
