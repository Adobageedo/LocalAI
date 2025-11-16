import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const PDP_FOLDER = '/Users/edoardo/Documents/LocalAI/mcp/data/annual_PDP';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const files = fs.readdirSync(PDP_FOLDER)
      .map(file => {
        const filePath = path.join(PDP_FOLDER, file);
        const stats = fs.statSync(filePath);
        return { file, filePath, mtime: stats.mtime };
      })
      .filter(f => fs.statSync(f.filePath).isFile() && f.file.toLowerCase().endsWith('.pdf'));

    if (files.length === 0) {
      res.status(404).json({ error: 'No files found in PDP folder' });
      return;
    }

    files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latestFile = files[0];
    const fileBuffer = fs.readFileSync(latestFile.filePath);
    let filename = path.basename(latestFile.filePath);

    const asciiFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Length', fileBuffer.length);

    res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('❌ Error downloading latest PDP file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Error downloading file: ${errorMessage}` });
  }
}