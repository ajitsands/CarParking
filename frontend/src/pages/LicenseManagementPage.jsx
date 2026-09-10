import React, { useState } from 'react';
import { 
  ShieldCheck, Clock, Key, Calendar, AlertTriangle, CheckCircle2, 
  ExternalLink, Globe, Server, RefreshCw, Lock, Unlock, ShieldAlert, Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function LicenseManagementPage() {
  const { license, refreshSettings } = useSettings();
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const currentDomain = window.location.hostname || 'localhost';

  const handleActivateNewKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) {
      setError('Please enter a valid License Key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.activateLicense({
        license_key: newKey.trim(),
        domain_name: currentDomain
      });

      if (res.success) {
        setSuccessMsg(res.message || 'License successfully activated!');
        setNewKey('');
        refreshSettings();
      } else {
        setError(res.error || res.message || 'Activation failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to SaNDS Lab Key Server (https://key.sandslab.com)');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate the current license? The application will be locked until a new valid key is activated.')) {
      return;
    }

    setDeactivating(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.deactivateLicense();
      if (res.success) {
        setSuccessMsg('License has been deactivated.');
        refreshSettings();
      }
    } catch (err) {
      setError(err.message || 'Failed to deactivate license');
    } finally {
      setDeactivating(false);
    }
  };

  const daysRemaining = license?.days_remaining ?? 0;
  const isExpiringSoon = daysRemaining <= 30;
  const isExpired = license?.status !== 'active' || daysRemaining <= 0 || !license?.is_valid;

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            SaNDS Lab Software License & Activation
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Cryptographically signed license validation powered by <a href="https://key.sandslab.com/public/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>key.sandslab.com</a>
          </p>
        </div>

        <a
          href="https://key.sandslab.com/public/docs"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.12)',
            color: '#2563eb',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            textDecoration: 'none'
          }}
        >
          <ExternalLink size={13} />
          Key Server Documentation
        </a>
      </div>

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-green-bg)',
          color: 'var(--status-green)',
          border: '1px solid var(--status-green-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.84rem'
        }}>
          <CheckCircle2 size={16} />
          <strong>{successMsg}</strong>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-red-bg)',
          color: 'var(--status-red)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} />
          <div>{error}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Status Card */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <ShieldCheck size={16} color="#ec4899" /> Active License Specifications
            </span>
            <span className={`badge ${!isExpired ? (isExpiringSoon ? 'badge-amber' : 'badge-green') : 'badge-red'}`}>
              {license?.status ? license.status.toUpperCase() : 'UNLICENSED'}
            </span>
          </div>
          <div className="panel-body">
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Validity Remaining
              </span>
              <div style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                color: !isExpired ? (isExpiringSoon ? 'var(--status-amber)' : 'var(--status-green)') : 'var(--status-red)',
                lineHeight: 1.1,
                margin: '8px 0'
              }}>
                {daysRemaining} Days
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {isExpired ? 'Access expired. Please activate a new license key.' : `Licensed through ${license?.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'N/A'}`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Key:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {license?.license_key ? `${license.license_key.slice(0, 8)}••••••••••••` : 'None installed'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Issued To:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {license?.issued_to || 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Bound Domain:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-blue)' }}>
                  {license?.domain_name || currentDomain}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Verification Model:</span>
                <span style={{ color: 'var(--status-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Asymmetric RSA-SHA256
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Max Supported Lanes:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {license?.max_lanes ?? 10} Lanes
                </span>
              </div>
            </div>

            {license?.is_valid && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Unlock size={14} />
                  Deactivate Current License
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activation Form */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <Key size={16} color="#2563eb" /> Activate / Update License Key
            </span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Exchange an official SaNDS Lab License Key for a cryptographically signed offline verification token.
            </p>

            <form onSubmit={handleActivateNewKey}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>
                  New License Key:
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="INV-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem'
                  }}
                  required
                />
              </div>

              <div style={{
                background: 'var(--bg-input)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Globe size={13} color="#ec4899" />
                  <span>Activation Host Domain: <strong>{currentDomain}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={13} color="#2563eb" />
                  <span>Key Server Endpoint: <strong>https://key.sandslab.com/public/api/activate</strong></span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newKey.trim()}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Validating with Key Server...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Activate License Key
                  </>
                )}
              </button>
            </form>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: '#2563eb', display: 'block', marginBottom: '4px' }}>
                Offline Asymmetric Security Model:
              </strong>
              The activation key server signs your domain and expiry into an RSA token. The application validates this token locally without sending requests on every page load.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
