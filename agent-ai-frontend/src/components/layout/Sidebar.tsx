'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessageSquare, 
  FolderOpen, 
  Settings, 
  Mail, 
  Database, 
  Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useStore from '@/store/useStore';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen } = useStore();
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return null;
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
    },
    {
      name: 'Files',
      href: '/files',
      icon: FolderOpen,
    },
    {
      name: 'Gmail',
      href: '/sources/gmail',
      icon: Mail,
    },
    {
      name: 'Outlook',
      href: '/sources/outlook',
      icon: Mail,
    },
    {
      name: 'Nextcloud',
      href: '/sources/nextcloud',
      icon: Cloud,
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: Database,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}
    >
      <nav className="flex h-full flex-col gap-2 p-4">
        <div className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent',
                pathname === item.href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          ))}
        </div>
        
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Agent AI</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}
