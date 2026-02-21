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
  { icon: Megaphone, label: 'Promote', href: '/promote' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [width, setWidth] = useState(340); // Default sidebar width
  const [isResizing, setIsResizing] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [userRole, setUserRole] = useState('Member');
  const [userEmail, setUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('My Team');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { overview, refresh, capabilities: teamCaps } = useTeamOverview();

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
    document.documentElement.classList.remove('dark');
    localStorage.setItem('leadsorter_theme', 'light');
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !mounted) return;
        const metaName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          (session.user.email ? session.user.email.split('@')[0] : '');
        if (metaName) setUserName(metaName);
        if (session.user.email) setUserEmail(session.user.email);
        setCurrentUserId(session.user.id);
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
    toast({
        title: "Signed Out",
        description: "Your session has been securely closed."
    });
    router.refresh();
  };

  return (
    <div 
      ref={sidebarRef}
      className="h-screen flex flex-col p-6 fixed left-0 top-0 hidden md:flex z-50 group border-r font-inter bg-[var(--app-sidebar-bg)] border-[color:var(--app-sidebar-border)]"
      style={{ width: width }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 w-4 h-full cursor-col-resize hover:bg-stone-300/30 active:bg-stone-400/50 transition-colors z-50 flex items-center justify-center"
        onMouseDown={startResizing}
      >
        <div className="w-[4px] h-full bg-stone-400/80 group-hover:bg-stone-500 transition-colors rounded-full" />
      </div>

      {/* Logo */}
      <Link href="/shop" className="flex items-center gap-2 mb-10 px-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300">
        <div className="h-10 w-10 min-w-[2.5rem] bg-[#1C1917] text-[#E5E4E2] rounded-full flex items-center justify-center">
            <LayoutGrid className="h-6 w-6" />
        </div>
        {width > 220 && (
           <span className="font-bungee text-2xl text-[var(--app-sidebar-title)] truncate">Ika Platform</span>
        )}
      </Link>

      <div className="px-2 mb-5 text-[11px] font-semibold text-[var(--app-sidebar-muted)] uppercase tracking-[0.32em] truncate">
        Main Menu
      </div>

      <nav className="space-y-1 flex-1 overflow-x-hidden">
        {sidebarItems.map((item) => {
          const isActive = (pathname === '/shop' && item.label === 'Dashboard') || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              data-tutorial-id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-2xl text-[13px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap relative",
                isActive
                  ? "bg-white text-[#1C1917] shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                  : "text-stone-500 hover:bg-white/60 hover:text-[#1C1917]"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 min-w-[1.125rem] mr-3", isActive ? "text-[#1C1917]" : "text-stone-400")} />
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

      <div className="mt-auto space-y-4 overflow-x-hidden">
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
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-9 w-9 rounded-full text-stone-500 hover:text-stone-700 hover:bg-stone-100"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-5xl bg-[#f1ece9] text-stone-900 p-0">
          <div className="flex items-start justify-between border-b border-stone-200 px-8 py-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-semibold">Account Settings</DialogTitle>
              <DialogDescription className="text-[13px] text-stone-500">Manage your profile, preferences, and workspace settings.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-stone-500 hover:text-stone-700 hover:bg-stone-100">
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1">
            <section className="px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-700 font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-stone-900">Profile Details</div>
                  <div className="text-[13px] text-stone-500">Update your photo and personal details here.</div>
                </div>
                <Button size="icon" className="ml-auto h-9 w-9 rounded-full bg-violet-500 text-white hover:bg-violet-600">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold text-stone-500">Full Name</label>
                  <Input className="h-11 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300" value={userName} onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold text-stone-500">Display Name</label>
                  <Input className="h-11 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300" placeholder="e.g. ika-admin" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[12px] font-semibold text-stone-500">Email Address</label>
                  <Input
                    className="h-11 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300"
                    value={userEmail || ''}
                    readOnly
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[12px] font-semibold text-stone-500">Bio</label>
                  <Textarea placeholder="Tell us about yourself..." className="min-h-[120px] rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-300" />
                </div>
                <p className="text-xs text-stone-400 md:col-span-2">
                  Brief description for your profile. URLs are hyperlinked.
                </p>
              </div>

              <div className="mt-8 border-t border-stone-200 pt-6">
                <div className="text-sm font-semibold text-stone-900">Workspace Role</div>
                <p className="text-sm text-stone-500 mt-1">You are currently a {userRole}.</p>
              </div>

              <div className="mt-8 border-t border-stone-200 pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-stone-900">Team Access</div>
                  <div className="flex items-center gap-2">
                    {teamCaps.role && (
                      <span className="text-xs font-semibold rounded-full px-3 py-1 bg-amber-100 text-amber-700">
                        {teamCaps.role}
                      </span>
                    )}
                    {overview?.team?.name && (
                      <span className="text-xs font-semibold rounded-full px-3 py-1 bg-stone-100 text-stone-700">
                        {overview.team.name}
                      </span>
                    )}
                  </div>
                </div>

                {!overview?.team && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                    <p className="text-xs text-stone-500">Create a team to invite admins, editors, and viewers.</p>
                    <Input
                      value={teamNameInput}
                      onChange={(e) => setTeamNameInput(e.target.value)}
                      className="h-10 rounded-xl border-stone-200"
                      placeholder="Team name"
                    />
                    <Button
                      onClick={handleCreateTeam}
                      disabled={teamBusy}
                      className="h-10 rounded-xl bg-stone-900 text-white hover:bg-stone-800"
                    >
                      {teamBusy ? 'Creating...' : 'Create Team'}
                    </Button>
                  </div>
                )}

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                  <p className="text-xs font-semibold text-stone-600">Join Team by Code</p>
                  <p className="text-[11px] text-stone-500">
                    Enter a 5-digit code. You can still request to join another team even if you already created one.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="h-10 rounded-xl border-stone-200"
                      placeholder="12345"
                    />
                    <Button
                      onClick={handleJoinWithCode}
                      disabled={teamBusy}
                      className="h-10 rounded-xl bg-stone-900 text-white hover:bg-stone-800"
                    >
                      Join by Code
                    </Button>
                  </div>
                </div>

                {overview?.team && (
                  <>
                    {teamCaps.canInvite && (
                      <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                        <p className="text-xs font-semibold text-stone-600">Invite Member</p>
                        <p className="text-[11px] text-stone-500">Use team code or share invite link. Email is no longer required.</p>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            onClick={handleInvite}
                            disabled={teamBusy}
                            className="h-10 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                          >
                            Invite
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
                      <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                        <p className="text-xs font-semibold text-stone-600">Pending Requests</p>
                        {overview.requests
                          .filter((r) => r.status === 'pending')
                          .map((r) => (
                            <div key={r.id} className="flex items-center gap-2 rounded-xl border border-stone-100 p-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-stone-900 truncate">{r.full_name || r.user_id}</p>
                                <p className="text-[11px] text-stone-500 truncate">{r.note || 'No note'}</p>
                              </div>
                              <Button
                                onClick={() => handleApprove(r.id)}
                                disabled={teamBusy}
                                className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-3"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReject(r.id)}
                                disabled={teamBusy}
                                variant="outline"
                                className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 px-3"
                              >
                                Reject
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                      <p className="text-xs font-semibold text-stone-600">Members</p>
                      {overview.members.map((m) => {
                        const isSelf = m.user_id === currentUserId;
                        const isOwner = String(m.role).toLowerCase() === 'owner';
                        return (
                          <div key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center rounded-xl border border-stone-100 p-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900 truncate">{m.full_name || m.user_id}</p>
                              <p className="text-[11px] text-stone-500">{m.role}</p>
                            </div>
                            {teamCaps.canManageMembers && !isOwner && (
                              <select
                                value={m.role}
                                onChange={(e) => handleMemberRole(m.id, e.target.value)}
                                className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800"
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
                                className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 px-3 text-xs"
                              >
                                Remove
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
