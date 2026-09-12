import React, { useState, useEffect } from 'react';
import { QrCode, Search, CheckCircle2, UserCheck, MessageSquare, Car, RefreshCw, Camera, Clock } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/common/DataTable';
import QrScannerModal from '../components/validation/QrScannerModal';
import VisualVehiclePickerModal from '../components/validation/VisualVehiclePickerModal';

export default function VisitorValidationPage() {
  const [activeTab, setActiveTab] = useState('reception');
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [receptionPlate, setReceptionPlate] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [validationSuccessMsg, setValidationSuccessMsg] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [visualPickerOpen, setVisualPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAppointments = async () => {
    try {
      const res = await api.searchAppointments(searchQuery);
      if (res.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAppointments();
  }, [searchQuery]);

  const handleReceptionValidate = async (e) => {
    e.preventDefault();
    if (!receptionPlate.trim()) {
      setError('Vehicle plate number is required');
      return;
    }

    setLoading(true);
    setError('');
    setValidationSuccessMsg('');

    try {
      const res = await api.validateByReception({
        plate_number: receptionPlate.trim(),
        patient_mrn: patientMrn.trim(),
        visitor_name: visitorName.trim() || 'Hospital Patient',
        notes: 'Reception desk validation confirmed'
      });

      if (res.success) {
        setValidationSuccessMsg(res.data?.message || 'Visit successfully validated!');
        setReceptionPlate('');
        setPatientMrn('');
        setVisitorName('');
        loadAppointments();
      }
    } catch (err) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Hospital Visitor & Patient Validation Portal
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Validate patient and visitor parking sessions through visual car photos, appointment QR, or reception desk
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setVisualPickerOpen(true)}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)', border: 'none' }}
          >
            <Camera size={14} /> 🚗 Visual Vehicle Picker (Car Photos)
          </button>

          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setQrModalOpen(true)}
          >
            <QrCode size={14} /> Scan Appointment QR
          </button>
        </div>
      </div>

      {validationSuccessMsg && (
        <div style={{
          padding: '12px 14px',
          background: 'var(--status-green-bg)',
          color: 'var(--status-green)',
          border: '1px solid var(--status-green-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          <strong>{validationSuccessMsg}</strong>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-red-bg)',
          color: 'var(--status-red)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          fontSize: '0.8rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
        {/* Method B: Reception Counter Desk */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <UserCheck size={16} /> Method B — Reception Counter Validation
            </span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Patient or visitor arrived without an appointment QR code. Enter their vehicle plate number to link and validate the parking session.
            </p>

            <form onSubmit={handleReceptionValidate}>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Vehicle Plate Number *</label>
                  <button
                    type="button"
                    onClick={() => setVisualPickerOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <Camera size={13} /> Don't know plate? Pick by Car Photo
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BHR 43210"
                  value={receptionPlate}
                  onChange={(e) => setReceptionPlate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient MRN / File Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MRN-88192"
                  value={patientMrn}
                  onChange={(e) => setPatientMrn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visitor / Patient Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ahmed Al-Sayed"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-success"
                style={{ width: '100%', padding: '9px', marginTop: '6px' }}
                disabled={loading}
              >
                <CheckCircle2 size={16} />
                {loading ? 'Validating Session...' : 'Confirm Visitor Validation'}
              </button>
            </form>
          </div>
        </div>

        {/* Method C: Hospital Appointments & QR Delivery DataTable */}
        <DataTable
          columns={[
            {
              key: 'patient_mrn',
              label: 'Patient MRN',
              render: (apt) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.72rem' }}>
                  {apt.patient_mrn}
                </span>
              )
            },
            {
              key: 'patient_name',
              label: 'Patient Name',
              render: (apt) => <strong>{apt.patient_name}</strong>
            },
            {
              key: 'registered_plate_number',
              label: 'Plate',
              render: (apt) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {apt.registered_plate_number || <em style={{ color: 'var(--text-muted)' }}>Not Registered</em>}
                </span>
              )
            },
            {
              key: 'qr_token',
              label: 'QR Token',
              render: (apt) => (
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {apt.qr_token ? `${apt.qr_token.substring(0, 16)}...` : '-'}
                </span>
              )
            },
            {
              key: 'action',
              label: 'Action',
              sortable: false,
              align: 'right',
              render: (apt) => (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                  onClick={() => {
                    setReceptionPlate(apt.registered_plate_number || '');
                    setPatientMrn(apt.patient_mrn);
                    setVisitorName(apt.patient_name);
                  }}
                >
                  Select
                </button>
              )
            }
          ]}
          data={appointments}
          title="Today's Scheduled Appointments (HIS Sync)"
          subtitle="Real-time appointment registry from Hospital Information System"
          icon={QrCode}
          exportable={true}
          exportFileName="his_appointments"
          searchPlaceholder="Search patient name, MRN, or plate..."
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          emptyMessage="No scheduled appointments found."
          headerActions={(
            <button className="btn btn-outline btn-sm" onClick={loadAppointments} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        />
      </div>

      <QrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onValidationSuccess={(data) => {
          setValidationSuccessMsg(`Visit validated successfully! Vehicle ${data.plate_number} is authorized.`);
        }}
      />

      <VisualVehiclePickerModal
        isOpen={visualPickerOpen}
        onClose={() => setVisualPickerOpen(false)}
        patientMrn={patientMrn}
        visitorName={visitorName}
        onValidationSuccess={(data) => {
          setValidationSuccessMsg(`Vehicle ${data.plate_number} verified and validated! 3 hours free parking granted.`);
          loadAppointments();
        }}
      />
    </div>
  );
}
