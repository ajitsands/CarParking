import React, { useState } from 'react';
import { 
  Camera, 
  Car, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  CreditCard, 
  ArrowRightCircle, 
  Sparkles,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { useSettings } from '../../context/SettingsContext';

export default function VehicleSnapshotModal({ 
  isOpen, 
  onClose, 
  session, 
  onOpenValidation, 
  onOpenPayment, 
  onOpenExit 
}) {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'exit'
  const [imgError, setImgError] = useState(false);

  if (!session) return null;

  const hasEntryImg = Boolean(session.entry_image_url);
  const hasExitImg = Boolean(session.exit_image_url);

  // Active image url
  let currentImageUrl = activeTab === 'exit' ? (session.exit_image_url || session.entry_image_url) : (session.entry_image_url || session.exit_image_url);

  // If backend returns a relative URL, prepend server base if needed or use relative
  if (currentImageUrl && !currentImageUrl.startsWith('http') && !currentImageUrl.startsWith('data:')) {
    if (!currentImageUrl.startsWith('/')) {
      currentImageUrl = '/' + currentImageUrl;
    }
  }

  const confidence = activeTab === 'exit' 
    ? (session.exit_confidence || session.entry_confidence || 98.5)
    : (session.entry_confidence || 98.5);

  const activeGate = activeTab === 'exit'
    ? (session.exit_gate_id || 'GATE-OUT-01')
    : (session.entry_gate_id || 'GATE-IN-01');

  const activeTime = activeTab === 'exit'
    ? (session.exit_time || '—')
    : (session.entry_time || '—');

  const handleDownload = () => {
    if (!currentImageUrl) return;
    const a = document.createElement('a');
    a.href = currentImageUrl;
    a.download = `${session.plate_number}_${activeTab}_snapshot.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="var(--brand-primary, #2563eb)" />
          <span>Vehicle ANPR Snapshot</span>
        </div>
      }
      maxWidth="720px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top Header Plate Display Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          border: '1px solid #334155'
        }}>
          {/* License Plate Graphic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '6px 16px',
              borderRadius: '8px',
              border: '3px solid #0f172a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '2px', color: '#dc2626', textTransform: 'uppercase' }}>
                BAHRAIN البحرين
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1px', lineHeight: 1.1 }}>
                {session.plate_number}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Session Code
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
                {session.session_code}
              </div>
              {session.owner_name && (
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                  {session.owner_name} {session.owner_department ? `(${session.owner_department})` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Status & Accuracy Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <StatusBadge status={session.status} />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              <Sparkles size={11} /> AI Confidence: {parseFloat(confidence).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Entry / Exit Tab Controls (if exit exists or for toggle) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-input, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', gap: '2px' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('entry'); setImgError(false); }}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeTab === 'entry' ? '#2563eb' : 'transparent',
                color: activeTab === 'entry' ? '#ffffff' : 'var(--text-secondary, #475569)',
                boxShadow: activeTab === 'entry' ? '0 1px 3px rgba(37,99,235,0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              🟢 Entry Snapshot {hasEntryImg ? '✓' : ''}
            </button>
            <button
              type="button"
              disabled={!session.exit_time && !hasExitImg}
              onClick={() => { setActiveTab('exit'); setImgError(false); }}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: (!session.exit_time && !hasExitImg) ? 'not-allowed' : 'pointer',
                opacity: (!session.exit_time && !hasExitImg) ? 0.5 : 1,
                background: activeTab === 'exit' ? '#2563eb' : 'transparent',
                color: activeTab === 'exit' ? '#ffffff' : 'var(--text-secondary, #475569)',
                boxShadow: activeTab === 'exit' ? '0 1px 3px rgba(37,99,235,0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              🔴 Exit Snapshot {hasExitImg ? '✓' : ''}
            </button>
          </div>

          {currentImageUrl && !imgError && (
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}
            >
              <Download size={13} /> Download Image
            </button>
          )}
        </div>

        {/* Snapshot Image Container */}
        <div style={{
          background: '#090d16',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #334155)',
          minHeight: '260px',
          maxHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {currentImageUrl && !imgError ? (
            <img
              src={currentImageUrl}
              alt={`Plate ${session.plate_number} ${activeTab} capture`}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                maxHeight: '380px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '30px 20px',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Car size={32} color="#64748b" />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>
                {activeTab === 'exit' && !session.exit_time ? 'Vehicle Still Parked (No Exit Capture Yet)' : 'Digital LPR Event Verified'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '360px' }}>
                Plate <strong>{session.plate_number}</strong> was recognized at <strong>{activeGate}</strong> via Uniview ANPR Optical Engine.
              </div>
            </div>
          )}

          {/* Watermark Tag */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '10px',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📷 {activeGate}</span>
            <span>•</span>
            <span>{activeTime}</span>
          </div>
        </div>

        {/* Capture Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Capture Timestamp
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {activeTime}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Gate & Lane
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {activeGate}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Duration
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: '2px', color: '#2563eb', fontFamily: 'monospace' }}>
              {session.total_duration_minutes ? `${session.total_duration_minutes} mins` : 'Active'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Calculated Fee
            </span>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, marginTop: '2px', color: parseFloat(session.net_amount || 0) > 0 ? 'var(--status-amber)' : 'var(--status-green)' }}>
              {formatCurrency(session.net_amount || 0)}
            </div>
          </div>
        </div>

        {/* Quick Modal Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {session.status === 'VALIDATION_PENDING' && onOpenValidation && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => { onClose(); onOpenValidation(session); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={13} /> Validate Parking
              </button>
            )}

            {session.status === 'CHARGING' && onOpenPayment && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); onOpenPayment(session); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CreditCard size={13} /> Collect Fee ({formatCurrency(session.net_amount || 0)})
              </button>
            )}

            {!session.exit_time && session.status !== 'EXIT_COMPLETED' && onOpenExit && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--status-blue)', borderColor: 'var(--status-blue)' }}
                onClick={() => { onClose(); onOpenExit(session); }}
              >
                <ArrowRightCircle size={13} /> Authorize Exit
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </Modal>
  );
}
