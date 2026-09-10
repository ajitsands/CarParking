import React, { useState, useEffect } from 'react';
import { 
  Car, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Coins, 
  RefreshCw,
  Video,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import BoomBarrierVisualizer from '../components/gate/BoomBarrierVisualizer';
import DataTable from '../components/common/DataTable';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard({ onNavigate, onOpenPayment, onOpenValidation }) {
  const { formatCurrency } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      const res = await api.getDashboardMetrics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 8000); // auto-refresh every 8s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <RefreshCw size={24} className="animate-spin" color="var(--accent)" />
        <span style={{ marginLeft: '10px', fontWeight: 600 }}>Loading control room metrics...</span>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Hospital Parking Operations Dashboard
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Real-time ANPR vehicle monitoring, visitor validation status & revenue metrics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={loadDashboard}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

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

      {/* KPI Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Vehicles Inside</div>
            <div className="stat-value">{metrics.inside_count ?? 0}</div>
          </div>
          <div className="stat-icon-wrap stat-icon-blue">
            <Car size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Validation Pending</div>
            <div className="stat-value" style={{ color: 'var(--status-amber)' }}>
              {metrics.validation_pending_count ?? 0}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-amber">
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Validated (Free)</div>
            <div className="stat-value" style={{ color: 'var(--status-green)' }}>
              {metrics.validated_count ?? 0}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-green">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Currently Charging</div>
            <div className="stat-value" style={{ color: 'var(--status-red)' }}>
              {metrics.charging_count ?? 0}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-red">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Today Entries</div>
            <div className="stat-value">{metrics.today_entries ?? 0}</div>
          </div>
          <div className="stat-icon-wrap stat-icon-blue">
            <ArrowDownRight size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Today Exits</div>
            <div className="stat-value">{metrics.today_exits ?? 0}</div>
          </div>
          <div className="stat-icon-wrap stat-icon-purple">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Today Revenue</div>
            <div className="stat-value" style={{ color: 'var(--gold)' }}>
              {formatCurrency(metrics.today_revenue || 0)}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-amber">
            <Coins size={20} />
          </div>
        </div>
      </div>

      {/* Gates Live Quick Preview */}
      <div className="lane-monitor-grid">
        <div className="lane-card">
          <div className="panel-header">
            <span className="panel-title">
              <Video size={16} color="var(--status-green)" />
              GATE-IN-01 — Entry Lane Camera & Barrier
            </span>
            <span className="badge badge-green">LIVE ANPR</span>
          </div>
          <div style={{ padding: '12px' }}>
            <BoomBarrierVisualizer 
              isOpen={false} 
              gateName="Entry Boom Barrier" 
            />
          </div>
        </div>

        <div className="lane-card">
          <div className="panel-header">
            <span className="panel-title">
              <Video size={16} color="var(--accent)" />
              GATE-OUT-01 — Exit Lane Camera & Barrier
            </span>
            <span className="badge badge-green">LIVE ANPR</span>
          </div>
          <div style={{ padding: '12px' }}>
            <BoomBarrierVisualizer 
              isOpen={false} 
              gateName="Exit Boom Barrier" 
            />
          </div>
        </div>
      </div>

      {/* Active Sessions & Recent Events Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Active Parking Sessions DataTable */}
        <DataTable
          columns={[
            {
              key: 'plate_number',
              label: 'Plate Number',
              render: (sess) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
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
              key: 'total_duration_minutes',
              label: 'Duration',
              render: (sess) => `${sess.total_duration_minutes || 0}m`
            },
            {
              key: 'net_amount',
              label: 'Fee Due',
              render: (sess) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {formatCurrency(sess.net_amount || 0)}
                </span>
              )
            },
            {
              key: 'action',
              label: 'Action',
              sortable: false,
              align: 'right',
              render: (sess) => (
                <div style={{ display: 'inline-flex', gap: '6px' }}>
                  {sess.status === 'VALIDATION_PENDING' && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                      onClick={() => onOpenValidation && onOpenValidation(sess)}
                    >
                      Validate
                    </button>
                  )}
                  {sess.status === 'CHARGING' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                      onClick={() => onOpenPayment && onOpenPayment(sess)}
                    >
                      Collect
                    </button>
                  )}
                </div>
              )
            }
          ]}
          data={data?.active_sessions || []}
          loading={loading}
          title="Active Vehicles in Parking"
          icon={Car}
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          exportable={true}
          exportFileName="dashboard_active_vehicles"
          searchPlaceholder="Search active parked vehicles..."
          emptyMessage="No vehicles currently in parking area."
          headerActions={(
            <button 
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => onNavigate('sessions')}
            >
              View All Sessions
            </button>
          )}
        />

        {/* Live ANPR Events Stream */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <Video size={16} /> Live ANPR Feed
            </span>
            <span className="badge badge-blue">REAL-TIME</span>
          </div>
          <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '10px' }}>
            {data?.recent_events && data.recent_events.length > 0 ? (
              data.recent_events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {evt.plate_number}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {evt.gate_id} · {evt.direction} · {evt.confidence}% conf
                    </div>
                  </div>
                  <span className={`badge ${evt.direction === 'ENTRY' ? 'badge-blue' : 'badge-green'}`}>
                    {evt.direction}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Awaiting camera events...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
