import { createToolDefinition } from '../lib/mcpHelpers.js';
import { saveNoteSchema } from '../schemas/noteSchema.js';
import { ToolExecutionError, ValidationError } from '../lib/errors.js';
import NotesService from '../services/notesService.js';
import config from '../config/index.js';
import { validateRequiredFields, isValidDate } from '../utils/validators.js';
import logger from '../utils/logger.js';

/**
 * Tool: save_note
 * Save a note/point to the database
 */

// Initialize notes service
const notesService = new NotesService(config.documents.baseFolder);

// ==================== TOOL DEFINITION ====================

export const toolDefinition = createToolDefinition(
  'save_note',
  'Save a note/point to the database with date, windfarm, topic, comment, type (O&M, operational, invoice, etc.), and company',
  saveNoteSchema
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate note data
 * @param {Object} noteData - Note data to validate
 * @throws {ValidationError} If validation fails
 */
function validateNoteData(noteData) {
  const { date, windfarm, topic, comment, type } = noteData;

  // Validate required fields
  validateRequiredFields(
    noteData,
    ['date', 'windfarm', 'topic', 'comment', 'type'],
    'Note'
  );

  // Validate date format
  if (!isValidDate(date)) {
    throw new ValidationError(
      'Invalid date format. Expected YYYY-MM-DD'
    );
  }

  // Validate type is a valid note type
  const validTypes = ['O&M', 'operational', 'invoice', 'contract', 'meeting', 'incident', 'maintenance', 'other'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Invalid note type. Must be one of: ${validTypes.join(', ')}`
    );
  }
}

// ==================== TOOL HANDLER ====================

/**
 * Handler for save_note tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Save result
 */
export async function handler(args) {
  const { date, windfarm, topic, comment, type, company } = args;

  try {
    logger.info('Saving note', {
      date,
      windfarm,
      topic,
      type,
    });

    // Validate note data
    validateNoteData(args);

    // Prepare note object
    const noteData = {
      date,
      windfarm,
      topic,
      comment,
      type,
      company: company || '',
    };

    // Save note using notes service
    const result = await notesService.addNote(noteData);

    logger.info('Note saved successfully', {
      noteId: result.note.id,
      windfarm,
      type,
    });

    return {
      ...result,
      message: 'Note saved successfully',
    };
  } catch (error) {
    logger.error('Error saving note', {
      error: error.message,
      stack: error.stack,
      date,
      windfarm,
      type,
    });

    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ToolExecutionError(
      'save_note',
      error.message,
      error
    );
  }
}

// ==================== EXPORTS ====================

export default {
  toolDefinition,
  handler,
};
