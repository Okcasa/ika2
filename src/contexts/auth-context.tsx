'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const ADMIN_USERNAMES = ['admin', 'admin2'];
const USERNAME_KEY = 'leadsorter_username';

type AuthContextType = {
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const storedUsername = localStorage.getItem(USERNAME_KEY);
        if (storedUsername) {
          setUsername(storedUsername);
          setIsAdmin(ADMIN_USERNAMES.includes(storedUsername.toLowerCase()));
        } else {
          // If there's a firebase user but no username, something is wrong, log out.
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
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login';

    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
       router.push(isAdmin ? '/' : '/dashboard');
    } else if (user && !isAdmin && pathname === '/') {
        router.push('/dashboard');
    }

  }, [user, loading, pathname, router, isAdmin]);

  const login = async (inputUsername: string) => {
    setLoading(true);
    try {
        const userCredential = await signInAnonymously(auth);
        setUser(userCredential.user);
        setUsername(inputUsername);
        localStorage.setItem(USERNAME_KEY, inputUsername);
        const isAdminUser = ADMIN_USERNAMES.includes(inputUsername.toLowerCase());
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

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, username, isAdmin, loading, login, logout }}>
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
