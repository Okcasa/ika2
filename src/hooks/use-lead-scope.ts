'use client';

import { useCallback, useEffect, useState } from 'react';

export type LeadScope = 'team' | 'mine';

const LEAD_SCOPE_KEY = 'ika_lead_scope';
const LEAD_SCOPE_EVENT = 'ika:lead-scope-change';

const normalizeScope = (raw: unknown): LeadScope => {
  return raw === 'mine' ? 'mine' : 'team';
};

export const readLeadScope = (): LeadScope => {
  if (typeof window === 'undefined') return 'team';
  return normalizeScope(window.localStorage.getItem(LEAD_SCOPE_KEY));
};

export const writeLeadScope = (scope: LeadScope) => {
  if (typeof window === 'undefined') return;
  const next = normalizeScope(scope);
  window.localStorage.setItem(LEAD_SCOPE_KEY, next);
  window.dispatchEvent(new CustomEvent(LEAD_SCOPE_EVENT, { detail: next }));
};

export function useLeadScope() {
  const [leadScope, setLeadScopeState] = useState<LeadScope>('team');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLeadScopeState(readLeadScope());

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LEAD_SCOPE_KEY) return;
      setLeadScopeState(normalizeScope(event.newValue));
    };

    const onScopeChange = (event: Event) => {
      const customEvent = event as CustomEvent<LeadScope>;
      setLeadScopeState(normalizeScope(customEvent.detail));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LEAD_SCOPE_EVENT, onScopeChange as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LEAD_SCOPE_EVENT, onScopeChange as EventListener);
    };
  }, []);

  const setLeadScope = useCallback((scope: LeadScope) => {
    const next = normalizeScope(scope);
    setLeadScopeState(next);
    writeLeadScope(next);
  }, []);

  return {
    leadScope,
    setLeadScope,
    isMineScope: leadScope === 'mine',
  };
}
