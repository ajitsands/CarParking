import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  ShieldAlert, 
  Download, 
  RefreshCw,
  Calendar,
  Filter,
  X,
  ArrowRight,
  FileText,
  Layers,
  Info,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import DataTable from '../components/common/DataTable';

export default function ReportsPage() {
  const { formatCurrency } = useSettings();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Range Search Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState('all');

  const loadReport = async (overrideParams = null) => {
    setLoading(true);
    try {
      const params = overrideParams !== null ? overrideParams : {};
      if (overrideParams === null) {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      const res = await api.getReportsSummary(params);
      if (res.success) {
        setReport(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Preset Date Handlers
  const handlePreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (preset === 'today') {
      start = formatDate(now);
      end = formatDate(now);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      start = formatDate(y);
      end = formatDate(y);
    } else if (preset === 'last7') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      start = formatDate(d7);
      end = formatDate(now);
    } else if (preset === 'last30') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 29);
      start = formatDate(d30);
      end = formatDate(now);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatDate(firstDay);
      end = formatDate(now);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);

    const params = {};
    if (start) params.start_date = start;
    if (end) params.end_date = end;
    loadReport(params);
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setActivePreset('custom');
    loadReport();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
    loadReport({});
  };

  const totals = report?.totals || {};

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Management Reports & Financial Analytics
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Revenue breakdown, visitor validation audit, hourly peak usage, and immutable security logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Export / Print
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => loadReport()}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
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

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Parking Sessions</div>
            <div className="stat-value">{totals.total_sessions ?? 0}</div>
          </div>
          <div className="stat-icon-wrap stat-icon-blue">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Revenue Collected</div>
            <div className="stat-value" style={{ color: 'var(--gold)' }}>
              {formatCurrency(totals.total_revenue || 0)}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-amber">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Validated Hospital Visits</div>
            <div className="stat-value" style={{ color: 'var(--status-green)' }}>
              {totals.total_validated ?? 0}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-green">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Revenue and Validation Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Payment Methods Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <DollarSign size={16} /> Revenue by Payment Method
            </span>
          </div>
          <div className="panel-body">
            {report?.payment_methods && report.payment_methods.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.payment_methods.map((m, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.78rem' }}>
                      {m.payment_method.replace('_', ' ')}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                        {formatCurrency(m.total)}
                      </strong>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {m.count} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Validation Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <CheckCircle2 size={16} /> Validated Sessions Breakdown
            </span>
          </div>
          <div className="panel-body">
            {report?.validation_stats && report.validation_stats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.validation_stats.map((v, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.78rem' }}>
                      {v.validation_method.replace('_', ' ')}
                    </span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-green)' }}>
                      {v.count} sessions
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No visitor validations logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Between Search & Range Filter Section */}
      <div className="panel" style={{ marginBottom: '16px', padding: '14px 18px', background: 'var(--bg-surface)' }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Calendar size={16} color="var(--accent)" />
              <span>Date Range Filter:</span>
            </div>

            {/* From Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>From</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.76rem', padding: '5px 8px', borderRadius: 'var(--radius-sm)' }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>

            {/* To Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>To</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.76rem', padding: '5px 8px', borderRadius: 'var(--radius-sm)' }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>

            {/* Filter & Reset Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                <Filter size={13} /> Filter
              </button>
              {(startDate || endDate || activePreset !== 'all') && (
                <button type="button" className="btn btn-outline btn-sm" onClick={handleResetFilter} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                className={`btn btn-sm ${activePreset === p.id ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: '0.72rem',
                  padding: '4px 8px',
                  fontWeight: activePreset === p.id ? 700 : 500
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Modern DataTable for Security Audit Trail with Expandable Child Rows */}
      <DataTable
        title="Immutable System & Security Audit Logs"
        subtitle={`Total logged events: ${(report?.audit_logs || []).length} ${startDate || endDate ? `(Filtered: ${startDate || 'Start'} to ${endDate || 'Now'})` : ''}`}
        icon={ShieldAlert}
        columns={[
          {
            key: 'created_at',
            label: 'Timestamp',
            width: '155px',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {log.created_at}
              </span>
            )
          },
          {
            key: 'plate_number',
            label: 'Vehicle Number',
            width: '130px',
            render: (log) => {
              if (!log.plate_number || log.plate_number === '-') {
                return <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>-</span>;
              }
              return (
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)'
                }}>
                  {log.plate_number}
                </div>
              );
            }
          },
          {
            key: 'gate_route',
            label: 'Gate / Route',
            width: '180px',
            render: (log) => {
              const route = log.gate_route || log.entity_id || 'GATE-IN-01';
              const isMultiGate = String(route).includes('→');

              return (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isMultiGate ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)',
                  border: `1px solid ${isMultiGate ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-color)'}`,
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: isMultiGate ? 'var(--accent)' : 'var(--text-primary)'
                }}>
                  {route}
                </div>
              );
            }
          },
          {
            key: 'start_time',
            label: 'Start Time',
            width: '150px',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {log.start_time || log.created_at || '-'}
              </span>
            )
          },
          {
            key: 'end_time',
            label: 'End Time',
            width: '150px',
            render: (log) => {
              if (log.end_time) {
                return (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {log.end_time}
                  </span>
                );
              }
              if (log.is_currently_inside && log.plate_number && log.plate_number !== '-') {
                return (
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    ● Inside / Active
                  </span>
                );
              }
              return <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>-</span>;
            }
          },
          {
            key: 'duration_minutes',
            label: 'Total Parked',
            width: '120px',
            render: (log) => {
              const mins = log.duration_minutes !== null && log.duration_minutes !== undefined ? parseInt(log.duration_minutes, 10) : null;
              if (mins === null || isNaN(mins)) {
                return <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>-</span>;
              }
              const formatted = mins >= 60 
                ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                : `${mins}m`;
              return (
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 700, 
                  fontSize: '0.76rem',
                  color: mins > 120 ? 'var(--status-amber)' : 'var(--text-primary)'
                }}>
                  {formatted}
                </span>
              );
            }
          },
          {
            key: 'username',
            label: 'User / Operator',
            width: '120px',
            render: (log) => <span style={{ fontWeight: 600, fontSize: '0.76rem' }}>{log.username || 'System'}</span>
          },
          {
            key: 'action',
            label: 'Action',
            width: '160px',
            render: (log) => (
              <span className={`badge ${
                log.action.includes('OVERRIDE') ? 'badge-amber' : 
                log.action.includes('ANPR') ? 'badge-blue' : 
                log.action.includes('DELETE') ? 'badge-red' : 'badge-gray'
              }`} style={{ fontSize: '0.68rem' }}>
                {log.action}
              </span>
            )
          }
        ]}
        data={report?.audit_logs || []}
        loading={loading}
        exportable={true}
        exportFileName="security_audit_logs"
        searchPlaceholder="Search audit events by plate, user, action, gate, or reason..."
        emptyMessage="No audit logs recorded for the selected period."
        // Collapsible Child Row Displaying the Reason & Detailed Activity Audit
        expandableRowRender={(log) => (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '4px 6px'
          }}>
            {/* Top Reason Alert if available */}
            {log.override_reason && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent)'
              }}>
                <Info size={16} />
                <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                  Reason / Justification:
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {log.override_reason}
                </span>
              </div>
            )}

            {/* Detailed Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px'
            }}>
              {/* Box 1: Full Activity Description */}
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <FileText size={13} color="var(--accent)" />
                  <span>Activity Description</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {log.details || 'Standard system action logged.'}
                </div>
              </div>

              {/* Box 2: Entity & Gate Route Info */}
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <Layers size={13} color="var(--accent)" />
                  <span>Entity Target & Routing</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Entity:</strong> {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}</div>
                  <div style={{ marginTop: '2px' }}><strong>Gate Route:</strong> {log.gate_route || log.entity_id || 'GATE-IN-01'}</div>
                  {log.entry_gate && <div style={{ marginTop: '2px' }}><strong>Entry Gate:</strong> {log.entry_gate}</div>}
                  {log.exit_gate && <div style={{ marginTop: '2px' }}><strong>Exit Gate:</strong> {log.exit_gate}</div>}
                </div>
              </div>

              {/* Box 3: Security & Network Origin */}
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <ShieldCheck size={13} color="var(--status-green)" />
                  <span>Security & Origin</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Operator:</strong> {log.username || 'System Automation'} (ID: {log.user_id || 'SYSTEM'})</div>
                  <div style={{ marginTop: '2px' }}><strong>IP Address:</strong> {log.ip_address || '127.0.0.1 (Local)'}</div>
                  <div style={{ marginTop: '2px' }}><strong>Log Ref:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>#LOG-{String(log.id).padStart(5, '0')}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
        headerActions={
          <button className="btn btn-outline btn-sm" onClick={() => loadReport()} title="Refresh audit report">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />
    </div>
  );
}

