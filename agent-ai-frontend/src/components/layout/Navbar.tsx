'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/lib/firebase';
import useStore from '@/store/useStore';

export default function Navbar() {
  const { currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useStore();
  
  const userInitials = currentUser?.displayName
    ? currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  const handleSignOut = async () => {
    try {
      await signOutUser();
      // No need for navigation as the AuthProvider will redirect to login
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Agent AI</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/dashboard" className={`transition-colors hover:text-foreground/80 ${pathname === '/dashboard' ? 'text-foreground font-medium' : 'text-foreground/60'}`}>
            Dashboard
          </Link>
          <Link href="/chat" className={`transition-colors hover:text-foreground/80 ${pathname === '/chat' ? 'text-foreground font-medium' : 'text-foreground/60'}`}>
            Chat
          </Link>
          <Link href="/files" className={`transition-colors hover:text-foreground/80 ${pathname === '/files' ? 'text-foreground font-medium' : 'text-foreground/60'}`}>
            Files
          </Link>
          <Link href="/settings" className={`transition-colors hover:text-foreground/80 ${pathname === '/settings' ? 'text-foreground font-medium' : 'text-foreground/60'}`}>
            Settings
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-foreground/60 hover:text-foreground"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>

          {/* User menu */}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    {currentUser.photoURL ? (
                      <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || 'User'} />
                    ) : (
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="p-2 text-sm font-medium">
                  {currentUser.displayName || currentUser.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
