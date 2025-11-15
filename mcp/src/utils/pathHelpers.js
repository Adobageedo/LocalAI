import path from 'path';

/**
 * Path manipulation helper functions
 */

/**
 * Sanitize filename to remove invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Generate timestamp-based filename
 * @param {string} baseName - Base name for the file
 * @param {string} extension - File extension (without dot)
 * @returns {string} Filename with timestamp
 */
export function generateTimestampFilename(baseName, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedBase = sanitizeFilename(baseName);
  return `${sanitizedBase}_${timestamp}.${extension}`;
}

/**
 * Build structured path for documents
 * @param {string} baseDir - Base directory
 * @param {string} category - Category/subfolder
 * @param {string} filename - Filename
 * @returns {string} Complete path
 */
export function buildDocumentPath(baseDir, category, filename) {
  const sanitizedCategory = sanitizeFilename(category);
  return path.join(baseDir, sanitizedCategory, filename);
}

/**
 * Extract filename without extension
 * @param {string} filename - Filename with extension
 * @returns {string} Filename without extension
 */
export function getBaseName(filename) {
  return path.basename(filename, path.extname(filename));
}

/**
 * Get file extension (with dot)
 * @param {string} filename - Filename
 * @returns {string} Extension including dot
 */
export function getExtension(filename) {
  return path.extname(filename);
}

/**
 * Resolve path from project root
 * @param {string} relativePath - Relative path from root
 * @param {string} rootDir - Root directory
 * @returns {string} Absolute path
 */
export function resolveFromRoot(relativePath, rootDir) {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(rootDir, relativePath);
}

/**
 * Join path segments safely
 * @param {...string} segments - Path segments
 * @returns {string} Joined path
 */
export function joinPath(...segments) {
  return path.join(...segments);
}

/**
 * Normalize path (resolve '..' and '.')
 * @param {string} inputPath - Input path
 * @returns {string} Normalized path
 */
export function normalizePath(inputPath) {
  return path.normalize(inputPath);
}

export default {
  sanitizeFilename,
  generateTimestampFilename,
  buildDocumentPath,
  getBaseName,
  getExtension,
  resolveFromRoot,
  joinPath,
  normalizePath,
};
