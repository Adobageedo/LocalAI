/**
 * JSON schema for note/point saving
 */

export const saveNoteSchema = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      description: 'Date of the note (YYYY-MM-DD format)',
    },
    windfarm: {
      type: 'string',
      description: 'Name of the windfarm',
    },
    topic: {
      type: 'string',
      description: 'Topic or subject of the note',
    },
    comment: {
      type: 'string',
      description: 'Detailed comment or description',
    },
    type: {
      type: 'string',
      description: 'Type of note: O&M, operational, invoice, contract, meeting, incident, maintenance, etc.',
    },
    company: {
      type: 'string',
      description: 'Company name (optional)',
    },
  },
  required: ['date', 'windfarm', 'topic', 'comment', 'type'],
};

export default {
  saveNoteSchema,
};
