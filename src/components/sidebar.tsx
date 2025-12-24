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
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const sidebarItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/shop' }, // Mapping Shop/Home to Dashboard
  { icon: Package, label: 'Products', href: '/products' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: Store, label: 'Shop', href: '/shop-view' }, // Maybe separate shop view? For now keeping structure
  { icon: CheckSquare, label: 'Income', href: '/income' },
  { icon: Megaphone, label: 'Promote', href: '/promote' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [theme, setTheme] = useState('light');
  const [userEmail, setUserEmail] = useState<string>('User');

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }

    const getUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setUserEmail(session.user.email);
        }
    }
    getUser();
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
    <div className="w-64 h-screen flex flex-col p-6 fixed left-0 top-0 hidden md:flex z-50 bg-[#F2F2F2]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="h-10 w-10 bg-[#1C1917] text-[#F2F2F2] rounded-full flex items-center justify-center">
            <LayoutGrid className="h-6 w-6" />
        </div>
      </div>

      <div className="px-2 mb-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">
        Dashboard
      </div>

      <nav className="space-y-1 flex-1">
        {sidebarItems.map((item) => {
          // Highlight Dashboard for /shop as it's the main view now
          const isActive = (pathname === '/shop' && item.label === 'Dashboard') || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white text-[#1C1917] shadow-sm"
                  : "text-stone-500 hover:bg-white/50 hover:text-[#1C1917]"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-5 w-5", isActive ? "text-[#1C1917]" : "text-stone-400")} />
                {item.label}
              </div>
              {isActive && (
                 <div className="h-1.5 w-1.5 rounded-full bg-[#1C1917]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex flex-col gap-2">
            <Button variant="ghost" className="justify-start gap-3 text-stone-500 hover:bg-white/50 rounded-xl h-12" onClick={toggleTheme}>
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>
            <Button variant="ghost" className="justify-start gap-3 text-stone-500 hover:text-destructive hover:bg-red-50 rounded-xl h-12" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
