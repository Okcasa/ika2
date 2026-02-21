'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

function AcceptInvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams?.get('token') || '', [searchParams]);
  const codeFromUrl = useMemo(() => searchParams?.get('code') || '', [searchParams]);
  const [inviteCodeInput, setInviteCodeInput] = useState(codeFromUrl);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const lookupCode = inviteCodeInput.trim();
      if (!token && lookupCode.length === 0) {
        setInvite(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (!token && lookupCode.length !== 5) {
        setInvite(null);
        setError('Enter the full 5-digit invite code.');
        setLoading(false);
        return;
      }
      try {
        const query = token
          ? `token=${encodeURIComponent(token)}`
          : `code=${encodeURIComponent(lookupCode)}`;
        const res = await fetch(`/api/team/invite?${query}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json?.error || 'Invite not found.');
        } else {
          setInvite(json?.invite || null);
          if (json?.invite?.expired) {
            setError('This invite has expired.');
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load invite.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, inviteCodeInput]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    setStatusMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setError('Sign in first, then accept the invite.');
        setAccepting(false);
        return;
      }

      const res = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, code: inviteCodeInput.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to accept invite.');
      } else {
        setStatusMsg(json?.message || 'Invite accepted. Admin approval is pending.');
        window.setTimeout(() => {
          router.push('/shop');
        }, 1200);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="min-h-screen app-shell-bg app-shell-text p-6 flex items-center justify-center">
      <Card className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-black tracking-tight text-stone-900">Team Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!token && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-600">Invite Code</p>
              <Input
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter 5-digit code"
                className="h-10 rounded-xl border-stone-300 bg-white text-stone-900"
              />
            </div>
          )}
          {loading && <p className="text-sm text-stone-500">Loading invite...</p>}
          {!loading && invite && (
            <div className="space-y-2 text-sm">
              <p className="text-stone-700">
                Team: <span className="font-bold text-stone-900">{invite?.teams?.name || 'Unknown team'}</span>
              </p>
              <p className="text-stone-700">
                Invited as: <span className="font-bold text-stone-900">{invite?.role || 'editor'}</span>
              </p>
              <p className="text-stone-700">
                Code: <span className="font-bold text-stone-900">{invite?.invite_code || '-'}</span>
              </p>
              {invite?.email && (
                <p className="text-stone-700">
                  Email: <span className="font-bold text-stone-900">{invite?.email}</span>
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {statusMsg && <p className="text-sm text-emerald-700">{statusMsg}</p>}
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={loading || !!error || accepting}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              {accepting ? 'Accepting...' : 'Accept Invite'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/shop')}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen app-shell-bg app-shell-text p-6 flex items-center justify-center">Loading invite...</main>}>
      <AcceptInvitePageContent />
    </Suspense>
  );
}
