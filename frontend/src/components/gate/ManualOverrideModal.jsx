import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { ShieldAlert, AlertTriangle, Car, CheckCircle2, Info } from 'lucide-react';
import { api } from '../../services/api';

export default function ManualOverrideModal({ 
  isOpen, 
  onClose, 
  defaultGate = 'GATE-IN-01', 
  initialPlate = '',
  initialSessionId = null,
  onOverrideSuccess 
}) {
  const [gateId, setGateId] = useState(defaultGate);
  const [direction, setDirection] = useState(defaultGate.includes('OUT') ? 'EXIT' : 'ENTRY');
  const [plateNumber, setPlateNumber] = useState(initialPlate);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [activeSessions, setActiveSessions] = useState([]);
  const [reasonCategory, setReasonCategory] = useState('Emergency / Medical Escort');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGateId(defaultGate);
      setDirection(defaultGate.includes('OUT') ? 'EXIT' : 'ENTRY');
      setPlateNumber(initialPlate || '');
      setSelectedSessionId(initialSessionId || null);
      setError('');

      // Fetch active vehicles currently inside the parking facility
      api.getSessions({ limit: 50 })
        .then(res => {
          if (res.success) {
            const inside = (res.data.sessions || []).filter(s => !s.exit_time && s.status !== 'EXIT_COMPLETED');
            setActiveSessions(inside);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultGate, initialPlate, initialSessionId]);

  const handleVehicleSelect = (sess) => {
    if (!sess) {
      setPlateNumber('');
      setSelectedSessionId(null);
      return;
    }
    setPlateNumber(sess.plate_number);
    setSelectedSessionId(sess.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const finalReason = customReason.trim() ? `${reasonCategory}: ${customReason}` : reasonCategory;

    if (!finalReason) {
      setError('A reason is strictly mandatory for security audit compliance');
      return;
    }

    setSubmitting(true);
    try {
      if (onOverrideSuccess) {
        await onOverrideSuccess({
          gate_id: gateId,
          direction,
          plate_number: plateNumber || 'MANUAL_OVERRIDE',
          session_id: selectedSessionId,
          reason: finalReason
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send override command');
    } finally {
      setSubmitting(false);
    }
  };

  const isExitGate = direction === 'EXIT' || gateId.includes('OUT');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Boom Barrier Override & Gate Clearance" maxWidth="560px">
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'var(--status-amber-bg)',
          border: '1px solid var(--status-amber-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '14px',
          color: 'var(--status-amber)'
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.74rem', lineHeight: 1.4 }}>
            <strong>Security Warning:</strong> Every manual barrier pulse is cryptographically logged with operator ID, timestamp, and gate location.
          </p>
        </div>

        {isExitGate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--status-blue-bg)',
            border: '1px solid var(--status-blue-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            color: 'var(--status-blue)',
            fontSize: '0.74rem'
          }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Exit Gate Action:</strong> Authorizing exit will open the boom barrier and automatically mark the vehicle's parking session as <strong>COMPLETED</strong>.
            </span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Select Barrier Gate *</label>
          <select 
            className="form-select"
            value={gateId} 
            onChange={(e) => {
              const val = e.target.value;
              setGateId(val);
              setDirection(val.includes('OUT') ? 'EXIT' : 'ENTRY');
            }}
          >
            <option value="GATE-OUT-01">GATE-OUT-01 — North Exit (Main Exit Barrier)</option>
            <option value="GATE-IN-01">GATE-IN-01 — North Entry (Main Entrance Barrier)</option>
          </select>
        </div>

        {/* If Exit Gate: Provide active vehicles picker */}
        {isExitGate && activeSessions.length > 0 && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Select Parked Vehicle (Inside Facility)</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{activeSessions.length} parked</span>
            </label>
            <select 
              className="form-select"
              value={selectedSessionId || ''}
              onChange={(e) => {
                const sId = parseInt(e.target.value);
                const found = activeSessions.find(s => s.id === sId);
                handleVehicleSelect(found);
              }}
            >
              <option value="">-- Choose active vehicle to exit or enter plate below --</option>
              {activeSessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.plate_number} · [{s.status}] · In: {s.entry_time.slice(11, 16)} ({s.total_duration_minutes}m)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Vehicle Plate Number</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. BHR 43210 or type plate number"
            value={plateNumber}
            onChange={(e) => {
              setPlateNumber(e.target.value);
              setSelectedSessionId(null);
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Override Reason Category *</label>
          <select 
            className="form-select"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            required
          >
            <option value="Whitelisted Vehicle / Staff Access">Whitelisted Vehicle / Staff Access</option>
            <option value="Maintenance / Relay Testing">Maintenance / Relay Testing</option>
            <option value="Emergency / Medical Escort">Emergency / Medical Escort</option>
            <option value="VIP / Doctor Emergency Convoy">VIP / Doctor Emergency Convoy</option>
            <option value="Plate Misread / ANPR Unreadable">Plate Misread / ANPR Unreadable</option>
            <option value="Cash / Manual Payment Collected">Cash / Manual Payment Collected</option>
            <option value="Contractor / Service Vehicle">Contractor / Service Vehicle</option>
            <option value="Loop Sensor / Hardware Glitch">Loop Sensor / Hardware Glitch</option>
            <option value="Other Protocol Exception">Other Protocol Exception</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Specific Details / Operator Notes</label>
          <textarea 
            className="form-textarea" 
            rows="2"
            placeholder="Add specific details for security audit log..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={submitting}>
            {submitting ? 'Transmitting Signal...' : isExitGate ? 'Authorize Exit & Open Barrier' : 'Authorize Entry & Open Barrier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
