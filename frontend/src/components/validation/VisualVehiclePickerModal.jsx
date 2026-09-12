import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { 
  Car, Search, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Camera, ShieldCheck, UserCheck, QrCode, ArrowRight, Eye
} from 'lucide-react';
import { api } from '../../services/api';

export default function VisualVehiclePickerModal({ 
  isOpen, 
  onClose, 
  qrToken = '', 
  patientMrn = '', 
  visitorName = '', 
  onValidationSuccess 
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validatingId, setValidatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const [freeDurationType, setFreeDurationType] = useState('3h');
  const [customDays, setCustomDays] = useState(3);
  const [admissionNote, setAdmissionNote] = useState('');

  const timeFilterOptions = [
    { id: 'all', label: 'All Parked Cars', icon: '🚗' },
    { id: '5min', label: '≤ 5 mins', icon: '⚡' },
    { id: '10min', label: '≤ 10 mins', icon: '⏱️' },
    { id: '20min', label: '≤ 20 mins', icon: '⏱️' },
    { id: '30min', label: '≤ 30 mins', icon: '⏱️' },
    { id: '1hr', label: '≤ 1 hour', icon: '🕒' },
    { id: '2hr', label: '≤ 2 hours', icon: '🕒' },
    { id: '3hr_plus', label: '3+ hours', icon: '⏳' },
  ];

  const durationPresets = [
    { id: '3h', label: '3 Hours', sub: 'Standard OPD', hours: 3 },
    { id: '5h', label: '5 Hours', sub: 'Extended', hours: 5 },
    { id: '10h', label: '10 Hours', sub: 'Day Care', hours: 10 },
    { id: '12h', label: '12 Hours', sub: 'Observation', hours: 12 },
    { id: '24h', label: '24 Hours', sub: '1 Day Stay', hours: 24, days: 1 },
    { id: '48h', label: '48 Hours', sub: '2 Days Stay', hours: 48, days: 2 },
    { id: 'custom_days', label: '🏥 Patient Admission', sub: 'Specify Days', isCustom: true }
  ];

  const getDurationPayload = () => {
    if (freeDurationType === 'custom_days') {
      const days = Math.max(1, parseInt(customDays) || 1);
      return { free_days: days, free_minutes: days * 1440, label: `${days} Days (Inpatient Admission)` };
    }
    const found = durationPresets.find(d => d.id === freeDurationType);
    if (found) {
      if (found.days) return { free_days: found.days, free_hours: found.hours, free_minutes: found.days * 1440, label: found.label };
      return { free_hours: found.hours, free_minutes: found.hours * 60, label: found.label };
    }
    return { free_hours: 3, free_minutes: 180, label: '3 Hours' };
  };

  const loadCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getValidationCandidates({
        q: searchQuery.trim(),
        time_filter: timeFilter
      });
      if (res.success) {
        setCandidates(res.data.candidates || []);
      } else {
        setError(res.message || 'Failed to fetch parked vehicles');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      loadCandidates();
    }
  }, [isOpen, searchQuery, timeFilter]);

  const handleSelectAndValidate = async (candidate) => {
    setValidatingId(candidate.id);
    setError('');
    setSuccessResult(null);

    const durPayload = getDurationPayload();

    try {
      let res;
      if (qrToken) {
        res = await api.validateByQr({
          session_id: candidate.id,
          qr_token: qrToken,
          plate_number: candidate.plate_number,
          free_minutes: durPayload.free_minutes,
          free_hours: durPayload.free_hours,
          free_days: durPayload.free_days,
          notes: admissionNote ? `Admission: ${admissionNote}` : undefined
        });
      } else {
        res = await api.validateByReception({
          session_id: candidate.id,
          plate_number: candidate.plate_number,
          patient_mrn: patientMrn,
          visitor_name: visitorName || 'Hospital Patient',
          free_minutes: durPayload.free_minutes,
          free_hours: durPayload.free_hours,
          free_days: durPayload.free_days,
          notes: admissionNote 
            ? `Hospital Admission (${durPayload.label}) · Note: ${admissionNote}` 
            : `Reception Desk Visual Validation (${durPayload.label})`
        });
      }

      if (res.success) {
        setSuccessResult({
          candidate,
          data: res.data,
          durationLabel: durPayload.label,
          message: res.data?.message || `Vehicle ${candidate.plate_number} successfully validated for ${durPayload.label}!`
        });

        if (onValidationSuccess) {
          onValidationSuccess({
            ...res.data,
            plate_number: candidate.plate_number,
            session_code: candidate.session_code
          });
        }
      } else {
        setError(res.message || 'Validation failed');
      }
    } catch (err) {
      setError(err.message || 'Validation request failed');
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="🚗 Visual Vehicle Picker — Identify by Car Photo & Arrival Time"
      size="xl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Linked Patient / QR Context Alert */}
        {(qrToken || patientMrn || visitorName) && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#0284c7" />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                <strong>Validating For:</strong> {visitorName || 'Patient'} 
                {patientMrn && <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>({patientMrn})</span>}
                {qrToken && (
                  <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'rgba(2,132,199,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    Token: {qrToken.substring(0, 20)}...
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2,132,199,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
              Select Customer's Car Below
            </span>
          </div>
        )}

        {/* Free Duration Selector Card (Hours / 1-2 Days / Admission Days) */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="var(--primary-color)" /> Free Parking Duration to Grant:
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--status-green)', background: 'var(--status-green-bg)', padding: '2px 8px', borderRadius: '12px' }}>
              Active: {getDurationPayload().label} Free
            </span>
          </div>

          {/* Duration Preset Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {durationPresets.map((dp) => (
              <button
                key={dp.id}
                type="button"
                onClick={() => setFreeDurationType(dp.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: freeDurationType === dp.id ? 'var(--primary-color)' : 'var(--bg-surface-alt)',
                  color: freeDurationType === dp.id ? '#ffffff' : 'var(--text-main)',
                  border: freeDurationType === dp.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>{dp.label}</span>
                <span style={{ fontSize: '0.62rem', opacity: freeDurationType === dp.id ? 0.9 : 0.6 }}>{dp.sub}</span>
              </button>
            ))}
          </div>

          {/* Inpatient Admission Custom Days Input */}
          {freeDurationType === 'custom_days' && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Specify Admission Days:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                    onClick={() => setCustomDays(Math.max(1, customDays - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                    onClick={() => setCustomDays(customDays + 1)}
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#6366f1' }}>
                    Days ({customDays * 24} Hours Free)
                  </span>
                </div>

                {/* Quick day pills */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[3, 5, 7, 10, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCustomDays(d)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: customDays === d ? '#6366f1' : 'var(--bg-surface)',
                        color: customDays === d ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.74rem', padding: '6px 10px' }}
                  placeholder="Optional admission note (e.g. Ward 3B / Surgery Stay / ICU Patient)..."
                  value={admissionNote}
                  onChange={(e) => setAdmissionNote(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {successResult && (
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--status-green-bg)',
            border: '1px solid var(--status-green-border)',
            color: 'var(--status-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={24} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Validation Successful!</strong>
                <p style={{ fontSize: '0.76rem', margin: '2px 0 0 0', color: 'var(--text-main)' }}>
                  Vehicle <strong>{successResult.candidate.plate_number}</strong> (Session: {successResult.candidate.session_code}) is now authorized for <strong>{successResult.durationLabel} of Free Parking</strong>.
                </p>
              </div>
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={onClose}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Done / Close
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filter Header Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--bg-surface-alt)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          {/* Top Row: Search Input & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
                placeholder="Search by plate digits (e.g. 43210 or 88192)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button 
              className="btn btn-outline btn-sm"
              onClick={loadCandidates}
              disabled={loading}
              title="Refresh Parked Vehicles List"
              style={{ padding: '7px 12px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Bottom Row: Quick Arrival Time Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
              Arrival Window:
            </span>
            {timeFilterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeFilter(opt.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.74rem',
                  fontWeight: timeFilter === opt.id ? 800 : 600,
                  background: timeFilter === opt.id ? 'var(--primary-color)' : 'var(--bg-surface)',
                  color: timeFilter === opt.id ? '#ffffff' : 'var(--text-secondary)',
                  border: timeFilter === opt.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vehicles Visual Cards Grid */}
        <div style={{
          maxHeight: '480px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {loading && candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.82rem' }}>Scanning active parked vehicles in the facility...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: 'var(--bg-surface-alt)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              <Car size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
                No Unvalidated Vehicles Found in This Time Window
              </p>
              <p style={{ fontSize: '0.76rem', margin: 0 }}>
                Try selecting <strong>"All Parked Cars"</strong> or clearing your search filter.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px'
            }}>
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  style={{
                    borderRadius: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="vehicle-candidate-card"
                >
                  {/* ANPR Snapshot Header Photo */}
                  <div style={{
                    height: '130px',
                    background: '#0f172a',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {cand.entry_image_url ? (
                      <img 
                        src={cand.entry_image_url} 
                        alt={cand.plate_number} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      /* Simulated ANPR Camera View */
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        color: '#94a3b8',
                        padding: '10px',
                        textAlign: 'center'
                      }}>
                        <Car size={36} color="#38bdf8" style={{ marginBottom: '4px', opacity: 0.8 }} />
                        <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                          🎥 ANPR CAMERA STREAM
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>
                          {cand.entry_gate_id} · LIVE CAPTURE
                        </div>
                      </div>
                    )}

                    {/* Elapsed Time Pill Over Image */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      <Clock size={11} />
                      <span>{cand.duration_formatted}</span>
                    </div>

                    {/* Gate Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '3px 7px',
                      borderRadius: '10px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: '#f8fafc',
                      fontSize: '0.64rem',
                      fontWeight: 700
                    }}>
                      {cand.entry_gate_id}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Embossed Plate Number Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '2px solid #0f172a',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        color: '#0284c7',
                        letterSpacing: '0.05em',
                        marginRight: '8px',
                        paddingRight: '6px',
                        borderRight: '1px solid #cbd5e1'
                      }}>
                        BAHRAIN
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        letterSpacing: '0.08em'
                      }}>
                        {cand.plate_number}
                      </span>
                    </div>

                    {/* Details Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem' }}>ARRIVED AT</span>
                        <strong>{cand.entry_time_display}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem' }}>STATUS</span>
                        <span style={{
                          color: cand.status === 'VALIDATED' ? 'var(--status-green)' : '#f59e0b',
                          fontWeight: 700
                        }}>
                          {cand.status === 'VALIDATED' ? 'Validated' : 'Needs Validation'}
                        </span>
                      </div>
                    </div>

                    {/* Select & Validate Button */}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{
                        width: '100%',
                        marginTop: 'auto',
                        padding: '8px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        justifyContent: 'center'
                      }}
                      disabled={validatingId === cand.id}
                      onClick={() => handleSelectAndValidate(cand)}
                    >
                      {validatingId === cand.id ? (
                        <>
                          <RefreshCw size={13} className="spin" />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Select &amp; Validate ({getDurationPayload().label} Free)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.76rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            Showing <strong>{candidates.length}</strong> vehicles currently parked inside facility.
          </div>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={onClose}
          >
            Cancel / Close
          </button>
        </div>

      </div>
    </Modal>
  );
}
