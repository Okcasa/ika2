'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Briefcase, Users, Store, BadgeDollarSign, Megaphone, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';

const sidebarItems = [
  { icon: Store, label: 'Shop', href: '/shop' },
  { icon: Briefcase, label: 'My Leads', href: '/leads' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: BadgeDollarSign, label: 'Income', href: '/income' },
  { icon: Megaphone, label: 'Promote', href: '/promote' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check initial theme
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('leadsorter_theme', newTheme);
  };

  return (
    <div className="w-64 border-r bg-card h-screen flex flex-col p-4 fixed left-0 top-0 hidden md:flex z-50">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <div className="h-4 w-4 bg-primary-foreground rounded-sm" />
        </div>
        <span className="text-xl font-bold">Workspace</span>
      </div>

      <nav className="space-y-1 flex-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/leads' && pathname === '/products'); // Fallback if user manually goes there
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
              {item.label === 'Shop' && (
                 <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between px-3">
             <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleTheme}>
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </Button>
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Joyce</span>
            <span className="text-xs text-muted-foreground">Pro Member</span>
          </div>
        </div>
      </div>
    </div>
  );
}
