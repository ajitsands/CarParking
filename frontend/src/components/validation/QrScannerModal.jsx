import React, { useState } from 'react';
import Modal from '../common/Modal';
import { QrCode, CheckCircle2, AlertCircle, Scan } from 'lucide-react';
import { api } from '../../services/api';

export default function QrScannerModal({ isOpen, onClose, onValidationSuccess }) {
  const [token, setToken] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const sampleTokens = [
    { label: 'Patient Ahmed (Cardiology)', token: 'QR-KIMS-88192-43210-XYZ', plate: 'BHR 43210' },
    { label: 'Patient Sara (Pediatrics)', token: 'QR-KIMS-90214-78901-ABC', plate: 'BHR 78901' }
  ];

  const handleValidate = async (e) => {
    if (e) e.preventDefault();
    if (!token.trim()) {
      setError('Please provide or scan an appointment QR code token');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.validateByQr({
        qr_token: token.trim(),
        plate_number: plateNumber.trim()
      });

      if (res.success) {
        setResult(res.data);
        if (onValidationSuccess) {
          onValidationSuccess(res.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visitor Appointment QR Validation (Method A)">
      <form onSubmit={handleValidate}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Scan the QR code received on the patient's WhatsApp / Email appointment confirmation, or enter the token to validate parking.
        </p>

        {/* Quick Demo Tokens */}
        <div style={{ marginBottom: '12px' }}>
          <label className="form-label">Sample Appointment QR Tokens</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sampleTokens.map((st, i) => (
              <button
                key={i}
                type="button"
                className="btn btn-outline btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => {
                  setToken(st.token);
                  setPlateNumber(st.plate);
                }}
              >
                <Scan size={14} />
                <span><strong>{st.label}</strong>: {st.token}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Appointment QR Token *</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. QR-KIMS-88192-43210-XYZ"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Vehicle Plate Number (Optional)</label>
          <input
            type="text"
            className="form-input"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            placeholder="e.g. BHR 43210"
          />
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <div>{error}</div>
          </div>
        )}

        {result && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--status-green-bg)',
            border: '1px solid var(--status-green-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            color: 'var(--status-green)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <CheckCircle2 size={18} />
              <strong style={{ fontSize: '0.85rem' }}>Visit Successfully Validated!</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
              Vehicle <strong>{result.plate_number}</strong> (Session: {result.session_code}) is now eligible for <strong>Free Parking</strong>.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <QrCode size={16} />
            {loading ? 'Validating...' : 'Validate Parking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
