import { Request, Response, Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Path to technicians database
const TECHNICIANS_DB_PATH = path.resolve(__dirname, '../../mcp/technicians_database.json');

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  certifications: Array<{
    certification_type: string;
    certification_name: string;
    issue_date: string | null;
    expiry_date: string | null;
  }>;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface TechniciansDatabase {
  technicians: Technician[];
  metadata?: {
    created: string;
    last_updated: string;
    version: string;
  };
}

// Helper to load database
async function loadDatabase(): Promise<TechniciansDatabase> {
  try {
    const data = await fs.readFile(TECHNICIANS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty structure if file doesn't exist
    return {
      technicians: [],
      metadata: {
        created: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }
}

// Helper to save database
async function saveDatabase(db: TechniciansDatabase): Promise<void> {
  if (db.metadata) {
    db.metadata.last_updated = new Date().toISOString();
  }
  await fs.mkdir(path.dirname(TECHNICIANS_DB_PATH), { recursive: true });
  await fs.writeFile(TECHNICIANS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// GET /api/technicians - Get all technicians
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    res.json({
      success: true,
      data: db.technicians,
      total: db.technicians.length
    });
  } catch (error) {
    console.error('Error loading technicians:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load technicians'
    });
  }
});

// GET /api/technicians/:id - Get single technician
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const technician = db.technicians.find(t => t.id === req.params.id);
    
    if (!technician) {
      res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Error loading technician:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load technician'
    });
  }
});

// PUT /api/technicians/:id - Update technician
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const index = db.technicians.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
      return;
    }
    
    const existingTech = db.technicians[index];
    const updatedTech: Technician = {
      ...existingTech,
      ...req.body,
      id: existingTech.id, // Preserve ID
      created_at: existingTech.created_at, // Preserve creation date
      updated_at: new Date().toISOString()
    };
    
    db.technicians[index] = updatedTech;
    await saveDatabase(db);
    
    res.json({
      success: true,
      data: updatedTech
    });
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update technician'
    });
  }
});

// DELETE /api/technicians/:id - Delete technician
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    const index = db.technicians.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
      return;
    }
    
    db.technicians.splice(index, 1);
    await saveDatabase(db);
    
    res.json({
      success: true,
      message: 'Technician deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete technician'
    });
  }
});

// POST /api/technicians - Create new technician
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await loadDatabase();
    
    // Generate ID from name
    const id = `${req.body.first_name}_${req.body.last_name}`.toLowerCase().replace(/\s+/g, '_');
    
    // Check if already exists
    if (db.technicians.some(t => t.id === id)) {
      res.status(409).json({
        success: false,
        error: 'Technician with this name already exists'
      });
      return;
    }
    
    const newTech: Technician = {
      id,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      company: req.body.company || null,
      certifications: req.body.certifications || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: req.body.metadata || {}
    };
    
    db.technicians.push(newTech);
    await saveDatabase(db);
    
    res.status(201).json({
      success: true,
      data: newTech
    });
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create technician'
    });
  }
});

export default router;
