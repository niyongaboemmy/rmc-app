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
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roleId: string | null;
  roleEntity: Role | null;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function AssignRoleModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserRow;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(user.roleId ?? '');
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.put(`/users/${user.id}/role`, {
        roleId: selectedRoleId || null,
        role: selectedRole,
      });
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Failed to assign role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1">Assign Role</h2>
        <p className="text-gray-500 text-sm mb-4">
          {user.firstName} {user.lastName} · {user.email}
        </p>
        {error && <Alert variant="error" message={error} className="mb-3" />}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Role (hierarchy)</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Role (permissions)</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <option value="">— None —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button isLoading={isLoading} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({
  roles,
  onClose,
  onSaved,
}: {
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', role: 'user', roleId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/users', {
        ...form,
        roleId: form.roleId || undefined,
      });
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Create failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">Create User</h2>
        {error && <Alert variant="error" message={error} className="mb-3" />}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" required value={form.firstName} onChange={set('firstName')} />
            <Input label="Last Name" required value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
          <Input label="Phone (+250...)" required value={form.phone} onChange={set('phone')} />
          <Input label="Password" type="password" required value={form.password} onChange={set('password')} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green" value={form.role} onChange={set('role')}>
                <option value="user">User</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Role</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green" value={form.roleId} onChange={set('roleId')}>
                <option value="">— None —</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Create User</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<UserRow | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const limit = 20;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: { users: UserRow[]; total: number } }>('/users', {
          params: { page, limit, search: search || undefined, status: statusFilter || undefined },
        }),
        apiClient.get<{ success: boolean; data: Role[] }>('/roles'),
      ]);
      setUsers(usersRes.data.data.users);
      setTotal(usersRes.data.data.total);
      setRoles(rolesRes.data.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Delete user ${user.email}?`)) return;
    try {
      await apiClient.delete(`/users/${user.id}`);
      await loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Delete failed');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>+ Create User</Button>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rmc-green" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-medium capitalize">{u.role}</span>
                        {u.roleEntity && (
                          <span className="text-gray-400 ml-1">· {u.roleEntity.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setAssignModal(u)}
                        className="text-rmc-green hover:underline text-xs font-medium"
                      >
                        Role
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-red-500 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <span className="flex items-center text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {assignModal && (
        <AssignRoleModal
          user={assignModal}
          roles={roles}
          onClose={() => setAssignModal(null)}
          onSaved={async () => { setAssignModal(null); await loadData(); }}
        />
      )}

      {createModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setCreateModal(false)}
          onSaved={async () => { setCreateModal(false); await loadData(); }}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute permissions={[Permission.USERS_VIEW]}>
      <UsersPageContent />
    </ProtectedRoute>
  );
}
