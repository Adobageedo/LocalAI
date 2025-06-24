'use client';

import { useState, useEffect } from 'react';
import { Loader2, File, Folder, RefreshCw, Upload, Download, Plus, Trash2, Share2, ArrowLeft, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import useStore from '@/store/useStore';
import { useDropzone } from 'react-dropzone';
import { create } from 'webdav';

// File/folder type definitions
interface FileItem {
  basename: string;
  filename: string;
  type: 'file' | 'directory';
  mime?: string;
  size?: number;
  lastmod?: string;
  etag?: string;
}

// Create WebDAV client
const createWebDAVClient = (serverUrl: string, username: string, password: string) => {
  return create(
    serverUrl,
    {
      username,
      password,
    }
  );
};

export default function NextcloudExplorerPage() {
  const { connectedAccounts } = useStore();
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [client, setClient] = useState<any>(null);
  
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // File upload state
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
  });

  // Find Nextcloud account if connected
  const nextcloudAccount = connectedAccounts.find(acc => acc.type === 'nextcloud');

  // Initialize WebDAV client when component mounts or when account changes
  useEffect(() => {
    if (nextcloudAccount) {
      // In a real app, we would retrieve these values from the connected account
      // For demo, we're using the values from the memory
      const serverUrl = nextcloudAccount.serverUrl || 'http://localhost:8080/remote.php/webdav';
      const username = nextcloudAccount.username || 'admin';
      const password = nextcloudAccount.password || 'admin_password';
      
      const newClient = createWebDAVClient(serverUrl, username, password);
      setClient(newClient);
    } else {
      setError('No Nextcloud account connected. Please connect an account in Settings.');
      setIsLoading(false);
    }
  }, [nextcloudAccount]);

  // Load files when client is ready or path changes
  useEffect(() => {
    if (client) {
      loadFiles();
    }
  }, [client, currentPath]);

  // Function to load files from current path
  async function loadFiles() {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const directoryItems = await client.getDirectoryContents(currentPath);
      
      // Map items to our format
      const formattedItems = directoryItems.map((item: any) => ({
        basename: item.basename,
        filename: item.filename,
        type: item.type,
        mime: item.mime,
        size: item.size,
        lastmod: item.lastmod,
        etag: item.etag,
      }));
      
      setItems(formattedItems);
      setSelectedItems([]);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files. Please check your connection and try again.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Navigate to a directory
  function navigateTo(path: string) {
    setCurrentPath(path);
  }

  // Navigate to parent directory
  function navigateUp() {
    if (currentPath === '/') return;
    
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
    setCurrentPath(newPath);
  }

  // Handle file selection
  function toggleSelectItem(filename: string) {
    setSelectedItems(prev => 
      prev.includes(filename)
        ? prev.filter(item => item !== filename)
        : [...prev, filename]
    );
  }

  // Handle file drop for upload
  async function handleFileDrop(acceptedFiles: File[]) {
    if (!client) return;
    
    for (const file of acceptedFiles) {
      try {
        toast.loading(`Uploading ${file.name}...`);
        
        const targetPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${file.name}`;
        await client.putFileContents(targetPath, file);
        
        toast.success(`Uploaded ${file.name} successfully!`);
        loadFiles();
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }

  // Create new folder
  async function createFolder() {
    if (!client || !newFolderName) return;
    
    try {
      const folderPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${newFolderName}`;
      await client.createDirectory(folderPath);
      toast.success(`Folder '${newFolderName}' created successfully!`);
      setIsCreateFolderOpen(false);
      setNewFolderName('');
      loadFiles();
    } catch (err) {
      console.error('Failed to create folder:', err);
      toast.error(`Failed to create folder '${newFolderName}'`);
    }
  }

  // Download selected file
  async function downloadFile(filename: string) {
    if (!client) return;
    
    try {
      const filePath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${filename}`;
      const content = await client.getFileContents(filePath, { format: 'binary' });
      
      // Create a download link
      const blob = new Blob([content]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename} successfully!`);
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err);
      toast.error(`Failed to download ${filename}`);
    }
  }

  // Delete selected items
  async function deleteSelectedItems() {
    if (!client || selectedItems.length === 0) return;
    
    for (const itemName of selectedItems) {
      try {
        const itemPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${itemName}`;
        await client.deleteFile(itemPath);
      } catch (err) {
        console.error(`Failed to delete ${itemName}:`, err);
        toast.error(`Failed to delete ${itemName}`);
      }
    }
    
    toast.success(`Deleted ${selectedItems.length} item(s) successfully!`);
    setSelectedItems([]);
    loadFiles();
  }

  // Share selected file
  async function shareSelectedFile() {
    if (!client || selectedItems.length !== 1) return;
    
    try {
      // In a real app, this would call the Nextcloud sharing API
      // For demo purposes, we'll just simulate it
      const fileName = selectedItems[0];
      
      setTimeout(() => {
        const simulatedShareUrl = `https://nextcloud.example.com/s/generated-share-link-for-${fileName}`;
        setShareUrl(simulatedShareUrl);
        setIsShareDialogOpen(true);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to share file:', err);
      toast.error('Failed to share file');
    }
  }

  // Copy share URL to clipboard
  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  }

  // Function to format file size
  function formatFileSize(bytes?: number): string {
    if (bytes === undefined) return 'Unknown';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    
    return (
      <div className="flex items-center space-x-1 overflow-x-auto py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTo('/')}
          className="shrink-0"
        >
          Root
        </Button>
        
        {parts.map((part, i) => {
          const path = `/${parts.slice(0, i + 1).join('/')}`;
          return (
            <div key={path} className="flex items-center">
              <span className="text-muted-foreground">/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo(path)}
                className="shrink-0"
              >
                {part}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Nextcloud Explorer</h1>
        </div>

        {!nextcloudAccount ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-10 space-y-4">
              <div className="text-amber-500 bg-amber-100 dark:bg-amber-950 p-3 rounded-full">
                <Folder className="h-10 w-10" />
              </div>
              <CardTitle>No Nextcloud Account Connected</CardTitle>
              <p className="text-center text-muted-foreground">
                Please connect your Nextcloud account in Settings to use this feature.
              </p>
              <Button onClick={() => window.location.href = '/settings'}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Actions toolbar */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={navigateUp}
                disabled={currentPath === '/'}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Up
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={loadFiles}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Folder
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={selectedItems.length !== 1}
                onClick={() => {
                  const selectedItem = items.find(item => item.basename === selectedItems[0]);
                  if (selectedItem && selectedItem.type === 'file') {
                    downloadFile(selectedItem.basename);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={selectedItems.length === 0}
                onClick={deleteSelectedItems}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={selectedItems.length !== 1}
                onClick={shareSelectedFile}
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              
              <div
                {...getRootProps()}
                className="flex cursor-pointer items-center rounded-md border border-dashed px-3 py-2 text-sm"
              >
                <input {...getInputProps()} />
                <Upload className="h-4 w-4 mr-1" />
                {isDragActive ? 'Drop files here' : 'Upload Files'}
              </div>
            </div>

            {/* Breadcrumb navigation */}
            <Card className="mb-4">
              <CardContent className="p-4">
                {renderBreadcrumbs()}
              </CardContent>
            </Card>

            {/* Files and folders list */}
            <Card>
              <CardHeader>
                <CardTitle>Files and Folders</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="text-center p-8">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">This folder is empty</p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <div className="grid grid-cols-12 gap-2 p-3 border-b bg-muted/50 font-medium">
                      <div className="col-span-1"></div>
                      <div className="col-span-6">Name</div>
                      <div className="col-span-3">Last Modified</div>
                      <div className="col-span-2 text-right">Size</div>
                    </div>
                    <div className="divide-y">
                      {items
                        .sort((a, b) => {
                          // Sort directories first, then by name
                          if (a.type !== b.type) {
                            return a.type === 'directory' ? -1 : 1;
                          }
                          return a.basename.localeCompare(b.basename);
                        })
                        .map((item) => (
                          <div 
                            key={item.basename}
                            className={`grid grid-cols-12 gap-2 p-3 items-center hover:bg-muted/80 cursor-pointer ${
                              selectedItems.includes(item.basename) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleSelectItem(item.basename)}
                            onDoubleClick={() => {
                              if (item.type === 'directory') {
                                navigateTo(item.filename);
                              }
                            }}
                          >
                            <div className="col-span-1">
                              {item.type === 'directory' ? (
                                <Folder className="h-5 w-5 text-primary" />
                              ) : (
                                <File className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="col-span-6 truncate">{item.basename}</div>
                            <div className="col-span-3 text-muted-foreground text-sm">
                              {item.lastmod ? new Date(item.lastmod).toLocaleString() : 'Unknown'}
                            </div>
                            <div className="col-span-2 text-right text-sm text-muted-foreground">
                              {item.type === 'directory' ? '—' : formatFileSize(item.size)}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Folder Name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateFolderOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Share Dialog */}
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Link</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={shareUrl}
                    readOnly
                  />
                </div>
                <DialogFooter>
                  <Button onClick={copyShareUrl}>
                    Copy Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AppLayout>
  );
}
