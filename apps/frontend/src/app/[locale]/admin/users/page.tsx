'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConfirmModal, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

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

const SYSTEM_ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'operator', label: 'Operator' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

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
  const { success, error: toastError } = useToast();
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
      success('Role assigned successfully');
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e?.response?.data?.error?.message || 'Failed to assign role';
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const customRoleOptions = [
    { value: '', label: '— None —' },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Assign Role</ModalTitle>
        <ModalDescription>
          {user.firstName} {user.lastName} · {user.email}
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-3">
        {error && <Alert variant="error" message={error} />}
        <Select
          label="System Role (hierarchy)"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          options={SYSTEM_ROLE_OPTIONS}
        />
        <Select
          label="Custom Role (permissions)"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          options={customRoleOptions}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button isLoading={isLoading} onClick={handleSave}>Save</Button>
      </ModalFooter>
    </Modal>
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
  const { success, error: toastError } = useToast();
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
      await apiClient.post('/users', { ...form, roleId: form.roleId || undefined });
      success('User created successfully');
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e?.response?.data?.error?.message || 'Create failed';
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const customRoleOptions = [
    { value: '', label: '— None —' },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Create User</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && <Alert variant="error" message={error} className="mb-3" />}
        <form id="create-user-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="First Name" required value={form.firstName} onChange={set('firstName')} />
            <Input label="Last Name" required value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
          <Input label="Phone (+250...)" required value={form.phone} onChange={set('phone')} />
          <Input label="Password" type="password" required value={form.password} onChange={set('password')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="System Role" value={form.role} onChange={set('role')} options={SYSTEM_ROLE_OPTIONS} />
            <Select label="Custom Role" value={form.roleId} onChange={set('roleId')} options={customRoleOptions} />
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button type="submit" form="create-user-form" isLoading={isLoading}>Create User</Button>
      </ModalFooter>
    </Modal>
  );
}

function UsersPageContent() {
  const { success, error: toastError } = useToast();
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
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/users/${deleteTarget.id}`);
      success(`${deleteTarget.email} deleted`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toastError(e?.response?.data?.error?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>+ Create User</Button>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </span>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={STATUS_OPTIONS}
              className="w-full sm:w-44"
            />
            {(search || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-2 transition-colors shrink-0 bg-gray-50 hover:bg-gray-100"
                title="Clear filters"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
        {(search || statusFilter) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 text-xs bg-rmc-green/10 text-rmc-green font-medium rounded-full px-2.5 py-1">
                Search: &quot;{search}&quot;
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-rmc-green/10 text-rmc-green font-medium rounded-full px-2.5 py-1 capitalize">
                Status: {statusFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <PageSpinner />
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
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
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
                        onClick={() => setDeleteTarget(u)}
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete user?"
        description={deleteTarget ? `This will permanently delete ${deleteTarget.email}. This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
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
