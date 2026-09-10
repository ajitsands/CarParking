import React, { useState, useEffect } from 'react';
import { 
  WalletCards, 
  Plus, 
  Calendar, 
  Clock, 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  FileText, 
  ShieldCheck, 
  Car, 
  User, 
  Phone, 
  ArrowRight,
  Receipt,
  Eye,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';

export default function PrepaidParkingPage() {
  const { formatCurrency, settings } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState('passes'); // 'passes', 'ledger', 'vehicle'
  const [passes, setPasses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState(null);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filters
  const [passSearch, setPassSearch] = useState('');
  const [passStatusFilter, setPassStatusFilter] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerMonth, setLedgerMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [ledgerMethod, setLedgerMethod] = useState('');

  // Vehicle History State
  const [selectedPlate, setSelectedPlate] = useState('');
  const [vehicleHistory, setVehicleHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Pass Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    plate_number: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    vehicle_type: 'Sedan',
    duration_type: 'month',
    duration_value: 1,
    start_date: new Date().toISOString().slice(0, 10),
    total_amount: '',
    payment_method: 'cash',
    payment_reference: '',
    notes: ''
  });
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Renewal Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewDurationValue, setRenewDurationValue] = useState(1);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');
  const [renewPaymentRef, setRenewPaymentRef] = useState('');
  const [renewCost, setRenewCost] = useState(null);
  const [renewing, setRenewing] = useState(false);

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [passesRes, statsRes, ledgerRes] = await Promise.all([
        api.getPrepaidPasses({ search: passSearch, status: passStatusFilter }),
        api.getPrepaidStats({ month: ledgerMonth }),
        api.getPrepaidLedger({ search: ledgerSearch, month: ledgerMonth, payment_method: ledgerMethod })
      ]);

      if (passesRes.success) setPasses(passesRes.data.passes || []);
      if (statsRes.success) {
        setStats(statsRes.data.stats);
        setRates(statsRes.data.rates || {});
      }
      if (ledgerRes.success) setLedger(ledgerRes.data.ledger || []);
    } catch (err) {
      setError(err.message || 'Failed to load prepaid parking records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [passStatusFilter, ledgerMonth, ledgerMethod]);

  // Recalculate cost when modal duration changes
  useEffect(() => {
    if (!issueModalOpen) return;
    const calcCost = async () => {
      try {
        const res = await api.calculatePrepaidCost({
          duration_type: issueForm.duration_type,
          duration_value: issueForm.duration_value
        });
        if (res.success) {
          setCalculatedCost(res.data);
          setIssueForm(prev => ({ ...prev, total_amount: res.data.total_amount }));
        }
      } catch (e) {}
    };
    calcCost();
  }, [issueForm.duration_type, issueForm.duration_value, issueModalOpen]);

  // Calculate renewal cost
  useEffect(() => {
    if (!renewModalOpen || !renewTarget) return;
    const calcRenewCost = async () => {
      try {
        const res = await api.calculatePrepaidCost({
          duration_type: renewTarget.duration_type,
          duration_value: renewDurationValue
        });
        if (res.success) {
          setRenewCost(res.data);
        }
      } catch (e) {}
    };
    calcRenewCost();
  }, [renewDurationValue, renewModalOpen, renewTarget]);

  // Handle Pass Issuance
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.issuePrepaidPass(issueForm);
      if (res.success) {
        setSuccessMsg(`Prepaid pass ${res.data.pass_code} issued successfully! Vehicle ${res.data.plate_number} is now Whitelisted.`);
        setIssueModalOpen(false);
        setCurrentReceipt(res.data);
        setReceiptModalOpen(true);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to issue prepaid pass');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Pass Renewal
  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewTarget) return;
    setRenewing(true);
    setError('');

    try {
      const res = await api.renewPrepaidPass(renewTarget.id, {
        duration_value: renewDurationValue,
        payment_method: renewPaymentMethod,
        payment_reference: renewPaymentRef
      });
      if (res.success) {
        setSuccessMsg(`Pass ${renewTarget.pass_code} renewed successfully! Extended until ${res.data.new_expiry}`);
        setRenewModalOpen(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Renewal failed');
    } finally {
      setRenewing(false);
    }
  };

  // Open Vehicle Ledger History
  const inspectVehicleHistory = async (plate) => {
    const cleanPlate = decodeURIComponent(plate || '').trim();
    setSelectedPlate(cleanPlate);
    setActiveSubTab('vehicle');
    setHistoryLoading(true);
    try {
      const res = await api.getPrepaidVehicleHistory(cleanPlate);
      if (res.success) {
        setVehicleHistory(res.data);
      }
    } catch (e) {
      alert('Failed to load vehicle history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Prepaid Parking Management & Financial Ledger
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Issue day/week/month prepaid passes with automated whitelist access and vehicle-based financial ledgers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={loadData}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => {
              setIssueForm({
                plate_number: '',
                owner_name: '',
                owner_phone: '',
                owner_email: '',
                vehicle_type: 'Sedan',
                duration_type: 'month',
                duration_value: 1,
                start_date: new Date().toISOString().slice(0, 10),
                total_amount: rates.rate_per_month || '35.000',
                payment_method: 'cash',
                payment_reference: '',
                notes: ''
              });
              setIssueModalOpen(true);
            }}
          >
            <Plus size={14} /> Issue New Prepaid Pass
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-green-bg)',
          color: 'var(--status-green)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-red-bg)',
          color: 'var(--status-red)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Analytics KPI Stat Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* Monthly Collection Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="stat-label">Collected This Month ({stats?.selected_month || 'Current'})</div>
            <div className="stat-value">{formatCurrency(stats?.collected_this_month || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-green)', marginTop: '4px', fontWeight: 600 }}>
              Lifetime Total: {formatCurrency(stats?.total_all_time || 0)}
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-purple">
            <Receipt size={20} />
          </div>
        </div>

        {/* Today's Collection Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="stat-label">Today's Pass Revenue</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {formatCurrency(stats?.collected_today || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Direct Cash & Card Receipts
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-green">
            <Banknote size={20} />
          </div>
        </div>

        {/* Active Passes Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="stat-label">Active Whitelisted Vehicles</div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>
              {stats?.active_passes_count || passes.filter(p => p.status === 'active').length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Auto-open barrier on gates
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-blue">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Expiring Soon Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="stat-label">Expiring in 7 Days</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>
              {stats?.expiring_soon_count || passes.filter(p => p.days_remaining > 0 && p.days_remaining <= 7).length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Eligible for renewal reminder
            </div>
          </div>
          <div className="stat-icon-wrap stat-icon-amber">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'passes' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('passes')}
          style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
        >
          <WalletCards size={14} /> Active & Issued Passes ({passes.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'ledger' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('ledger')}
          style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
        >
          <Receipt size={14} /> Financial & Pass Ledger ({ledger.length})
        </button>
        {selectedPlate && (
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'vehicle' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveSubTab('vehicle')}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
          >
            <Car size={14} /> Vehicle History: {decodeURIComponent(selectedPlate)}
          </button>
        )}
      </div>

      {/* TAB 1: PASSES LIST */}
      {activeSubTab === 'passes' && (
        <DataTable
          title="Prepaid Passes Registry"
          subtitle={`Total passes: ${passes.length}`}
          icon={ShieldCheck}
          columns={[
            {
              key: 'pass_code',
              label: 'PASS CODE',
              render: (p) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem' }}>
                  {p.pass_code}
                </span>
              )
            },
            {
              key: 'plate_number',
              label: 'PLATE NUMBER',
              render: (p) => <span className="plate-badge">{p.plate_number}</span>
            },
            {
              key: 'owner_name',
              label: 'OWNER / DRIVER',
              render: (p) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{p.owner_name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.owner_phone || p.vehicle_type}</div>
                </div>
              )
            },
            {
              key: 'duration_type',
              label: 'PLAN DURATION',
              render: (p) => (
                <div style={{ fontSize: '0.78rem' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p.duration_type}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>({p.total_days} days)</span>
                </div>
              )
            },
            {
              key: 'start_date',
              label: 'VALIDITY PERIOD',
              render: (p) => (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <div>From: {p.start_date?.substring(0, 10)}</div>
                  <div>To: {p.expiry_date?.substring(0, 10)}</div>
                </div>
              )
            },
            {
              key: 'days_remaining',
              label: 'DAYS LEFT',
              render: (p) => {
                const isExpiringSoon = p.days_remaining > 0 && p.days_remaining <= 7;
                return p.status === 'active' ? (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: isExpiringSoon ? 'var(--status-amber-bg)' : 'var(--status-green-bg)',
                    color: isExpiringSoon ? 'var(--status-amber)' : 'var(--status-green)',
                    border: `1px solid ${isExpiringSoon ? 'var(--status-amber-border)' : 'var(--status-green-border)'}`
                  }}>
                    {p.days_remaining}d left
                  </span>
                ) : (
                  <span className="badge badge-gray">Expired</span>
                );
              }
            },
            {
              key: 'total_amount',
              label: 'AMOUNT PAID',
              render: (p) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {formatCurrency(p.total_amount)}
                </span>
              )
            },
            {
              key: 'payment_method',
              label: 'PAY METHOD',
              render: (p) => (
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {p.payment_method === 'qr_benefitpay' ? 'BenefitPay' : p.payment_method}
                </span>
              )
            },
            {
              key: 'status',
              label: 'STATUS',
              render: (p) => (
                <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                  {p.status}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'ACTIONS',
              sortable: false,
              exportable: false,
              align: 'right',
              render: (p) => (
                <div style={{ display: 'inline-flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setRenewTarget(p);
                      setRenewDurationValue(1);
                      setRenewModalOpen(true);
                    }}
                    title="Renew / Extend Pass"
                  >
                    <RotateCcw size={13} /> Renew
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => inspectVehicleHistory(p.plate_number)}
                    title="Inspect Vehicle Ledger History"
                  >
                    <Eye size={13} /> Ledger
                  </button>
                </div>
              )
            }
          ]}
          data={passes}
          loading={loading}
          exportable={true}
          exportFileName="prepaid_passes"
          searchPlaceholder="Search by pass code, plate number, owner, or status..."
          emptyMessage="No prepaid parking passes found. Click 'Issue New Prepaid Pass' to register a vehicle."
          headerActions={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="form-select"
                value={passStatusFilter}
                onChange={(e) => setPassStatusFilter(e.target.value)}
                style={{ fontSize: '0.75rem', width: 'auto', padding: '4px 22px 4px 8px' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="expired">Expired</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadData} title="Refresh passes">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          }
        />
      )}

      {/* TAB 2: FINANCIAL LEDGER */}
      {activeSubTab === 'ledger' && (
        <DataTable
          title="Prepaid Parking Collections & Audit Ledger"
          subtitle={`Showing records for ${ledgerMonth || 'All Time'} • Revenue: ${formatCurrency(ledger.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0))}`}
          icon={Receipt}
          columns={[
            {
              key: 'receipt_number',
              label: 'RECEIPT #',
              render: (l) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem' }}>
                  {l.receipt_number}
                </span>
              )
            },
            {
              key: 'created_at',
              label: 'TRANSACTION DATE',
              render: (l) => (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {l.created_at}
                </span>
              )
            },
            {
              key: 'plate_number',
              label: 'PLATE NUMBER',
              render: (l) => (
                <span 
                  className="plate-badge" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => inspectVehicleHistory(l.plate_number)}
                  title="View this vehicle's complete ledger"
                >
                  {l.plate_number}
                </span>
              )
            },
            {
              key: 'owner_name',
              label: 'OWNER NAME',
              render: (l) => <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{l.owner_name}</span>
            },
            {
              key: 'transaction_type',
              label: 'TYPE',
              render: (l) => (
                <span className={`badge ${l.transaction_type === 'NEW_PASS' ? 'badge-blue' : 'badge-green'}`}>
                  {l.transaction_type}
                </span>
              )
            },
            {
              key: 'period_start',
              label: 'COVERAGE PERIOD',
              render: (l) => (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {l.period_start?.substring(0, 10)} to {l.period_end?.substring(0, 10)} ({l.days_added}d)
                </span>
              )
            },
            {
              key: 'payment_method',
              label: 'PAY METHOD',
              render: (l) => (
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {l.payment_method === 'qr_benefitpay' ? 'BenefitPay' : l.payment_method?.toUpperCase()}
                </span>
              )
            },
            {
              key: 'payment_ref',
              label: 'REFERENCE',
              render: (l) => (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {l.payment_ref || '-'}
                </span>
              )
            },
            {
              key: 'collected_by',
              label: 'COLLECTED BY',
              render: (l) => (
                <span style={{ fontSize: '0.74rem' }}>
                  {l.collected_by || 'Cashier'}
                </span>
              )
            },
            {
              key: 'amount',
              label: 'AMOUNT',
              align: 'right',
              render: (l) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatCurrency(l.amount)}
                </span>
              )
            }
          ]}
          data={ledger}
          loading={loading}
          exportable={true}
          exportFileName={`prepaid_ledger_${ledgerMonth || 'all'}`}
          searchPlaceholder="Search receipt #, plate number, owner, or cashier..."
          emptyMessage="No ledger transactions found for the selected period."
          headerActions={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Month:</span>
                <input
                  type="month"
                  className="form-input"
                  value={ledgerMonth}
                  onChange={(e) => setLedgerMonth(e.target.value)}
                  style={{ width: '130px', fontSize: '0.74rem', padding: '4px 8px' }}
                />
              </div>

              <select
                className="form-select"
                value={ledgerMethod}
                onChange={(e) => setLedgerMethod(e.target.value)}
                style={{ fontSize: '0.74rem', width: 'auto', padding: '4px 22px 4px 8px' }}
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="qr_benefitpay">BenefitPay / QR</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>

              <button className="btn btn-outline btn-sm" onClick={loadData} title="Refresh ledger">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          }
        />
      )}

      {/* TAB 3: VEHICLE SPECIFIC HISTORY */}
      {activeSubTab === 'vehicle' && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={16} color="var(--accent)" />
              <span>Vehicle Ledger History: {decodeURIComponent(selectedPlate || '')}</span>
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveSubTab('passes')}>
              Back to Passes
            </button>
          </div>
          <div className="panel-body" style={{ padding: '16px' }}>
            {historyLoading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={18} className="animate-spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
                <div>Loading vehicle financial history...</div>
              </div>
            ) : vehicleHistory ? (
              <div>
                {/* Vehicle Financial Summary - 4 Elegant Stat Cards */}
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="stat-label">Vehicle License Plate</div>
                      <div style={{ marginTop: '4px' }}>
                        <span className="plate-badge" style={{ fontSize: '1rem', fontWeight: 800, padding: '4px 10px' }}>
                          {decodeURIComponent(vehicleHistory.plate_number || selectedPlate || '')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Registered Whitelist Vehicle
                      </div>
                    </div>
                    <div className="stat-icon-wrap stat-icon-blue">
                      <Car size={20} />
                    </div>
                  </div>

                  <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="stat-label">Lifetime Revenue Paid</div>
                      <div className="stat-value" style={{ color: '#10b981' }}>
                        {vehicleHistory.formatted_total_paid || formatCurrency(vehicleHistory.total_paid || 0)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        All prepaid collections
                      </div>
                    </div>
                    <div className="stat-icon-wrap stat-icon-green">
                      <Banknote size={20} />
                    </div>
                  </div>

                  <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="stat-label">Total Passes Issued</div>
                      <div className="stat-value">
                        {vehicleHistory.passes?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Active & past duration plans
                      </div>
                    </div>
                    <div className="stat-icon-wrap stat-icon-purple">
                      <WalletCards size={20} />
                    </div>
                  </div>

                  <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="stat-label">Gate Entries Logged</div>
                      <div className="stat-value">
                        {vehicleHistory.sessions?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        ANPR automated gate visits
                      </div>
                    </div>
                    <div className="stat-icon-wrap stat-icon-amber">
                      <Clock size={20} />
                    </div>
                  </div>
                </div>

                {/* Vehicle Ledger Table */}
                <div style={{ marginBottom: '20px' }}>
                  <DataTable
                    title="Ledger Transactions & Payment Receipts"
                    icon={Receipt}
                    defaultPageSize={10}
                    exportable={true}
                    exportFileName={`vehicle_ledger_${selectedPlate}`}
                    columns={[
                      {
                        key: 'receipt_number',
                        label: 'RECEIPT #',
                        render: (l) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{l.receipt_number}</span>
                      },
                      {
                        key: 'created_at',
                        label: 'DATE',
                        render: (l) => <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{l.created_at}</span>
                      },
                      {
                        key: 'transaction_type',
                        label: 'TRANSACTION',
                        render: (l) => <span className="badge badge-green">{l.transaction_type}</span>
                      },
                      {
                        key: 'duration_type',
                        label: 'PLAN',
                        render: (l) => <span style={{ textTransform: 'capitalize' }}>{l.duration_type}</span>
                      },
                      {
                        key: 'period_start',
                        label: 'PERIOD',
                        render: (l) => (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {l.period_start?.substring(0, 10)} to {l.period_end?.substring(0, 10)}
                          </span>
                        )
                      },
                      {
                        key: 'payment_method',
                        label: 'METHOD',
                        render: (l) => <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{l.payment_method?.toUpperCase()}</span>
                      },
                      {
                        key: 'amount',
                        label: 'AMOUNT',
                        align: 'right',
                        render: (l) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatCurrency(l.amount)}</span>
                      }
                    ]}
                    data={vehicleHistory.ledger || []}
                    emptyMessage="No ledger records for this vehicle."
                    searchPlaceholder="Search vehicle receipts..."
                  />
                </div>

                {/* Gate Entry Sessions */}
                <div style={{ marginBottom: '10px' }}>
                  <DataTable
                    title="Recent Parking Gate Visits"
                    icon={Car}
                    defaultPageSize={10}
                    exportable={true}
                    exportFileName={`gate_visits_${selectedPlate}`}
                    columns={[
                      {
                        key: 'session_code',
                        label: 'SESSION CODE',
                        render: (s) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s.session_code}</span>
                      },
                      {
                        key: 'entry_time',
                        label: 'ENTRY TIME',
                        render: (s) => <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{s.entry_time}</span>
                      },
                      {
                        key: 'exit_time',
                        label: 'EXIT TIME',
                        render: (s) => <span style={{ fontSize: '0.74rem' }}>{s.exit_time || 'Currently Parked'}</span>
                      },
                      {
                        key: 'status',
                        label: 'STATUS',
                        render: (s) => <span className="badge badge-green">{s.status}</span>
                      },
                      {
                        key: 'total_duration_minutes',
                        label: 'DURATION',
                        render: (s) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{s.total_duration_minutes}m</span>
                      },
                      {
                        key: 'net_amount',
                        label: 'NET FEE',
                        align: 'right',
                        render: (s) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatCurrency(s.net_amount)}</span>
                      }
                    ]}
                    data={vehicleHistory.sessions || []}
                    emptyMessage="No gate visits recorded."
                    searchPlaceholder="Search gate visit sessions..."
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: ISSUE NEW PREPAID PASS */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue New Prepaid Parking Pass & Whitelist Vehicle"
      >
        <form onSubmit={handleIssueSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Plate Number *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. BHR 55443"
                value={issueForm.plate_number}
                onChange={(e) => setIssueForm({ ...issueForm, plate_number: e.target.value.toUpperCase() })}
                style={{ fontWeight: 700, letterSpacing: '0.05em' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select
                className="form-select"
                value={issueForm.vehicle_type}
                onChange={(e) => setIssueForm({ ...issueForm, vehicle_type: e.target.value })}
              >
                <option value="Sedan">Sedan / Hatchback</option>
                <option value="SUV">SUV / 4x4</option>
                <option value="Staff">Hospital Staff Car</option>
                <option value="Doctor">Doctor / Consultant</option>
                <option value="Patient">Frequent Patient</option>
                <option value="Vendor">Vendor / Contractor</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Owner / Driver Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Salman Al-Ghatam"
                value={issueForm.owner_name}
                onChange={(e) => setIssueForm({ ...issueForm, owner_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Contact Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +973 3988 1122"
                value={issueForm.owner_phone}
                onChange={(e) => setIssueForm({ ...issueForm, owner_phone: e.target.value })}
              />
            </div>
          </div>

          {/* Pass Duration Settings */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Pass Duration & Coverage
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={issueForm.start_date}
                  onChange={(e) => setIssueForm({ ...issueForm, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Duration Type *</label>
                <select
                  className="form-select"
                  value={issueForm.duration_type}
                  onChange={(e) => setIssueForm({ ...issueForm, duration_type: e.target.value })}
                >
                  <option value="day">Day(s) Pass</option>
                  <option value="week">Week(s) Pass</option>
                  <option value="month">Month(s) Pass</option>
                  <option value="custom">Custom Days</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Number of Units *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="form-input"
                  value={issueForm.duration_value}
                  onChange={(e) => setIssueForm({ ...issueForm, duration_value: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            {calculatedCost && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                background: 'rgba(37, 99, 235, 0.12)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--status-blue)'
              }}>
                <span>Total Days: <strong>{calculatedCost.total_days} Days</strong></span>
                <span>Standard Rate: <strong>{formatCurrency(calculatedCost.total_amount)}</strong></span>
              </div>
            )}
          </div>

          {/* Payment Collection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Amount Collected ({settings.currency_code}) *</label>
              <input
                type="number"
                step="0.001"
                className="form-input"
                value={issueForm.total_amount}
                onChange={(e) => setIssueForm({ ...issueForm, total_amount: e.target.value })}
                style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                className="form-select"
                value={issueForm.payment_method}
                onChange={(e) => setIssueForm({ ...issueForm, payment_method: e.target.value })}
              >
                <option value="cash">Cash Collection</option>
                <option value="qr_benefitpay">BenefitPay / QR Code</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Wire Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Reference / Txn ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Benefit Ref / POS Auth Code"
              value={issueForm.payment_reference}
              onChange={(e) => setIssueForm({ ...issueForm, payment_reference: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Processing...' : 'Issue Pass & Whitelist Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RENEW PASS */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title={`Renew Prepaid Pass: ${renewTarget?.plate_number}`}
      >
        {renewTarget && (
          <form onSubmit={handleRenewSubmit}>
            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.78rem' }}>
              <div>Owner: <strong>{renewTarget.owner_name}</strong></div>
              <div>Current Expiry Date: <strong style={{ color: 'var(--accent)' }}>{renewTarget.expiry_date}</strong></div>
              <div>Pass Type: <strong style={{ textTransform: 'capitalize' }}>{renewTarget.duration_type} Pass</strong></div>
            </div>

            <div className="form-group">
              <label className="form-label">Extend By ({renewTarget.duration_type}s) *</label>
              <input
                type="number"
                min="1"
                max="12"
                className="form-input"
                value={renewDurationValue}
                onChange={(e) => setRenewDurationValue(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            {renewCost && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '0.75rem',
                color: 'var(--status-green)',
                fontWeight: 600
              }}>
                Renewal Amount to Collect: {formatCurrency(renewCost.total_amount)} (+{renewCost.total_days} Days)
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                className="form-select"
                value={renewPaymentMethod}
                onChange={(e) => setRenewPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="qr_benefitpay">BenefitPay / QR</option>
                <option value="card">Credit/Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Reference</label>
              <input
                type="text"
                className="form-input"
                placeholder="Reference # or Auth code"
                value={renewPaymentRef}
                onChange={(e) => setRenewPaymentRef(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setRenewModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={renewing}>
                {renewing ? 'Renewing...' : 'Confirm Renewal & Extend Whitelist'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: PAYMENT RECEIPT */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Prepaid Parking Receipt & Pass Confirmation"
      >
        {currentReceipt && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--status-green-bg)',
                color: 'var(--status-green)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Prepaid Pass Activated</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Vehicle automatically whitelisted for barrier auto-open</p>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              fontSize: '0.78rem',
              lineHeight: 1.6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receipt Number:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReceipt.receipt_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pass Code:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReceipt.pass_code}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
                <strong className="plate-badge">{currentReceipt.plate_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Owner:</span>
                <strong>{currentReceipt.owner_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Valid Period:</span>
                <strong>{currentReceipt.start_date?.substring(0, 10)} to {currentReceipt.expiry_date?.substring(0, 10)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Days:</span>
                <strong>{currentReceipt.total_days} Days</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount Collected:</span>
                <strong style={{ fontSize: '1rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {currentReceipt.formatted_amount}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setReceiptModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
