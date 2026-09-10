import React, { useState, useEffect } from 'react';
import { Car, Search, Filter, RefreshCw, Eye, CheckCircle2, CreditCard, AlertCircle, ArrowRightCircle } from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import { useSettings } from '../context/SettingsContext';

export default function ParkingSessions({ onOpenPayment, onOpenValidation }) {
  const { formatCurrency } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSessions({
        status: statusFilter,
        search: search.trim(),
        limit: 100
      });
      if (res.success) {
        setSessions(res.data.sessions || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load parking sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
    }, 8000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadSessions();
  };

  const openDetails = async (id) => {
    try {
      const res = await api.getSession(id);
      if (res.success) {
        setSelectedSession(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load details');
    }
  };

  const handleCompleteExit = async (sess, isCash = false) => {
    if (!window.confirm(`Authorize exit for vehicle ${sess.plate_number}? This will open the exit boom barrier and complete the session.`)) return;
    try {
      const res = await api.completeSessionExit(sess.id, {
        gate_id: 'GATE-OUT-01',
        cash_payment: isCash,
        reason: isCash ? 'Cash collected by operator' : 'Manual exit checkout from sessions page'
      });
      if (res.success) {
        alert(res.message || `Vehicle ${sess.plate_number} exit completed successfully!`);
        loadSessions();
      }
    } catch (err) {
      alert(err.message || 'Failed to complete exit');
    }
  };

  const statusTabs = [
    { id: '', label: 'All Sessions' },
    { id: 'VALIDATION_PENDING', label: 'Validation Pending' },
    { id: 'VALIDATED', label: 'Validated (Free)' },
    { id: 'CHARGING', label: 'Charging' },
    { id: 'PAID', label: 'Paid' },
    { id: 'EXIT_COMPLETED', label: 'Completed' },
    { id: 'BLACKLISTED', label: 'Blacklisted' },
    { id: 'MANUAL_REVIEW', label: 'Manual Review' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Parking Sessions Management
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Real-time record of all vehicles, validation countdowns, duration, and exit status
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={loadSessions}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '12px'
      }}>
        {statusTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: 10, left: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Search by vehicle plate number (e.g. BHR 12345) or session code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

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
        columns={[
          {
            key: 'session_code',
            label: 'Session Code',
            render: (sess) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', fontWeight: 600 }}>
                {sess.session_code}
              </span>
            )
          },
          {
            key: 'plate_number',
            label: 'Plate Number',
            render: (sess) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {sess.plate_number}
              </span>
            )
          },
          {
            key: 'entry_time',
            label: 'Entry Time',
            render: (sess) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {sess.entry_time}
              </span>
            )
          },
          {
            key: 'status',
            label: 'Status',
            render: (sess) => <StatusBadge status={sess.status} />
          },
          {
            key: 'validation_deadline',
            label: 'Validation Deadline',
            render: (sess) => (
              <span style={{ fontSize: '0.72rem', color: sess.status === 'VALIDATION_PENDING' ? 'var(--status-amber)' : 'var(--text-muted)' }}>
                {sess.status === 'VALIDATION_PENDING' ? (sess.validation_deadline || '-') : (sess.validated_at || '-')}
              </span>
            )
          },
          {
            key: 'total_duration_minutes',
            label: 'Duration',
            render: (sess) => (
              <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {sess.total_duration_minutes >= 60 
                  ? `${Math.floor(sess.total_duration_minutes / 60)}h ${sess.total_duration_minutes % 60}m`
                  : `${sess.total_duration_minutes || 0}m`
                }
              </span>
            )
          },
          {
            key: 'net_amount',
            label: 'Net Fee',
            render: (sess) => (
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontWeight: 700, 
                color: parseFloat(sess.net_amount || 0) > 0 ? 'var(--status-amber)' : 'var(--text-primary)'
              }}>
                {formatCurrency(sess.net_amount || 0)}
              </span>
            )
          },
          {
            key: 'payment_status',
            label: 'Payment',
            render: (sess) => (
              <span className={`badge ${sess.payment_status === 'paid' ? 'badge-green' : 'badge-gray'}`}>
                {sess.payment_status}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            align: 'right',
            render: (sess) => (
              <div style={{ display: 'inline-flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openDetails(sess.id)}
                  title="View Details"
                >
                  <Eye size={13} />
                </button>

                {sess.status === 'VALIDATION_PENDING' && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => onOpenValidation && onOpenValidation(sess)}
                  >
                    <CheckCircle2 size={13} /> Validate
                  </button>
                )}

                {sess.status === 'CHARGING' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpenPayment && onOpenPayment(sess)}
                  >
                    <CreditCard size={13} /> Collect
                  </button>
                )}

                {!sess.exit_time && sess.status !== 'EXIT_COMPLETED' && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--status-blue)', borderColor: 'var(--status-blue)' }}
                    onClick={() => handleCompleteExit(sess, parseFloat(sess.net_amount || 0) > 0)}
                    title="Complete Exit & Open Barrier"
                  >
                    <ArrowRightCircle size={13} /> Exit
                  </button>
                )}
              </div>
            )
          }
        ]}
        data={sessions}
        loading={loading}
        title="Vehicle Parking Sessions"
        subtitle="Live registry of active and completed vehicle entries"
        icon={Car}
        exportable={true}
        exportFileName="parking_sessions"
        searchPlaceholder="Search plate, session code, or status..."
        defaultPageSize={10}
        emptyMessage="No parking sessions matched your criteria."
      />

      {/* Detailed Session Modal */}
      {detailModalOpen && selectedSession && (
        <Modal 
          isOpen={detailModalOpen} 
          onClose={() => setDetailModalOpen(false)} 
          title={`Session Details: ${selectedSession.session?.session_code}`}
          maxWidth="640px"
        >
          <div style={{ fontSize: '0.8rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span className="stat-label">Plate Number</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedSession.session?.plate_number}
                </div>
              </div>
              <div>
                <span className="stat-label">Current State</span>
                <div>
                  <StatusBadge status={selectedSession.session?.status} />
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Entry Gate:</span>
                <strong>{selectedSession.session?.entry_gate_id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Entry Timestamp:</span>
                <strong>{selectedSession.session?.entry_time}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Exit Timestamp:</span>
                <strong>{selectedSession.session?.exit_time || 'Still Inside'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Validation Method:</span>
                <strong style={{ textTransform: 'capitalize' }}>
                  {selectedSession.session?.validation_method || 'None'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Parking Fee:</span>
                <strong style={{ color: 'var(--gold)', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(selectedSession.tariff?.net_amount || selectedSession.session?.net_amount || 0)}
                </strong>
              </div>
            </div>

            {/* Validation Info */}
            {selectedSession.validation && (
              <div style={{
                padding: '10px 12px',
                background: 'var(--status-green-bg)',
                border: '1px solid var(--status-green-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px'
              }}>
                <strong style={{ color: 'var(--status-green)' }}>Hospital Visitor Validation Record</strong>
                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                  Patient: {selectedSession.validation.visitor_name} (MRN: {selectedSession.validation.patient_mrn})<br />
                  Validated: {selectedSession.validation.created_at} via {selectedSession.validation.validation_type}
                </div>
              </div>
            )}

            {/* Payment Info */}
            {selectedSession.payments && selectedSession.payments.length > 0 && (
              <div style={{
                padding: '10px 12px',
                background: 'var(--status-blue-bg)',
                border: '1px solid var(--status-blue-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px'
              }}>
                <strong style={{ color: 'var(--status-blue)' }}>Confirmed Payment Record</strong>
                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                  Transaction: {selectedSession.payments[0].transaction_code}<br />
                  Amount Paid: {formatCurrency(selectedSession.payments[0].amount)} ({selectedSession.payments[0].payment_method})<br />
                  Paid At: {selectedSession.payments[0].paid_at}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
