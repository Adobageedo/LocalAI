'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Inbox, FileText, Database, Cloud } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import ApiService from '@/lib/api';
import useStore from '@/store/useStore';
import { toast } from 'sonner';

export default function Dashboard() {
  const { connectedAccounts, documents } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentStats = async () => {
      try {
        const response = await ApiService.documents.stats();
        setStats(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching document stats:', error);
        setIsLoading(false);
      }
    };

    fetchDocumentStats();
  }, []);

  const handleSyncAccount = async (accountType: string) => {
    try {
      toast.loading(`Syncing ${accountType}...`);
      
      if (accountType === 'gmail') {
        await ApiService.sources.gmail.sync();
      } else if (accountType === 'outlook') {
        await ApiService.sources.outlook.sync();
      } else if (accountType === 'nextcloud') {
        await ApiService.sources.nextcloud.sync();
      }
      
      toast.success(`${accountType} synced successfully!`);
      
      // Refresh document stats after sync
      const response = await ApiService.documents.stats();
      setStats(response.data);
    } catch (error) {
      console.error(`Error syncing ${accountType}:`, error);
      toast.error(`Failed to sync ${accountType}`);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Document Stats</CardTitle>
                <CardDescription>Your indexed documents</CardDescription>
              </div>
              <Database className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted"></div>
                  <div className="h-4 w-1/2 rounded bg-muted"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Documents</span>
                    <span className="text-sm">{stats?.total_documents || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Document Types</span>
                    <span className="text-sm">{stats?.type_count || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/documents">View All Documents</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Gmail Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gmail</CardTitle>
                <CardDescription>Email synchronization</CardDescription>
              </div>
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  {connectedAccounts.find(acc => acc.type === 'gmail') ? (
                    <>
                      <p className="text-green-600 dark:text-green-400">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Last synced: {connectedAccounts.find(acc => acc.type === 'gmail')?.lastSync?.toLocaleDateString() || 'Never'}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400">Not connected</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-1/2"
                onClick={() => handleSyncAccount('gmail')}
                disabled={!connectedAccounts.find(acc => acc.type === 'gmail')}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Sync
              </Button>
              <Button asChild variant="outline" size="sm" className="w-1/2">
                <Link href="/sources/gmail">Configure</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Outlook Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outlook</CardTitle>
                <CardDescription>Email synchronization</CardDescription>
              </div>
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  {connectedAccounts.find(acc => acc.type === 'outlook') ? (
                    <>
                      <p className="text-green-600 dark:text-green-400">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Last synced: {connectedAccounts.find(acc => acc.type === 'outlook')?.lastSync?.toLocaleDateString() || 'Never'}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400">Not connected</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-1/2"
                onClick={() => handleSyncAccount('outlook')}
                disabled={!connectedAccounts.find(acc => acc.type === 'outlook')}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Sync
              </Button>
              <Button asChild variant="outline" size="sm" className="w-1/2">
                <Link href="/sources/outlook">Configure</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Nextcloud Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Nextcloud</CardTitle>
                <CardDescription>File synchronization</CardDescription>
              </div>
              <Cloud className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  {connectedAccounts.find(acc => acc.type === 'nextcloud') ? (
                    <>
                      <p className="text-green-600 dark:text-green-400">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Last synced: {connectedAccounts.find(acc => acc.type === 'nextcloud')?.lastSync?.toLocaleDateString() || 'Never'}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400">Not connected</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-1/2"
                onClick={() => handleSyncAccount('nextcloud')}
                disabled={!connectedAccounts.find(acc => acc.type === 'nextcloud')}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Sync
              </Button>
              <Button asChild variant="outline" size="sm" className="w-1/2">
                <Link href="/sources/nextcloud">Configure</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Recent Files Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Last 5 documents</CardDescription>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent documents</p>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/files">Manage Files</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
