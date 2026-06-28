'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, KeyRound, Users, Building2, Clock, FileText, Wallet, BarChart3, Settings, MessageSquare, Bell, HardDrive, Heart, GraduationCap, CreditCard, Mail } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Permission groups definition
// ---------------------------------------------------------------------------
const PERMISSION_GROUPS: { group: string; color: string; icon: React.ElementType; perms: string[] }[] = [
  {
    group: 'Users', color: 'blue', icon: User,
    perms: ['users:view', 'users:create', 'users:edit', 'users:delete', 'users:assign_role'],
  },
  {
    group: 'Roles', color: 'purple', icon: KeyRound,
    perms: ['roles:view', 'roles:create', 'roles:edit', 'roles:delete'],
  },
  {
    group: 'Members', color: 'green', icon: Users,
    perms: ['members:view', 'members:create', 'members:edit', 'members:delete', 'members:approve', 'members:id_card'],
  },
  {
    group: 'Mosques', color: 'teal', icon: Building2,
    perms: ['mosques:view', 'mosques:create', 'mosques:edit', 'mosques:delete', 'mosques:manage_imams'],
  },
  {
    group: 'Prayer Times', color: 'amber', icon: Clock,
    perms: ['prayer_times:view', 'prayer_times:manage'],
  },
  {
    group: 'Content', color: 'orange', icon: FileText,
    perms: ['content:view', 'content:create', 'content:edit', 'content:delete'],
  },
  {
    group: 'Finance', color: 'emerald', icon: Wallet,
    perms: ['finance:view', 'finance:manage'],
  },
  {
    group: 'Reports', color: 'cyan', icon: BarChart3,
    perms: ['reports:view', 'reports:export'],
  },
  {
    group: 'System', color: 'red', icon: Settings,
    perms: ['system:settings', 'audit_log:view'],
  },
  {
    group: 'SMS Config', color: 'purple', icon: MessageSquare,
    perms: ['sms_config:view', 'sms_config:manage'],
  },
  {
    group: 'Notifications', color: 'orange', icon: Bell,
    perms: ['notification_settings:view', 'notification_settings:manage'],
  },
  {
    group: 'AI Settings', color: 'indigo', icon: Settings,
    perms: ['ai_settings:view', 'ai_settings:manage'],
  },
  {
    group: 'Payment Settings', color: 'yellow', icon: CreditCard,
    perms: ['payment_settings:view', 'payment_settings:manage'],
  },
  {
    group: 'Subscribers', color: 'pink', icon: Mail,
    perms: ['subscribers:view', 'subscribers:manage'],
  },
  {
    group: 'Donations', color: 'emerald', icon: Wallet,
    perms: ['donations:view', 'donations:manage'],
  },
  {
    group: 'Schools', color: 'cyan', icon: GraduationCap,
    perms: ['schools:view', 'schools:manage'],
  },
  {
    group: 'Contact Messages', color: 'teal', icon: MessageSquare,
    perms: ['contact_messages:view', 'contact_messages:manage'],
  },
  {
    group: 'Marriage', color: 'rose', icon: Heart,
    perms: [
      'marriage:view', 'marriage:manage', 'marriage:approve',
      'marriage:assign_imam', 'marriage:certificate', 'marriage:reports',
    ],
  },
  {
    group: 'Drive', color: 'slate', icon: HardDrive,
    perms: [
      'drive:view', 'drive:create', 'drive:edit',
      'drive:delete', 'drive:share', 'drive:admin',
    ],
  },
];

const GROUP_COLORS: Record<string, { bg: string; border: string; header: string; check: string }> = {
  blue:    { bg: 'bg-blue-50/60',    border: 'border-blue-100',   header: 'text-blue-700',   check: 'accent-blue-600' },
  purple:  { bg: 'bg-purple-50/60',  border: 'border-purple-100', header: 'text-purple-700', check: 'accent-purple-600' },
  green:   { bg: 'bg-green-50/60',   border: 'border-green-100',  header: 'text-green-700',  check: 'accent-green-600' },
  teal:    { bg: 'bg-teal-50/60',    border: 'border-teal-100',   header: 'text-teal-700',   check: 'accent-teal-600' },
  amber:   { bg: 'bg-amber-50/60',   border: 'border-amber-100',  header: 'text-amber-700',  check: 'accent-amber-600' },
  orange:  { bg: 'bg-orange-50/60',  border: 'border-orange-100', header: 'text-orange-700', check: 'accent-orange-600' },
  emerald: { bg: 'bg-emerald-50/60', border: 'border-emerald-100',header: 'text-emerald-700',check: 'accent-emerald-600' },
  cyan:    { bg: 'bg-cyan-50/60',    border: 'border-cyan-100',   header: 'text-cyan-700',   check: 'accent-cyan-600' },
  red:     { bg: 'bg-red-50/60',     border: 'border-red-100',    header: 'text-red-700',    check: 'accent-red-600' },
  indigo:  { bg: 'bg-indigo-50/60',  border: 'border-indigo-100', header: 'text-indigo-700', check: 'accent-indigo-600' },
  yellow:  { bg: 'bg-yellow-50/60',  border: 'border-yellow-100', header: 'text-yellow-700', check: 'accent-yellow-600' },
  pink:    { bg: 'bg-pink-50/60',    border: 'border-pink-100',   header: 'text-pink-700',   check: 'accent-pink-600' },
  rose:    { bg: 'bg-rose-50/60',    border: 'border-rose-100',   header: 'text-rose-700',   check: 'accent-rose-600' },
  slate:   { bg: 'bg-slate-50/60',   border: 'border-slate-200',  header: 'text-slate-700',  check: 'accent-slate-600' },
};

function formatPerm(raw: string) {
  const part = raw.includes(':') ? raw.split(':')[1] : raw;
  return part.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// RoleModal
// ---------------------------------------------------------------------------
function RoleModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const isEdit = !!role;

  const [name, setName]               = useState(role?.name ?? '');
  const [slug, setSlug]               = useState(role?.slug ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    new Set(role?.permissions ?? []),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const togglePerm = (p: string) =>
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const toggleGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => selectedPerms.has(p));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (allSelected ? next.delete(p) : next.add(p)));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const payload = { name, slug, description, permissions: Array.from(selectedPerms) };
      if (isEdit && role) {
        await apiClient.put(`/roles/${role.id}`, payload);
      } else {
        await apiClient.post('/roles', payload);
      }
      success(isEdit ? 'Role updated successfully' : 'Role created successfully');
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e?.response?.data?.error?.message || 'Save failed';
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelected = selectedPerms.size;
  const totalPerms    = PERMISSION_GROUPS.reduce((s, g) => s + g.perms.length, 0);

  return (
    <Modal isOpen onClose={onClose} size="2xl">
      <ModalHeader>
        <ModalTitle>{isEdit ? `Edit Role — ${role?.name}` : 'Create New Role'}</ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {error && <Alert variant="error" message={error} dismissible />}

        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Role Name"
            placeholder="e.g. Content Editor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEdit && (role?.isSystem ?? false)}
            required
          />
          <Input
            label="Slug"
            placeholder="e.g. content-editor"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isEdit}
            hint={isEdit ? 'Slug cannot be changed after creation' : 'Lowercase, hyphens only'}
            required
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Describe what this role can do…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          resize="none"
        />

        {/* Permissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Permissions</p>
            <span className="text-xs text-gray-400 tabular-nums">
              {totalSelected} / {totalPerms} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PERMISSION_GROUPS.map(({ group, color, icon: GroupIcon, perms }) => {
              const c           = GROUP_COLORS[color];
              const allSelected = perms.every((p) => selectedPerms.has(p));
              const someSelected = perms.some((p) => selectedPerms.has(p)) && !allSelected;

              return (
                <div
                  key={group}
                  className={cn(
                    'rounded-xl border p-3 flex flex-col gap-2 transition-shadow',
                    c.bg, c.border,
                    someSelected && 'ring-1 ring-offset-0',
                    allSelected  && 'ring-2 ring-offset-0',
                  )}
                >
                  {/* Group header */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(node) => { if (node) node.indeterminate = someSelected; }}
                      onChange={() => toggleGroup(perms)}
                      className={cn('h-4 w-4 rounded cursor-pointer', c.check)}
                    />
                    <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className={cn('text-xs font-bold tracking-wide uppercase', c.header)}>
                      {group}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400 tabular-nums shrink-0">
                      {perms.filter((p) => selectedPerms.has(p)).length}/{perms.length}
                    </span>
                  </label>

                  {/* Divider */}
                  <div className="border-t border-current opacity-10" />

                  {/* Individual perms */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {perms.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-1.5 cursor-pointer select-none group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.has(p)}
                          onChange={() => togglePerm(p)}
                          className={cn('h-3.5 w-3.5 rounded cursor-pointer shrink-0', c.check)}
                        />
                        <span className="text-[11px] text-gray-600 capitalize group-hover:text-gray-900 transition-colors truncate">
                          {formatPerm(p)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          isLoading={isLoading}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
        >
          {isEdit ? 'Save Changes' : 'Create Role'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function RolesPageContent() {
  const { success, error: toastError } = useToast();
  const [roles, setRoles]             = useState<Role[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [modalRole, setModalRole]     = useState<Role | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: Role[] }>('/roles');
      setRoles(res.data.data);
    } catch {
      setError('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/roles/${deleteTarget.id}`);
      success(`Role "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await loadRoles();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toastError(e?.response?.data?.error?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage roles and their permissions</p>
        </div>
        <Button onClick={() => setModalRole(null)}>+ New Role</Button>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Permissions</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{role.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{role.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant="primary">{role.permissions.length} permissions</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={role.isSystem ? 'default' : 'info'}>
                      {role.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setModalRole(role)}
                      className="text-rmc-green hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => setDeleteTarget(role)}
                        className="text-red-500 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role create / edit modal */}
      {modalRole !== undefined && (
        <RoleModal
          role={modalRole}
          onClose={() => setModalRole(undefined)}
          onSaved={async () => { setModalRole(undefined); await loadRoles(); }}
        />
      )}

      {/* Delete confirm modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete role?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. Users with this role will lose its permissions.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function RolesPage() {
  return (
    <ProtectedRoute permissions={[Permission.ROLES_VIEW]}>
      <RolesPageContent />
    </ProtectedRoute>
  );
}
