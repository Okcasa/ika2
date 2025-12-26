'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Package,
  Users,
  Store,
  CheckSquare,
  Megaphone,
  Moon,
  Sun,
  LogOut,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const sidebarItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/shop' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: Users, label: 'Leads', href: '/customers' },
  { icon: Store, label: 'Logs', href: '/logs' },
  { icon: CheckSquare, label: 'Income', href: '/income' },
  { icon: Megaphone, label: 'Promote', href: '/promote' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [theme, setTheme] = useState('light');
  const [width, setWidth] = useState(256); // Default 64 * 4 = 256px
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true);
    document.body.style.userSelect = 'none'; // Prevent text selection
    document.body.style.cursor = 'col-resize'; // Keep cursor consistent
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.userSelect = ''; // Re-enable text selection
    document.body.style.cursor = ''; // Reset cursor
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 240 && newWidth <= 480) { // Min 240px to keep title visible, Max 480px
          setWidth(newWidth);
          // Set CSS variable for main content to use
          document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Initial set
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, []);

  useEffect(() => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
        title: "Logged out",
        description: "You have been successfully logged out."
    });
    router.push('/');
  };

  return (
    <div 
      ref={sidebarRef}
      className="h-screen flex flex-col p-6 fixed left-0 top-0 hidden md:flex z-50 bg-[#E5E4E2] group border-r border-stone-300"
      style={{ width: width }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 w-4 h-full cursor-col-resize hover:bg-stone-300/30 active:bg-stone-400/50 transition-colors z-50 flex items-center justify-center"
        onMouseDown={startResizing}
      >
        <div className="w-[4px] h-full bg-stone-400 group-hover:bg-stone-600 transition-colors rounded-full" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="h-10 w-10 min-w-[2.5rem] bg-[#1C1917] text-[#E5E4E2] rounded-full flex items-center justify-center">
            <LayoutGrid className="h-6 w-6" />
        </div>
        {width > 220 && (
           <span className="font-bold text-xl text-stone-800 truncate">Ika Platform</span>
        )}
      </div>

      <div className="px-2 mb-4 text-xs font-semibold text-stone-400 uppercase tracking-wider truncate">
        Dashboard
      </div>

      <nav className="space-y-1 flex-1 overflow-x-hidden">
        {sidebarItems.map((item) => {
          const isActive = (pathname === '/shop' && item.label === 'Dashboard') || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-white text-[#1C1917] shadow-sm"
                  : "text-stone-500 hover:bg-white/50 hover:text-[#1C1917]"
              )}
            >
              <item.icon className={cn("h-5 w-5 min-w-[1.25rem] mr-3", isActive ? "text-[#1C1917]" : "text-stone-400")} />
              <span className="truncate opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
              {isActive && width > 220 && (
                 <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1C1917]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 overflow-x-hidden">
        <div className="flex flex-col gap-2">
            <Button variant="ghost" className="justify-start gap-3 text-stone-500 hover:bg-white/50 rounded-xl h-12 w-full" onClick={toggleTheme}>
                {theme === 'dark' ? <Moon className="h-5 w-5 min-w-[1.25rem]" /> : <Sun className="h-5 w-5 min-w-[1.25rem]" />}
                <span className="truncate">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>
            <Button variant="ghost" className="justify-start gap-3 text-stone-500 hover:text-destructive hover:bg-red-50 rounded-xl h-12 w-full" onClick={handleLogout}>
                <LogOut className="h-5 w-5 min-w-[1.25rem]" />
                <span className="truncate">Logout</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
