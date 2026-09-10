import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Camera, Car, Play, CheckCircle2, XCircle, RefreshCw, Coins } from 'lucide-react';
import { api } from '../../services/api';

export default function AnprSimulatorModal({ isOpen, onClose, onSimulated }) {
  const [plateNumber, setPlateNumber] = useState('BHR 43210');
  const [direction, setDirection] = useState('ENTRY');
  const [gateId, setGateId] = useState('GATE-IN-01');
  const [cameraId, setCameraId] = useState('ANPR-CAM-01');
  const [confidence, setConfidence] = useState(99.2);
  const [autoClearExit, setAutoClearExit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const quickPresets = [
    { label: 'Patient Visitor (Entry)', plate: 'BHR 43210', dir: 'ENTRY', gate: 'GATE-IN-01' },
    { label: 'Doctor Whitelist (Entry)', plate: 'BHR 11223', dir: 'ENTRY', gate: 'GATE-IN-01' },
    { label: 'Emergency Ambulance (Entry)', plate: 'BHR 99999', dir: 'ENTRY', gate: 'GATE-IN-01' },
    { label: 'Blacklist Alert (Entry)', plate: 'BHR 66666', dir: 'ENTRY', gate: 'GATE-IN-01' },
    { label: 'Patient Vehicle (Exit)', plate: 'BHR 43210', dir: 'EXIT', gate: 'GATE-OUT-01' },
    { label: 'Doctor Vehicle (Exit)', plate: 'BHR 11223', dir: 'EXIT', gate: 'GATE-OUT-01' }
  ];

  const handleSimulate = async () => {
    if (!plateNumber.trim()) {
      setError('Please provide a plate number');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        plate_number: plateNumber.trim(),
        direction,
        gate_id: gateId,
        camera_id: cameraId,
        confidence: parseFloat(confidence),
        timestamp: new Date().toISOString()
      };

      let res = await api.sendAnprWebhook(payload);

      // If user enabled auto-clear exit and fee was due, automatically complete exit
      if (direction === 'EXIT' && autoClearExit && res.data?.session_id && !res.data?.barrier_open) {
        try {
          const completeRes = await api.completeSessionExit(res.data.session_id, {
            gate_id: gateId,
            cash_payment: true,
            reason: 'Auto-cleared cash payment in simulator'
          });
          if (completeRes.success) {
            res = {
              success: true,
              data: {
                ...res.data,
                barrier_open: true,
                status: 'EXIT_COMPLETED',
                message: `Exit authorized and completed! ${completeRes.message}`
              }
            };
          }
        } catch (e) {}
      }

      setResult(res);
      if (onSimulated) {
        onSimulated(res);
      }
    } catch (err) {
      setError(err.message || 'Webhook push failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndExitNow = async () => {
    if (!result?.data?.session_id) return;
    setPaying(true);
    try {
      const res = await api.completeSessionExit(result.data.session_id, {
        gate_id: gateId,
        cash_payment: true,
        reason: 'Paid cash at gate monitor'
      });
      if (res.success) {
        setResult({
          success: true,
          data: {
            ...result.data,
            barrier_open: true,
            status: 'EXIT_COMPLETED',
            message: `Payment confirmed! Vehicle ${plateNumber} exit completed. Boom barrier opened.`
          }
        });
        if (onSimulated) onSimulated(res);
      }
    } catch (e) {
      setError(e.message || 'Failed to complete exit');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ANPR Camera Webhook Simulator" maxWidth="620px">
      <div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Simulates an ANPR camera software event pushing a detected vehicle to the webhook endpoint. Test live gate barrier automation, blacklist rejection, and session state transitions.
        </p>

        {/* Presets */}
        <div style={{ marginBottom: '14px' }}>
          <label className="form-label">Quick Scenario Presets</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setPlateNumber(p.plate);
                  setDirection(p.dir);
                  setGateId(p.gate);
                }}
              >
                <Car size={12} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Vehicle Plate Number *</label>
            <input
              type="text"
              className="form-input"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="e.g. BHR 12345"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Lane Direction</label>
            <select
              className="form-select"
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setGateId(e.target.value === 'EXIT' ? 'GATE-OUT-01' : 'GATE-IN-01');
              }}
            >
              <option value="ENTRY">ENTRY (Entry Lane)</option>
              <option value="EXIT">EXIT (Exit Lane)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Gate Location</label>
            <input
              type="text"
              className="form-input"
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ANPR Confidence (%)</label>
            <input
              type="number"
              className="form-input"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              step="0.1"
              min="50"
              max="100"
            />
          </div>
        </div>

        {direction === 'EXIT' && (
          <div style={{
            margin: '6px 0 12px',
            padding: '8px 12px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem'
          }}>
            <input
              type="checkbox"
              id="autoClearExitCheck"
              checked={autoClearExit}
              onChange={(e) => setAutoClearExit(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="autoClearExitCheck" style={{ cursor: 'pointer', margin: 0, color: 'var(--text-primary)' }}>
              <strong>Auto-Complete Exit:</strong> Automatically record cash payment / authorize clearance so barrier opens and parking session completes.
            </label>
          </div>
        )}

        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
            onClick={handleSimulate}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Transmitting Webhook to Server...' : 'Trigger ANPR Camera Webhook'}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)',
            border: '1px solid var(--status-red-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <XCircle size={16} />
            <div>{error}</div>
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '14px',
            padding: '12px 14px',
            background: result.data?.barrier_open ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
            border: `1px solid ${result.data?.barrier_open ? 'var(--status-green-border)' : 'var(--status-red-border)'}`,
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {result.data?.barrier_open ? (
                <CheckCircle2 size={18} color="var(--status-green)" />
              ) : (
                <XCircle size={18} color="var(--status-red)" />
              )}
              <strong style={{
                fontSize: '0.85rem',
                color: result.data?.barrier_open ? 'var(--status-green)' : 'var(--status-red)'
              }}>
                {result.data?.barrier_open ? 'BOOM BARRIER OPENED · EXIT COMPLETED' : 'BARRIER REMAINS CLOSED · PAYMENT REQUIRED'}
              </strong>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {result.data?.message || result.message}
            </p>

            {result.data?.action === 'PAYMENT_PENDING' && result.data?.session_id && (
              <div style={{ margin: '8px 0', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                  disabled={paying}
                  onClick={handlePayAndExitNow}
                >
                  {paying ? <RefreshCw size={13} className="animate-spin" /> : <Coins size={13} />}
                  {paying ? 'Processing...' : `Collect Cash (${result.data.formatted_amount}) & Open Exit Barrier Now`}
                </button>
              </div>
            )}

            <div style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-surface)',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
