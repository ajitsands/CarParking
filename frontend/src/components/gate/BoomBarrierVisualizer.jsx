import React from 'react';

export default function BoomBarrierVisualizer({ isOpen, gateName, onToggle, showToggle = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 14px',
      background: 'var(--bg-input)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-color)',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`barrier-led ${isOpen ? 'green' : 'red'}`} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {gateName || 'Boom Barrier'}
          </span>
        </div>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          background: isOpen ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
          color: isOpen ? 'var(--status-green)' : 'var(--status-red)',
          border: `1px solid ${isOpen ? 'var(--status-green-border)' : 'var(--status-red-border)'}`
        }}>
          {isOpen ? 'BARRIER OPEN' : 'BARRIER CLOSED'}
        </span>
      </div>

      {/* SVG Boom Barrier Animation */}
      <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="220" height="70" viewBox="0 0 220 70">
          {/* Ground */}
          <line x1="10" y1="65" x2="210" y2="65" stroke="var(--border-color)" strokeWidth="3" />
          
          {/* Barrier Pedestal */}
          <rect x="25" y="20" width="22" height="45" rx="4" fill="#1e3a5c" stroke="#0f7bc4" strokeWidth="1.5" />
          
          {/* LED Indicator on Cabinet */}
          <circle cx="36" cy="30" r="4" fill={isOpen ? "#10b981" : "#ef4444"} />
          
          {/* Pivot Joint */}
          <circle cx="36" cy="38" r="6" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />
          
          {/* Barrier Arm with Red/White Stripes (Rotates on pivot) */}
          <g transform={`rotate(${isOpen ? -68 : 0}, 36, 38)`} style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            {/* Barrier Pole */}
            <rect x="36" y="35" width="140" height="6" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            {/* Stripes */}
            <rect x="55" y="35" width="16" height="6" fill="#dc2626" />
            <rect x="90" y="35" width="16" height="6" fill="#dc2626" />
            <rect x="125" y="35" width="16" height="6" fill="#dc2626" />
            <rect x="160" y="35" width="14" height="6" fill="#dc2626" />
            {/* Soft Tip */}
            <circle cx="176" cy="38" r="3.5" fill="#f59e0b" />
          </g>
        </svg>
      </div>

      {showToggle && (
        <button 
          className={`btn btn-sm ${isOpen ? 'btn-danger' : 'btn-success'}`}
          style={{ width: '100%', marginTop: '4px' }}
          onClick={onToggle}
        >
          {isOpen ? 'Close Barrier' : 'Trigger Barrier Open'}
        </button>
      )}
    </div>
  );
}
