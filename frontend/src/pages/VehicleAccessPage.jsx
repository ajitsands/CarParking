import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Plus, Trash2, Search, Car, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';

export default function VehicleAccessPage() {
  const [activeTab, setActiveTab] = useState('whitelisted');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

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

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.getVehicles({ access_status: activeTab });
      if (res.success) {
        setVehicles(res.data.vehicles || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load vehicle access list');
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
        plate_number: plateNumber.trim(),
        access_status: activeTab,
        category: activeTab === 'blacklisted' ? 'general' : category,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        owner_department: ownerDept.trim(),
        block_reason: blockReason.trim(),
        valid_to: validTo || null,
        notes: notes.trim()
      });

      setModalOpen(false);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await api.deleteVehicle(id);
      loadVehicles();
    } catch (err) {
      alert(err.message || 'Delete failed');
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`btn ${activeTab === 'whitelisted' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('whitelisted')}
        >
          <ShieldCheck size={16} /> Whitelist (Staff, Doctors & Priority)
        </button>
        <button
          className={`btn ${activeTab === 'blacklisted' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => setActiveTab('blacklisted')}
        >
          <ShieldAlert size={16} /> Blacklist (Security Restricted)
        </button>
      </div>

      {error && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--status-red-bg)',
          color: 'var(--status-red)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Modern DataTable */}
      <DataTable
        title={activeTab === 'whitelisted' ? 'Whitelisted Priority Vehicles' : 'Security Blacklisted Vehicles'}
        subtitle={`Total registered records: ${vehicles.length}`}
        icon={activeTab === 'whitelisted' ? ShieldCheck : ShieldAlert}
        columns={[
          {
            key: 'plate_number',
            label: 'Plate Number',
            render: (v) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem' }}>
                {v.plate_number}
              </span>
            )
          },
          {
            key: 'category',
            label: 'Category',
            render: (v) => (
              <span className={`badge ${activeTab === 'whitelisted' ? 'badge-blue' : 'badge-red'}`} style={{ textTransform: 'capitalize' }}>
                {v.category}
              </span>
            )
          },
          {
            key: 'owner_name',
            label: 'Owner / Department',
            render: (v) => (
              <div>
                <strong style={{ fontSize: '0.8rem' }}>{v.owner_name || '-'}</strong>
                {v.owner_department && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{v.owner_department}</div>}
              </div>
            )
          },
          {
            key: 'owner_phone',
            label: 'Contact',
            render: (v) => (
              <span style={{ fontSize: '0.75rem' }}>{v.owner_phone || '-'}</span>
            )
          },
          {
            key: activeTab === 'whitelisted' ? 'valid_to' : 'block_reason',
            label: activeTab === 'whitelisted' ? 'Valid Until' : 'Block Reason',
            render: (v) => (
              <span style={{ fontSize: '0.75rem', color: activeTab === 'blacklisted' ? 'var(--status-red)' : 'var(--text-secondary)' }}>
                {activeTab === 'whitelisted' ? (v.valid_to || 'Permanent') : v.block_reason}
              </span>
            )
          },
          {
            key: 'notes',
            label: 'Notes',
            render: (v) => (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.notes || '-'}</span>
            )
          },
          {
            key: 'actions',
            label: 'Action',
            sortable: false,
            exportable: false,
            align: 'right',
            render: (v) => (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--status-red)' }}
                onClick={() => handleDelete(v.id)}
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

          {activeTab === 'whitelisted' ? (
            <>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="doctor">Doctor / Physician</option>
                  <option value="staff">Hospital Staff / Nurse</option>
                  <option value="emergency">Emergency / Ambulance</option>
                  <option value="hospital_owned">Hospital Owned Vehicle</option>
                  <option value="vendor">Authorized Vendor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Owner Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Tariq"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cardiology"
                  value={ownerDept}
                  onChange={(e) => setOwnerDept(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valid Until (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Security Block Reason *</label>
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
