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
  Layers,
  Sparkles,
  Percent,
  Compass
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
    const handleSim = () => loadDashboard();
    window.addEventListener('anpr-event-simulated', handleSim);
    return () => {
      clearInterval(interval);
      window.removeEventListener('anpr-event-simulated', handleSim);
    };
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
  const floorBreakdown = data?.floor_breakdown || [];
  const totalCapacity = metrics.total_parking_capacity || 500;
  const occupiedCount = metrics.inside_count || 0;
  const availableSlots = metrics.available_parking_slots !== undefined 
    ? metrics.available_parking_slots 
    : Math.max(0, totalCapacity - occupiedCount);
  const occupancyRate = metrics.occupancy_rate_percent !== undefined 
    ? metrics.occupancy_rate_percent 
    : Math.round((occupiedCount / totalCapacity) * 100);

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Hospital Parking Operations Dashboard
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Real-time ANPR vehicle monitoring, capacity & floor occupancy, visitor validation & revenue
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

      {/* ── Highlighted Parking Capacity & Live Availability Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.25)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Car size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Real-Time Hospital Parking Capacity
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Live lot status synchronized with HIMS & Entrance Barrier Gates
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
              background: availableSlots > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: availableSlots > 0 ? 'var(--status-green)' : 'var(--status-red)',
              border: `1px solid ${availableSlots > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              ● {availableSlots > 0 ? (occupancyRate >= 85 ? 'NEAR CAPACITY' : 'SLOTS AVAILABLE') : 'PARKING FULL'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {occupancyRate}% Occupied
            </span>
          </div>
        </div>

        {/* 3 Core Capacity Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '14px'
        }}>
          {/* Card 1: Total Capacity */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Capacity
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                {totalCapacity} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Slots</span>
              </div>
            </div>
            <div className="stat-icon-wrap stat-icon-blue">
              <Compass size={18} />
            </div>
          </div>

          {/* Card 2: Occupied */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Currently Occupied
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--status-blue)', marginTop: '2px' }}>
                {occupiedCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Vehicles</span>
              </div>
            </div>
            <div className="stat-icon-wrap stat-icon-purple">
              <Car size={18} />
            </div>
          </div>

          {/* Card 3: Available Slots */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Available Slots
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: availableSlots > 0 ? 'var(--status-green)' : 'var(--status-red)', marginTop: '2px' }}>
                {availableSlots} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Vacant</span>
              </div>
            </div>
            <div className="stat-icon-wrap stat-icon-green">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Real-time Occupancy Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>Overall Occupancy Level</span>
            <span>{occupiedCount} / {totalCapacity} Slots ({occupancyRate}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, occupancyRate)}%`,
              height: '100%',
              background: occupancyRate >= 90 ? 'var(--status-red)' : (occupancyRate >= 75 ? 'var(--status-amber)' : 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)'),
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Floor-Wise Slot Availability Grid */}
        {floorBreakdown.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Layers size={14} color="#0284c7" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Floor-Wise Real-Time Breakdown:
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px'
            }}>
              {floorBreakdown.map((fl, idx) => (
                <div 
                  key={fl.floor_id || idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {fl.floor_name}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: fl.available_slots > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: fl.available_slots > 0 ? 'var(--status-green)' : 'var(--status-red)'
                    }}>
                      {fl.available_slots > 0 ? `${fl.available_slots} Free` : 'FULL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Occupied: <strong>{fl.occupied_slots}</strong> / {fl.total_capacity}</span>
                    <span>{fl.occupancy_rate}%</span>
                  </div>

                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, fl.occupancy_rate)}%`,
                      height: '100%',
                      background: fl.occupancy_rate >= 90 ? 'var(--status-red)' : (fl.occupancy_rate >= 75 ? 'var(--status-amber)' : 'var(--status-blue)'),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Operational Lifecycle Metrics Grid ── */}
      <div className="stat-grid">
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
