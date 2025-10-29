/**
 * Stream Types
 * Types pour le streaming de contenu
 * Migré depuis /frontend/src/services/composeService.ts
 */

/**
 * Type de chunk de streaming
 */
export type StreamChunkType = 'chunk' | 'done' | 'error';

/**
 * Chunk de streaming
 */
export interface StreamChunk {
  type: StreamChunkType;
  delta?: string;
  message?: string;
  metadata?: StreamMetadata;
}

/**
 * Métadonnées de streaming
 */
export interface StreamMetadata {
  tokensUsed?: number;
  model?: string;
  temperature?: number;
  generationTime?: number;
  finishReason?: 'stop' | 'length' | 'error';
}

/**
 * Configuration de streaming
 */
export interface StreamConfig {
  onChunk: (chunk: StreamChunk) => void;
  onComplete?: (metadata?: StreamMetadata) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Status de streaming
 */
export interface StreamStatus {
  isStreaming: boolean;
  chunksReceived: number;
  totalTokens?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Événement de streaming
 */
export interface StreamEvent {
  type: 'start' | 'chunk' | 'end' | 'error';
  data?: any;
  timestamp: Date;
}

/**
 * Connexion de streaming
 */
export interface StreamConnection {
  id: string;
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  startedAt: Date;
  lastChunkAt?: Date;
}

/**
 * Helper pour créer un chunk
 */
export function createStreamChunk(
  type: StreamChunkType,
  delta?: string,
  message?: string,
  metadata?: StreamMetadata
): StreamChunk {
  return { type, delta, message, metadata };
}

/**
 * Helper pour vérifier si c'est un chunk de données
 */
export function isDataChunk(chunk: StreamChunk): chunk is StreamChunk & { delta: string } {
  return chunk.type === 'chunk' && chunk.delta !== undefined;
}

/**
 * Helper pour vérifier si c'est un chunk de fin
 */
export function isDoneChunk(chunk: StreamChunk): boolean {
  return chunk.type === 'done';
}

/**
 * Helper pour vérifier si c'est un chunk d'erreur
 */
export function isErrorChunk(chunk: StreamChunk): chunk is StreamChunk & { message: string } {
  return chunk.type === 'error' && chunk.message !== undefined;
}
