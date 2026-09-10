import React, { useState, useEffect } from 'react';
import { 
  Video, 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Car, 
  CreditCard, 
  ArrowRightCircle, 
  Clock, 
  Coins 
} from 'lucide-react';
import BoomBarrierVisualizer from '../components/gate/BoomBarrierVisualizer';
import ManualOverrideModal from '../components/gate/ManualOverrideModal';
import StatusBadge from '../components/common/StatusBadge';
import SearchableSelect from '../components/common/SearchableSelect';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function LiveLanes({ onOpenSimulator }) {
  const { formatCurrency } = useSettings();
  const { user, isAdmin } = useAuth();
  const [gates, setGates] = useState([]);
  const [entryBarrierOpen, setEntryBarrierOpen] = useState({});
  const [exitBarrierOpen, setExitBarrierOpen] = useState({});
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedGate, setSelectedGate] = useState('GATE-IN-01');
  const [activeEntryGateId, setActiveEntryGateId] = useState('');
  const [activeExitGateId, setActiveExitGateId] = useState('');
  const [overrideInitialPlate, setOverrideInitialPlate] = useState('');
  const [overrideInitialSessionId, setOverrideInitialSessionId] = useState(null);
  const [barrierLogs, setBarrierLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedExitSessionId, setSelectedExitSessionId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    try {
      const [logsRes, sessRes, gatesRes] = await Promise.all([
        api.getBarrierLogs(),
        api.getSessions({ limit: 50 }),
        api.getGates()
      ]);

      if (logsRes.success) {
        setBarrierLogs(logsRes.data.logs || []);
      }

      if (gatesRes.success) {
        let allGates = gatesRes.data.gates || [];
        // Filter by operator's assigned gates if not ALL and not admin
        const assigned = user?.assigned_gates;
        if (!isAdmin && assigned && assigned !== 'ALL') {
          const allowed = assigned.split(',').map(g => g.trim());
          allGates = allGates.filter(g => allowed.includes(g.gate_id));
        }
        setGates(allGates);

        // Set default active entry & exit gates if not already set
        const inGates = allGates.filter(g => g.gate_type === 'ENTRY');
        const outGates = allGates.filter(g => g.gate_type === 'EXIT');

        setActiveEntryGateId(prev => (prev && inGates.some(g => g.gate_id === prev)) ? prev : (inGates[0]?.gate_id || ''));
        setActiveExitGateId(prev => (prev && outGates.some(g => g.gate_id === prev)) ? prev : (outGates[0]?.gate_id || ''));
      }

      if (sessRes.success) {
        const inside = (sessRes.data.sessions || []).filter(s => !s.exit_time && s.status !== 'EXIT_COMPLETED');
        setActiveSessions(inside);

        // Keep existing selection if vehicle still inside; otherwise clear — do NOT auto-select first item
        setSelectedExitSessionId(prev => {
          if (prev && inside.some(s => s.id === prev)) return prev;
          return null; // ANPR will set this when a plate is detected
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Direct 1-click Exit Checkout from Gate Monitor
  const handleCompleteExit = async (session, isCash = false) => {
    if (!session) return;
    setActionLoading(true);

    try {
      const exitGateCode = activeExitGateId || 'GATE-OUT-01';
      const res = await api.completeSessionExit(session.id, {
        gate_id: exitGateCode,
        cash_payment: isCash,
        reason: isCash ? `Cash collected at exit gate (${exitGateCode})` : `Exit authorized at gate monitor (${exitGateCode})`
      });

      if (res.success) {
        setExitBarrierOpen(prev => ({ ...prev, [exitGateCode]: true }));
        setTimeout(() => setExitBarrierOpen(prev => ({ ...prev, [exitGateCode]: false })), 5000);
        showToast(`Vehicle ${session.plate_number} exit completed at ${exitGateCode}! Exit boom barrier opened.`);
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to complete exit', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualOverride = async (payload) => {
    try {
      const res = await api.manualOverrideBarrier(payload);
      if (res.success) {
        if (payload.gate_id.includes('IN')) {
          setEntryBarrierOpen(prev => ({ ...prev, [payload.gate_id]: true }));
          setTimeout(() => setEntryBarrierOpen(prev => ({ ...prev, [payload.gate_id]: false })), 5000);
        } else {
          setExitBarrierOpen(prev => ({ ...prev, [payload.gate_id]: true }));
          setTimeout(() => setExitBarrierOpen(prev => ({ ...prev, [payload.gate_id]: false })), 5000);
        }
        showToast(res.message || 'Manual override barrier pulse executed!');
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Override failed', true);
    }
  };

  const entryGatesList = gates.filter(g => g.gate_type === 'ENTRY');
  const exitGatesList = gates.filter(g => g.gate_type === 'EXIT');

  const currentEntryGate = entryGatesList.find(g => g.gate_id === activeEntryGateId) || entryGatesList[0] || null;
  const currentExitGate = exitGatesList.find(g => g.gate_id === activeExitGateId) || exitGatesList[0] || null;

  // Only populated when ANPR auto-detects or operator manually picks from dropdown
  const selectedVehicle = selectedExitSessionId
    ? activeSessions.find(s => s.id === selectedExitSessionId) || null
    : null;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          padding: '10px 16px',
          background: toastMessage.isError ? 'var(--status-red-bg)' : 'var(--status-green-bg)',
          color: toastMessage.isError ? 'var(--status-red)' : 'var(--status-green)',
          border: `1px solid ${toastMessage.isError ? 'var(--status-red-border)' : 'var(--status-green-border)'}`,
          borderRadius: 'var(--radius-sm)',
          marginBottom: '14px',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {toastMessage.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* Operator Assignment Notification Banner */}
      {user?.assigned_gates && user.assigned_gates !== 'ALL' && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(236, 72, 153, 0.08)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem'
        }}>
          <div>
            <strong style={{ color: 'var(--accent)' }}>Operator Lane Filter:</strong> You are assigned to monitor: {' '}
            {user.assigned_gates.split(',').map((g, i) => (
              <span key={i} className="badge badge-pink" style={{ marginLeft: '4px', fontSize: '0.72rem' }}>
                {g.trim()}
              </span>
            ))}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admin can re-assign gates in User Management</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Live Gate Monitor & Barrier Control Room
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Real-time multi-lane ANPR camera streams, IP cameras, loop sensor feedback, automated boom barrier relays & exit checkout
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={loadData}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-warning btn-sm" onClick={onOpenSimulator}>
            <Sparkles size={14} /> Simulate Camera Event
          </button>
        </div>
      </div>

      {/* Multi-Gate Lane Split View */}
      <div className="lane-monitor-grid">
        {/* ENTRY LANE PANEL */}
        <div className="lane-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <span className="panel-title">
              <Video size={16} color="var(--status-green)" />
              ENTRY LANE: {currentEntryGate?.name || 'No Entry Gate'}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {entryGatesList.length > 1 && (
                <select
                  className="form-control"
                  style={{ padding: '2px 8px', fontSize: '0.72rem', height: '26px' }}
                  value={activeEntryGateId}
                  onChange={(e) => setActiveEntryGateId(e.target.value)}
                >
                  {entryGatesList.map(g => (
                    <option key={g.gate_id} value={g.gate_id}>
                      {g.gate_id} - {g.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="badge badge-green">ANPR ACTIVE</span>
            </div>
          </div>

          <div className="lane-camera-viewport">
            <div style={{
              position: 'absolute',
              top: 10, left: 10,
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px',
              color: '#ef4444', fontSize: '0.68rem', fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              LIVE HD CAM
            </div>

            <div style={{
              position: 'absolute',
              top: 10, right: 10,
              background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px',
              color: '#38bdf8', fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)'
            }}>
              {currentEntryGate?.camera_ip ? `${currentEntryGate.camera_ip}:${currentEntryGate.camera_port || 80}` : 'NO CAM IP'}
            </div>

            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <Video size={48} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
                {currentEntryGate?.gate_id || 'GATE-IN-01'} · IP: {currentEntryGate?.camera_ip || '192.168.1.101'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                HTTP Webhook / TCP Socket Active (Port {currentEntryGate?.camera_port || 80})
              </div>
              {currentEntryGate?.rtsp_url && (
                <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  RTSP: {currentEntryGate.rtsp_url}
                </div>
              )}
            </div>

            <div className="lane-anpr-plate-overlay">
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>ENTRY SENSOR ({currentEntryGate?.gate_id}):</span>
              <span>READY</span>
              <span style={{ fontSize: '0.65rem', color: '#10b981' }}>AUTO-ALLOW</span>
            </div>
          </div>

          <div style={{ padding: '12px' }}>
            <BoomBarrierVisualizer
              isOpen={Boolean(entryBarrierOpen[currentEntryGate?.gate_id || 'GATE-IN-01'])}
              gateName={`${currentEntryGate?.name || 'Entry Boom Barrier'} (${currentEntryGate?.barrier_relay_ip || 'Relay 1'})`}
              onToggle={() => {
                const gid = currentEntryGate?.gate_id || 'GATE-IN-01';
                setEntryBarrierOpen(prev => ({ ...prev, [gid]: !prev[gid] }));
              }}
            />
          </div>

          <div className="barrier-status-bar">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Relay IP: <strong>{currentEntryGate?.barrier_relay_ip || '192.168.1.201:8080'}</strong> (PULSE 800ms)
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setSelectedGate(currentEntryGate?.gate_id || 'GATE-IN-01');
                setOverrideInitialPlate('');
                setOverrideInitialSessionId(null);
                setOverrideModalOpen(true);
              }}
            >
              <ShieldAlert size={14} /> Manual Override Open
            </button>
          </div>
        </div>

        {/* EXIT LANE PANEL */}
        <div className="lane-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <span className="panel-title">
              <Video size={16} color="var(--status-blue)" />
              EXIT LANE: {currentExitGate?.name || 'No Exit Gate'}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {exitGatesList.length > 1 && (
                <select
                  className="form-control"
                  style={{ padding: '2px 8px', fontSize: '0.72rem', height: '26px' }}
                  value={activeExitGateId}
                  onChange={(e) => setActiveExitGateId(e.target.value)}
                >
                  {exitGatesList.map(g => (
                    <option key={g.gate_id} value={g.gate_id}>
                      {g.gate_id} - {g.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="badge badge-blue">ANPR ACTIVE</span>
            </div>
          </div>

          <div className="lane-camera-viewport">
            <div style={{
              position: 'absolute',
              top: 10, left: 10,
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px',
              color: '#ef4444', fontSize: '0.68rem', fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              LIVE HD CAM
            </div>

            <div style={{
              position: 'absolute',
              top: 10, right: 10,
              background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px',
              color: '#38bdf8', fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)'
            }}>
              {currentExitGate?.camera_ip ? `${currentExitGate.camera_ip}:${currentExitGate.camera_port || 80}` : 'NO CAM IP'}
            </div>

            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <Video size={48} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
                {currentExitGate?.gate_id || 'GATE-OUT-01'} · IP: {currentExitGate?.camera_ip || '192.168.1.102'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                Exit Payment & Barrier Interlock (Port {currentExitGate?.camera_port || 80})
              </div>
              {currentExitGate?.rtsp_url && (
                <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  RTSP: {currentExitGate.rtsp_url}
                </div>
              )}
            </div>

            <div className="lane-anpr-plate-overlay">
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>EXIT SENSOR ({currentExitGate?.gate_id}):</span>
              <span style={{ color: selectedVehicle ? '#fff' : '#64748b' }}>
                {selectedVehicle ? selectedVehicle.plate_number : 'WAITING...'}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#10b981' }}>{activeSessions.length} INSIDE</span>
            </div>
          </div>

          {/* Active Vehicle at Exit Gate Panel */}
          <div style={{
            margin: '10px 12px 0',
            padding: '10px 12px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Vehicle selector — ANPR auto-fills, operator can override */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Car size={13} color="var(--accent)" />
                Vehicle at Exit Gate:
              </div>

              {/* Select2-style searchable dropdown */}
              <SearchableSelect
                options={activeSessions.map(s => ({
                  value: s.id,
                  label: s.plate_number,
                  meta: `[${s.status}] In: ${s.entry_gate_id || 'GATE-IN-01'} @ ${s.entry_time ? s.entry_time.slice(11,16) : ''} • ${s.total_duration_minutes || 0}m`
                }))}
                value={selectedExitSessionId}
                onChange={(val) => setSelectedExitSessionId(val ? parseInt(val) : null)}
                placeholder="— ANPR auto-detects / Search plate —"
                searchPlaceholder="Type plate number to search..."
                noOptionsText="No active vehicles inside"
              />
            </div>

            {selectedVehicle ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedVehicle.plate_number}
                    </span>
                    <span style={{ marginLeft: '8px' }}>
                      <StatusBadge status={selectedVehicle.status} />
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Net Fee</div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700, 
                      fontSize: '0.88rem', 
                      color: parseFloat(selectedVehicle.net_amount || 0) > 0 ? 'var(--status-amber)' : 'var(--status-green)' 
                    }}>
                      {formatCurrency(selectedVehicle.net_amount || 0)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> Parked: {selectedVehicle.total_duration_minutes || 0}m
                  </span>
                  <span>In Route: <strong>{selectedVehicle.entry_gate_id || 'GATE-IN-01'}</strong> → Out: <strong>{currentExitGate?.gate_id || 'GATE-OUT-01'}</strong></span>
                  <span>Entry: {selectedVehicle.entry_time ? selectedVehicle.entry_time.slice(11, 16) : ''}</span>
                  <span>Code: {selectedVehicle.session_code}</span>
                </div>

                {/* Gate Action Buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {parseFloat(selectedVehicle.net_amount || 0) > 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem' }}
                      disabled={actionLoading}
                      onClick={() => handleCompleteExit(selectedVehicle, true)}
                    >
                      <Coins size={13} /> Collect Cash & Open {currentExitGate?.gate_id || 'Exit'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem' }}
                      disabled={actionLoading}
                      onClick={() => handleCompleteExit(selectedVehicle, false)}
                    >
                      <CheckCircle2 size={13} /> Authorize Exit & Open {currentExitGate?.gate_id || 'Barrier'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => {
                      setSelectedGate(currentExitGate?.gate_id || 'GATE-OUT-01');
                      setOverrideInitialPlate(selectedVehicle.plate_number);
                      setOverrideInitialSessionId(selectedVehicle.id);
                      setOverrideModalOpen(true);
                    }}
                  >
                    <ShieldAlert size={13} /> Override
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                No active vehicles currently inside the parking facility.
              </div>
            )}
          </div>

          <div style={{ padding: '12px' }}>
            <BoomBarrierVisualizer
              isOpen={Boolean(exitBarrierOpen[currentExitGate?.gate_id || 'GATE-OUT-01'])}
              gateName={`${currentExitGate?.name || 'Exit Boom Barrier'} (${currentExitGate?.barrier_relay_ip || 'Relay 2'})`}
              onToggle={() => {
                const gid = currentExitGate?.gate_id || 'GATE-OUT-01';
                setExitBarrierOpen(prev => ({ ...prev, [gid]: !prev[gid] }));
              }}
            />
          </div>

          <div className="barrier-status-bar">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Relay IP: <strong>{currentExitGate?.barrier_relay_ip || '192.168.1.202:8080'}</strong> (PULSE 800ms)
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setSelectedGate(currentExitGate?.gate_id || 'GATE-OUT-01');
                setOverrideInitialPlate(selectedVehicle ? selectedVehicle.plate_number : '');
                setOverrideInitialSessionId(selectedVehicle ? selectedVehicle.id : null);
                setOverrideModalOpen(true);
              }}
            >
              <ShieldAlert size={14} /> Manual Override Open
            </button>
          </div>
        </div>
      </div>

      {/* Barrier Audit Logs DataTable */}
      <DataTable
        columns={[
          {
            key: 'created_at',
            label: 'Timestamp',
            render: (log) => (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {log.created_at}
              </span>
            )
          },
          {
            key: 'gate_id',
            label: 'Gate ID',
            render: (log) => <strong>{log.gate_id}</strong>
          },
          {
            key: 'direction',
            label: 'Direction',
            render: (log) => (
              <span className={`badge ${log.direction === 'ENTRY' ? 'badge-blue' : 'badge-green'}`}>
                {log.direction}
              </span>
            )
          },
          {
            key: 'plate_number',
            label: 'Plate Number',
            render: (log) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {log.plate_number || 'N/A'}
              </span>
            )
          },
          {
            key: 'trigger_type',
            label: 'Trigger Event',
            render: (log) => (
              <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>
                {log.trigger_type}
              </span>
            )
          },
          {
            key: 'command_sent',
            label: 'Relay Command',
            render: (log) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                {log.command_sent}
              </span>
            )
          },
          {
            key: 'operator_name',
            label: 'Operator',
            render: (log) => (
              <span style={{ fontSize: '0.74rem' }}>
                {log.operator_name || 'System / Auto'}
              </span>
            )
          },
          {
            key: 'override_reason',
            label: 'Reason / Notes',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: log.override_reason ? 'var(--status-amber)' : 'var(--text-muted)' }}>
                {log.override_reason || 'Automated ANPR trigger'}
              </span>
            )
          }
        ]}
        data={barrierLogs}
        title="Boom Barrier Operations & Override Audit Log"
        subtitle="Real-time hardware relay triggers and operator overrides"
        icon={ShieldAlert}
        exportable={true}
        exportFileName="barrier_audit_logs"
        searchPlaceholder="Search gate, plate, operator, or reason..."
        defaultPageSize={10}
        emptyMessage="No barrier logs recorded yet."
        headerActions={(
          <button className="btn btn-outline btn-sm" onClick={loadData} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        )}
      />

      {/* Manual Override Modal */}
      <ManualOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        defaultGate={selectedGate}
        initialPlate={overrideInitialPlate}
        initialSessionId={overrideInitialSessionId}
        onOverrideSuccess={handleManualOverride}
      />
    </div>
  );
}
