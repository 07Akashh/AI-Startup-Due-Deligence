'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, LogOut, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4 mr-2" /> },
    { href: '/dashboard/reports', label: 'My Reports', icon: <FileText className="h-4 w-4 mr-2" /> },
  ];

  if (!user) {
    return null; // Will redirect via AuthProvider
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex md:flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-foreground">VentureLens</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</span>
            </div>
          </div>
          <div className="mt-4 px-3 py-2 bg-secondary rounded-md flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-semibold text-foreground">{user.credits}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground" 
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/dashboard" className="font-bold text-xl tracking-tight text-foreground">
              VentureLens
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card p-4 flex flex-col space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
               <span className="text-muted-foreground">Credits: <span className="font-semibold text-foreground">{user.credits}</span></span>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
