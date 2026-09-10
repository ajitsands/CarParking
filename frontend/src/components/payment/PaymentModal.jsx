import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { CreditCard, Banknote, QrCode, CheckCircle2, Printer, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

export default function PaymentModal({ isOpen, onClose, session, onPaymentComplete }) {
  const { formatCurrency } = useSettings();
  const [tariff, setTariff] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('benefit_pay');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session && isOpen) {
      setReceipt(null);
      setError('');
      loadTariff(session.id);
    }
  }, [session, isOpen]);

  const loadTariff = async (sessionId) => {
    try {
      const res = await api.calculateTariff({ session_id: sessionId });
      if (res.success) {
        setTariff(res.data.tariff);
        setQrData(res.data.qr_payment_data);
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate tariff');
    }
  };

  const handleProcessPayment = async () => {
    if (!session) return;
    setProcessing(true);
    setError('');

    try {
      const res = await api.processPayment({
        session_id: session.id,
        payment_method: paymentMethod,
        gate_id: 'GATE-OUT-01'
      });

      if (res.success) {
        setReceipt(res.data.receipt);
        if (onPaymentComplete) {
          onPaymentComplete(res.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!session) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exit Payment & Boom Barrier Release" maxWidth="560px">
      {!receipt ? (
        <div>
          {/* Vehicle Info Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            marginBottom: '14px'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Vehicle Plate
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {session.plate_number}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Session Code
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                {session.session_code}
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {tariff && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '14px',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Entry Time:</span>
                <span style={{ fontWeight: 600 }}>{session.entry_time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Parking Duration:</span>
                <span style={{ fontWeight: 600 }}>{tariff.total_minutes} minutes</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Free Grace Period Deducted:</span>
                <span style={{ fontWeight: 600, color: 'var(--status-green)' }}>-{tariff.grace_minutes} mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Chargeable Time:</span>
                <span style={{ fontWeight: 600 }}>{tariff.chargeable_minutes} minutes ({tariff.slots} slabs)</span>
              </div>

              <div style={{
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline'
              }}>
                <strong style={{ fontSize: '0.95rem' }}>Total Amount Due:</strong>
                <span style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: tariff.net_amount > 0 ? 'var(--status-red)' : 'var(--status-green)'
                }}>
                  {formatCurrency(tariff.net_amount)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'benefit_pay' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.74rem' }}
                onClick={() => setPaymentMethod('benefit_pay')}
              >
                <QrCode size={14} /> BenefitPay / QR
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.74rem' }}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={14} /> POS Card
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.74rem' }}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote size={14} /> Cash Desk
              </button>
            </div>
          </div>

          {/* Dynamic QR Code Mock for Mobile Banking */}
          {paymentMethod === 'benefit_pay' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                background: '#fff',
                padding: '10px',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '8px'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData?.qr_string || 'BENEFITPAY-PARKING')}`}
                  alt="Payment QR"
                  style={{ width: '130px', height: '130px', display: 'block' }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Scan to Pay via BenefitPay / Mobile Banking
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Amount: {formatCurrency(tariff?.net_amount || 0)}
              </span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              marginBottom: '12px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={handleProcessPayment}
              disabled={processing}
            >
              <ShieldCheck size={16} />
              {processing ? 'Verifying...' : `Confirm & Open Exit Barrier`}
            </button>
          </div>
        </div>
      ) : (
        /* Receipt View */
        <div>
          <div style={{
            textAlign: 'center',
            marginBottom: '14px',
            color: 'var(--status-green)'
          }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 6px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Payment Confirmed & Exit Barrier Opened!</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Vehicle has been authorized for safe exit.
            </p>
          </div>

          <div className="receipt-box" id="thermal-receipt">
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.9rem' }}>{receipt.hospital}</strong>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>PARKING EXIT RECEIPT</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Transaction ID:</span>
              <span><strong>{receipt.transaction_id}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Vehicle Plate:</span>
              <span><strong>{receipt.plate_number}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Session:</span>
              <span>{receipt.session_code}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Entry:</span>
              <span>{receipt.entry_time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Exit:</span>
              <span>{receipt.exit_time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Total Duration:</span>
              <span>{receipt.duration}</span>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <strong>AMOUNT PAID:</strong>
              <strong>{receipt.amount_paid}</strong>
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.65rem', color: '#64748b' }}>
              Thank you for visiting KIMSHEALTH.<br />Drive safely!
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={handlePrint}>
              <Printer size={16} /> Print Receipt
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
