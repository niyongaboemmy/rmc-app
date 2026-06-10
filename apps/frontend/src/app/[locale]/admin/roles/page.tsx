'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

const ALL_PERMISSION_VALUES = [
  'users:view','users:create','users:edit','users:delete','users:assign_role',
  'roles:view','roles:create','roles:edit','roles:delete',
  'members:view','members:create','members:edit','members:delete','members:approve','members:id_card',
  'mosques:view','mosques:create','mosques:edit','mosques:delete','mosques:manage_imams',
  'prayer_times:view','prayer_times:manage',
  'content:view','content:create','content:edit','content:delete',
  'finance:view','finance:manage',
  'reports:view','reports:export',
  'system:settings','audit_log:view',
];

const PERMISSION_GROUPS: Record<string, string[]> = {
  Users: ['users:view','users:create','users:edit','users:delete','users:assign_role'],
  Roles: ['roles:view','roles:create','roles:edit','roles:delete'],
  Members: ['members:view','members:create','members:edit','members:delete','members:approve','members:id_card'],
  Mosques: ['mosques:view','mosques:create','mosques:edit','mosques:delete','mosques:manage_imams'],
  'Prayer Times': ['prayer_times:view','prayer_times:manage'],
  Content: ['content:view','content:create','content:edit','content:delete'],
  Finance: ['finance:view','finance:manage'],
  Reports: ['reports:view','reports:export'],
  System: ['system:settings','audit_log:view'],
};

function RoleModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [slug, setSlug] = useState(role?.slug ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    new Set(role?.permissions ?? []),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePerm = (p: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

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
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Save failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Role' : 'Create Role'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="error" message={error} />}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit && (role?.isSystem ?? false)}
              required
            />
            <Input
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isEdit}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Permissions</p>
            <div className="space-y-4">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                const allSelected = perms.every((p) => selectedPerms.has(p));
                return (
                  <div key={group} className="border border-gray-100 rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleGroup(perms)}
                        className="rounded accent-rmc-green"
                      />
                      <span className="text-sm font-semibold text-gray-800">{group}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1 ml-5">
                      {perms.map((p) => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPerms.has(p)}
                            onChange={() => togglePerm(p)}
                            className="rounded accent-rmc-green"
                          />
                          <span className="text-xs text-gray-600">{p.split(':')[1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>
              {isEdit ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RolesPageContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalRole, setModalRole] = useState<Role | null | undefined>(undefined);
  // undefined = closed, null = create, Role = edit

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

  const handleDelete = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await apiClient.delete(`/roles/${role.id}`);
      await loadRoles();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Delete failed');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage roles and their permissions</p>
        </div>
        <Button onClick={() => setModalRole(null)}>+ New Role</Button>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rmc-green" />
        </div>
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
                    <span className="bg-rmc-green/10 text-rmc-green text-xs px-2 py-0.5 rounded-full font-medium">
                      {role.permissions.length} permissions
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {role.isSystem ? (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">System</span>
                    ) : (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setModalRole(role)}
                      className="text-rmc-green hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDelete(role)}
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

      {modalRole !== undefined && (
        <RoleModal
          role={modalRole}
          onClose={() => setModalRole(undefined)}
          onSaved={async () => { setModalRole(undefined); await loadRoles(); }}
        />
      )}
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
