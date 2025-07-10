// /Users/edoardo/Documents/LocalAI/rag-frontend/src/utils/sourceHandler.js
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

// Ensure API_BASE_URL is available for source handling

/**
 * Utility functions to handle different types of sources in chat responses
 */

/**
 * Open a source based on its type
 * @param {Object} source - The source object with type and path information
 * @returns {Object} Result of the operation with success status and message
 */
export const openSource = (source) => {
  try {
    if (!source) {
      return { success: false, message: 'Invalid source data' };
    }

    // Get source type and path
    const sourceType = source.type || detectSourceType(source.source || source.path || '');
    const sourcePath = source.source || source.path || '';
    
    if (!sourcePath) {
      return { success: false, message: 'No source path found' };
    }

    switch (sourceType) {
      case 'personal_storage':
        return downloadPersonalFile(sourcePath);
      
      case 'google_storage':
        return openGoogleDriveFile(sourcePath);
      
      case 'google_email':
        return openGmailEmail(sourcePath);
      
      case 'microsoft_email':
        return openOutlookEmail(sourcePath);
      
      default:
        // Default to download for unknown types
        return downloadPersonalFile(sourcePath);
    }
  } catch (error) {
    console.error('Error handling source:', error);
    return { 
      success: false, 
      message: `Error opening source: ${error.message}` 
    };
  }
};

/**
 * Get source type from path if not explicitly provided
 */
export const detectSourceType = (path, explicitType = null) => {
  // If explicit type is provided, use it
  if (explicitType) return explicitType;
  
  // Handle the new format "filename|source"
  let sourcePath = path;
  if (path.includes('|')) {
    const parts = path.split('|');
    sourcePath = parts.length > 1 ? parts[1] : path;
  }
  
  // Otherwise detect from path
  if (sourcePath.startsWith('/google_email/')) {
    return 'google_email';
  } else if (sourcePath.startsWith('/microsoft_email/')) {
    return 'microsoft_email';
  } else if (sourcePath.startsWith('/google_drive/') || sourcePath.startsWith('/google_storage/')) {
    return 'google_storage';
  } else {
    return 'personal_storage';
  }
};

/**
 * Download a file from personal storage
 */
const downloadPersonalFile = async (path) => {
  if (!path) return { success: false, message: 'Invalid file path' };
  
  const prefix = '/personal_storage/';
  let part=path.split('|');
  let cleanpath=part[1].startsWith(prefix) ? part[1].slice(prefix.length) : part[1];
  try {
    const response = await authFetch(`${API_BASE_URL}/db/download?path=${encodeURIComponent(cleanpath)}`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement: ${response.status}`);
    }
    const blob = await response.blob();
    // Création d'une URL pour le téléchargement
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // Extraction du nom de fichier depuis le chemin
    const fileName = path.split('/').pop();
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return blob;
  } catch (error) {
    console.error('Erreur downloadFile:', error);
    throw error;
  }
  
};

/**
 * Open a Google Drive file in a new tab
 */
const openGoogleDriveFile = (path) => {
  try {
    // Extract file ID from the path
    const fileId = extractGoogleFileId(path);
    if (!fileId) {
      return { success: false, message: 'Could not extract Google Drive file ID' };
    }
    
    // Open Google Drive viewer in a new tab
    const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
    window.open(driveUrl, '_blank');
    
    return { 
      success: true, 
      message: 'Opening file in Google Drive...' 
    };
  } catch (error) {
    console.error('Error opening Google Drive file:', error);
    return { 
      success: false, 
      message: `Error opening Google Drive file: ${error.message}` 
    };
  }
};

/**
 * Extract Google Drive file ID from path
 */
const extractGoogleFileId = (path) => {
  if (!path) return null;
  
  // Try to extract the file ID from the path
  // Format could be: /google_drive/user_id/file_id/filename
  const parts = path.split('/');
  if (parts.length >= 4) {
    return parts[3]; // This should be the file ID
  }
  
  return null;
};

/**
 * Open a Gmail email in a new tab
 */
const openGmailEmail = (source) => {
  try {
    // Extract email ID from source
    console.log("source open gmail", source);
    const emailId = source.id || extractEmailId(source);
    if (!emailId) {
      return { success: false, message: 'Could not extract Gmail message ID' };
    }
    
    // Open Gmail with the specific message ID
    const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${emailId}`;
    window.open(gmailUrl, '_blank');
    
    return { 
      success: true, 
      message: 'Opening email in Gmail...' 
    };
  } catch (error) {
    console.error('Error opening Gmail email:', error);
    return { 
      success: false, 
      message: `Error opening Gmail email: ${error.message}` 
    };
  }
};

/**
 * Open a Microsoft email in a new tab
 */
const openOutlookEmail = (source) => {
  try {
    // Extract email ID from source
    const emailId = source.id || extractEmailId(source);
    if (!emailId) {
      return { success: false, message: 'Could not extract Microsoft message ID' };
    }
    
    // Open Outlook with the specific message ID
    const outlookUrl = `https://outlook.office.com/mail/inbox/id/${emailId}`;
    window.open(outlookUrl, '_blank');
    
    return { 
      success: true, 
      message: 'Opening email in Outlook...' 
    };
  } catch (error) {
    console.error('Error opening Microsoft email:', error);
    return { 
      success: false, 
      message: `Error opening Microsoft email: ${error.message}` 
    };
  }
};

/**
 * Extract email ID from path
 */
const extractEmailId = (path) => {
  if (!path) return null;
  
  // Try to extract the email ID from the path
  // Format could be: /google_email/user_id/conversation_id/email_id
  // or: /microsoft_email/user_id/folder_id/email_id
  const parts = path.split('|');
  if (parts.length >= 4) {
    console.log("path", parts);
    console.log("parts", parts[2]);
    return parts[2]; // Last part should be the email ID
  }
  
  return null;
};

/**
 * Get file name from path
 */
export const getFileName = (path) => {
  if (!path) return 'Unknown Document';
  
  // Handle the new format "filename|source"
  if (path.includes('|')) {
    const [filename, _] = path.split('|');
    return filename;
  }
  
  // Original behavior for backward compatibility
  const parts = path.split('/');
  return parts[parts.length - 1];
};

/**
 * Get source icon based on source type and file extension
 * @param {Object} source - The source object
 * @returns {string} Icon name to use
 */
export const getSourceIcon = (source) => {
  if (!source) return 'file';
  
  const sourceType = source.type || detectSourceType(source.source || source.path || '');
  const path = source.source || source.path || '';
  
  switch (sourceType) {
    case 'google_email':
      return 'email';
    case 'microsoft_email':
      return 'email';
    case 'google_storage':
      return getFileIconByExtension(path);
    case 'personal_storage':
    default:
      return getFileIconByExtension(path);
  }
};

/**
 * Get appropriate icon based on file extension
 */
const getFileIconByExtension = (path) => {
  if (!path) return 'file';
  
  const extension = path.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
    case 'ppt':
    case 'pptx':
      return 'powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return 'image';
    case 'mp4':
    case 'avi':
    case 'mov':
      return 'video';
    default:
      return 'file';
  }
};

/**
 * Get display name for source
 */
export const getSourceDisplayName = (source) => {
  if (!source) return 'Unknown Source';
  
  const sourceType = source.type || detectSourceType(source.source || source.path || '');
  const path = source.source || source.path || '';
  const parts = path.split('|');
  let name=parts[0];
  if (name.endsWith(".eml")) {
    name = "Email : " + name.slice(0, -4);  // remove last 4 characters
  }
  switch (sourceType) {
    case 'google_email':
      return name || 'Gmail Email';
    case 'microsoft_email':
      return name || 'Outlook Email';
    case 'google_storage':
      return name || getFileName(path);
    case 'personal_storage':
    default:
      return name || getFileName(path);
  }
};
