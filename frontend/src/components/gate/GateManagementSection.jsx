import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Edit3, 
  Trash2, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Wifi, 
  Radio, 
  ShieldCheck, 
  ArrowRightCircle, 
  ArrowLeftCircle,
  HelpCircle,
  Server
} from 'lucide-react';
import { api } from '../../services/api';
import DataTable from '../common/DataTable';
import Modal from '../common/Modal';
import ConfirmModal from '../common/ConfirmModal';

export default function GateManagementSection({ onGatesUpdated }) {
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState({});

  // Delete Confirm state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    gate: null,
    loading: false
  });

  // Form State
  const [formData, setFormData] = useState({
    gate_code: '',
    gate_name: '',
    gate_type: 'entry',
    camera_name: '',
    camera_ip: '192.168.1.101',
    camera_port: 80,
    rtsp_url: '',
    relay_ip: '192.168.1.201',
    relay_port: 8080,
    relay_command: 'OPEN_RELAY_1',
    is_active: 1
  });

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const loadGates = async () => {
    setLoading(true);
    try {
      const res = await api.getGates();
      if (res.success) {
        setGates(res.data.gates || []);
        if (onGatesUpdated) onGatesUpdated(res.data.gates || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load gates list', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGates();
  }, []);

  const handleOpenAdd = () => {
    setEditingGate(null);
    setFormData({
      gate_code: `GATE-IN-0${gates.filter(g => g.gate_type === 'entry').length + 1}`,
      gate_name: '',
      gate_type: 'entry',
      camera_name: 'Dahua ANPR Camera',
      camera_ip: '192.168.1.101',
      camera_port: 80,
      rtsp_url: '',
      relay_ip: '192.168.1.201',
      relay_port: 8080,
      relay_command: 'OPEN_RELAY_1',
      is_active: 1
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (gate) => {
    setEditingGate(gate);
    setFormData({
      gate_code: gate.gate_code,
      gate_name: gate.gate_name,
      gate_type: gate.gate_type || 'entry',
      camera_name: gate.camera_name || '',
      camera_ip: gate.camera_ip || '',
      camera_port: gate.camera_port || 80,
      rtsp_url: gate.rtsp_url || '',
      relay_ip: gate.relay_ip || '',
      relay_port: gate.relay_port || 8080,
      relay_command: gate.relay_command || 'OPEN_RELAY_1',
      is_active: gate.is_active !== undefined ? gate.is_active : 1
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGate) {
        const res = await api.updateGate(editingGate.id, formData);
        if (res.success) {
          showToast(`Gate '${formData.gate_code}' updated successfully!`);
          setModalOpen(false);
          loadGates();
        }
      } else {
        const res = await api.createGate(formData);
        if (res.success) {
          showToast(`New gate '${formData.gate_code}' configured successfully!`);
          setModalOpen(false);
          loadGates();
        }
      }
    } catch (err) {
      showToast(err.message || 'Operation failed', true);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.gate) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.deleteGate(deleteConfirm.gate.id);
      if (res.success) {
        showToast(`Gate '${deleteConfirm.gate.gate_code}' deleted successfully!`);
        setDeleteConfirm({ isOpen: false, gate: null, loading: false });
        loadGates();
      }
    } catch (err) {
      showToast(err.message || 'Delete failed', true);
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  const handleTestCameraPing = async (gate) => {
    setDiagnosticsLoading(prev => ({ ...prev, [`cam_${gate.id}`]: true }));
    try {
      const res = await api.testCameraPing(gate.id);
      showToast(res.message, !res.data?.is_reachable);
    } catch (err) {
      showToast(err.message || 'Camera ping test failed', true);
    } finally {
      setDiagnosticsLoading(prev => ({ ...prev, [`cam_${gate.id}`]: false }));
    }
  };

  const handleTestPulse = async (gate) => {
    setDiagnosticsLoading(prev => ({ ...prev, [`pulse_${gate.id}`]: true }));
    try {
      const res = await api.testGatePulse(gate.id);
      showToast(res.message);
    } catch (err) {
      showToast(err.message || 'Pulse test failed', true);
    } finally {
      setDiagnosticsLoading(prev => ({ ...prev, [`pulse_${gate.id}`]: false }));
    }
  };

  return (
    <div className="panel" style={{ marginBottom: '16px', background: 'var(--bg-panel)' }}>
      {/* Toast Alert */}
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
          background: toastMsg.isError ? 'var(--status-red-bg)' : 'var(--status-green-bg)',
          color: toastMsg.isError ? 'var(--status-red)' : 'var(--status-green)',
          border: `1px solid ${toastMsg.isError ? 'var(--status-red-border)' : 'var(--status-green-border)'}`,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {toastMsg.isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="panel-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(37,99,235,0.35)'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <span className="panel-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
              Multi-Gate & ANPR Camera Network IP Configuration
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Configure Ingress (IN) and Egress (OUT) gate lanes, ANPR camera IP addresses, RTSP streams, and Ethernet barrier relay controllers.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={loadGates}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={14} /> Add Ingress / Egress Gate
          </button>
        </div>
      </div>

      {/* Gates DataTable */}
      <div style={{ padding: '16px' }}>
        <DataTable
          columns={[
            {
              key: 'gate_code',
              label: 'Gate Code',
              width: '130px',
              render: (g) => {
                const isEntry = g.gate_type === 'entry';
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {isEntry ? (
                      <ArrowRightCircle size={15} color="var(--status-green)" />
                    ) : (
                      <ArrowLeftCircle size={15} color="var(--accent)" />
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      color: isEntry ? 'var(--status-green)' : 'var(--accent)'
                    }}>
                      {g.gate_code}
                    </span>
                  </div>
                );
              }
            },
            {
              key: 'gate_name',
              label: 'Gate Name & Location',
              render: (g) => (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{g.gate_name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type: <strong style={{ textTransform: 'uppercase' }}>{g.gate_type}</strong>
                  </div>
                </div>
              )
            },
            {
              key: 'camera_ip',
              label: 'ANPR Camera & IP',
              render: (g) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Video size={13} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{g.camera_name || 'ANPR Camera'}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    IP: <strong>{g.camera_ip}</strong>:{g.camera_port || 80}
                  </div>
                </div>
              )
            },
            {
              key: 'relay_ip',
              label: 'Barrier Relay IP',
              render: (g) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Zap size={13} color="var(--gold)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.74rem' }}>
                      {g.relay_ip}:{g.relay_port || 8080}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Cmd: <span style={{ fontFamily: 'var(--font-mono)' }}>{g.relay_command || 'OPEN_RELAY'}</span>
                  </div>
                </div>
              )
            },
            {
              key: 'is_active',
              label: 'Status',
              width: '90px',
              render: (g) => (
                <span className={`badge ${g.is_active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.68rem' }}>
                  {g.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Diagnostics & Actions',
              sortable: false,
              exportable: false,
              align: 'right',
              render: (g) => (
                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  {/* Ping Camera */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleTestCameraPing(g)}
                    disabled={diagnosticsLoading[`cam_${g.id}`]}
                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                    title={`Ping ANPR Camera at ${g.camera_ip}:${g.camera_port || 80}`}
                  >
                    <Wifi size={12} color="var(--accent)" />
                    {diagnosticsLoading[`cam_${g.id}`] ? 'Pinging...' : 'Ping IP'}
                  </button>

                  {/* Test Pulse */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleTestPulse(g)}
                    disabled={diagnosticsLoading[`pulse_${g.id}`]}
                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                    title={`Send test open pulse to ${g.relay_ip}:${g.relay_port || 8080}`}
                  >
                    <Zap size={12} color="var(--gold)" />
                    {diagnosticsLoading[`pulse_${g.id}`] ? 'Testing...' : 'Test Pulse'}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenEdit(g)}
                    style={{ padding: '3px 7px' }}
                    title="Edit Gate Configuration"
                  >
                    <Edit3 size={13} />
                  </button>

                  {/* Delete */}
                  {gates.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setDeleteConfirm({ isOpen: true, gate: g, loading: false })}
                      style={{ padding: '3px 7px', color: 'var(--status-red)' }}
                      title="Delete Gate"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            }
          ]}
          data={gates}
          loading={loading}
          searchPlaceholder="Search gates by code, name, camera IP, or relay IP..."
          emptyMessage="No gates configured yet."
        />
      </div>

      {/* Add / Edit Gate Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGate ? `Edit Gate: ${editingGate.gate_code}` : 'Add Ingress / Egress Gate & ANPR Camera'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gate Code (Identifier) *</label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                value={formData.gate_code}
                onChange={(e) => setFormData({ ...formData, gate_code: e.target.value.toUpperCase() })}
                placeholder="e.g. GATE-IN-02"
                required
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Unique hardware code for webhooks</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gate Direction / Type *</label>
              <select
                className="form-select"
                value={formData.gate_type}
                onChange={(e) => setFormData({ ...formData, gate_type: e.target.value })}
              >
                <option value="entry">Entry Ingress Lane (IN)</option>
                <option value="exit">Exit Egress Lane (OUT)</option>
                <option value="bidirectional">Bidirectional (IN & OUT)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gate Name & Location *</label>
            <input
              type="text"
              className="form-input"
              value={formData.gate_name}
              onChange={(e) => setFormData({ ...formData, gate_name: e.target.value })}
              placeholder="e.g. Emergency & Ambulance Entrance (Lane 2)"
              required
            />
          </div>

          {/* Section Divider: Camera Network Settings */}
          <div style={{
            margin: '14px 0 10px',
            padding: '4px 0',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Video size={14} /> ANPR Camera Network Settings
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ANPR Camera IP Address *</label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={formData.camera_ip}
                onChange={(e) => setFormData({ ...formData, camera_ip: e.target.value })}
                placeholder="e.g. 192.168.1.102"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Camera Port</label>
              <input
                type="number"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={formData.camera_port}
                onChange={(e) => setFormData({ ...formData, camera_port: parseInt(e.target.value) || 80 })}
                placeholder="80"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Camera Name / Model</label>
            <input
              type="text"
              className="form-input"
              value={formData.camera_name}
              onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
              placeholder="e.g. Dahua ITC237-PW6M-IRLZF1050 / Hikvision ANPR"
            />
          </div>

          {/* Section Divider: Barrier Relay Hardware Settings */}
          <div style={{
            margin: '14px 0 10px',
            padding: '4px 0',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Zap size={14} /> Boom Barrier Relay Controller (Moxa / Waveshare / IP Relay)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Relay Controller IP Address *</label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={formData.relay_ip}
                onChange={(e) => setFormData({ ...formData, relay_ip: e.target.value })}
                placeholder="e.g. 192.168.1.202"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Relay Port</label>
              <input
                type="number"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={formData.relay_port}
                onChange={(e) => setFormData({ ...formData, relay_port: parseInt(e.target.value) || 8080 })}
                placeholder="8080"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Relay Pulse Command</label>
            <input
              type="text"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={formData.relay_command}
              onChange={(e) => setFormData({ ...formData, relay_command: e.target.value })}
              placeholder="e.g. OPEN_RELAY_2 or RELAY_CH2_PULSE"
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Command string sent to trigger the 800ms dry contact relay pulse</span>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem' }}>
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              <span><strong>Enable this Gate Lane</strong> (Ready to process live ANPR camera events and open barrier)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingGate ? 'Save Gate Configuration' : 'Create Gate & Camera'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, gate: null, loading: false })}
        onConfirm={handleDelete}
        title="Delete Gate Lane Configuration"
        message={`Are you sure you want to remove Gate '${deleteConfirm.gate?.gate_code}' (${deleteConfirm.gate?.gate_name}) and its camera mapping?`}
        confirmText="Delete Gate"
        cancelText="Cancel"
        type="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}
