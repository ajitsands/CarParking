import React, { useState, useEffect } from 'react';
import { 
  Car, Search, Filter, RefreshCw, Eye, CheckCircle2, CreditCard, 
  AlertCircle, ArrowRightCircle, Calendar, ShieldCheck, Building2, 
  Clock, Zap, Activity, ChevronRight, UserCheck, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import DataTable from '../components/common/DataTable';
import { useSettings } from '../context/SettingsContext';

export default function ParkingSessions({ onOpenPayment, onOpenValidation }) {
  const { formatCurrency } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Date Filter State
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'yesterday', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Live Inside Counts summary
  const [insideCounts, setInsideCounts] = useState({
    total_inside: 0,
    charging: 0,
    free_grace: 0,
    validated: 0,
    admin_staff: 0,
    company_vendor: 0,
    general_visitor: 0
  });

  // Modern Confirmation Modal state
  const [exitModal, setExitModal] = useState({
    isOpen: false,
    session: null,
    isCash: false,
    loading: false
  });

  const isInsideTab = ['CHARGING', 'INSIDE', 'ACTIVE'].includes(statusFilter);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        status: statusFilter,
        category: categoryFilter,
        search: search.trim(),
        limit: 100
      };

      // Only attach date filters when NOT on inside/charging tab
      if (!isInsideTab) {
        if (datePreset === 'today' || datePreset === 'yesterday') {
          params.date_preset = datePreset;
        } else if (datePreset === 'custom') {
          if (fromDate) params.from_date = fromDate;
          if (toDate) params.to_date = toDate;
        }
      }

      const res = await api.getSessions(params);
      if (res.success) {
        setSessions(res.data.sessions || []);
        setTotal(res.data.total || 0);
        if (res.data.inside_counts) {
          setInsideCounts(res.data.inside_counts);
        }
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
    const handleSim = () => loadSessions();
    window.addEventListener('anpr-event-simulated', handleSim);
    return () => {
      clearInterval(interval);
      window.removeEventListener('anpr-event-simulated', handleSim);
    };
  }, [statusFilter, categoryFilter, datePreset, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadSessions();
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setFromDate('');
      setToDate('');
    } else {
      // Default custom to today if empty
      const today = new Date().toISOString().split('T')[0];
      if (!fromDate) setFromDate(today);
      if (!toDate) setToDate(today);
    }
  };

  const openDetails = async (id) => {
    try {
      const res = await api.getSession(id);
      if (res.success) {
        setSelectedSession(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to load details' });
    }
  };

  const handleOpenExitModal = (sess, isCash = false) => {
    setExitModal({
      isOpen: true,
      session: sess,
      isCash,
      loading: false
    });
  };

  const handleExecuteExit = async () => {
    if (!exitModal.session) return;
    setExitModal(prev => ({ ...prev, loading: true }));

    try {
      const res = await api.completeSessionExit(exitModal.session.id, {
        gate_id: 'GATE-OUT-01',
        cash_payment: exitModal.isCash,
        reason: exitModal.isCash ? 'Cash collected by operator' : 'Manual exit checkout from sessions page'
      });

      if (res.success) {
        setExitModal({ isOpen: false, session: null, isCash: false, loading: false });
        setToastMsg({ 
          type: 'success', 
          text: res.message || `Vehicle ${exitModal.session.plate_number} exit authorized! Boom barrier opening signal sent.` 
        });
        setTimeout(() => setToastMsg(null), 5000);
        loadSessions();
      }
    } catch (err) {
      setExitModal(prev => ({ ...prev, loading: false }));
      setToastMsg({ type: 'error', text: err.message || 'Failed to complete exit' });
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const statusTabs = [
    { id: '', label: 'All Sessions' },
    { id: 'INSIDE', label: 'Currently Inside (Active)', count: insideCounts.total_inside },
    { id: 'CHARGING', label: 'Charging', count: insideCounts.charging },
    { id: 'VALIDATION_PENDING', label: 'Validation Pending', count: insideCounts.free_grace },
    { id: 'VALIDATED', label: 'Validated (Free)' },
    { id: 'PAID', label: 'Paid' },
    { id: 'EXIT_COMPLETED', label: 'Completed' },
    { id: 'BLACKLISTED', label: 'Blacklisted' },
    { id: 'MANUAL_REVIEW', label: 'Manual Review' }
  ];

  const getCategoryBadge = (category, accessStatus) => {
    const cat = (category || '').toLowerCase();
    const acc = (accessStatus || '').toLowerCase();

    if (acc === 'whitelisted' || ['staff', 'doctor', 'hospital_owned', 'admin'].includes(cat)) {
      return {
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        label: cat === 'doctor' ? 'Doctor' : cat === 'staff' ? 'Staff' : cat === 'hospital_owned' ? 'Hospital Fleet' : 'Admin / Staff'
      };
    }
    if (['vendor', 'company', 'contractor', 'supplier'].includes(cat)) {
      return {
        bg: '#faf5ff',
        color: '#7e22ce',
        border: '#e9d5ff',
        label: 'Company / Vendor'
      };
    }
    if (cat === 'emergency') {
      return {
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
        label: 'Emergency'
      };
    }
    if (['patient', 'visitor'].includes(cat)) {
      return {
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        label: cat === 'patient' ? 'Patient' : 'Visitor'
      };
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
            Parking Sessions Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Real-time tracking of active parked vehicles, category distribution, and completed exits
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={loadSessions}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Real-time Inside Parking Metric KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Total Inside */}
        <div 
          onClick={() => { setStatusFilter('INSIDE'); setCategoryFilter(''); }}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusFilter === 'INSIDE' && !categoryFilter ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'var(--bg-surface)',
            color: statusFilter === 'INSIDE' && !categoryFilter ? '#fff' : 'inherit',
            border: `1px solid ${statusFilter === 'INSIDE' && !categoryFilter ? '#334155' : 'var(--border-color)'}`,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85 }}>
              Total Inside Parking
            </span>
            <Car size={16} color={statusFilter === 'INSIDE' && !categoryFilter ? '#38bdf8' : 'var(--brand-primary)'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>
            {insideCounts.total_inside}
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.75 }}>
            Active vehicles inside premises
          </div>
        </div>

        {/* Charging (Paid) */}
        <div 
          onClick={() => { setStatusFilter('CHARGING'); setCategoryFilter(''); }}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusFilter === 'CHARGING' ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'var(--bg-surface)',
            color: statusFilter === 'CHARGING' ? '#fff' : 'inherit',
            border: `1px solid ${statusFilter === 'CHARGING' ? '#dc2626' : 'var(--border-color)'}`,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: statusFilter === 'CHARGING' ? '#fff' : 'var(--status-red)' }}>
              Charging (Paid)
            </span>
            <Zap size={16} color={statusFilter === 'CHARGING' ? '#fca5a5' : 'var(--status-red)'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: statusFilter === 'CHARGING' ? '#fff' : 'var(--status-red)' }}>
            {insideCounts.charging}
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.75 }}>
            Accruing hourly tariffs
          </div>
        </div>

        {/* Free Grace Period */}
        <div 
          onClick={() => { setStatusFilter('VALIDATION_PENDING'); setCategoryFilter(''); }}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusFilter === 'VALIDATION_PENDING' ? 'linear-gradient(135deg, #78350f, #92400e)' : 'var(--bg-surface)',
            color: statusFilter === 'VALIDATION_PENDING' ? '#fff' : 'inherit',
            border: `1px solid ${statusFilter === 'VALIDATION_PENDING' ? '#d97706' : 'var(--border-color)'}`,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: statusFilter === 'VALIDATION_PENDING' ? '#fff' : 'var(--status-amber)' }}>
              Free Grace Window
            </span>
            <Clock size={16} color={statusFilter === 'VALIDATION_PENDING' ? '#fde68a' : 'var(--status-amber)'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: statusFilter === 'VALIDATION_PENDING' ? '#fff' : 'var(--status-amber)' }}>
            {insideCounts.free_grace}
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.75 }}>
            Validation pending / grace
          </div>
        </div>

        {/* Administration & Staff */}
        <div 
          onClick={() => { setStatusFilter('INSIDE'); setCategoryFilter('staff'); }}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusFilter === 'INSIDE' && categoryFilter === 'staff' ? 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' : 'var(--bg-surface)',
            color: statusFilter === 'INSIDE' && categoryFilter === 'staff' ? '#fff' : 'inherit',
            border: `1px solid ${statusFilter === 'INSIDE' && categoryFilter === 'staff' ? '#2563eb' : 'var(--border-color)'}`,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: statusFilter === 'INSIDE' && categoryFilter === 'staff' ? '#fff' : '#2563eb' }}>
              Administration & Staff
            </span>
            <ShieldCheck size={16} color={statusFilter === 'INSIDE' && categoryFilter === 'staff' ? '#bfdbfe' : '#2563eb'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: statusFilter === 'INSIDE' && categoryFilter === 'staff' ? '#fff' : '#2563eb' }}>
            {insideCounts.admin_staff}
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.75 }}>
            Doctors, Staff & Hospital Fleet
          </div>
        </div>

        {/* Company & Vendors */}
        <div 
          onClick={() => { setStatusFilter('INSIDE'); setCategoryFilter('vendor'); }}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? 'linear-gradient(135deg, #581c87, #6b21a8)' : 'var(--bg-surface)',
            color: statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? '#fff' : 'inherit',
            border: `1px solid ${statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? '#9333ea' : 'var(--border-color)'}`,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? '#fff' : '#7e22ce' }}>
              Company & Vendors
            </span>
            <Building2 size={16} color={statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? '#e9d5ff' : '#7e22ce'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: statusFilter === 'INSIDE' && categoryFilter === 'vendor' ? '#fff' : '#7e22ce' }}>
            {insideCounts.company_vendor}
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.75 }}>
            Corporate & Suppliers
          </div>
        </div>
      </div>

      {/* Date Filter & Preset Toolbar */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        {/* Left: Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={14} /> Date Filter:
          </span>

          <div style={{ display: 'inline-flex', background: 'var(--bg-body)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              disabled={isInsideTab}
              onClick={() => handleDatePresetChange('all')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: isInsideTab ? 'not-allowed' : 'pointer',
                background: datePreset === 'all' && !isInsideTab ? 'var(--brand-primary)' : 'transparent',
                color: datePreset === 'all' && !isInsideTab ? '#fff' : 'var(--text-secondary)'
              }}
            >
              All Time
            </button>
            <button
              type="button"
              disabled={isInsideTab}
              onClick={() => handleDatePresetChange('today')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: isInsideTab ? 'not-allowed' : 'pointer',
                background: datePreset === 'today' && !isInsideTab ? 'var(--brand-primary)' : 'transparent',
                color: datePreset === 'today' && !isInsideTab ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Today
            </button>
            <button
              type="button"
              disabled={isInsideTab}
              onClick={() => handleDatePresetChange('yesterday')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: isInsideTab ? 'not-allowed' : 'pointer',
                background: datePreset === 'yesterday' && !isInsideTab ? 'var(--brand-primary)' : 'transparent',
                color: datePreset === 'yesterday' && !isInsideTab ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Yesterday
            </button>
            <button
              type="button"
              disabled={isInsideTab}
              onClick={() => handleDatePresetChange('custom')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: isInsideTab ? 'not-allowed' : 'pointer',
                background: datePreset === 'custom' && !isInsideTab ? 'var(--brand-primary)' : 'transparent',
                color: datePreset === 'custom' && !isInsideTab ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Custom Date Range
            </button>
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && !isInsideTab && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.74rem', width: '135px' }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.74rem', width: '135px' }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Informative Note when viewing Inside/Charging */}
        {isInsideTab ? (
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            background: 'var(--status-blue-bg, #eff6ff)',
            border: '1px solid var(--status-blue-border, #bfdbfe)',
            borderRadius: '6px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Activity size={13} /> Live Inside View: Showing all currently parked vehicles (no date cutoff).
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Category:
            </span>
            <select
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '0.74rem', minWidth: '150px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="staff">Administration & Staff</option>
              <option value="doctor">Doctors</option>
              <option value="vendor">Company & Vendors</option>
              <option value="patient">Patients</option>
              <option value="visitor">Visitors</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        )}
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
            onClick={() => {
              setStatusFilter(tab.id);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span style={{
                background: statusFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                color: statusFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification Toast */}
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

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: 10, left: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Search by vehicle plate number (e.g. 2150, BHR 12345) or session code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {search && (
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={() => { setSearch(''); loadSessions(); }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Sessions DataTable */}
      <DataTable
        columns={[
          {
            key: 'plate_number',
            label: 'Plate Number',
            render: (sess) => {
              const catBadge = getCategoryBadge(sess.category, sess.access_status);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.84rem'
                    }}>
                      {sess.plate_number}
                    </div>
                    {catBadge && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: catBadge.bg,
                        color: catBadge.color,
                        border: `1px solid ${catBadge.border}`
                      }}>
                        {catBadge.label}
                      </span>
                    )}
                  </div>
                  {sess.owner_name && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {sess.owner_name} {sess.owner_department ? `(${sess.owner_department})` : ''}
                    </span>
                  )}
                </div>
              );
            }
          },
          {
            key: 'session_code',
            label: 'Session Code',
            render: (sess) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {sess.session_code}
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
              <span className={`badge ${sess.payment_status === 'paid' ? 'badge-green' : sess.payment_status === 'waived' ? 'badge-blue' : 'badge-gray'}`}>
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
                    onClick={() => handleOpenExitModal(sess, parseFloat(sess.net_amount || 0) > 0)}
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

      {/* Well-Designed Exit Authorization Modal */}
      <ConfirmModal
        isOpen={exitModal.isOpen}
        onClose={() => setExitModal({ isOpen: false, session: null, isCash: false, loading: false })}
        onConfirm={handleExecuteExit}
        title="Authorize Vehicle Exit"
        plateNumber={exitModal.session?.plate_number}
        message="Authorize exit for this vehicle? This will trigger the relay signal to open the Exit Boom Barrier and complete this parking session."
        confirmText="Authorize & Open Barrier"
        cancelText="Cancel"
        type="primary"
        loading={exitModal.loading}
        sessionInfo={exitModal.session ? {
          gate: exitModal.session.exit_gate_id || 'GATE-OUT-01',
          duration: exitModal.session.total_duration_minutes 
            ? (exitModal.session.total_duration_minutes >= 60 
                ? `${Math.floor(exitModal.session.total_duration_minutes / 60)}h ${exitModal.session.total_duration_minutes % 60}m`
                : `${exitModal.session.total_duration_minutes}m`)
            : 'Active',
          status: exitModal.session.status,
          statusColor: exitModal.session.status === 'VALIDATED' ? 'var(--status-green)' : 'var(--status-blue)',
          fee: formatCurrency(exitModal.session.net_amount || 0)
        } : null}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span className="stat-label">Entry Time</span>
                <div style={{ fontWeight: 600 }}>{selectedSession.session?.entry_time}</div>
              </div>
              <div>
                <span className="stat-label">Exit Time</span>
                <div style={{ fontWeight: 600 }}>{selectedSession.session?.exit_time || 'Still in parking lot'}</div>
              </div>
              <div>
                <span className="stat-label">Duration</span>
                <div style={{ fontWeight: 600 }}>{selectedSession.session?.total_duration_minutes || 0} minutes</div>
              </div>
              <div>
                <span className="stat-label">Entry Gate / Camera</span>
                <div style={{ fontWeight: 600 }}>{selectedSession.session?.entry_gate_id || 'GATE-IN-01'}</div>
              </div>
            </div>

            {/* Validation Info */}
            {selectedSession.validations && selectedSession.validations.length > 0 && (
              <div style={{
                padding: '10px 12px',
                background: 'var(--status-green-bg)',
                border: '1px solid var(--status-green-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px'
              }}>
                <strong style={{ color: 'var(--status-green)' }}>Validation Verified</strong>
                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                  Type: {selectedSession.validations[0].validation_type}<br />
                  Validated By: Staff User #{selectedSession.validations[0].validated_by_user_id || 'System'}<br />
                  Free Minutes Granted: {selectedSession.validations[0].free_minutes_granted} mins ({selectedSession.validations[0].discount_percent}% Waiver)
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
