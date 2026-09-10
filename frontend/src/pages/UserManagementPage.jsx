import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, ShieldAlert, UserCheck, Trash2, CheckCircle2, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import DataTable from '../components/common/DataTable';

export default function UserManagementPage() {
  const { user: currentUser, isSuperadmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Delete User Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    user: null,
    loading: false
  });

  // Add User Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'operator',
    password: ''
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.createUser(formData);
      if (res.success) {
        setToastMsg({ type: 'success', text: `User ${formData.username} created successfully!` });
        setTimeout(() => setToastMsg(null), 4000);
        setAddModalOpen(false);
        setFormData({
          username: '',
          email: '',
          full_name: '',
          phone: '',
          role: 'operator',
          password: ''
        });
        loadUsers();
      }
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setError('');
    setSuccessMsg('');

    try {
      const res = await api.resetPassword({
        user_id: selectedUser.id,
        new_password: newPassword
      });
      if (res.success) {
        setToastMsg({ type: 'success', text: `Password for ${selectedUser.username} has been reset!` });
        setTimeout(() => setToastMsg(null), 4000);
        setResetModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      setError(err.message || 'Password reset failed');
    }
  };

  const handleOpenDeleteModal = (u) => {
    setDeleteConfirm({
      isOpen: true,
      user: u,
      loading: false
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.user) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      await api.deleteUser(deleteConfirm.user.id);
      setToastMsg({ type: 'success', text: `User account ${deleteConfirm.user.username} deleted successfully!` });
      setTimeout(() => setToastMsg(null), 4000);
      setDeleteConfirm({ isOpen: false, user: null, loading: false });
      loadUsers();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      setToastMsg({ type: 'error', text: err.message || 'Delete failed' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            User Accounts & RBAC Access Control
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {isSuperadmin 
              ? 'Superadmin View: Full system visibility across all administrators and operators' 
              : 'Admin View: Manage gate operators and cashiers (Superadmin accounts protected)'}
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
          <Plus size={14} /> Add User Account
        </button>
      </div>

      {toastMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          fontWeight: 600,
          background: toastMsg.type === 'success' ? 'var(--status-green-bg, #ecfdf5)' : 'var(--status-red-bg, #fef2f2)',
          color: toastMsg.type === 'success' ? 'var(--status-green, #059669)' : 'var(--status-red, #dc2626)',
          border: `1px solid ${toastMsg.type === 'success' ? 'var(--status-green-border, #a7f3d0)' : 'var(--status-red-border, #fecaca)'}`,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Users DataTable */}
      <DataTable
        columns={[
          {
            key: 'username',
            label: 'Username',
            render: (u) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: u.role === 'superadmin' ? '#f59e0b' : (u.role === 'admin' ? '#2563eb' : '#ec4899'),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{u.username}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
              </div>
            )
          },
          {
            key: 'full_name',
            label: 'Full Name & Contact',
            render: (u) => (
              <div>
                <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                {u.phone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
              </div>
            )
          },
          {
            key: 'role',
            label: 'Role',
            render: (u) => {
              let badgeClass = 'badge-gray';
              if (u.role === 'superadmin') badgeClass = 'badge-amber';
              else if (u.role === 'admin') badgeClass = 'badge-blue';
              else if (u.role === 'operator') badgeClass = 'badge-green';

              return (
                <span className={`badge ${badgeClass}`} style={{ textTransform: 'uppercase' }}>
                  {u.role}
                </span>
              );
            }
          },
          {
            key: 'status',
            label: 'Status',
            render: (u) => (
              <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                {u.status}
              </span>
            )
          },
          {
            key: 'last_login',
            label: 'Last Login',
            render: (u) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {u.last_login || 'Never'}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            exportable: false,
            align: 'right',
            render: (u) => (
              <div style={{ display: 'inline-flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSelectedUser(u);
                    setResetModalOpen(true);
                  }}
                  title="Reset Password"
                >
                  <KeyRound size={13} /> Reset Pass
                </button>

                {u.role !== 'superadmin' && u.id !== currentUser.id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--status-red)' }}
                    onClick={() => handleOpenDeleteModal(u)}
                    title="Delete User"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          }
        ]}
        data={users}
        loading={loading}
        exportable={true}
        exportFileName="system_users"
        searchPlaceholder="Search by username, full name, email, or role..."
        emptyMessage="No system user accounts found."
        headerActions={
          <button className="btn btn-outline btn-sm" onClick={loadUsers} title="Refresh users list">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, user: null, loading: false })}
        onConfirm={handleExecuteDelete}
        title="Delete User Account"
        message={`Are you sure you want to deactivate and delete user account '${deleteConfirm.user?.username}' (${deleteConfirm.user?.full_name})?`}
        confirmText="Delete Account"
        cancelText="Cancel"
        type="danger"
        loading={deleteConfirm.loading}
      />

      {/* Add User Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Create New User Account">
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className="form-input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. jameel_operator"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Jameel Ahmed"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@hospital.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+973 3900 0000"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Role Access</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="operator">Gate Operator (Live monitor, manual review, barrier override)</option>
              <option value="admin">System Admin (Tariff, settings, user accounts & reports)</option>
              {isSuperadmin && (
                <option value="superadmin">Superadmin (Server configs, licenses, full database control)</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password (min 6 chars) *</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal 
        isOpen={resetModalOpen} 
        onClose={() => setResetModalOpen(false)} 
        title={`Reset Password for ${selectedUser?.username}`}
      >
        <form onSubmit={handleResetPassword}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Set a new password for <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}). The user will be required to login with this password.
          </p>

          <div className="form-group">
            <label className="form-label">New Password (min 6 characters) *</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setResetModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
