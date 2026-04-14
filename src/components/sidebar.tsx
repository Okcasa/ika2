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
  LogOut,
  GripVertical,
  Settings,
  User as UserIcon,
  Bell,
  CreditCard,
  Shield,
  Puzzle,
  LifeBuoy,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTeamOverview } from '@/hooks/use-team-overview';

const sidebarItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/shop' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: Users, label: 'Leads', href: '/customers' },
  { icon: Store, label: 'Logs', href: '/logs' },
  { icon: CheckSquare, label: 'Income', href: '/income' },
];

const teamFabOpenRef = { current: false };
let teamFabSetOpen: ((open: boolean) => void) | null = null;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [width, setWidth] = useState(340); // Default sidebar width
  const [isResizing, setIsResizing] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [userRole, setUserRole] = useState('Member');
  const [userEmail, setUserEmail] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('My Team');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [patternMode, setPatternMode] = useState<'light' | 'dark'>('light');
  const [isNavLoading, setIsNavLoading] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { overview, refresh, capabilities: teamCaps } = useTeamOverview();
  const isLogsPage = pathname === '/logs';

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
    setPatternMode('light');
    document.documentElement.setAttribute('data-pattern-mode', 'light');
  }, [isLogsPage]);

  useEffect(() => {
    return () => {
      document.documentElement.setAttribute('data-pattern-mode', 'light');
    };
  }, []);

  useEffect(() => {
    setIsNavLoading(false);
    document.documentElement.classList.remove('nav-loading');
  }, [pathname]);

  const handleNavClick = useCallback(
    (href: string) => {
      const isDashboard = href === '/shop' && pathname === '/shop';
      if (pathname === href || isDashboard) return;
      setIsNavLoading(true);
      document.documentElement.classList.add('nav-loading');
    },
    [pathname]
  );

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) {
          setIsAuthed(false);
          setUserName('Account');
          setUserRole('Member');
          setUserEmail('');
          setCurrentUserId(null);
          setDisplayName('');
          setProfileBio('');
          setSettingsOpen(false);
          return;
        }
        setIsAuthed(true);
        const metaName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          (session.user.email ? session.user.email.split('@')[0] : '');
        if (metaName) setUserName(metaName);
        const metaDisplayName = session.user.user_metadata?.display_name;
        if (typeof metaDisplayName === 'string') setDisplayName(metaDisplayName);
        const metaBio = session.user.user_metadata?.bio;
        if (typeof metaBio === 'string') setProfileBio(metaBio);
        if (session.user.email) setUserEmail(session.user.email);
        setCurrentUserId(session.user.id);

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (profile?.full_name) setUserName(profile.full_name);
      } catch {
        // ignore
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthed(false);
        setUserName('Account');
        setUserRole('Member');
        setUserEmail('');
        setCurrentUserId(null);
        setDisplayName('');
        setProfileBio('');
        setSettingsOpen(false);
        return;
      }
      setIsAuthed(true);
      const metaName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        (session.user.email ? session.user.email.split('@')[0] : '');
      if (metaName) setUserName(metaName);
      if (session.user.email) setUserEmail(session.user.email);
      setCurrentUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!overview?.role) return;
    const normalized = teamCaps.role || 'editor';
    const pretty = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    setUserRole(pretty);
  }, [overview?.role, teamCaps.role]);

  const callTeamApi = useCallback(async (url: string, body?: Record<string, any>) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not signed in');
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || 'Request failed');
    return json;
  }, []);

  const handleCreateTeam = useCallback(async () => {
    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/create', { name: teamNameInput.trim() || 'My Team' });
      await refresh();
      toast({ title: 'Team created', description: 'Your workspace is now shareable.' });
    } catch (e: any) {
      toast({ title: 'Create team failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [callTeamApi, teamNameInput, refresh, toast]);

  const handleInvite = useCallback(async () => {
    if (!overview?.team?.id) return;
    setTeamBusy(true);
    try {
      const data = await callTeamApi('/api/team/invite', {
        teamId: overview.team.id,
        role: inviteRole,
      });
      setInviteUrl(data?.inviteUrl || '');
      setInviteCode(data?.inviteCode || '');
      await refresh();
      toast({ title: 'Invite created', description: 'Share the code or invite link with your teammate.' });
    } catch (e: any) {
      toast({ title: 'Invite failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [overview?.team?.id, inviteRole, callTeamApi, refresh, toast]);

  const handleCopyValue = useCallback(
    async (value: string, label: string) => {
      const text = value.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: `${label} copied`, description: 'Copied to clipboard.' });
      } catch {
        toast({
          title: 'Copy failed',
          description: 'Clipboard permissions are blocked.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleJoinWithCode = useCallback(async () => {
    const code = joinCodeInput.trim();
    if (!/^\d{5}$/.test(code)) {
      toast({ title: 'Invalid code', description: 'Enter the full 5-digit team code.', variant: 'destructive' });
      return;
    }

    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/invite/accept', { code });
      setJoinCodeInput('');
      await refresh();
      toast({ title: 'Request sent', description: 'Your join request is pending team approval.' });
    } catch (e: any) {
      toast({ title: 'Join failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [joinCodeInput, callTeamApi, refresh, toast]);

  const handleApprove = useCallback(async (requestId: string) => {
    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/requests/approve', { requestId });
      await refresh();
      toast({ title: 'Request approved', description: 'Team member added.' });
    } catch (e: any) {
      toast({ title: 'Approve failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [callTeamApi, refresh, toast]);

  const handleReject = useCallback(async (requestId: string) => {
    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/requests/reject', { requestId });
      await refresh();
      toast({ title: 'Request rejected', description: 'The join request was declined.' });
    } catch (e: any) {
      toast({ title: 'Reject failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [callTeamApi, refresh, toast]);

  const handleMemberRole = useCallback(async (memberId: string, role: string) => {
    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/members/role', { memberId, role });
      await refresh();
      toast({ title: 'Role updated', description: 'Member permissions were updated.' });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [callTeamApi, refresh, toast]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    setTeamBusy(true);
    try {
      await callTeamApi('/api/team/members/remove', { memberId });
      await refresh();
      toast({ title: 'Member removed', description: 'Access has been revoked.' });
    } catch (e: any) {
      toast({ title: 'Remove failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setTeamBusy(false);
    }
  }, [callTeamApi, refresh, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear tutorial state so it shows again on next login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ika_tutorial_master_done_v1');
      localStorage.removeItem('ika_tutorial_flow_state_v1');
      // Clear legacy tutorial keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ika_tutorial_done:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
    toast({
        title: "Signed Out",
        description: "Your session has been securely closed."
    });
    router.refresh();
  };

  const handleSaveProfile = useCallback(async () => {
    if (!currentUserId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in again to save your profile.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingProfile(true);
    const nextFullName = userName.trim();
    const nextDisplayName = displayName.trim();
    const nextBio = profileBio.trim();

    try {
      const { error: profileErr } = await supabase.from('user_profiles').upsert({
        user_id: currentUserId,
        full_name: nextFullName || null,
      });
      if (profileErr) throw profileErr;

      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: nextFullName || null,
          display_name: nextDisplayName || null,
          bio: nextBio || null,
        },
      });
      if (authErr) throw authErr;

      toast({
        title: 'Profile saved',
        description: 'Your account settings were saved to Supabase.',
      });
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Could not save profile updates.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  }, [currentUserId, displayName, profileBio, toast, userName]);

  const isPatternDark = patternMode === 'dark';
  return (
    <div 
      ref={sidebarRef}
      className="sidebar-doodle-bg sidebar-elevated-right h-screen flex flex-col p-6 fixed left-0 top-0 hidden md:flex z-50 group font-inter"
      style={{ width: width }}
    >
      <style jsx global>{`
        .keycap-gear {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(180deg, #282828, #202020);
          box-shadow:
            inset -6px 0 6px rgba(0, 0, 0, 0.15),
            inset 0 -6px 6px rgba(0, 0, 0, 0.25),
            0 0 0 2px rgba(0, 0, 0, 0.75),
            8px 16px 20px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          transition: transform 0.12s ease-in-out, box-shadow 0.12s ease-in;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .keycap-gear::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 4px;
          bottom: 8px;
          right: 8px;
          background: linear-gradient(90deg, #232323, #4a4a4a);
          border-radius: 10px;
          box-shadow:
            -8px -8px 8px rgba(255, 255, 255, 0.2),
            8px 4px 8px rgba(0, 0, 0, 0.15);
          border-left: 1px solid #0004;
          border-bottom: 1px solid #0004;
          border-top: 1px solid #0009;
          transition: all 0.12s ease-in-out;
        }
        .keycap-gear > * {
          position: relative;
          z-index: 1;
          color: #e9e9e9;
        }
        .keycap-gear:active {
          transform: translateY(4px) !important;
          box-shadow:
            inset -5px 0 5px rgba(0, 0, 0, 0.2),
            inset 0 -5px 5px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(0, 0, 0, 0.45),
            4px 8px 12px rgba(0, 0, 0, 0.3);
        }
        .keycap-gear:active::before {
          top: 6px;
          left: 6px;
          bottom: 6px;
          right: 6px;
          box-shadow:
            -4px -4px 4px rgba(255, 255, 255, 0.12),
            4px 2px 4px rgba(0, 0, 0, 0.1);
        }
        .keycap-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          padding: 0 18px;
          border-radius: 14px;
          background: linear-gradient(180deg, #282828, #202020);
          box-shadow:
            inset -8px 0 8px rgba(0, 0, 0, 0.15),
            inset 0 -8px 8px rgba(0, 0, 0, 0.25),
            0 0 0 2px rgba(0, 0, 0, 0.75),
            10px 20px 25px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          transition: transform 0.12s ease-in-out, box-shadow 0.12s ease-in;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .keycap-cta::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 4px;
          bottom: 9px;
          right: 9px;
          background: linear-gradient(90deg, #232323, #4a4a4a);
          border-radius: 12px;
          box-shadow:
            -10px -10px 10px rgba(255, 255, 255, 0.25),
            10px 5px 10px rgba(0, 0, 0, 0.15);
          border-left: 1px solid #0004;
          border-bottom: 1px solid #0004;
          border-top: 1px solid #0009;
          transition: all 0.12s ease-in-out;
        }
        .keycap-cta > * {
          position: relative;
          z-index: 1;
          color: #e9e9e9;
        }
        .keycap-cta:active {
          transform: translateY(4px) !important;
          box-shadow:
            inset -7px 0 7px rgba(0, 0, 0, 0.2),
            inset 0 -7px 7px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(0, 0, 0, 0.45),
            4px 9px 14px rgba(0, 0, 0, 0.38);
        }
        .keycap-cta:active::before {
          top: 6px;
          left: 6px;
          bottom: 6px;
          right: 6px;
          box-shadow:
            -4px -4px 4px rgba(255, 255, 255, 0.12),
            4px 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 w-4 h-full cursor-col-resize hover:bg-stone-300/30 active:bg-stone-400/50 transition-colors z-50 flex items-center justify-center"
        onMouseDown={startResizing}
      >
        <div className="w-[4px] h-full bg-stone-400/80 group-hover:bg-stone-500 transition-colors rounded-full" />
      </div>

      {/* Logo */}
      <Link href="/shop" className="flex items-center gap-1 mb-10 px-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300">
        <img
          src="/icon-512.png"
          alt="ikaLeads"
          className="h-20 w-20 min-w-[5rem] rounded-full"
        />
        {width > 220 && (
           <span
             className={cn(
               "font-bungee text-3xl -ml-1 truncate",
               isPatternDark
                 ? "text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] [text-shadow:0_0_1px_rgba(0,0,0,0.75)]"
                 : "text-[var(--app-sidebar-title)]"
             )}
           >
             ikaLeads
           </span>
        )}
      </Link>

      <div className={cn(
        "mb-3 inline-flex w-fit max-w-full items-center rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] truncate border backdrop-blur-sm",
        isPatternDark
          ? "text-white border-[#3b3a52] bg-[#1a1928] shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
          : "text-white border-[#344666] bg-[#2f4467] shadow-[0_6px_14px_rgba(15,23,42,0.22)]"
      )}>
        Main Menu
      </div>

      <nav className={cn(
        "space-y-1 flex-1 overflow-x-hidden rounded-2xl border p-2 backdrop-blur-sm",
        isPatternDark
          ? "border-white/18 bg-black/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-stone-300/70 bg-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
      )}>
        {sidebarItems.map((item) => {
          const isActive = (pathname === '/shop' && item.label === 'Dashboard') || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              data-tutorial-id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-2xl text-[13px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap relative",
                isActive
                  ? "bg-white text-[#1C1917] shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
                  : isPatternDark
                    ? "text-stone-100 hover:bg-white/12 hover:text-white"
                    : "text-stone-800 hover:bg-white/78 hover:text-[#1C1917]"
              )}
            >
              <item.icon className={cn(
                "h-4.5 w-4.5 min-w-[1.125rem] mr-3",
                isActive ? "text-[#1C1917]" : isPatternDark ? "text-stone-200" : "text-stone-700"
              )} />
              <span className="truncate opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
              {isActive && width > 220 && (
                 <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {isNavLoading && (
        <div className="fixed inset-x-0 top-3 z-[9999] flex justify-end px-6 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-black/80 text-white text-xs font-semibold px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.2)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Loading...
          </div>
        </div>
      )}

      <div className="mt-auto space-y-4 overflow-x-hidden">
        {/* Team Access Button - original position */}
        <button
          onClick={() => {
            const setOpen = (window as any).__teamFabSetOpen;
            if (setOpen) setOpen((prev: boolean) => !prev);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-semibold tracking-wide transition-all duration-200",
            isPatternDark
              ? "bg-stone-800/60 text-stone-100 hover:bg-stone-700/80 border border-stone-700/50"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center",
            isPatternDark ? "bg-violet-600/80" : "bg-violet-500"
          )}>
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="truncate">Team Access</div>
            {overview?.team?.name && (
              <div className="text-[11px] text-stone-500 truncate">{overview.team.name}</div>
            )}
          </div>
          {teamCaps.role && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              teamCaps.role === 'owner' ? "bg-amber-100 text-amber-700" :
              teamCaps.role === 'admin' ? "bg-blue-100 text-blue-700" :
              "bg-stone-100 text-stone-600"
            )}>
              {teamCaps.role}
            </span>
          )}
        </button>

        {isAuthed && (
          <div className="backdrop-blur rounded-2xl p-3 shadow-sm border border-stone-200/70 bg-[var(--app-sidebar-card-bg)]">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold">
                {userName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-800 truncate">{userName}</div>
                <div className="text-[11px] text-stone-500 truncate">{userRole}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="keycap-gear border-0 bg-transparent hover:bg-transparent"
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="keycap-gear border-0 bg-transparent hover:bg-transparent"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog open={settingsOpen && isAuthed} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-3xl bg-[#f1ece9] text-stone-900 p-0 rounded-3xl overflow-hidden font-poppins">
          <div className="flex items-start justify-between border-b border-stone-200 px-6 py-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-extrabold tracking-tight">Account Settings</DialogTitle>
              <DialogDescription className="text-sm font-semibold text-stone-500">Manage your profile, preferences, and workspace settings.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2" />
          </div>

          <div className="grid grid-cols-1">
            <section className="px-6 py-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-2xl font-bold text-stone-900 tracking-tight">Profile Details</div>
                  <div className="text-sm font-semibold text-stone-500">Update your photo and personal details here.</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-xs font-semibold text-stone-600">Full Name</label>
                  <Input className="h-10 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 hover:text-stone-900 hover:placeholder:text-stone-500 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300" value={userName} onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-xs font-semibold text-stone-600">Display Name</label>
                  <Input
                    className="h-10 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 hover:text-stone-900 hover:placeholder:text-stone-500 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300"
                    placeholder="e.g. ika-admin"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-xs font-semibold text-stone-600">Email Address</label>
                  <Input
                    className="h-10 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 hover:text-stone-900 hover:placeholder:text-stone-500 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300"
                    value={userEmail || ''}
                    readOnly
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-xs font-semibold text-stone-600">Bio</label>
                  <Textarea
                    placeholder="Tell us about yourself..."
                    className="min-h-[96px] rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 hover:text-stone-900 hover:placeholder:text-stone-500 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                  />
                </div>
                <p className="text-xs text-stone-400 md:col-span-2">
                  Brief description for your profile. URLs are hyperlinked.
                </p>
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="keycap-cta border-0 bg-transparent hover:bg-transparent"
                  >
                    <span className="text-[12px] font-black uppercase tracking-widest text-[#e9e9e9]">
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="mt-6 border-t border-stone-200 pt-4">
                  <div className="inline-flex rounded-full bg-stone-200 px-3 py-1 text-sm font-semibold text-stone-700">Workspace Role</div>
                  <p className="text-base md:text-lg font-semibold text-stone-500 mt-2">You are currently a {userRole}.</p>
              </div>

              <div className="mt-6 border-t border-stone-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-full bg-stone-200 px-3 py-1 text-sm font-semibold text-stone-700">Team Access</div>
                  <div className="flex items-center gap-2">
                    {teamCaps.role && (
                    <span className="text-sm font-semibold rounded-full px-3 py-1 bg-amber-100 text-amber-700">
                        {teamCaps.role}
                      </span>
                    )}
                    {overview?.team?.name && (
                    <span className="text-sm font-semibold rounded-full px-3 py-1 bg-stone-100 text-stone-700">
                        {overview.team.name}
                      </span>
                    )}
                  </div>
                </div>

                {!overview?.team && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2.5">
                    <p className="text-sm text-stone-600">Create a team to invite admins, editors, and viewers.</p>
                    <Input
                      value={teamNameInput}
                      onChange={(e) => setTeamNameInput(e.target.value)}
                      className="h-10 rounded-2xl border-stone-200 text-sm text-stone-900 placeholder:text-stone-500 hover:text-stone-900 hover:placeholder:text-stone-500"
                      placeholder="Team name"
                    />
                    <Button
                      onClick={handleCreateTeam}
                      disabled={teamBusy}
                      className="keycap-cta border-0 bg-transparent hover:bg-transparent"
                    >
                      <span className="text-[12px] font-black uppercase tracking-widest text-[#e9e9e9]">
                        {teamBusy ? 'Creating...' : 'Create Team'}
                      </span>
                    </Button>
                  </div>
                )}

                <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2.5">
                  <p className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-sm font-semibold text-stone-700">Join Team by Code</p>
                  <p className="text-sm text-stone-600">
                    Enter a 5-digit code. You can still request to join another team even if you already created one.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="h-10 rounded-2xl border-stone-200 text-sm text-stone-900 placeholder:text-stone-500"
                      placeholder="12345"
                    />
                    <Button
                      onClick={handleJoinWithCode}
                      disabled={teamBusy}
                      className="keycap-cta border-0 bg-transparent hover:bg-transparent"
                    >
                      <span className="text-[12px] font-black uppercase tracking-widest text-[#e9e9e9]">
                        Join by Code
                      </span>
                    </Button>
                  </div>
                </div>

                {overview?.team && (
                  <>
                    {teamCaps.canInvite && (
                      <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2.5">
                        <p className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-sm font-semibold text-stone-700">Invite Member</p>
                        <p className="text-sm text-stone-600">Use team code or share invite link. Email is no longer required.</p>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="h-10 rounded-2xl border border-stone-200 bg-white px-3 text-sm text-stone-800 hover:text-stone-900"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            onClick={handleInvite}
                            disabled={teamBusy}
                            className="keycap-cta border-0 bg-transparent hover:bg-transparent"
                          >
                            <span className="text-[12px] font-black uppercase tracking-widest text-[#e9e9e9]">
                              Invite
                            </span>
                          </Button>
                        </div>
                        {(inviteUrl || inviteCode || overview?.team?.invite_code) && (
                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-2">
                            <button
                              type="button"
                              onClick={() => handleCopyValue(inviteCode || overview?.team?.invite_code || '', 'Code')}
                              className="mb-1 block w-full rounded px-1 py-1 text-left text-[11px] font-bold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                              title="Click to copy code"
                            >
                              Team Code: {inviteCode || overview?.team?.invite_code || '-'}
                            </button>
                            {inviteUrl && (
                              <button
                                type="button"
                                onClick={() => handleCopyValue(inviteUrl, 'Link')}
                                className="block w-full rounded px-1 py-1 text-left text-[11px] break-all text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                                title="Click to copy link"
                              >
                                {inviteUrl}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {teamCaps.canManageMembers && overview.requests?.filter((r) => r.status === 'pending').length > 0 && (
                      <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2">
                      <p className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-sm font-semibold text-stone-700">Pending Requests</p>
                        {overview.requests
                          .filter((r) => r.status === 'pending')
                          .map((r) => (
                            <div key={r.id} className="flex items-center gap-2 rounded-xl border border-stone-100 p-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-stone-900 truncate">{r.full_name || r.user_id}</p>
                                <p className="text-sm text-stone-500 truncate">{r.note || 'No note'}</p>
                              </div>
                              <Button
                                onClick={() => handleApprove(r.id)}
                                disabled={teamBusy}
                                className="keycap-cta border-0 bg-transparent hover:bg-transparent px-4"
                              >
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#e9e9e9]">
                                  Approve
                                </span>
                              </Button>
                              <Button
                                onClick={() => handleReject(r.id)}
                                disabled={teamBusy}
                                variant="outline"
                                className="keycap-cta border-0 bg-transparent hover:bg-transparent px-4"
                              >
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#e9e9e9]">
                                  Reject
                                </span>
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2">
                      <p className="inline-flex rounded-full bg-stone-200/80 px-2.5 py-1 text-sm font-semibold text-stone-700">Members</p>
                      {overview.members.map((m) => {
                        const isSelf = m.user_id === currentUserId;
                        const isOwner = String(m.role).toLowerCase() === 'owner';
                        return (
                          <div key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center rounded-xl border border-stone-100 p-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900 truncate">{m.full_name || m.user_id}</p>
                              <p className="text-sm text-stone-500">{m.role}</p>
                            </div>
                            {teamCaps.canManageMembers && !isOwner && (
                              <select
                                value={m.role}
                                onChange={(e) => handleMemberRole(m.id, e.target.value)}
                                className="h-10 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-800 hover:text-stone-900"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            {teamCaps.canManageMembers && !isOwner && !isSelf && (
                              <Button
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={teamBusy}
                                variant="outline"
                                className="keycap-cta border-0 bg-transparent hover:bg-transparent px-4"
                              >
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#e9e9e9]">
                                  Remove
                                </span>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
