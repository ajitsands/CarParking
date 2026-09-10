import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  KeyRound, 
  ShieldAlert, 
  UserCheck, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  AlertCircle,
  Edit3,
  Layers,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import DataTable from '../components/common/DataTable';

export default function UserManagementPage() {
  const { user: currentUser, isSuperadmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
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
    password: '',
    assigned_gates: 'ALL'
  });

  // Edit User Form State
  const [editFormData, setEditFormData] = useState({
    id: null,
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'operator',
    status: 'active',
    assigned_gates: 'ALL'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, gatesRes] = await Promise.all([
        api.getUsers(),
        api.getGates().catch(() => ({ success: false, data: { gates: [] } }))
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data.users || []);
      }
      if (gatesRes.success) {
        setGates(gatesRes.data.gates || []);
      }
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to load user list' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      phone: '',
      role: 'operator',
      password: '',
      assigned_gates: 'ALL'
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditFormData({
      id: u.id,
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone || '',
      role: u.role,
      status: u.status || 'active',
      assigned_gates: u.assigned_gates || 'ALL'
    });
    setEditModalOpen(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser(formData);
      if (res.success) {
        setToastMsg({ type: 'success', text: `User account '${formData.username}' created successfully!` });
        setTimeout(() => setToastMsg(null), 4000);
        setAddModalOpen(false);
        loadData();
      }
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to create user' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateUser(editFormData.id, editFormData);
      if (res.success) {
        setToastMsg({ type: 'success', text: `User account '${editFormData.username}' updated successfully!` });
        setTimeout(() => setToastMsg(null), 4000);
        setEditModalOpen(false);
        loadData();
      }
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to update user' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

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
      setToastMsg({ type: 'error', text: err.message || 'Password reset failed' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.user) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      await api.deleteUser(deleteConfirm.user.id);
      setToastMsg({ type: 'success', text: `User account ${deleteConfirm.user.username} deleted successfully!` });
      setTimeout(() => setToastMsg(null), 4000);
      setDeleteConfirm({ isOpen: false, user: null, loading: false });
      loadData();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      setToastMsg({ type: 'error', text: err.message || 'Delete failed' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Helper for Gate Checkbox toggling
  const toggleGateSelection = (gateCode, currentVal, setter) => {
    if (currentVal === 'ALL') {
      setter([gateCode]);
      return;
    }
    const currentList = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentList.includes(gateCode)) {
      const updated = currentList.filter(g => g !== gateCode);
      setter(updated.length === 0 ? 'ALL' : updated.join(','));
    } else {
      currentList.push(gateCode);
      setter(currentList.join(','));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            User Accounts & Gate Operator Assignments
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {isSuperadmin 
              ? 'Superadmin View: Full system visibility across administrators and gate lane operator assignments' 
              : 'Admin View: Manage operators, cashiers, and assign specific IN/OUT gate lanes to operators'}
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
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
                <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{u.full_name}</div>
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
                <span className={`badge ${badgeClass}`} style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  {u.role}
                </span>
              );
            }
          },
          {
            key: 'assigned_gates',
            label: 'Assigned Gate(s) / Lanes',
            render: (u) => {
              const val = u.assigned_gates || 'ALL';
              if (val === 'ALL') {
                return (
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                    All Gates (Full Access)
                  </span>
                );
              }
              const list = val.split(',').map(s => s.trim()).filter(Boolean);
              return (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {list.map(g => (
                    <span 
                      key={g} 
                      className={`badge ${g.includes('IN') ? 'badge-green' : 'badge-amber'}`}
                      style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              );
            }
          },
          {
            key: 'status',
            label: 'Status',
            render: (u) => (
              <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.68rem' }}>
                {u.status}
              </span>
            )
          },
          {
            key: 'last_login',
            label: 'Last Login',
            render: (u) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
              <div style={{ display: 'inline-flex', gap: '5px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenEdit(u)}
                  title="Edit User & Gate Assignment"
                  style={{ padding: '3px 7px' }}
                >
                  <Edit3 size={13} />
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSelectedUser(u);
                    setResetModalOpen(true);
                  }}
                  title="Reset Password"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  <KeyRound size={13} /> Reset Pass
                </button>

                {u.role !== 'superadmin' && u.id !== currentUser.id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--status-red)', padding: '3px 7px' }}
                    onClick={() => setDeleteConfirm({ isOpen: true, user: u, loading: false })}
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
        searchPlaceholder="Search by username, full name, email, gate, or role..."
        emptyMessage="No system user accounts found."
        headerActions={
          <button className="btn btn-outline btn-sm" onClick={loadData} title="Refresh users list">
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
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Create New User Account & Gate Assignment">
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

          {/* Assigned Gates / Lanes Selection */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--accent)" />
              Assigned Gate(s) / Lanes to Monitor:
            </label>
            
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-input)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                <input
                  type="radio"
                  name="add_gate_mode"
                  checked={formData.assigned_gates === 'ALL'}
                  onChange={() => setFormData({ ...formData, assigned_gates: 'ALL' })}
                />
                <span>All Gates & Lanes (Full System Access)</span>
              </label>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Or select specific gate lanes:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                {gates.map(g => {
                  const isChecked = formData.assigned_gates !== 'ALL' && formData.assigned_gates.split(',').map(s => s.trim()).includes(g.gate_code);
                  return (
                    <label 
                      key={g.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isChecked ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                        border: `1px solid ${isChecked ? 'var(--accent)' : 'transparent'}`,
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGateSelection(g.gate_code, formData.assigned_gates, (v) => setFormData({ ...formData, assigned_gates: v }))}
                      />
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{g.gate_code}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({g.gate_type.toUpperCase()})</span>
                    </label>
                  );
                })}
              </div>
            </div>
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

      {/* Edit User Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Account: ${editFormData.username}`}>
        <form onSubmit={handleUpdateUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={editFormData.full_name}
              onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Role Access</label>
              <select
                className="form-select"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              >
                <option value="operator">Gate Operator</option>
                <option value="admin">System Admin</option>
                {isSuperadmin && (
                  <option value="superadmin">Superadmin</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Assigned Gates / Lanes Selection */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--accent)" />
              Assigned Gate(s) / Lanes to Monitor:
            </label>
            
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-input)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                <input
                  type="radio"
                  name="edit_gate_mode"
                  checked={editFormData.assigned_gates === 'ALL'}
                  onChange={() => setEditFormData({ ...editFormData, assigned_gates: 'ALL' })}
                />
                <span>All Gates & Lanes (Full System Access)</span>
              </label>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Or select specific gate lanes:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                {gates.map(g => {
                  const isChecked = editFormData.assigned_gates !== 'ALL' && editFormData.assigned_gates.split(',').map(s => s.trim()).includes(g.gate_code);
                  return (
                    <label 
                      key={g.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isChecked ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                        border: `1px solid ${isChecked ? 'var(--accent)' : 'transparent'}`,
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGateSelection(g.gate_code, editFormData.assigned_gates, (v) => setEditFormData({ ...editFormData, assigned_gates: v }))}
                      />
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{g.gate_code}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({g.gate_type.toUpperCase()})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
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
            Set a new password for <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}).
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

