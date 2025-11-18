import { Request, Response, Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Path to records database (notes database)
const RECORDS_DB_PATH = path.resolve(__dirname, '../../mcp/data/PDP/notes_database.json');

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
    // Return empty structure if file doesn't exist
    return { notes: [] };
  }
}

// Helper to save database
async function saveDatabase(db: RecordsDatabase): Promise<void> {
  await fs.mkdir(path.dirname(RECORDS_DB_PATH), { recursive: true });
  await fs.writeFile(RECORDS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// GET /api/records - Get all records
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    res.json({
      success: true,
      data: db.notes,
      total: db.notes.length
    });
  } catch (error) {
    console.error('Error loading records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load records'
    });
  }
});

// GET /api/records/:id - Get single record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const record = db.notes.find(r => r.id === req.params.id);
    
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error loading record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load record'
    });
  }
});

// PUT /api/records/:id - Update record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const index = db.notes.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
      return;
    }
    
    const existingRecord = db.notes[index];
    const updatedRecord: Record = {
      ...existingRecord,
      ...req.body,
      id: existingRecord.id, // Preserve ID
      created_at: existingRecord.created_at, // Preserve creation date
      updated_at: new Date().toISOString()
    };
    
    db.notes[index] = updatedRecord;
    await saveDatabase(db);
    
    res.json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update record'
    });
  }
});

// DELETE /api/records/:id - Delete record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const index = db.notes.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
      return;
    }
    
    db.notes.splice(index, 1);
    await saveDatabase(db);
    
    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete record'
    });
  }
});

// POST /api/records - Create new record
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    
    const newRecord: Record = {
      id: Date.now().toString(),
      date: req.body.date,
      windfarm: req.body.windfarm,
      topic: req.body.topic,
      comment: req.body.comment,
      type: req.body.type,
      company: req.body.company || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.notes.push(newRecord);
    await saveDatabase(db);
    
    res.status(201).json({
      success: true,
      data: newRecord
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create record'
    });
  }
});

export default router;
