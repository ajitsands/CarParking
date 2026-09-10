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

export default function LiveLanes({ onOpenSimulator }) {
  const { formatCurrency } = useSettings();
  const [entryBarrierOpen, setEntryBarrierOpen] = useState(false);
  const [exitBarrierOpen, setExitBarrierOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedGate, setSelectedGate] = useState('GATE-IN-01');
  const [overrideInitialPlate, setOverrideInitialPlate] = useState('');
  const [overrideInitialSessionId, setOverrideInitialSessionId] = useState(null);
  const [barrierLogs, setBarrierLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedExitSessionId, setSelectedExitSessionId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    try {
      const [logsRes, sessRes] = await Promise.all([
        api.getBarrierLogs(),
        api.getSessions({ limit: 50 })
      ]);

      if (logsRes.success) {
        setBarrierLogs(logsRes.data.logs || []);
      }

      if (sessRes.success) {
        const inside = (sessRes.data.sessions || []).filter(s => !s.exit_time && s.status !== 'EXIT_COMPLETED');
        setActiveSessions(inside);

        // Auto-select the first vehicle if none currently selected
        setSelectedExitSessionId(prev => {
          if (prev && inside.some(s => s.id === prev)) return prev;
          return inside.length > 0 ? inside[0].id : null;
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Direct 1-click Exit Checkout from Gate Monitor
  const handleCompleteExit = async (session, isCash = false) => {
    if (!session) return;
    setActionLoading(true);

    try {
      const res = await api.completeSessionExit(session.id, {
        gate_id: 'GATE-OUT-01',
        cash_payment: isCash,
        reason: isCash ? 'Cash collected at exit gate' : 'Exit authorized at gate monitor'
      });

      if (res.success) {
        setExitBarrierOpen(true);
        setTimeout(() => setExitBarrierOpen(false), 5000);
        showToast(`Vehicle ${session.plate_number} exit completed successfully! Exit boom barrier opened.`);
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
          setEntryBarrierOpen(true);
          setTimeout(() => setEntryBarrierOpen(false), 5000);
        } else {
          setExitBarrierOpen(true);
          setTimeout(() => setExitBarrierOpen(false), 5000);
        }
        showToast(res.message || 'Manual override barrier pulse executed!');
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Override failed', true);
    }
  };

  const selectedVehicle = activeSessions.find(s => s.id === selectedExitSessionId) || activeSessions[0] || null;

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Live Gate Monitor & Barrier Control Room
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Real-time ANPR camera stream, loop sensor feedback, automated boom barrier relay control & exit checkout
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={loadData}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-warning btn-sm" onClick={onOpenSimulator}>
            <Sparkles size={14} /> Simulate Camera Event
          </button>
        </div>
      </div>

      {/* Dual Lane Split View */}
      <div className="lane-monitor-grid">
        {/* ENTRY LANE */}
        <div className="lane-card">
          <div className="panel-header">
            <span className="panel-title">
              <Video size={16} color="var(--status-green)" />
              LANE 1: GATE-IN-01 (Main Hospital Entry)
            </span>
            <span className="badge badge-green">ANPR ACTIVE</span>
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

            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <Video size={48} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>ANPR-CAM-01 · 192.168.1.101</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Optical Character Recognition Active</div>
            </div>

            <div className="lane-anpr-plate-overlay">
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>ENTRY SENSOR:</span>
              <span>READY</span>
              <span style={{ fontSize: '0.65rem', color: '#10b981' }}>AUTO-ALLOW</span>
            </div>
          </div>

          <div style={{ padding: '12px' }}>
            <BoomBarrierVisualizer
              isOpen={entryBarrierOpen}
              gateName="Entry Boom Barrier (Moxa Relay #1)"
              onToggle={() => setEntryBarrierOpen(!entryBarrierOpen)}
            />
          </div>

          <div className="barrier-status-bar">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Relay: <strong>192.168.1.201:8080</strong> (PULSE 800ms)
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setSelectedGate('GATE-IN-01');
                setOverrideInitialPlate('');
                setOverrideInitialSessionId(null);
                setOverrideModalOpen(true);
              }}
            >
              <ShieldAlert size={14} /> Manual Override Open
            </button>
          </div>
        </div>

        {/* EXIT LANE */}
        <div className="lane-card">
          <div className="panel-header">
            <span className="panel-title">
              <Video size={16} color="var(--status-blue)" />
              LANE 2: GATE-OUT-01 (Main Hospital Exit)
            </span>
            <span className="badge badge-blue">ANPR ACTIVE</span>
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

            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <Video size={48} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>ANPR-CAM-02 · 192.168.1.102</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Exit Payment Sensor Interlocked</div>
            </div>

            <div className="lane-anpr-plate-overlay">
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>EXIT SENSOR:</span>
              <span>{selectedVehicle ? selectedVehicle.plate_number : 'NO VEHICLE'}</span>
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
                  meta: `[${s.status}]  Entry: ${s.entry_time ? s.entry_time.slice(11,16) : ''}  •  ${s.total_duration_minutes || 0} min parked`
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

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> Parked: {selectedVehicle.total_duration_minutes || 0}m
                  </span>
                  <span>Entry: {selectedVehicle.entry_time.slice(11, 16)}</span>
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
                      <Coins size={13} /> Collect Cash & Open Exit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      style={{ flex: 1, fontSize: '0.72rem' }}
                      disabled={actionLoading}
                      onClick={() => handleCompleteExit(selectedVehicle, false)}
                    >
                      <CheckCircle2 size={13} /> Authorize Exit & Open Barrier
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => {
                      setSelectedGate('GATE-OUT-01');
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
              isOpen={exitBarrierOpen}
              gateName="Exit Boom Barrier (Moxa Relay #2)"
              onToggle={() => setExitBarrierOpen(!exitBarrierOpen)}
            />
          </div>

          <div className="barrier-status-bar">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Relay: <strong>192.168.1.202:8080</strong> (PULSE 800ms)
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setSelectedGate('GATE-OUT-01');
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
