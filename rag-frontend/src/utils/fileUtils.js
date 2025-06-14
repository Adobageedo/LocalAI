import React from 'react';
// Make sure React is in scope for JSX
import {
  Folder as FolderIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  TextSnippet as TextIcon,
  Archive as ArchiveIcon,
  Language as MarkdownIcon,
} from '@mui/icons-material';

// Decode file names
export const decodeFileName = (fileName) => {
  try {
    return decodeURIComponent(fileName);
  } catch (e) {
    console.error('Error decoding filename', e);
    return fileName;
  }
};

// Format file size with appropriate units
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get appropriate icon for file type
export const getFileIcon = (fileOrItem, sizeOrIsDirectory = 24) => {
  // Handle both usage patterns:
  // 1. getFileIcon(item, size)
  // 2. getFileIcon(fileName, isDirectory, size)
  
  let fileName, isDirectory, size;
  
  if (typeof fileOrItem === 'object') {
    // Case 1: Called with an item object
    fileName = fileOrItem.name;
    isDirectory = fileOrItem.is_directory;
    size = sizeOrIsDirectory;
  } else {
    // Case 2: Called with individual parameters
    fileName = fileOrItem;
    isDirectory = sizeOrIsDirectory;
    size = arguments[2] || 24;
  }
  
  const props = { sx: { fontSize: size } };
  
  if (isDirectory) {
    return {
      icon: 'FolderIcon',
      props: { ...props, sx: { ...props.sx, color: '#1E88E5' } }
    };
  }
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return { icon: 'PdfIcon', props: { ...props, color: 'error' } };
    case 'doc':
    case 'docx':
      return { icon: 'DocumentIcon', props: { ...props, color: 'primary' } };
    case 'xls':
    case 'xlsx':
      return { icon: 'SpreadsheetIcon', props: { ...props, color: 'success' } };
    case 'ppt':
    case 'pptx':
      return { icon: 'PresentationIcon', props: { ...props, color: 'warning' } };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      return { icon: 'ImageIcon', props: { ...props, color: 'secondary' } };
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'mkv':
    case 'webm':
      return { icon: 'VideoIcon', props: { ...props, color: 'error' } };
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
      return { icon: 'AudioIcon', props: { ...props, color: 'primary' } };
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'php':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'go':
    case 'rb':
    case 'swift':
    case 'kt':
      return { icon: 'CodeIcon', props: { ...props, color: 'info' } };
    case 'txt':
    case 'csv':
    case 'json':
    case 'xml':
      return { icon: 'TextIcon', props: { ...props, color: 'default' } };
    case 'md':
    case 'markdown':
      return { icon: 'MarkdownIcon', props: { ...props, color: 'primary' } };
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz':
    case 'tar':
      return { icon: 'ArchiveIcon', props: { ...props, color: 'warning' } };
    default:
      return { icon: 'DocumentIcon', props };
  }
};
