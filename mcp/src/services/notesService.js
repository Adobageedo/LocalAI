import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Service for managing notes/points in JSON database
 */
class NotesService {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.dbPath = path.join(baseDir, 'notes_database.json');
  }

  /**
   * Load notes database
   */
  async load() {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      logger.info('Notes database not found, creating new one');
      return { notes: [] };
    }
  }

  /**
   * Save notes database
   */
  async save(data) {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info('Notes database saved', { path: this.dbPath, count: data.notes.length });
  }

  /**
   * Add a new note/point to the database
   * @param {Object} note - Note object with date, windfarm, topic, comment, type, company
   */
  async addNote(note) {
    const { date, windfarm, topic, comment, type, company } = note;

    // Validate required fields
    if (!date || !windfarm || !topic || !comment || !type) {
      throw new Error('Missing required fields: date, windfarm, topic, comment, type are required');
    }

    // Load current database
    const db = await this.load();

    // Create new note with ID and timestamp
    const newNote = {
      id: Date.now().toString(),
      date: date,
      windfarm: windfarm,
      topic: topic,
      comment: comment,
      type: type,
      company: company || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to database
    db.notes.push(newNote);

    // Save
    await this.save(db);

    logger.info('Note added', { id: newNote.id, windfarm, topic, type });

    return {
      success: true,
      note: newNote,
      total_notes: db.notes.length
    };
  }

  /**
   * Get all notes
   */
  async getAllNotes() {
    const db = await this.load();
    return db.notes;
  }

  /**
   * Get notes by filter
   */
  async getNotesByFilter(filter) {
    const db = await this.load();
    let notes = db.notes;

    if (filter.windfarm) {
      notes = notes.filter(n => n.windfarm.toLowerCase().includes(filter.windfarm.toLowerCase()));
    }

    if (filter.type) {
      notes = notes.filter(n => n.type.toLowerCase() === filter.type.toLowerCase());
    }

    if (filter.company) {
      notes = notes.filter(n => n.company.toLowerCase().includes(filter.company.toLowerCase()));
    }

    if (filter.date_from) {
      notes = notes.filter(n => new Date(n.date) >= new Date(filter.date_from));
    }

    if (filter.date_to) {
      notes = notes.filter(n => new Date(n.date) <= new Date(filter.date_to));
    }

    return notes;
  }
}

export default NotesService;
