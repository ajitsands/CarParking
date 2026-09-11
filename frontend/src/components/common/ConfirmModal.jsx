import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, LogOut, X, RefreshCw } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary', // 'primary' | 'success' | 'danger' | 'warning'
  plateNumber = null,
  sessionInfo = null,
  loading = false,
  maxWidth = '480px'
}) {
  const [isShaking, setIsShaking] = React.useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    if (!loading) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={24} color="#10b981" />;
      case 'danger':
        return <ShieldAlert size={24} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={24} color="#f59e0b" />;
      case 'primary':
      default:
        return <LogOut size={24} color="#ec4899" />;
    }
  };

  const getButtonBg = () => {
    switch (type) {
      case 'success':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'danger':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'warning':
        return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'primary':
      default:
        return 'linear-gradient(135deg, #ec4899 0%, #2563eb 100%)';
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`modal-card ${isShaking ? 'modal-dialog-shake' : ''}`}
        style={{ 
          maxWidth,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-color)',
          border: '1px solid var(--border-color)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-input)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-color)'
            }}>
              {getIcon()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {title}
              </h3>
            </div>
          </div>

          {!loading && (
            <button 
              type="button" 
              className="btn-icon" 
              onClick={onClose}
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '22px' }}>
          {/* Plate Badge if provided */}
          {plateNumber && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '2px solid #0f172a',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontFamily: 'var(--font-mono, monospace)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', letterSpacing: '1px' }}>
                  BAHRAIN
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '2px' }}>
                  {plateNumber}
                </span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <p style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '0 0 16px 0',
            textAlign: plateNumber ? 'center' : 'left'
          }}>
            {message}
          </p>

          {/* Optional Session Summary Box */}
          {sessionInfo && (
            <div style={{
              background: 'var(--bg-input)',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              fontSize: '0.78rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Gate:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{sessionInfo.gate || 'GATE-OUT-01'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Duration:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{sessionInfo.duration || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Status:</span>
                <strong style={{ color: sessionInfo.statusColor || 'var(--status-green)' }}>
                  {sessionInfo.status || 'Validated'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Net Payable:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {sessionInfo.fee || 'BD 0.000'}
                </strong>
              </div>
            </div>
          )}

          {/* Buttons Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '9px 18px', fontSize: '0.84rem' }}
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                background: getButtonBg(),
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
