import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, CheckCircle2, ShieldAlert, Download, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import DataTable from '../components/common/DataTable';

export default function ReportsPage() {
  const { formatCurrency } = useSettings();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getReportsSummary();
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

  const totals = report?.totals || {};

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Management Reports & Financial Analytics
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Revenue breakdown, visitor validation audit, hourly peak usage, and security logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Export / Print
          </button>
          <button className="btn btn-outline btn-sm" onClick={loadReport}>
            <RefreshCw size={14} /> Refresh
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

      {/* Modern DataTable for Security Audit Trail */}
      <DataTable
        title="Immutable System & Security Audit Logs"
        subtitle={`Total logged events: ${(report?.audit_logs || []).length}`}
        icon={ShieldAlert}
        columns={[
          {
            key: 'created_at',
            label: 'Timestamp',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {log.created_at}
              </span>
            )
          },
          {
            key: 'plate_number',
            label: 'Vehicle Number',
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
            key: 'start_time',
            label: 'Start Time',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {log.start_time || log.created_at || '-'}
              </span>
            )
          },
          {
            key: 'end_time',
            label: 'End Time',
            render: (log) => {
              if (log.end_time) {
                return (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {log.end_time}
                  </span>
                );
              }
              if (log.plate_number && log.plate_number !== '-') {
                return (
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    Inside / Active
                  </span>
                );
              }
              return <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>-</span>;
            }
          },
          {
            key: 'duration_minutes',
            label: 'Total Parked (Min/Hr)',
            render: (log) => {
              const mins = log.duration_minutes !== null && log.duration_minutes !== undefined ? parseInt(log.duration_minutes, 10) : null;
              if (mins === null || isNaN(mins)) {
                return <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>-</span>;
              }
              const formatted = mins >= 60 
                ? `${Math.floor(mins / 60)}h ${mins % 60}m (${mins}m)`
                : `${mins} mins`;
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
            render: (log) => <span style={{ fontWeight: 600 }}>{log.username || 'System'}</span>
          },
          {
            key: 'action',
            label: 'Action',
            render: (log) => <span className="badge badge-gray">{log.action}</span>
          },
          {
            key: 'entity_type',
            label: 'Entity Target',
            render: (log) => (
              <span style={{ fontSize: '0.74rem' }}>
                {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
              </span>
            )
          },
          {
            key: 'details',
            label: 'Activity Details',
            render: (log) => (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {log.details}
              </span>
            )
          }
        ]}
        data={report?.audit_logs || []}
        loading={loading}
        exportable={true}
        exportFileName="security_audit_logs"
        searchPlaceholder="Search audit events by user, action, entity, or details..."
        emptyMessage="No audit logs recorded yet."
        headerActions={
          <button className="btn btn-outline btn-sm" onClick={loadReport} title="Refresh audit report">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />
    </div>
  );
}
