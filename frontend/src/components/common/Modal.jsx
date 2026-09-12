import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth, size = 'md', className = '' }) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Optional: keep escape key closing if requested or keep it disabled if pure dialog window
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    // Prevent closing when clicking outside the dialog window
    e.stopPropagation();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };

  const sizeMap = {
    sm: '420px',
    md: '540px',
    lg: '760px',
    xl: '1120px',
    '2xl': '1280px',
    full: '96vw'
  };

  const resolvedMaxWidth = maxWidth || sizeMap[size] || '540px';

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`modal-card ${isShaking ? 'modal-dialog-shake' : ''} ${className}`}
        style={{ maxWidth: resolvedMaxWidth, width: '100%' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onClose}
            title="Close Dialog Window"
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

