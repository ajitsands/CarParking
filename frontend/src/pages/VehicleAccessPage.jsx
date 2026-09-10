import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Plus, Trash2, Search, Car, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import DataTable from '../components/common/DataTable';

export default function VehicleAccessPage() {
  const [activeTab, setActiveTab] = useState('whitelisted');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState('staff');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerDept, setOwnerDept] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    vehicle: null,
    loading: false
  });

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.getVehicles({ access_status: activeTab });
      if (res.success) {
        setVehicles(res.data.vehicles || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await api.saveVehicle({
        plate_number: plateNumber.trim().toUpperCase(),
        category,
        access_status: activeTab,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        owner_department: ownerDept.trim(),
        block_reason: blockReason.trim(),
        valid_to: validTo || null,
        notes: notes.trim()
      });

      setModalOpen(false);
      setToastMsg({ type: 'success', text: `Vehicle ${plateNumber.trim().toUpperCase()} added to ${activeTab} successfully!` });
      setTimeout(() => setToastMsg(null), 4000);
      // Reset
      setPlateNumber('');
      setOwnerName('');
      setBlockReason('');
      loadVehicles();
    } catch (err) {
      setError(err.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (vehicle) => {
    setDeleteConfirm({
      isOpen: true,
      vehicle,
      loading: false
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.vehicle) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      await api.deleteVehicle(deleteConfirm.vehicle.id);
      setToastMsg({ type: 'success', text: `Vehicle ${deleteConfirm.vehicle.plate_number} removed from ${activeTab}!` });
      setTimeout(() => setToastMsg(null), 4000);
      setDeleteConfirm({ isOpen: false, vehicle: null, loading: false });
      loadVehicles();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      setToastMsg({ type: 'error', text: err.message || 'Failed to delete vehicle' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Vehicle Access Control (Whitelist & Blacklist)
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Configure authorized doctor/staff whitelist and security blacklisted vehicles
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Add {activeTab === 'whitelisted' ? 'Whitelisted Vehicle' : 'Blacklisted Vehicle'}
          </button>
        </div>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`btn ${activeTab === 'whitelisted' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('whitelisted')}
        >
          <ShieldCheck size={16} /> Whitelist (Doctor / Staff Auto-Open)
        </button>
        <button
          className={`btn ${activeTab === 'blacklisted' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('blacklisted')}
          style={activeTab === 'blacklisted' ? { background: 'var(--status-red)', borderColor: 'var(--status-red)' } : {}}
        >
          <ShieldAlert size={16} /> Blacklist (Security Alert / Block Entry)
        </button>
      </div>

      {/* Vehicles DataTable */}
      <DataTable
        columns={[
          {
            key: 'plate_number',
            label: 'Plate Number',
            render: (v) => (
              <div style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: '0.84rem'
              }}>
                {v.plate_number}
              </div>
            )
          },
          {
            key: 'owner_name',
            label: 'Owner / Contact',
            render: (v) => (
              <div>
                <div style={{ fontWeight: 600 }}>{v.owner_name || 'N/A'}</div>
                {v.owner_phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.owner_phone}</div>}
              </div>
            )
          },
          {
            key: 'category',
            label: 'Category',
            render: (v) => (
              <span className="badge badge-blue">
                {v.category}
              </span>
            )
          },
          {
            key: 'department',
            label: 'Department',
            render: (v) => (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {v.owner_department || '-'}
              </span>
            )
          },
          ...(activeTab === 'blacklisted' ? [
            {
              key: 'block_reason',
              label: 'Block Reason',
              render: (v) => (
                <span style={{ fontSize: '0.75rem', color: 'var(--status-red)', fontWeight: 600 }}>
                  {v.block_reason || 'Security Violation'}
                </span>
              )
            }
          ] : [
            {
              key: 'valid_to',
              label: 'Validity',
              render: (v) => (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {v.valid_to ? `Until ${v.valid_to}` : 'Permanent'}
                </span>
              )
            }
          ]),
          {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            align: 'right',
            render: (v) => (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--status-red)' }}
                onClick={() => handleOpenDeleteModal(v)}
                title="Remove Vehicle"
              >
                <Trash2 size={13} />
              </button>
            )
          }
        ]}
        data={vehicles}
        loading={loading}
        exportable={true}
        exportFileName={`${activeTab}_vehicles`}
        searchPlaceholder={`Search by plate number, owner, or category...`}
        emptyMessage={`No ${activeTab} vehicles registered yet.`}
        headerActions={
          <button className="btn btn-outline btn-sm" onClick={loadVehicles} title="Refresh vehicle list">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, vehicle: null, loading: false })}
        onConfirm={handleExecuteDelete}
        title="Remove Vehicle from Access List"
        plateNumber={deleteConfirm.vehicle?.plate_number}
        message={`Are you sure you want to remove this vehicle from the ${activeTab} list?`}
        confirmText="Remove Vehicle"
        cancelText="Cancel"
        type="danger"
        loading={deleteConfirm.loading}
      />

      {/* Add Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeTab === 'whitelisted' ? 'Add Whitelisted Vehicle' : 'Add Blacklisted Vehicle'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Plate Number *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. BHR 12345"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="doctor">Doctor</option>
              <option value="staff">Hospital Staff</option>
              <option value="hospital_owned">Hospital Owned / Ambulance</option>
              <option value="vip">VIP / Executive</option>
              <option value="vendor">Authorized Vendor</option>
              <option value="general">General Visitor</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full name..."
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="+973 3900 0000"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Department / Designation</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cardiology, Radiology, Security..."
              value={ownerDept}
              onChange={(e) => setOwnerDept(e.target.value)}
            />
          </div>

          {activeTab === 'whitelisted' && (
            <div className="form-group">
              <label className="form-label">Valid Until (Leave blank for permanent)</label>
              <input
                type="date"
                className="form-input"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'blacklisted' && (
            <div className="form-group">
              <label className="form-label">Blacklist Reason *</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Specify violation or security alert reason..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <input
              type="text"
              className="form-input"
              placeholder="Internal reference notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
