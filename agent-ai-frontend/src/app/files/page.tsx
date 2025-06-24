'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import ApiService from '@/lib/api';
import useStore from '@/store/useStore';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
}

const FileUpload = ({ onFileAccepted }: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <UploadCloud className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Drag and drop your file here</h3>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, TXT, CSV, and many other file types supported
          </p>
        </div>
      </div>
    </div>
  );
};

interface UploadItemProps {
  file: {
    name: string;
    size: number;
    type: string;
    status: 'uploading' | 'processing' | 'success' | 'error';
    progress?: number;
    error?: string;
  };
}

const UploadItem = ({ file }: UploadItemProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {file.status === 'uploading' && (
              <>
                <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </>
            )}
            {file.status === 'processing' && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {file.status === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {file.status === 'error' && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
        {file.status === 'error' && (
          <p className="text-xs text-red-500 mt-2">{file.error}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function FilesPage() {
  const [uploads, setUploads] = useState<Record<string, any>>({});
  const { documents, setDocuments } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch documents from API
    const fetchDocuments = async () => {
      try {
        const response = await ApiService.documents.list();
        
        if (response.data && Array.isArray(response.data.documents)) {
          // Convert API response to our document format
          const formattedDocs = response.data.documents.map((doc: any) => ({
            id: doc.doc_id || doc.id,
            name: doc.metadata?.filename || 'Document',
            type: doc.metadata?.extension || 'unknown',
            size: doc.metadata?.size || 0,
            uploadedAt: doc.metadata?.creation_date ? new Date(doc.metadata.creation_date) : new Date(),
            source: doc.metadata?.source || 'upload',
            status: 'ready'
          }));
          
          setDocuments(formattedDocs);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Failed to fetch documents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [setDocuments]);

  const handleFileAccepted = async (file: File) => {
    const fileId = Date.now().toString();
    
    // Add file to uploads with 'uploading' status
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      }
    }));

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulating upload progress
      const progressInterval = setInterval(() => {
        setUploads(prev => {
          const fileUpload = prev[fileId];
          if (fileUpload && fileUpload.status === 'uploading' && fileUpload.progress < 90) {
            return {
              ...prev,
              [fileId]: {
                ...fileUpload,
                progress: fileUpload.progress + 10
              }
            };
          }
          return prev;
        });
      }, 500);
      
      // Submit file to API
      const response = await ApiService.files.upload(formData);
      
      clearInterval(progressInterval);
      
      // Update uploads with 'processing' status
      setUploads(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'processing',
          progress: 100
        }
      }));
      
      // Simulate processing delay
      setTimeout(() => {
        // Update uploads with 'success' status
        setUploads(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'success'
          }
        }));
        
        // Add document to store
        const newDocument = {
          id: response.data.doc_id || fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date(),
          source: 'upload',
          status: 'ready'
        };
        
        // Add to documents store
        setDocuments([...documents, newDocument]);
        
        toast.success('File uploaded successfully!');
      }, 1500);
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Update uploads with 'error' status
      setUploads(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          error: 'Failed to upload file. Please try again.'
        }
      }));
      
      toast.error('Failed to upload file');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await ApiService.documents.delete(id);
      
      // Remove document from store
      setDocuments(documents.filter(doc => doc.id !== id));
      
      toast.success('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Files</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Upload documents to be processed by Agent AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFileAccepted={handleFileAccepted} />
          </CardContent>
        </Card>

        {Object.keys(uploads).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Current Uploads</h2>
            {Object.entries(uploads).map(([id, file]) => (
              <UploadItem key={id} file={file} />
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Your Documents</h2>
          
          {isLoading ? (
            <div className="text-center p-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Loading documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate">{doc.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {doc.type} • {(doc.size / 1024).toFixed(2)} KB
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-xs text-muted-foreground">
                      Uploaded on {doc.uploadedAt.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Source: {doc.source}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-12">
                <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documents found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload files or connect to cloud storage to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
