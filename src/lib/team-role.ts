export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'member' | null | undefined;

export const normalizeTeamRole = (role: TeamRole): 'owner' | 'admin' | 'editor' | 'viewer' | null => {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'admin') return 'admin';
  if (r === 'editor' || r === 'member') return 'editor';
  if (r === 'viewer') return 'viewer';
  return null;
};

export const getRoleCapabilities = (role: TeamRole) => {
  const normalized = normalizeTeamRole(role);
  return {
    role: normalized,
    canInvite: normalized === 'owner' || normalized === 'admin',
    canManageMembers: normalized === 'owner' || normalized === 'admin',
    canEdit: normalized !== 'viewer',
    canExportOnly: normalized === 'viewer',
  };
};

export const actorColorClass = (name?: string | null) => {
  const palette = [
    'text-blue-700',
    'text-violet-700',
    'text-emerald-700',
    'text-orange-700',
    'text-rose-700',
    'text-cyan-700',
  ];
  const source = (name || 'system').trim();
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
};

