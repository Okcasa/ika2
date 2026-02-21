'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TutorialStep = {
  selector: string;
  title: string;
  description: string;
};

type TutorialMap = Record<string, TutorialStep[]>;
type TutorialReplayDetail = {
  mode?: 'current' | 'all' | 'full';
  path?: string;
};

type TutorialFlowState = {
  routeIndex: number;
  stepIndex: number;
  active: boolean;
};

const LEGACY_TUTORIAL_DONE_PREFIX = 'ika_tutorial_done:';
const TUTORIAL_MASTER_DONE_KEY = 'ika_tutorial_master_done_v1';
const TUTORIAL_FLOW_STATE_KEY = 'ika_tutorial_flow_state_v1';
const TUTORIAL_ROUTE_ORDER = ['/shop', '/products', '/customers', '/logs', '/income'] as const;

const TUTORIAL_STEPS: TutorialMap = {
  '/shop': [
    { selector: '[data-tutorial-id="nav-dashboard"]', title: 'Dashboard', description: 'This is your home base for leads, revenue, and quick actions.' },
    { selector: '[data-tutorial-id="dashboard-stats"]', title: 'Top Metrics', description: 'Track lead volume and closed deal revenue here.' },
    { selector: '[data-tutorial-id="dashboard-new-leads"]', title: 'New Leads', description: 'Click these avatars to jump directly into Logs for that lead.' },
    { selector: '[data-tutorial-id="dashboard-pipeline"]', title: 'Lead Pipeline', description: 'This panel rotates lead snapshots and performance over time.' },
    { selector: '[data-tutorial-id="dashboard-products"]', title: 'Popular Products', description: 'Quick access to bundles so you can add more leads fast.' },
  ],
  '/customers': [
    { selector: '[data-tutorial-id="nav-leads"]', title: 'Leads Page', description: 'This is your full pipeline management table.' },
    { selector: '[data-tutorial-id="leads-stats"]', title: 'Lead Stats', description: 'Projected revenue, active pipeline, and closed value are summarized here.' },
    { selector: '[data-tutorial-id="leads-table"]', title: 'Lead Table', description: 'Search, filter, update status, and process actions for each lead.' },
  ],
  '/logs': [
    { selector: '[data-tutorial-id="nav-logs"]', title: 'Logs Page', description: 'Use this page to process interactions and keep history clean.' },
    { selector: '[data-tutorial-id="logs-lead-list"]', title: 'Lead List', description: 'Pick a lead from the left column to open its interaction workspace.' },
    { selector: '[data-tutorial-id="logs-workspace"]', title: 'Interaction Workspace', description: 'Update outcome, notes, scheduling, and status from this panel.' },
  ],
  '/income': [
    { selector: '[data-tutorial-id="nav-income"]', title: 'Income Page', description: 'Monitor revenue and deal outcomes in real time.' },
    { selector: '[data-tutorial-id="income-summary"]', title: 'Revenue Summary', description: 'Review total revenue and progress toward your target goal.' },
    { selector: '[data-tutorial-id="income-chart"]', title: 'Performance Chart', description: 'See daily revenue trends and close/lost activity by day.' },
    { selector: '[data-tutorial-id="income-recent"]', title: 'Recent Deals', description: 'Latest closed deals are listed here with amount and timing.' },
  ],
  '/products': [
    { selector: '[data-tutorial-id="nav-products"]', title: 'Marketplace', description: 'Choose a lead package and load your pipeline quickly.' },
    { selector: '[data-tutorial-id="products-overview"]', title: 'Market Overview', description: 'Current pricing and available lead volume are shown here.' },
    { selector: '[data-tutorial-id="products-config"]', title: 'Configure Order', description: 'Pick quantity, adjust custom leads, and review total cost.' },
    { selector: '[data-tutorial-id="products-bundles"]', title: 'Quick Bundles', description: 'Shortcut list for one-click package selection.' },
    { selector: '[data-tutorial-id="products-history"]', title: 'Purchase History', description: 'Track your previous lead purchases and totals.' },
  ],
};

const findVisibleTarget = (selector: string): HTMLElement | null => {
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of matches) {
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      styles.opacity !== '0';
    if (visible) return el;
  }
  return null;
};

const readFlowState = (): TutorialFlowState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TUTORIAL_FLOW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.routeIndex === 'number' &&
      typeof parsed.stepIndex === 'number' &&
      typeof parsed.active === 'boolean'
    ) {
      return parsed as TutorialFlowState;
    }
    return null;
  } catch {
    return null;
  }
};

const writeFlowState = (next: TutorialFlowState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TUTORIAL_FLOW_STATE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const clearFlowState = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TUTORIAL_FLOW_STATE_KEY);
  } catch {
    // ignore
  }
};

export function AppTutorial() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = useMemo(() => TUTORIAL_STEPS[pathname] || [], [pathname]);
  const currentStep = steps[stepIndex] || null;
  const total = steps.length;
  const routeIndex = useMemo(
    () => TUTORIAL_ROUTE_ORDER.indexOf(pathname as (typeof TUTORIAL_ROUTE_ORDER)[number]),
    [pathname]
  );

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(Boolean(data.session));
      setAuthReady(true);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthed) {
      setIsOpen(false);
      return;
    }
    if (!pathname || steps.length === 0) {
      setIsOpen(false);
      return;
    }
    if (typeof window === 'undefined') return;
    const alreadyDone = window.localStorage.getItem(TUTORIAL_MASTER_DONE_KEY) === '1';
    if (alreadyDone) {
      setIsOpen(false);
      return;
    }
    if (routeIndex < 0) {
      setIsOpen(false);
      return;
    }

    const flow = readFlowState();
    if (flow?.active) {
      if (flow.routeIndex !== routeIndex) {
        setIsOpen(false);
        return;
      }
      const clampedStep = Math.min(Math.max(flow.stepIndex, 0), Math.max(steps.length - 1, 0));
      setStepIndex(clampedStep);
      setIsOpen(true);
      return;
    }

    if (pathname === TUTORIAL_ROUTE_ORDER[0]) {
      writeFlowState({ routeIndex: 0, stepIndex: 0, active: true });
      setStepIndex(0);
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
  }, [authReady, isAuthed, pathname, routeIndex, steps.length]);

  useEffect(() => {
    if (!isOpen || routeIndex < 0) return;
    writeFlowState({ routeIndex, stepIndex, active: true });
  }, [isOpen, routeIndex, stepIndex]);

  useEffect(() => {
    if (!authReady || !isAuthed) return;
    if (typeof window === 'undefined') return;
    const handleReplay = (event: Event) => {
      const custom = event as CustomEvent<TutorialReplayDetail>;
      const detail = custom.detail || {};
      const mode = detail.mode || 'full';
      const targetPath = detail.path || pathname;

      if (mode === 'all' || mode === 'full') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(LEGACY_TUTORIAL_DONE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.removeItem(TUTORIAL_MASTER_DONE_KEY);
        clearFlowState();

        if (pathname !== TUTORIAL_ROUTE_ORDER[0]) {
          router.push(TUTORIAL_ROUTE_ORDER[0]);
          return;
        }
        if (steps.length === 0) return;
        setStepIndex(0);
        writeFlowState({ routeIndex: 0, stepIndex: 0, active: true });
        setIsOpen(true);
        return;
      } else {
        if (targetPath !== pathname) return;
        window.localStorage.removeItem(TUTORIAL_MASTER_DONE_KEY);
        clearFlowState();
      }

      if (steps.length === 0) return;
      setStepIndex(0);
      if (routeIndex >= 0) {
        writeFlowState({ routeIndex, stepIndex: 0, active: true });
      }
      setIsOpen(true);
    };

    window.addEventListener('tutorial:redo', handleReplay as EventListener);
    return () => {
      window.removeEventListener('tutorial:redo', handleReplay as EventListener);
    };
  }, [authReady, isAuthed, pathname, routeIndex, router, steps.length]);

  useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }

    const recalc = () => {
      const target = findVisibleTarget(currentStep.selector);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };

    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    const interval = window.setInterval(recalc, 350);

    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
      window.clearInterval(interval);
    };
  }, [currentStep, isOpen]);

  const closeAndRemember = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TUTORIAL_MASTER_DONE_KEY, '1');
    }
    clearFlowState();
    setIsOpen(false);
  };

  if (!isOpen || !currentStep || total === 0) return null;

  const padding = 8;
  const highlightTop = targetRect ? Math.max(8, targetRect.top - padding) : 0;
  const highlightLeft = targetRect ? Math.max(8, targetRect.left - padding) : 0;
  const highlightWidth = targetRect ? targetRect.width + padding * 2 : 0;
  const highlightHeight = targetRect ? targetRect.height + padding * 2 : 0;
  const highlightRadius = 16;

  const cardWidth = 360;
  const cardX = targetRect
    ? Math.min(window.innerWidth - cardWidth - 12, Math.max(12, targetRect.left))
    : Math.max(12, (window.innerWidth - cardWidth) / 2);
  const cardY = targetRect
    ? Math.min(window.innerHeight - 200, Math.max(12, targetRect.bottom + 14))
    : Math.max(12, (window.innerHeight - 200) / 2);

  return (
    <div className="fixed inset-0 z-[120]">
      {!targetRect && <div className="absolute inset-0 bg-black/45" />}

      {targetRect && (
        <div
          className="pointer-events-none absolute border-2 border-blue-300/90"
          style={{
            top: highlightTop,
            left: highlightLeft,
            width: highlightWidth,
            height: highlightHeight,
            borderRadius: highlightRadius,
            background: 'transparent',
            boxShadow:
              '0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset',
          }}
        />
      )}

      <div
        className="absolute rounded-2xl border border-stone-300 bg-stone-100/95 p-4 text-stone-900 shadow-2xl backdrop-blur-[1px]"
        style={{ width: cardWidth, left: cardX, top: cardY }}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Tutorial {stepIndex + 1} / {total}
            </p>
            <h3 className="text-base font-black text-stone-950">{currentStep.title}</h3>
          </div>
          <button
            type="button"
            onClick={closeAndRemember}
            className="rounded-full border border-stone-300 bg-stone-200 p-1 text-stone-600 transition hover:bg-stone-300 hover:text-stone-800"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-medium text-stone-700">{currentStep.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            className="rounded-full border border-stone-400 bg-stone-300 text-stone-900 hover:bg-stone-400 hover:text-stone-950"
            onClick={closeAndRemember}
          >
            Skip
          </Button>
          <Button
            type="button"
            className="rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800"
            onClick={() => {
              if (stepIndex >= total - 1) {
                if (routeIndex >= 0 && routeIndex < TUTORIAL_ROUTE_ORDER.length - 1) {
                  writeFlowState({ routeIndex: routeIndex + 1, stepIndex: 0, active: true });
                  setIsOpen(false);
                  router.push(TUTORIAL_ROUTE_ORDER[routeIndex + 1]);
                  return;
                }
                closeAndRemember();
                router.push(TUTORIAL_ROUTE_ORDER[0]);
                return;
              }
              setStepIndex((prev) => prev + 1);
            }}
          >
            {stepIndex >= total - 1 ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
