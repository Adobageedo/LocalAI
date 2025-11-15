import fs from 'fs/promises';
import path from 'path';

/**
 * File system helper functions
 */

/**
 * Ensure directory exists, create if not
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
export async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>}
 */
export async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write JSON file
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeJsonFile(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * List files in directory with filter
 * @param {string} dirPath - Directory path
 * @param {Function} filterFn - Optional filter function
 * @returns {Promise<string[]>}
 */
export async function listFiles(dirPath, filterFn = null) {
  try {
    const files = await fs.readdir(dirPath);
    return filterFn ? files.filter(filterFn) : files;
  } catch (error) {
    return [];
  }
}

/**
 * Copy file from source to destination
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
export async function copyFile(sourcePath, destPath) {
  await fs.copyFile(sourcePath, destPath);
}

/**
 * Get file size in bytes
 * @param {string} filePath - File path
 * @returns {Promise<number>}
 */
export async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Read file as buffer
 * @param {string} filePath - File path
 * @returns {Promise<Buffer>}
 */
export async function readFileBuffer(filePath) {
  return await fs.readFile(filePath);
}

/**
 * Write buffer to file
 * @param {string} filePath - File path
 * @param {Buffer} buffer - Buffer to write
 * @returns {Promise<void>}
 */
export async function writeFileBuffer(filePath, buffer) {
  await fs.writeFile(filePath, buffer);
}

export default {
  ensureDirectory,
  fileExists,
  readJsonFile,
  writeJsonFile,
  listFiles,
  copyFile,
  getFileSize,
  readFileBuffer,
  writeFileBuffer,
};
