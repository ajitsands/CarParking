import React, { useState } from 'react';
import { Key, ShieldAlert, CheckCircle2, AlertCircle, ExternalLink, Globe, Server, RefreshCw, LogOut } from 'lucide-react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

export default function LicenseLockModal() {
  const { license, refreshSettings } = useSettings();
  const { logout, user } = useAuth();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentDomain = window.location.hostname || 'localhost';

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Please enter your SaNDS Lab License Key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.activateLicense({
        license_key: licenseKey.trim(),
        domain_name: currentDomain
      });

      if (res.success) {
        setSuccessMsg(res.message || 'License successfully activated!');
        setTimeout(() => {
          refreshSettings();
        }, 1200);
      } else {
        setError(res.error || res.message || 'License activation failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to SaNDS Lab Key Server (https://key.sandslab.com)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(236, 72, 153, 0.25)',
        overflow: 'hidden',
        border: '1px solid rgba(236, 72, 153, 0.3)'
      }}>
        {/* Header with gradient banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ec4899 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
            }}>
              <Key size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  SaNDS Lab Software License
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: license?.status === 'expired' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(236, 72, 153, 0.25)',
                  color: license?.status === 'expired' ? '#f87171' : '#f472b6',
                  border: '1px solid rgba(236, 72, 153, 0.4)'
                }}>
                  {license?.status === 'expired' ? 'LICENSE EXPIRED' : 'ACTIVATION REQUIRED'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                Online activation & cryptographic offline verification via <a href="https://key.sandslab.com/public/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>key.sandslab.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px' }}>
          {license?.message && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Access Restricted:</strong> {license.message}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#059669',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div><strong>{successMsg}</strong> — Unlocking system now...</div>
            </div>
          )}

          {/* System Host Info */}
          <div style={{
            background: 'var(--bg-input, rgba(0,0,0,0.03))',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            color: 'var(--text-secondary, #64748b)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} color="#ec4899" />
              <span>Target Domain: <strong>{currentDomain}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={14} color="#2563eb" />
              <span>Server Port: <strong>{window.location.port || '80'}</strong></span>
            </div>
          </div>

          <form onSubmit={handleActivate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-primary, #1e293b)',
                marginBottom: '8px'
              }}>
                Enter SaNDS Lab License Key:
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="e.g. INV-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(236, 72, 153, 0.4)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '1px',
                  outline: 'none',
                  background: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-primary, #0f172a)'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ec4899 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.35)',
                  transition: 'opacity 0.2s'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Validating with Key Server...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Activate Software License
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={logout}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Logout from system"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </form>

          {/* Footer documentation info */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted, #94a3b8)'
          }}>
            <span>Logged in as: <strong>{user?.username || 'User'}</strong> ({user?.role || 'Operator'})</span>
            <a
              href="https://key.sandslab.com/public/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Key Server API Docs
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
