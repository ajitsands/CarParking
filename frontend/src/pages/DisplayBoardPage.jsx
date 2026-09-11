import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Wifi,
  WifiOff,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Car,
  Clock,
  DollarSign,
  QrCode,
  Settings,
  Info,
  Zap,
  Eye,
  Activity,
  Download,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  } catch { return isoStr; }
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatusBadge({ state }) {
  const cfg = {
    IDLE:             { label: 'IDLE',              bg: 'rgba(100,116,139,0.15)', color: '#94a3b8',  border: 'rgba(100,116,139,0.3)' },
    FREE_EXIT:        { label: 'FREE / PAID EXIT',  bg: 'rgba(34,197,94,0.12)',  color: '#4ade80',  border: 'rgba(34,197,94,0.3)'  },
    PAYMENT_REQUIRED: { label: 'PAYMENT REQUIRED',  bg: 'rgba(239,68,68,0.12)',  color: '#f87171',  border: 'rgba(239,68,68,0.3)'  },
  }[state] || { label: state, bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }} />
      {cfg.label}
    </span>
  );
}

// ── Live Kiosk Status Monitor ─────────────────────────────────────────────────

function LiveKioskMonitor({ gateId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastPoll, setLastPoll] = useState(null);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/kiosk/status?gate_id=${encodeURIComponent(gateId)}`);
      const json = await res.json();
      setStatus(json.data || json);
      setError(null);
      setLastPoll(new Date());
    } catch (e) {
      setError(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, [gateId]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
        Polling gate status…
      </div>
    );
  }

  const [submitting, setSubmitting] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState(null);

  const handleCounterCheckout = async (method) => {
    if (!status?.session_id) return;
    setSubmitting(true);
    setCheckoutMsg(null);
    try {
      const reasonMap = {
        cash: 'Cash collected by cashier at exit gate',
        card: 'Card / POS payment collected at exit gate',
        waived: 'Fee waived by operator at exit gate'
      };
      await api.completeSessionExit(status.session_id, {
        cash_payment: method === 'cash',
        payment_method: method,
        gate_id: gateId,
        reason: reasonMap[method] || 'Counter payment'
      });
      setCheckoutMsg({ 
        type: 'success', 
        text: `✓ Payment (${method.toUpperCase()}) collected successfully! Boom barrier opened & Kiosk display updated to SUCCESS.` 
      });
      await poll();
    } catch (err) {
      setCheckoutMsg({ type: 'error', text: err.message || 'Failed to complete counter checkout' });
    } finally {
      setSubmitting(false);
    }
  };

  const ds = status?.display_state || 'IDLE';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: error ? '#ef4444' : '#22c55e',
            boxShadow: `0 0 8px ${error ? '#ef4444' : '#22c55e'}`,
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '0.8rem', color: error ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
            {error ? `Error: ${error}` : 'Live — polling every 3s'}
          </span>
        </div>
        {lastPoll && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Last update: {lastPoll.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Current State Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            CURRENT DISPLAY STATE
          </div>
          <StatusBadge state={ds} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Gate ID</div>
          <code style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>{gateId}</code>
        </div>
      </div>

      {/* Vehicle Details (if any) */}
      {status?.has_vehicle && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          {[
            { label: 'Plate', value: status.plate_number, icon: Car },
            { label: 'Entry', value: formatDateTime(status.entry_time), icon: Clock },
            { label: 'Duration', value: formatDuration(status.duration_minutes), icon: Activity },
            { label: 'Amount', value: status.formatted_amount || `${status.currency_symbol || 'BD'} ${Number(status.amount_due || 0).toFixed(3)}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <Icon size={12} color="var(--text-muted)" />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cashier Counter Manual Payment & Gate Clearance */}
      {status?.has_vehicle && status?.session_id && (ds === 'PAYMENT_REQUIRED' || Number(status.amount_due || 0) > 0) && (
        <div style={{
          marginTop: '14px',
          background: 'rgba(37, 99, 235, 0.05)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="#2563eb" />
              Cashier Counter Payment (No QR / Cash / POS)
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Amount Due: <strong style={{ color: '#ec4899', fontSize: '0.98rem' }}>{status.formatted_amount || `${status.currency_symbol || 'BD'} ${Number(status.amount_due || 0).toFixed(3)}`}</strong>
            </span>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
            If the driver does not have a QR payment app or cannot scan the kiosk screen, collect payment at the counter below. The barrier will open immediately and the display unit will show <strong>SUCCESS / HAVE A SAFE TRIP</strong>.
          </p>

          {checkoutMsg && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              marginBottom: '12px',
              fontWeight: 600,
              background: checkoutMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: checkoutMsg.type === 'success' ? '#16a34a' : '#dc2626',
              border: `1px solid ${checkoutMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {checkoutMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-success btn-sm"
              onClick={() => handleCounterCheckout('cash')}
              disabled={submitting}
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <DollarSign size={14} />
              {submitting ? 'Processing...' : 'Collect Cash & Open Gate'}
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleCounterCheckout('card')}
              disabled={submitting}
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CreditCard size={14} />
              {submitting ? 'Processing...' : 'Collect Card / POS & Open Gate'}
            </button>

            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleCounterCheckout('waived')}
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={14} />
              Waive Fee & Open Gate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kiosk Simulator ───────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Patient (Paying)', plate: 'BHR 43210', gate: 'GATE-OUT-01', note: 'Standard parking fee — shows payment screen + QR' },
  { label: 'Doctor (Whitelisted)', plate: 'BHR 11223', gate: 'GATE-OUT-01', note: 'Whitelist — free exit, gate opens immediately' },
  { label: 'Short Stay (Grace)', plate: 'BHR 77777', gate: 'GATE-OUT-01', note: 'Within grace period — shows FREE EXIT screen' },
];

function KioskSimulator() {
  const [plate, setPlate] = useState('BHR 43210');
  const [gate, setGate] = useState('GATE-OUT-01');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSimulate = async () => {
    if (!plate.trim()) { setError('Plate number is required'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.kioskSimulateApproach({ gate_id: gate, plate_number: plate.trim() });
      setResult(res);
    } catch (e) {
      setError(e.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
        Simulates a vehicle approaching the exit gate. The kiosk display board app will immediately reflect the new state on the next poll (within 2–3 seconds).
      </p>

      {/* Quick Presets */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
          Quick Presets
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          {PRESETS.map((p, i) => (
            <button key={i} className="btn btn-outline btn-sm"
              onClick={() => { setPlate(p.plate); setGate(p.gate); }}
              title={p.note}
            >
              <Car size={12} /> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Vehicle Plate *</label>
          <input className="form-input" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="e.g. BHR 43210" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Exit Gate ID</label>
          <input className="form-input" value={gate} onChange={e => setGate(e.target.value.toUpperCase())} placeholder="GATE-OUT-01" />
        </div>
      </div>

      <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleSimulate} disabled={loading}>
        {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
        {loading ? 'Simulating ANPR Approach…' : 'Simulate Vehicle at Exit Gate'}
      </button>

      {error && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--status-red-bg)', color: 'var(--status-red)', border: '1px solid var(--status-red-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <XCircle size={15} /> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '12px', padding: '14px',
          background: result.data?.is_free ? 'var(--status-green-bg)' : 'var(--status-orange-bg, rgba(251,191,36,0.08))',
          border: `1px solid ${result.data?.is_free ? 'var(--status-green-border)' : 'rgba(251,191,36,0.3)'}`,
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {result.data?.is_free
              ? <CheckCircle2 size={17} color="var(--status-green)" />
              : <AlertCircle size={17} color="#fbbf24" />
            }
            <strong style={{ fontSize: '0.83rem', color: result.data?.is_free ? 'var(--status-green)' : '#fbbf24' }}>
              {result.data?.display_state === 'FREE_EXIT' ? '✅ FREE EXIT — Gate Opened' : '⚠️ PAYMENT REQUIRED — Kiosk displays fee'}
            </strong>
          </div>
          <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {result.message || result.data?.message}
          </p>
          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '8px', borderRadius: '6px', fontFamily: 'var(--font-mono)', maxHeight: '120px', overflowY: 'auto' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Setup Guide ───────────────────────────────────────────────────────────────

function SetupGuide() {
  const steps = [
    {
      step: '1',
      title: 'Install Expo Go',
      desc: 'Download "Expo Go" from Google Play Store on the Android tablet/phone that will be mounted at the exit gate.',
      icon: Smartphone,
      color: '#3b82f6'
    },
    {
      step: '2',
      title: 'Connect to Same Network',
      desc: 'Ensure the device and this PC are on the same WiFi/LAN network. Check your PC IP with ipconfig.',
      icon: Wifi,
      color: '#8b5cf6'
    },
    {
      step: '3',
      title: 'Scan QR Code',
      desc: 'Open Expo Go app → tap "Enter URL manually" and enter exp://192.168.8.11:8081 or scan the QR from the terminal window running expo start.',
      icon: QrCode,
      color: '#ec4899'
    },
    {
      step: '4',
      title: 'Configure Gate',
      desc: 'In the Display Board app, set Local URL to this server\'s IP:8080, set the Gate ID (e.g. GATE-OUT-01), then tap Launch Kiosk Display.',
      icon: Settings,
      color: '#f59e0b'
    },
    {
      step: '5',
      title: 'Test with Simulator',
      desc: 'Use the Kiosk Simulator tab above to push a vehicle to the exit gate. Watch the display board react within 2–3 seconds.',
      icon: Play,
      color: '#22c55e'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {steps.map(({ step, title, desc, icon: Icon, color }) => (
        <div key={step} style={{
          display: 'flex', gap: '14px', alignItems: 'flex-start',
          padding: '14px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          borderLeft: `3px solid ${color}`
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `${color}20`, border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={16} color={color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em',
                background: `${color}20`, color, border: `1px solid ${color}40`,
                padding: '1px 7px', borderRadius: '999px'
              }}>STEP {step}</span>
              <strong style={{ fontSize: '0.83rem', color: 'var(--text-primary)' }}>{title}</strong>
            </div>
            <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Connection Info Cards ─────────────────────────────────────────────────────

function ConnectionInfo() {
  const [localIp, setLocalIp] = useState('192.168.8.11');

  const cards = [
    {
      label: 'Metro Bundler (Expo Dev)',
      value: `exp://${localIp}:8081`,
      sub: 'Enter this in Expo Go app',
      icon: Smartphone,
      color: '#3b82f6',
      copy: `exp://${localIp}:8081`
    },
    {
      label: 'Backend API (Local WiFi)',
      value: `http://${localIp}:8080`,
      sub: 'Enter as Local URL in Display Board setup',
      icon: Wifi,
      color: '#8b5cf6',
      copy: `http://${localIp}:8080`
    },
    {
      label: 'Kiosk Status Endpoint',
      value: `/api/v1/kiosk/status?gate_id=GATE-OUT-01`,
      sub: 'Polled every 2s by the display board app',
      icon: Activity,
      color: '#ec4899',
      copy: `http://${localIp}:8080/api/v1/kiosk/status?gate_id=GATE-OUT-01`
    }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Info size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Edit Local IP if different:
        </span>
        <input
          className="form-input"
          style={{ width: '150px', padding: '4px 10px', fontSize: '0.8rem' }}
          value={localIp}
          onChange={e => setLocalIp(e.target.value)}
          placeholder="192.168.x.x"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cards.map(({ label, value, sub, icon: Icon, color, copy }) => (
          <div key={label} style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '8px',
              background: `${color}15`, border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icon size={16} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
              <code style={{
                fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 700,
                display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>{value}</code>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ flexShrink: 0, padding: '4px 10px', fontSize: '0.72rem' }}
              onClick={() => copyToClipboard(copy)}
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Download APK Section ──────────────────────────────────────────────────────

function DownloadApkSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Download Hero Card */}
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(59, 130, 246, 0.12))',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}>
              STANDALONE RELEASE v1.0.0
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Android 8.0+ (Phones, Tablets & Smart Displays)</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Parking Display Board App (APK)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Install directly on any Android device at exit gates. Built-in setup screen allows configuring Server URL, Gate ID, Brightness, and Display Timers directly on device.
          </p>
        </div>

        <a
          href="/downloads/ParkingDisplayBoard.apk"
          download="ParkingDisplayBoard.apk"
          className="btn btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            border: 'none',
            textDecoration: 'none',
            color: '#fff',
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
          }}
        >
          <Download size={18} /> Download APK (85 MB)
        </a>
      </div>

      {/* 4 Step Setup Guide for New Devices */}
      <div className="card" style={{ padding: '18px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={16} color="#60a5fa" /> How to Install & Configure on Any New Android Device:
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#60a5fa', marginBottom: '4px' }}>1. DOWNLOAD & INSTALL</div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Download <code>ParkingDisplayBoard.apk</code> via device browser or USB, tap to install, and allow <em>Unknown sources</em> if prompted.
            </p>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', marginBottom: '4px' }}>2. ENTER SERVER & GATE ID</div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Open app &rarr; In <strong>Display Board Setup</strong>, enter your Server IP (e.g. <code>http://192.168.8.11:8081</code>) and Gate ID (e.g. <code>GATE-OUT-01</code>).
            </p>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34d399', marginBottom: '4px' }}>3. TEST & LAUNCH</div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Tap <strong>Test Connection</strong> to confirm green status, then tap <strong>🚀 Launch Kiosk Display</strong>.
            </p>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>4. AUTO-ROTATE & ADMIN GESTURE</div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Supports Portrait and Landscape. To re-open Settings from kiosk screen anytime, <strong>tap the screen 5 times rapidly</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DisplayBoardPage() {
  const [activeSection, setActiveSection] = useState('apk');
  const [monitorGate, setMonitorGate] = useState('GATE-OUT-01');

  const sections = [
    { id: 'apk',       label: 'Download APK',   icon: Download },
    { id: 'monitor',   label: 'Live Monitor',   icon: Eye },
    { id: 'simulator', label: 'Kiosk Simulator', icon: Zap },
    { id: 'setup',     label: 'Setup Guide',     icon: Info },
    { id: 'connect',   label: 'Connection Info', icon: Wifi },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Monitor size={22} color="#818cf8" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Exit Gate Display Board
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Android kiosk app management — monitor, simulate & configure
          </p>
        </div>

        {/* Gate selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monitor Gate:</span>
          <input
            className="form-input"
            style={{ width: '140px', padding: '5px 10px', fontSize: '0.8rem' }}
            value={monitorGate}
            onChange={e => setMonitorGate(e.target.value.toUpperCase())}
            placeholder="GATE-OUT-01"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '20px'
      }}>
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '7px 12px', gap: '6px', justifyContent: 'center', fontSize: '0.78rem' }}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content Panel */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '22px'
      }}>
        {activeSection === 'apk' && <DownloadApkSection />}
        {activeSection === 'monitor' && <LiveKioskMonitor gateId={monitorGate} />}
        {activeSection === 'simulator' && <KioskSimulator />}
        {activeSection === 'setup' && <SetupGuide />}
        {activeSection === 'connect' && <ConnectionInfo />}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: '16px', padding: '10px 14px',
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '8px',
        display: 'flex', gap: '8px', alignItems: 'flex-start'
      }}>
        <Info size={14} color="#60a5fa" style={{ marginTop: '1px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Display Board App</strong> is a React Native (Expo) app located in <code>display-app/</code>.
          Run it with <code>npx expo start --go</code> and scan the QR code with Expo Go on your Android device.
          The app polls <code>GET /api/v1/kiosk/status</code> every 2 seconds to show real-time vehicle state at the exit gate.
        </p>
      </div>
    </div>
  );
}
