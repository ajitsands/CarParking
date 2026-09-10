import React, { useState } from 'react';
import { CreditCard, Search, Banknote, QrCode, Printer, CheckCircle2, ShieldCheck, Car } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function CashierTerminal() {
  const { formatCurrency } = useSettings();
  const [searchPlate, setSearchPlate] = useState('BHR 43210');
  const [session, setSession] = useState(null);
  const [tariff, setTariff] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('benefit_pay');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    if (!searchPlate.trim()) return;

    setLoading(true);
    setError('');
    setSession(null);
    setTariff(null);
    setReceipt(null);

    try {
      const res = await api.calculateTariff({ plate_number: searchPlate.trim() });
      if (res.success) {
        setSession(res.data.session);
        setTariff(res.data.tariff);
        setQrData(res.data.qr_payment_data);
      }
    } catch (err) {
      setError(err.message || 'No active session found for plate');
    } finally {
      setLoading(false);
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
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Exit Cashier & POS Terminal
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Quick vehicle lookup at exit gate, dynamic mobile banking QR generation, cash/card collection, and boom barrier release
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
        {/* Left: Search & Breakdown */}
        <div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Search size={16} /> Exit Vehicle Lookup
              </span>
            </div>
            <div className="panel-body">
              <form onSubmit={handleLookup} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Plate (e.g. BHR 43210)"
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Searching...' : 'Lookup'}
                </button>
              </form>

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

              {session && tariff && (
                <div style={{ fontSize: '0.8rem' }}>
                  <div style={{
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Session Code:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{session.session_code}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Entry Time:</span>
                      <strong>{session.entry_time}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Duration:</span>
                      <strong>{tariff.total_minutes} mins</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Grace Period:</span>
                      <strong style={{ color: 'var(--status-green)' }}>-{tariff.grace_minutes} mins</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Chargeable:</span>
                      <strong>{tariff.chargeable_minutes} mins</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '6px' }}>
                      <span style={{ fontWeight: 700 }}>Amount Due:</span>
                      <strong style={{ fontSize: '1.2rem', color: tariff.net_amount > 0 ? 'var(--status-red)' : 'var(--status-green)', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(tariff.net_amount)}
                      </strong>
                    </div>
                  </div>

                  {tariff.net_amount > 0 ? (
                    <div>
                      <label className="form-label">Payment Mode</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMethod === 'benefit_pay' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setPaymentMethod('benefit_pay')}
                        >
                          <QrCode size={13} /> BenefitPay
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMethod === 'card' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setPaymentMethod('card')}
                        >
                          <CreditCard size={13} /> POS Card
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setPaymentMethod('cash')}
                        >
                          <Banknote size={13} /> Cash
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn btn-success"
                        style={{ width: '100%', padding: '10px' }}
                        onClick={handleProcessPayment}
                        disabled={processing}
                      >
                        <ShieldCheck size={16} />
                        {processing ? 'Processing...' : `Collect & Open Exit Barrier`}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      background: 'var(--status-green-bg)',
                      color: 'var(--status-green)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                      fontWeight: 700
                    }}>
                      No Payment Required! Authorized for Free Exit.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Dynamic QR or Receipt Display */}
        <div>
          {receipt ? (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <CheckCircle2 size={16} color="var(--status-green)" />
                  Payment Confirmed · Exit Barrier Released
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                  <Printer size={13} /> Print
                </button>
              </div>
              <div className="panel-body">
                <div className="receipt-box">
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{receipt.hospital}</strong>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>OFFICIAL EXIT RECEIPT</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>TXN:</span>
                    <strong>{receipt.transaction_id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Plate:</span>
                    <strong>{receipt.plate_number}</strong>
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
                    <span>Duration:</span>
                    <span>{receipt.duration}</span>
                  </div>

                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <strong>AMOUNT:</strong>
                    <strong>{receipt.amount_paid}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : tariff && paymentMethod === 'benefit_pay' ? (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <QrCode size={16} /> Customer Facing Digital QR Display
                </span>
                <span className="badge badge-amber">AWAITING SCAN</span>
              </div>
              <div className="panel-body" style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#fff',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '12px'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData?.qr_string || 'PAY')}`}
                    alt="Exit Payment QR"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Scan to Pay: {formatCurrency(tariff.net_amount)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  BenefitPay · Apple Pay · Cards Supported
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <Car size={16} /> Exit Lane Display
                </span>
              </div>
              <div className="panel-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Car size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.8rem' }}>
                  Search an exit vehicle by plate number on the left to calculate duration and open the exit barrier.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
