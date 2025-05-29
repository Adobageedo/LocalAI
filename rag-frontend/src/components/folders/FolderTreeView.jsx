import React, { useState } from "react";
import { authFetch } from '../../firebase/authFetch';
import { TreeView, TreeItem } from '@mui/lab';
import { Folder, FolderOpen, InsertDriveFile } from '@mui/icons-material';
import { Typography, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function buildTree(folders) {
  // folders: { [folderPath]: [docs] }
  const tree = {};
  Object.entries(folders).forEach(([folderPath, docs]) => {
    const parts = folderPath.split('/');
    let node = tree;
    parts.forEach((part, idx) => {
      if (!node[part]) node[part] = { __children: {}, __docs: [] };
      if (idx === parts.length - 1) node[part].__docs = docs;
      node = node[part].__children;
    });
  });
  return tree;
}

function renderTree(nodes, parentKey = '', onDelete) {
  return Object.entries(nodes).map(([key, value]) => {
    const nodeId = parentKey ? `${parentKey}/${key}` : key;
    return (
      <TreeItem
        key={nodeId}
        nodeId={nodeId}
        label={
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <Folder sx={{ mr: 1 }} />
            <Typography variant="body2">{key}</Typography>
          </span>
        }
      >
        {/* Files in this folder */}
        {value.__docs.map((doc) => (
          <TreeItem
            key={doc.unique_id || doc.doc_id}
            nodeId={doc.unique_id || doc.doc_id}
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InsertDriveFile sx={{ mr: 1 }} />
                <Tooltip title={doc.source_path || ""} placement="top" arrow>
                  <Typography variant="body2">{doc.display_name || doc.attachment_name || (doc.source_path ? doc.source_path.split("/").pop() : "[Unknown]")}</Typography>
                </Tooltip>
                <Typography variant="caption" sx={{ ml: 1 }}>{doc.user}</Typography>
                <Typography variant="caption" sx={{ ml: 1 }}>{doc.date}</Typography>
                <IconButton size="small" onClick={() => onDelete(doc.doc_id)}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </span>
            }
          />
        ))}
        {/* Subfolders */}
        {renderTree(value.__children, nodeId, onDelete)}
      </TreeItem>
    );
  });
}

export default function FolderTreeView({ folders, onDelete }) {
  const [expanded, setExpanded] = useState([]);
  const tree = buildTree(folders);
  return (
    <TreeView
      defaultCollapseIcon={<FolderOpen />}
      defaultExpandIcon={<Folder />}
      expanded={expanded}
      onNodeToggle={(_, nodeIds) => setExpanded(nodeIds)}
      sx={{ flexGrow: 1, overflowY: 'auto', background: '#f7fafc', p: 2, borderRadius: 2 }}
    >
      {renderTree(tree, '', onDelete)}
    </TreeView>
  );
}
