import React, { useState } from 'react';
import { ShieldCheck, Clock, Plus, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function LicenseManagementPage() {
  const { license, refreshSettings } = useSettings();
  const [exactDate, setExactDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleExtend = async (days) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.extendLicense(days);
      if (res.success) {
        setSuccessMsg(`Software expiry duration successfully extended by ${days} days!`);
        refreshSettings();
      }
    } catch (err) {
      setError(err.message || 'Failed to extend license');
    } finally {
      setLoading(false);
    }
  };

  const handleSetExact = async (e) => {
    e.preventDefault();
    if (!exactDate) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.setExactExpiry(exactDate);
      if (res.success) {
        setSuccessMsg(`Software expiration date successfully set to ${exactDate}!`);
        refreshSettings();
      }
    } catch (err) {
      setError(err.message || 'Failed to set expiry date');
    } finally {
      setLoading(false);
    }
  };

  const daysRemaining = license?.days_remaining ?? 0;
  const isExpiringSoon = daysRemaining <= 30;
  const isExpired = license?.status !== 'active' || daysRemaining <= 0;

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Software License & Expiry Duration Control
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Superadmin exclusive governance to fix, extend, and monitor the commercial duration of the parking management software
        </p>
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
          gap: '8px'
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
          fontSize: '0.8rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Status Card */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <ShieldCheck size={16} /> Active License Specifications
            </span>
            <span className={`badge ${!isExpired ? (isExpiringSoon ? 'badge-amber' : 'badge-green') : 'badge-red'}`}>
              {license?.status ? license.status.toUpperCase() : 'ACTIVE'}
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
                fontSize: '2.8rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: isExpired ? 'var(--status-red)' : (isExpiringSoon ? 'var(--status-amber)' : 'var(--status-green)'),
                lineHeight: 1.1,
                margin: '4px 0'
              }}>
                {daysRemaining} DAYS
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {isExpired ? 'License is expired. System access locked.' : `Licensed to: ${license?.issued_to || 'KIMSHEALTH'}`}
              </p>
            </div>

            <div style={{ fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Key:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{license?.license_key || 'KIMS-SANDS-PARK'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>License Expiration Date:</span>
                <strong>{license?.expires_at || 'Perpetual'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Maximum Concurrent Lanes:</span>
                <strong>{license?.max_lanes || 10} Lanes</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Control Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <Clock size={16} /> Extend / Fix License Expiry
            </span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Quickly extend software duration by standard periods or set an exact expiration date.
            </p>

            {/* Quick Extension Buttons */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Add Validity Duration</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleExtend(30)}
                  disabled={loading}
                >
                  <Plus size={14} /> +30 Days (1 Month)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleExtend(90)}
                  disabled={loading}
                >
                  <Plus size={14} /> +90 Days (Quarter)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleExtend(180)}
                  disabled={loading}
                >
                  <Plus size={14} /> +180 Days (Half Year)
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleExtend(365)}
                  disabled={loading}
                >
                  <Plus size={14} /> +365 Days (1 Year)
                </button>
              </div>
            </div>

            {/* Set Exact Date */}
            <form onSubmit={handleSetExact} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div className="form-group">
                <label className="form-label">Set Specific Expiry Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={exactDate}
                  onChange={(e) => setExactDate(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-success"
                style={{ width: '100%' }}
                disabled={loading}
              >
                <Calendar size={14} />
                {loading ? 'Applying...' : 'Lock Exact Expiration Date'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
