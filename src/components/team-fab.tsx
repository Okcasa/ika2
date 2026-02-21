'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Users, X, UserPlus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTeamOverview } from '@/hooks/use-team-overview';
import { PendingRequestsLoader } from '@/components/ui/pending-requests-loader';
import { useLeadScope } from '@/hooks/use-lead-scope';

export function TeamFab() {
  const pathname = usePathname();
  const { toast } = useToast();
  const { overview, loading, refreshing, refresh, capabilities: teamCaps } = useTeamOverview();
  const { leadScope, setLeadScope } = useLeadScope();
  const [open, setOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; label: string } | null>(null);
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('My Team');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [origin, setOrigin] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [pendingRevealLoading, setPendingRevealLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setCurrentUserId(data.session?.user?.id || '');
    };
    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const hiddenRoute = useMemo(
    () => pathname === '/accept-invite' || pathname === '/' || pathname === '/privacy',
    [pathname]
  );

  const callTeamApi = useCallback(async (url: string, body?: Record<string, unknown>) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sign in first');
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({} as { error?: string }));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }, []);

  const withBusy = useCallback(
    async (action: () => Promise<void>) => {
      setTeamBusy(true);
      try {
        await action();
      } finally {
        setTeamBusy(false);
      }
    },
    []
  );

  const handleCreateTeam = useCallback(async () => {
    await withBusy(async () => {
      await callTeamApi('/api/team/create', { name: teamNameInput.trim() || 'My Team' });
      await refresh();
      toast({ title: 'Team created', description: 'Your team workspace is ready.' });
    }).catch((e: unknown) => {
      toast({
        title: 'Create team failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    });
  }, [callTeamApi, refresh, teamNameInput, toast, withBusy]);

  const handleInvite = useCallback(async () => {
    const team = overview?.team;
    if (!team?.id) return;
    await withBusy(async () => {
      const data = await callTeamApi('/api/team/invite', {
        teamId: team.id,
        role: inviteRole,
      });
      const inviteData = data as { inviteUrl?: string };
      setInviteUrl(inviteData.inviteUrl || '');
      setInviteCode((data as { inviteCode?: string }).inviteCode || '');
      await refresh();
      toast({ title: 'Invite ready', description: 'Share the code or the link with your teammate.' });
    }).catch((e: unknown) => {
      toast({
        title: 'Invite failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    });
  }, [overview?.team, inviteRole, withBusy, callTeamApi, refresh, toast]);

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
      toast({
        title: 'Invalid code',
        description: 'Enter the full 5-digit team code.',
        variant: 'destructive',
      });
      return;
    }

    await withBusy(async () => {
      await callTeamApi('/api/team/invite/accept', { code });
      setJoinCodeInput('');
      await refresh();
      toast({
        title: 'Request sent',
        description: 'Your join request is pending team approval.',
      });
    }).catch((e: unknown) => {
      toast({
        title: 'Join failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    });
  }, [callTeamApi, joinCodeInput, refresh, toast, withBusy]);

  const shownCode = inviteCode || overview?.team?.invite_code || '';
  const codeLink = shownCode && origin ? `${origin}/accept-invite?code=${encodeURIComponent(shownCode)}` : '';
  const pendingRequests = overview.requests.filter((r) => r.status === 'pending');
  const isViewerWithTeam = Boolean(overview?.team && teamCaps.role === 'viewer');

  useEffect(() => {
    const currentCount = pendingRequests.length;
    const prevCount = prevPendingCountRef.current;
    const hasNewPending = currentCount > prevCount;

    if (hasNewPending) {
      setPendingRevealLoading(true);
      const timer = window.setTimeout(() => {
        setPendingRevealLoading(false);
      }, 1200);
      prevPendingCountRef.current = currentCount;
      return () => window.clearTimeout(timer);
    }

    if (currentCount === 0) {
      setPendingRevealLoading(false);
    }

    prevPendingCountRef.current = currentCount;
  }, [pendingRequests.length]);

  const handleToggleLeadScope = useCallback(() => {
    const nextScope = leadScope === 'team' ? 'mine' : 'team';
    setLeadScope(nextScope);
    toast({
      title: nextScope === 'mine' ? 'My leads mode enabled' : 'Team leads mode enabled',
      description:
        nextScope === 'mine'
          ? 'Viewer can edit only their own leads in this mode.'
          : 'Switched back to shared team leads (read-only for viewer).',
    });
  }, [leadScope, setLeadScope, toast]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      await withBusy(async () => {
        await callTeamApi('/api/team/requests/approve', { requestId });
        await refresh();
      }).catch((e: unknown) => {
        toast({
          title: 'Approve failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      });
    },
    [callTeamApi, refresh, toast, withBusy]
  );

  const handleReject = useCallback(
    async (requestId: string) => {
      await withBusy(async () => {
        await callTeamApi('/api/team/requests/reject', { requestId });
        await refresh();
      }).catch((e: unknown) => {
        toast({
          title: 'Reject failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      });
    },
    [callTeamApi, refresh, toast, withBusy]
  );

  const handleMemberRole = useCallback(
    async (memberId: string, role: string) => {
      await withBusy(async () => {
        await callTeamApi('/api/team/members/role', { memberId, role });
        await refresh();
      }).catch((e: unknown) => {
        toast({
          title: 'Role update failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      });
    },
    [callTeamApi, refresh, toast, withBusy]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      await withBusy(async () => {
        await callTeamApi('/api/team/members/remove', { memberId });
        await refresh();
      }).catch((e: unknown) => {
        toast({
          title: 'Remove failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      });
    },
    [callTeamApi, refresh, toast, withBusy]
  );

  if (hiddenRoute) return null;

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (fabButtonRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [open]);

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          className="font-outfit fixed bottom-24 right-4 z-[80] w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-2xl md:right-6 md:w-[420px]"
        >
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-stone-900">Team Access</p>
              <p className="text-[11px] text-stone-500">
                {overview?.team?.name || 'No team yet'} {teamCaps.role ? `• ${teamCaps.role}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => refresh()}
                disabled={teamBusy}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-stone-200 bg-stone-900 text-white hover:bg-stone-700 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
            {!loading && !overview?.team && (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs text-stone-600">Create your team first.</p>
                <Input
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="Team name"
                  className="h-9 rounded-lg border-stone-300 bg-white text-stone-900 placeholder:text-stone-400"
                />
                <Button
                  className="h-9 w-full rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                  onClick={handleCreateTeam}
                  disabled={teamBusy}
                >
                  Create Team
                </Button>
              </div>
            )}

            {!loading && (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold text-stone-700">Join a Team</p>
                <p className="text-[11px] text-stone-500">
                  Enter a 5-digit invite code. This works even if you already created your own team.
                </p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="12345"
                    className="h-9 rounded-lg border-stone-300 bg-white text-stone-900 placeholder:text-stone-400"
                  />
                  <Button
                    className="h-9 rounded-lg bg-stone-900 px-4 text-white hover:bg-stone-800"
                    onClick={handleJoinWithCode}
                    disabled={teamBusy}
                  >
                    Join
                  </Button>
                </div>
              </div>
            )}

            {!loading && isViewerWithTeam && (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold text-stone-700">Viewer Lead Scope</p>
                <p className="text-[11px] text-stone-500">
                  Optional: switch to your own leads. Team mode stays read-only for viewer.
                </p>
                <Button
                  className="h-9 w-full rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                  onClick={handleToggleLeadScope}
                >
                  {leadScope === 'team' ? 'Switch to My Leads' : 'Switch to Team Leads (Read-only)'}
                </Button>
              </div>
            )}

            {!loading && overview?.team && (
              <>
                {teamCaps.canInvite && (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs font-semibold text-stone-700">Invite People</p>
                    <p className="text-[11px] text-stone-500">Use the team code or share a link. Email is not required.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                        className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-900 font-sans font-medium"
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>
                      <Button className="h-9 rounded-lg bg-violet-600 px-4 text-white hover:bg-violet-700" onClick={handleInvite} disabled={teamBusy}>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Invite
                      </Button>
                      </div>
                    </div>
                    {(shownCode || inviteUrl || codeLink) && (
                      <div className="rounded-lg border border-violet-200 bg-violet-50 p-2 text-[11px] space-y-1">
                        {shownCode && (
                          <button
                            type="button"
                            onClick={() => handleCopyValue(shownCode, 'Code')}
                            className="block w-full rounded px-1 py-1 text-left font-bold tracking-wide text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                            title="Click to copy code"
                          >
                            Code: {shownCode}
                          </button>
                        )}
                        {codeLink && (
                          <button
                            type="button"
                            onClick={() => handleCopyValue(codeLink, 'Link')}
                            className="block w-full rounded px-1 py-1 text-left break-all text-violet-700 font-sans transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                            title="Click to copy link"
                          >
                            {codeLink}
                          </button>
                        )}
                        {inviteUrl && (
                          <button
                            type="button"
                            onClick={() => handleCopyValue(inviteUrl, 'Link')}
                            className="block w-full rounded px-1 py-1 text-left break-all text-violet-700 font-sans transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                            title="Click to copy link"
                          >
                            {inviteUrl}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {teamCaps.canManageMembers && (pendingRequests.length > 0 || refreshing || pendingRevealLoading) && (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-700">Pending Requests</p>
                    </div>
                    {(refreshing || pendingRevealLoading) && (
                      <div className="rounded-lg border border-stone-200 bg-white py-2 flex justify-center">
                        <PendingRequestsLoader />
                      </div>
                    )}
                    {!pendingRevealLoading && pendingRequests.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{r.full_name || r.user_id}</p>
                            <p className="truncate text-[11px] text-stone-500">{r.note || 'No note'}</p>
                          </div>
                          <Button className="h-7 rounded-md bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700" onClick={() => handleApprove(r.id)} disabled={teamBusy}>
                            Approve
                          </Button>
                          <Button variant="outline" className="h-7 rounded-md border-red-200 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => handleReject(r.id)} disabled={teamBusy}>
                            Reject
                          </Button>
                        </div>
                      ))}
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-700">Members</p>
                  {overview.members.map((m) => {
                    const isOwner = String(m.role).toLowerCase() === 'owner';
                    const isSelf = m.user_id === currentUserId;
                    return (
                      <div key={m.id} className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 bg-white p-2 md:grid-cols-[1fr_auto_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">{m.full_name || m.user_id}</p>
                          <p className="text-[11px] text-stone-500">{m.role}</p>
                        </div>
                        {teamCaps.canManageMembers && !isOwner && (
                          <select
                            value={m.role}
                            onChange={(e) => handleMemberRole(m.id, e.target.value)}
                            className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-xs"
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                        {teamCaps.canManageMembers && !isOwner && !isSelf && (
                          <Button
                            variant="outline"
                            className="h-8 rounded-lg border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setMemberToRemove({ id: m.id, label: m.full_name || m.user_id });
                              setConfirmRemoveOpen(true);
                            }}
                            disabled={teamBusy}
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
        </div>
      )}

      <Button
        ref={fabButtonRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[80] h-14 w-14 rounded-full bg-stone-900 text-white shadow-xl hover:bg-stone-800 md:bottom-6 md:right-6"
        aria-label="Open Team Access"
      >
        <Users className="h-5 w-5" />
      </Button>

      <AlertDialog
        open={confirmRemoveOpen}
        onOpenChange={(next) => {
          setConfirmRemoveOpen(next);
          if (!next) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent className="font-outfit rounded-2xl border border-stone-300 bg-white text-stone-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-stone-900">Remove member?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600">
              {memberToRemove?.label
                ? `This will remove ${memberToRemove.label} from your team.`
                : 'This will remove this member from your team.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-300 bg-stone-900 text-white hover:bg-stone-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (memberToRemove?.id) {
                  void handleRemoveMember(memberToRemove.id);
                }
                setConfirmRemoveOpen(false);
                setMemberToRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
