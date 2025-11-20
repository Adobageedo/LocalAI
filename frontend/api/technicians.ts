import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';

// Path to technicians database
const TECHNICIANS_DB_PATH = path.resolve(process.cwd(), '..', 'mcp/data/technicians_database.json');

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
          // Get single technician
          const db = await loadDatabase();
          const technician = db.technicians.find(t => t.id === id);
          
          if (!technician) {
            return res.status(404).json({
              success: false,
              error: 'Technician not found'
            });
          }
          
          return res.status(200).json({
            success: true,
            data: technician
          });
        } else {
          // Get all technicians
          const db = await loadDatabase();
          return res.status(200).json({
            success: true,
            data: db.technicians,
            total: db.technicians.length
          });
        }

      case 'POST':
        // Create new technician
        const db = await loadDatabase();
        const { first_name, last_name, phone, email, company, certifications, metadata } = req.body;
        
        // Generate ID from name
        const newId = `${first_name}_${last_name}`.toLowerCase().replace(/\s+/g, '_');
        
        // Check if already exists
        if (db.technicians.some(t => t.id === newId)) {
          return res.status(409).json({
            success: false,
            error: 'Technician with this name already exists'
          });
        }
        
        const newTech: Technician = {
          id: newId,
          first_name,
          last_name,
          phone: phone || null,
          email: email || null,
          company: company || null,
          certifications: certifications || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: metadata || {}
        };
        
        db.technicians.push(newTech);
        await saveDatabase(db);
        
        return res.status(201).json({
          success: true,
          data: newTech
        });

      case 'PUT':
        // Update technician
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Technician ID is required'
          });
        }
        
        const updateDb = await loadDatabase();
        const index = updateDb.technicians.findIndex(t => t.id === id);
        
        if (index === -1) {
          return res.status(404).json({
            success: false,
            error: 'Technician not found'
          });
        }
        
        const existingTech = updateDb.technicians[index];
        const updatedTech: Technician = {
          ...existingTech,
          ...req.body,
          id: existingTech.id,
          created_at: existingTech.created_at,
          updated_at: new Date().toISOString()
        };
        
        updateDb.technicians[index] = updatedTech;
        await saveDatabase(updateDb);
        
        return res.status(200).json({
          success: true,
          data: updatedTech
        });

      case 'DELETE':
        // Delete technician
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Technician ID is required'
          });
        }
        
        const deleteDb = await loadDatabase();
        const deleteIndex = deleteDb.technicians.findIndex(t => t.id === id);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Technician not found'
          });
        }
        
        deleteDb.technicians.splice(deleteIndex, 1);
        await saveDatabase(deleteDb);
        
        return res.status(200).json({
          success: true,
          message: 'Technician deleted successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Technicians API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
