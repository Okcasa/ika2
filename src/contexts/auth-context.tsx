'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { AppUser } from '@/lib/types';

const USERS_KEY = 'leadsorter_users';
const USERNAME_KEY = 'leadsorter_username';


const defaultUsers: AppUser[] = [
    { id: '1', username: 'okcasa', role: 'admin' },
];

type AuthContextType = {
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_KEY);
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      setUsers(defaultUsers);
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            const storedUsername = localStorage.getItem(USERNAME_KEY);
            const appUser = users.find(u => u.username === storedUsername);

            if (appUser) {
              setUsername(appUser.username);
              setIsAdmin(appUser.role === 'admin');
            } else {
              // If there's a firebase user but no app user, something is wrong, log out.
              auth.signOut();
              localStorage.removeItem(USERNAME_KEY);
            }
          } else {
            setUser(null);
            setUsername(null);
            setIsAdmin(false);
          }
          setLoading(false);
        });

        return () => unsubscribe();
    }
  }, [users]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login';
    const isProtectedRoute = pathname === '/' || pathname === '/dashboard' || pathname === '/admin/users';

    if (!user && isProtectedRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
       router.push(isAdmin ? '/' : '/dashboard');
    } else if (user && !isAdmin && (pathname === '/' || pathname === '/admin/users')) {
        router.push('/dashboard');
    }

  }, [user, loading, pathname, router, isAdmin]);
  
  const login = async (inputUsername: string) => {
    setLoading(true);
    const appUser = users.find(u => u.username.toLowerCase() === inputUsername.toLowerCase());

    if (!appUser) {
        // In a real app, you'd show an error. For now, we'll just log it.
        console.error("User not found");
        setLoading(false);
        // Maybe show a toast message here
        alert("Invalid username.");
        return;
    }

    try {
        const userCredential = await signInAnonymously(auth);
        setUser(userCredential.user);
        setUsername(appUser.username);
        localStorage.setItem(USERNAME_KEY, appUser.username);
        const isAdminUser = appUser.role === 'admin';
        setIsAdmin(isAdminUser);
        router.push(isAdminUser ? '/' : '/dashboard');
    } catch (error) {
        console.error("Anonymous sign-in failed", error);
    } finally {
        setLoading(false);
    }
  };


  const logout = async () => {
    setLoading(true);
    try {
        await auth.signOut();
        localStorage.removeItem(USERNAME_KEY);
        setUser(null);
        setUsername(null);
        setIsAdmin(false);
        router.push('/login');
    } catch (error) {
        console.error("Sign-out failed", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading && !users.length) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, username, isAdmin, loading, login, logout, users, setUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
