import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, ShieldAlert, UserCheck, Trash2, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
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
        setSuccessMsg(`User ${formData.username} created successfully!`);
        setAddModalOpen(false);
        setFormData({ username: '', email: '', full_name: '', phone: '', role: 'operator', password: '' });
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
        setSuccessMsg(res.message || `Password for ${selectedUser.username} successfully reset!`);
        setResetModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      setError(err.message || 'Password reset failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this user?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Delete failed');
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

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-green-bg)',
          color: 'var(--status-green)',
          border: '1px solid var(--status-green-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <strong>{successMsg}</strong>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-red-bg)',
          color: 'var(--status-red)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          fontSize: '0.8rem'
        }}>
          {error}
        </div>
      )}

      {/* Modern DataTable */}
      <DataTable
        title="System Operators & Administrative Accounts"
        subtitle={`Total registered accounts: ${users.length}`}
        icon={Users}
        columns={[
          {
            key: 'username',
            label: 'Username',
            render: (u) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {u.username}
              </span>
            )
          },
          {
            key: 'full_name',
            label: 'Full Name',
            render: (u) => <span style={{ fontWeight: 600 }}>{u.full_name}</span>
          },
          {
            key: 'email',
            label: 'Email Address',
            render: (u) => <span style={{ fontSize: '0.75rem' }}>{u.email}</span>
          },
          {
            key: 'phone',
            label: 'Phone',
            render: (u) => <span style={{ fontSize: '0.75rem' }}>{u.phone || '-'}</span>
          },
          {
            key: 'role',
            label: 'Role',
            render: (u) => (
              <span className={`badge ${
                u.role === 'superadmin' ? 'badge-purple' : (u.role === 'admin' ? 'badge-blue' : 'badge-gray')
              }`}>
                {u.role.toUpperCase()}
              </span>
            )
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
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
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
                    onClick={() => handleDelete(u.id)}
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
              placeholder="e.g. Jameel Al-Ghatam"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jameel@kimshealth.com"
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
              placeholder="+973 3311 0000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">User Role</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="operator">Gate Operator / Cashier / Reception</option>
              <option value="admin">Hospital Security Administrator</option>
              {isSuperadmin && <option value="superadmin">Super Administrator</option>}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password (min 6 characters) *</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      {selectedUser && (
        <Modal 
          isOpen={resetModalOpen} 
          onClose={() => setResetModalOpen(false)} 
          title={`Reset Password: ${selectedUser.username}`}
        >
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {selectedUser.role === 'superadmin' ? (
                <strong style={{ color: 'var(--status-purple)' }}>
                  Superadmin Password Security: This credential will be cryptographically encrypted and saved directly in the server file vault.
                </strong>
              ) : (
                `Enter a new secure password for ${selectedUser.full_name} (${selectedUser.username}). This will be updated in the database.`
              )}
            </p>

            <div className="form-group">
              <label className="form-label">New Password (min 6 characters) *</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
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
      )}
    </div>
  );
}
