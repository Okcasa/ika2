'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Facebook, Github } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastUsedEmail, setLastUsedEmail] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('last_supabase_email');
    if (stored) setLastUsedEmail(stored);
  }, [open]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        setMessage('Registration successful! Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        localStorage.setItem('last_supabase_email', email);
        onOpenChange(false);
        if (pathname === '/') {
          router.push('/shop');
        } else {
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectPath = pathname === '/' ? '/shop' : pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + redirectPath
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-stone-200 p-0 bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
        <DialogHeader className="sr-only">
          <DialogTitle>{isSignUp ? 'Create your account' : 'Sign in to Acme Co'}</DialogTitle>
          <DialogDescription>
            {isSignUp ? 'Join us today! Please fill in the details.' : 'Welcome back! Please sign in to continue.'}
          </DialogDescription>
        </DialogHeader>
        <div className="p-8 space-y-6">
          {/* Logo/Icon */}
          <div className="flex justify-center mt-2">
            <div className="w-11 h-11 bg-[#2D2D2D] rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
                {isSignUp ? 'Create your account' : 'Sign in to Acme Co'}
            </h2>
            <p className="text-stone-400 text-sm">
                {isSignUp ? 'Join us today! Please fill in the details' : 'Welcome back! Please sign in to continue'}
            </p>
          </div>

          {/* Social Sign In Buttons - CLERK STYLE (Wide/Grid) */}
          <div className="space-y-4">
            {!isSignUp && lastUsedEmail && (
                <Button 
                    variant="outline" 
                    className="w-full h-auto py-3 px-4 border-stone-200 bg-white hover:bg-stone-50 transition-all rounded-xl flex flex-col items-start gap-0.5 group shadow-sm mb-2"
                    onClick={() => setEmail(lastUsedEmail)}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Continue with previous email</span>
                        <div className="bg-stone-100 text-[9px] px-1.5 py-0.5 rounded text-stone-500 group-hover:bg-stone-200">Last used</div>
                    </div>
                    <span className="text-sm font-semibold text-stone-700">{lastUsedEmail}</span>
                </Button>
            )}

            <div className="grid grid-cols-3 gap-3">
                <Button 
                    variant="outline" 
                    className="h-11 border-stone-200 hover:bg-stone-50 hover:border-stone-300 hover:scale-[0.98] transition-all rounded-xl shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 1.21-4.53z" fill="#EA4335"/>
                    </svg>
                </Button>
                <div className="relative group/wip cursor-not-allowed">
                    <Button 
                        variant="outline" 
                        className="w-full h-11 border-stone-200 bg-stone-50/50 rounded-xl shadow-sm opacity-50 pointer-events-none"
                        disabled={true}
                    >
                        <Facebook className="w-5 h-5 text-stone-400 fill-stone-400" />
                    </Button>
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-800/80 rounded-xl opacity-0 group-hover/wip:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-white">WIP</span>
                    </div>
                </div>

                <div className="relative group/wip cursor-not-allowed">
                    <Button 
                        variant="outline" 
                        className="w-full h-11 border-stone-200 bg-stone-50/50 rounded-xl shadow-sm opacity-50 pointer-events-none"
                        disabled={true}
                    >
                        <Github className="w-5 h-5 text-stone-400" />
                    </Button>
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-800/80 rounded-xl opacity-0 group-hover/wip:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-white">WIP</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-stone-400 font-medium tracking-widest">or</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold text-stone-700 ml-0.5">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 border-stone-200 focus:border-stone-400 focus:ring-0 rounded-lg transition-all text-sm"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-stone-700 ml-0.5">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-10 border-stone-200 focus:border-stone-400 focus:ring-0 rounded-lg transition-all text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-semibold text-stone-700 ml-0.5">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-10 border-stone-200 focus:border-stone-400 focus:ring-0 rounded-lg transition-all text-sm"
              />
            </div>

            <Button 
                className="w-full h-11 bg-[#2D2D2D] hover:bg-[#1D1D1D] text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 group mt-2" 
                type="submit" 
                disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                    Continue
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                    </svg>
                </>
              )}
            </Button>
          </form>
          
          <div className="pt-2 pb-2 text-center border-t border-stone-50">
            <p className="text-stone-500 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                    type="button"
                    className="ml-1.5 font-bold text-stone-900 hover:text-stone-700 transition-colors"
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null);
                        setMessage(null);
                    }}
                >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
            </p>
          </div>
        </div>
        
        {/* Footer branding */}
        <div className="bg-stone-50/50 py-4 border-t border-stone-100 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400 flex items-center justify-center gap-1.5">
                Secured by <span className="text-stone-500">Supabase</span>
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
