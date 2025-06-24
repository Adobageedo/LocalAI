'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { useTheme } from 'next-themes';
import { signOutUser } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { Input } from '@/components/ui/input';

// Predefined agent personas
const AGENT_PERSONAS = [
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Helps analyze and visualize data',
    avatar: '📊',
  },
  {
    id: 'email-assistant',
    name: 'Email Assistant',
    description: 'Helps manage and summarize emails',
    avatar: '📧',
  },
  {
    id: 'document-explorer',
    name: 'Document Explorer',
    description: 'Helps navigate and extract information from documents',
    avatar: '📄',
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Helps with research and information gathering',
    avatar: '🔍',
  },
];

type ConnectionFormProps = {
  type: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
  }>;
  onSave: (data: any) => void;
  isConnected: boolean;
  onDisconnect: () => void;
};

const ConnectionForm = ({
  type,
  title,
  description,
  fields,
  onSave,
  isConnected,
  onDisconnect,
}: ConnectionFormProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Connected
              </p>
            </div>
            <Button variant="outline" onClick={onDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              </div>
            ))}
            <Button type="submit">Connect</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { connectedAccounts, addConnectedAccount, removeConnectedAccount, currentAgent, setCurrentAgent } = useStore();
  const [language, setLanguage] = useState('en');

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out', error);
      toast.error('Failed to sign out');
    }
  };

  // Handle connection for Nextcloud
  const handleConnectNextcloud = (data: any) => {
    // Simulate connecting to Nextcloud
    toast.loading('Connecting to Nextcloud...');
    
    setTimeout(() => {
      try {
        // In a real app, this would be an API call
        addConnectedAccount({
          id: `nextcloud-${Date.now()}`,
          type: 'nextcloud',
          username: data.username,
          serverUrl: data.serverUrl,
          lastSync: new Date(),
          status: 'connected',
        });
        
        toast.success('Connected to Nextcloud successfully!');
      } catch (error) {
        console.error('Error connecting to Nextcloud:', error);
        toast.error('Failed to connect to Nextcloud');
      }
    }, 1500);
  };

  // Handle connection for Gmail
  const handleConnectGmail = (data: any) => {
    // Simulate connecting to Gmail
    toast.loading('Connecting to Gmail...');
    
    setTimeout(() => {
      try {
        // In a real app, this would be an API call
        addConnectedAccount({
          id: `gmail-${Date.now()}`,
          type: 'gmail',
          email: data.email,
          lastSync: new Date(),
          status: 'connected',
        });
        
        toast.success('Connected to Gmail successfully!');
      } catch (error) {
        console.error('Error connecting to Gmail:', error);
        toast.error('Failed to connect to Gmail');
      }
    }, 1500);
  };

  // Handle connection for Outlook
  const handleConnectOutlook = (data: any) => {
    // Simulate connecting to Outlook
    toast.loading('Connecting to Outlook...');
    
    setTimeout(() => {
      try {
        // In a real app, this would be an API call using the Azure auth flow
        // Note: Would use the tenant_id, client_id, and client_secret from memory
        addConnectedAccount({
          id: `outlook-${Date.now()}`,
          type: 'outlook',
          email: data.email,
          lastSync: new Date(),
          status: 'connected',
        });
        
        toast.success('Connected to Outlook successfully!');
      } catch (error) {
        console.error('Error connecting to Outlook:', error);
        toast.error('Failed to connect to Outlook');
      }
    }, 1500);
  };

  // Handle disconnection for accounts
  const handleDisconnectAccount = (type: string) => {
    const account = connectedAccounts.find((acc) => acc.type === type);
    
    if (!account) return;
    
    // Simulate disconnecting
    toast.loading(`Disconnecting ${type}...`);
    
    setTimeout(() => {
      try {
        // In a real app, this would be an API call
        removeConnectedAccount(account.id);
        toast.success(`Disconnected from ${type} successfully!`);
      } catch (error) {
        console.error(`Error disconnecting from ${type}:`, error);
        toast.error(`Failed to disconnect from ${type}`);
      }
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="theme-toggle" className="text-sm">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </Label>
                <Switch
                  id="theme-toggle"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </div>
          
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language</Label>
              <Select
                value={language}
                onValueChange={setLanguage}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This will affect the language used for AI responses
              </p>
            </div>
          
            <div className="pt-4 border-t">
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agent Customization */}
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Preferences</CardTitle>
            <CardDescription>Customize your AI assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label htmlFor="default-agent">Default Agent</Label>
              <Select
                value={currentAgent?.id || AGENT_PERSONAS[0].id}
                onValueChange={(value) => {
                  const agent = AGENT_PERSONAS.find((a) => a.id === value);
                  if (agent) setCurrentAgent(agent);
                }}
              >
                <SelectTrigger id="default-agent">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_PERSONAS.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center">
                        <span className="mr-2">{agent.avatar}</span>
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <h2 className="text-xl font-semibold mt-8">Connected Services</h2>

        {/* Nextcloud Connection */}
        <ConnectionForm
          type="nextcloud"
          title="Nextcloud"
          description="Connect to your Nextcloud instance to synchronize files"
          fields={[
            {
              name: 'serverUrl',
              label: 'Server URL',
              type: 'url',
              placeholder: 'https://nextcloud.example.com',
              required: true,
            },
            {
              name: 'username',
              label: 'Username',
              type: 'text',
              placeholder: 'admin',
              required: true,
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              placeholder: '••••••••',
              required: true,
            },
          ]}
          onSave={handleConnectNextcloud}
          isConnected={!!connectedAccounts.find(acc => acc.type === 'nextcloud')}
          onDisconnect={() => handleDisconnectAccount('nextcloud')}
        />

        {/* Gmail Connection */}
        <ConnectionForm
          type="gmail"
          title="Gmail"
          description="Connect your Gmail account to synchronize emails"
          fields={[
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'yourname@gmail.com',
              required: true,
            },
          ]}
          onSave={handleConnectGmail}
          isConnected={!!connectedAccounts.find(acc => acc.type === 'gmail')}
          onDisconnect={() => handleDisconnectAccount('gmail')}
        />

        {/* Outlook Connection */}
        <ConnectionForm
          type="outlook"
          title="Outlook"
          description="Connect your Outlook/Microsoft account to synchronize emails"
          fields={[
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'yourname@outlook.com',
              required: true,
            },
          ]}
          onSave={handleConnectOutlook}
          isConnected={!!connectedAccounts.find(acc => acc.type === 'outlook')}
          onDisconnect={() => handleDisconnectAccount('outlook')}
        />
        
      </div>
    </AppLayout>
  );
}
