import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';

// Path to records database
const RECORDS_DB_PATH = path.resolve(process.cwd(), '..', 'mcp/data/notes_database.json');

interface Record {
  id: string;
  date: string;
  windfarm: string;
  topic: string;
  comment: string;
  type: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

interface RecordsDatabase {
  notes: Record[];
}

// Helper to load database
async function loadDatabase(): Promise<RecordsDatabase> {
  try {
    const data = await fs.readFile(RECORDS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { notes: [] };
  }
}

// Helper to save database
async function saveDatabase(db: RecordsDatabase): Promise<void> {
  await fs.mkdir(path.dirname(RECORDS_DB_PATH), { recursive: true });
  await fs.writeFile(RECORDS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const id = query.id as string | undefined;

    switch (method) {
      case 'GET':
        if (id) {
          // Get single record
          const db = await loadDatabase();
          const record = db.notes.find(r => r.id === id);
          
          if (!record) {
            return res.status(404).json({
              success: false,
              error: 'Record not found'
            });
          }
          
          return res.status(200).json({
            success: true,
            data: record
          });
        } else {
          // Get all records
          const db = await loadDatabase();
          return res.status(200).json({
            success: true,
            data: db.notes,
            total: db.notes.length
          });
        }

      case 'POST':
        // Create new record
        const db = await loadDatabase();
        const { date, windfarm, topic, comment, type, company } = req.body;
        
        const newRecord: Record = {
          id: Date.now().toString(),
          date,
          windfarm,
          topic,
          comment,
          type,
          company: company || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        db.notes.push(newRecord);
        await saveDatabase(db);
        
        return res.status(201).json({
          success: true,
          data: newRecord
        });

      case 'PUT':
        // Update record
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Record ID is required'
          });
        }
        
        const updateDb = await loadDatabase();
        const index = updateDb.notes.findIndex(r => r.id === id);
        
        if (index === -1) {
          return res.status(404).json({
            success: false,
            error: 'Record not found'
          });
        }
        
        const existingRecord = updateDb.notes[index];
        const updatedRecord: Record = {
          ...existingRecord,
          ...req.body,
          id: existingRecord.id,
          created_at: existingRecord.created_at,
          updated_at: new Date().toISOString()
        };
        
        updateDb.notes[index] = updatedRecord;
        await saveDatabase(updateDb);
        
        return res.status(200).json({
          success: true,
          data: updatedRecord
        });

      case 'DELETE':
        // Delete record
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Record ID is required'
          });
        }
        
        const deleteDb = await loadDatabase();
        const deleteIndex = deleteDb.notes.findIndex(r => r.id === id);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Record not found'
          });
        }
        
        deleteDb.notes.splice(deleteIndex, 1);
        await saveDatabase(deleteDb);
        
        return res.status(200).json({
          success: true,
          message: 'Record deleted successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Records API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
