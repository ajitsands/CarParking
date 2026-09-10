import React, { useState, useEffect } from 'react';
import { 
  Settings, Globe, DollarSign, Clock, Building2, Upload, CheckCircle2, 
  AlertCircle, Palette, Sparkles, Receipt, Calculator, Video, Copy, Check, 
  Server, Wifi, Send, ExternalLink, Terminal, Radio, Folder, Cpu, Layers, HardDrive 
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function SettingsPage() {
  const { refreshSettings } = useSettings();
  const [formData, setFormData] = useState({
    company_name: '',
    company_subtitle: '',
    company_logo: '',
    timezone: 'Asia/Bahrain',
    date_format: 'DD/MM/YYYY',
    currency_code: 'BHD',
    default_grace_minutes: '30',
    rate_per_minute: '0.005',
    rate_per_hour: '0.200',
    rate_per_day: '2.000',
    rate_per_week: '10.000',
    rate_per_month: '35.000',
    tariff_mode: 'hourly_daily_cap',
    menu_theme: 'pink_blue',
    menu_color_primary: '#ec4899',
    menu_color_secondary: '#2563eb',
    menu_bg_style: 'gradient_accents'
  });

  const [timezones, setTimezones] = useState({});
  const [supportedCurrencies, setSupportedCurrencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // ANPR Webhook & Network State
  const [networkInfo, setNetworkInfo] = useState({
    detected_lan_ip: '192.168.100.4',
    server_port: 8000,
    local_webhook_url: 'http://192.168.100.4:8000/api/v1/webhook/anpr',
    localhost_webhook_url: 'http://127.0.0.1:8000/api/v1/webhook/anpr',
    server_webhook_url: 'https://parking.sandslab.com/api/v1/webhook/anpr',
    production_server_url: 'https://parking.sandslab.com',
    active_environment: 'local'
  });
  const [selectedWebhookType, setSelectedWebhookType] = useState('local'); // 'local' | 'server' | 'localhost'
  const [customLanIp, setCustomLanIp] = useState('');
  const [customLanPort, setCustomLanPort] = useState('8000');
  const [copiedKey, setCopiedKey] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [showPayloadGuide, setShowPayloadGuide] = useState(false);

  // Camera Manufacturer Mapping & Image Storage
  const [anprMapping, setAnprMapping] = useState({
    preset: 'dahua',
    field_plate: 'PlateNumber',
    field_gate: 'Channel',
    field_lane: 'Lane',
    field_time: 'TimeStamp',
    field_type: 'VehicleType',
    field_color: 'VehicleColor',
    field_image: 'Image',
    channel_entry: '1',
    channel_exit: '2',
    image_folder_path: 'storage/uploads/anpr_snapshots',
    resolved_abs_path: ''
  });
  const [samplePayloadText, setSamplePayloadText] = useState(JSON.stringify({
    PlateNumber: 'BHR 55443',
    PlateColor: 'Blue',
    VehicleColor: 'Silver',
    VehicleType: 'Sedan',
    TimeStamp: '2026-09-10 12:45:00',
    Channel: 1,
    Lane: 1,
    SnapPicURL: 'http://192.168.100.20/snapshot/img1.jpg'
  }, null, 2));
  const [mappingTestResult, setMappingTestResult] = useState(null);
  const [testingMapping, setTestingMapping] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getSettings();
      if (res.success) {
        setFormData(prev => ({
          ...prev,
          ...res.data.settings
        }));
        setTimezones(res.data.timezones || {});
        setSupportedCurrencies(res.data.supported_currencies || {});
        if (res.data.network_info) {
          setNetworkInfo(res.data.network_info);
          setCustomLanIp(res.data.settings?.anpr_lan_ip || res.data.network_info.detected_lan_ip || '192.168.100.4');
          setCustomLanPort(res.data.settings?.anpr_lan_port || String(res.data.network_info.server_port || 8000));
          if (res.data.settings?.anpr_webhook_mode) {
            setSelectedWebhookType(res.data.settings.anpr_webhook_mode);
          }
        }
        if (res.data.anpr_mapping) {
          setAnprMapping(res.data.anpr_mapping);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCurrencyChange = (newCode) => {
    setFormData(prev => ({
      ...prev,
      currency_code: newCode
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target.result;
        const res = await api.uploadLogo(base64);
        if (res.success) {
          setFormData(prev => ({ ...prev, company_logo: res.data.logo_url }));
          refreshSettings();
        }
      } catch (err) {
        alert(err.message || 'Logo upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 3000);
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await api.simulateAnpr({
        camera_id: 'ANPR-ENTRY-CAM-01',
        plate_number: 'BHR 11223',
        gate_code: 'GATE-IN-01',
        direction: 'ENTRY'
      });
      setTestResult({ 
        success: true, 
        data: res.data, 
        message: res.message || 'Webhook successfully received & processed!' 
      });
    } catch (err) {
      setTestResult({ 
        success: false, 
        error: err.message || 'Webhook test failed' 
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const selectVendorPreset = (vendor) => {
    if (vendor === 'dahua') {
      setAnprMapping(prev => ({
        ...prev,
        preset: 'dahua',
        field_plate: 'PlateNumber',
        field_gate: 'Channel',
        field_lane: 'Lane',
        field_time: 'TimeStamp',
        field_type: 'VehicleType',
        field_color: 'VehicleColor',
        field_image: 'Image',
        channel_entry: '1',
        channel_exit: '2'
      }));
      setSamplePayloadText(JSON.stringify({
        PlateNumber: 'BHR 55443',
        PlateColor: 'Blue',
        VehicleColor: 'Silver',
        VehicleType: 'Sedan',
        TimeStamp: '2026-09-10 12:45:00',
        Channel: 1,
        Lane: 1,
        SnapPicURL: 'http://192.168.100.20/snapshot/img1.jpg'
      }, null, 2));
    } else if (vendor === 'hikvision') {
      setAnprMapping(prev => ({
        ...prev,
        preset: 'hikvision',
        field_plate: 'licensePlate',
        field_gate: 'laneNo',
        field_lane: 'laneNo',
        field_time: 'dateTime',
        field_type: 'vehicleType',
        field_color: 'vehicleColor',
        field_image: 'picture',
        channel_entry: '1',
        channel_exit: '2'
      }));
      setSamplePayloadText(JSON.stringify({
        licensePlate: 'BHR 11223',
        laneNo: 1,
        dateTime: '2026-09-10 12:45:00',
        vehicleType: 'Car',
        vehicleColor: 'Silver',
        picture: 'http://192.168.100.21/hik_snap.jpg'
      }, null, 2));
    } else if (vendor === 'uniview') {
      setAnprMapping(prev => ({
        ...prev,
        preset: 'uniview',
        field_plate: 'PlateText',
        field_gate: 'ChannelID',
        field_lane: 'TollGateID',
        field_time: 'PassTime',
        field_type: 'CarType',
        field_color: 'PlateColor',
        field_image: 'ImageURL',
        channel_entry: '1',
        channel_exit: '2'
      }));
      setSamplePayloadText(JSON.stringify({
        PlateText: 'BHR 43212',
        ChannelID: 1,
        PassTime: '2026-09-10 12:45:00',
        CarType: 'SUV',
        PlateColor: 'White',
        ImageURL: 'http://192.168.100.22/unv_snap.jpg'
      }, null, 2));
    } else if (vendor === 'auto') {
      setAnprMapping(prev => ({ ...prev, preset: 'auto' }));
    } else {
      setAnprMapping(prev => ({ ...prev, preset: 'custom' }));
    }
  };

  const handleTestMapping = async () => {
    setTestingMapping(true);
    setMappingTestResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(samplePayloadText);
      } catch (e) {
        throw new Error('Invalid JSON in sample payload: ' + e.message);
      }
      const res = await api.testAnprMapping({
        sample_payload: parsed,
        mapping: anprMapping
      });
      if (res.success) {
        setMappingTestResult(res.data);
      }
    } catch (err) {
      setMappingTestResult({ success: false, error: err.message || 'Mapping test failed' });
    } finally {
      setTestingMapping(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setError('');

    try {
      const payload = {
        ...formData,
        anpr_lan_ip: customLanIp,
        anpr_lan_port: customLanPort,
        anpr_webhook_mode: selectedWebhookType,
        anpr_manufacturer_preset: anprMapping.preset,
        anpr_field_plate: anprMapping.field_plate,
        anpr_field_gate: anprMapping.field_gate,
        anpr_field_lane: anprMapping.field_lane,
        anpr_field_time: anprMapping.field_time,
        anpr_field_type: anprMapping.field_type,
        anpr_field_color: anprMapping.field_color,
        anpr_field_image: anprMapping.field_image,
        anpr_channel_entry: anprMapping.channel_entry,
        anpr_channel_exit: anprMapping.channel_exit,
        anpr_image_folder_path: anprMapping.image_folder_path
      };
      const res = await api.updateSettings(payload);
      if (res.success) {
        setSuccessMsg('System settings, camera field mapping, and image storage path successfully saved!');
        refreshSettings();
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isThreeDecimals = (formData.currency_code === 'BHD' || formData.currency_code === 'KWD' || formData.currency_code === 'OMR');

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          System Settings & Customization
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Configure hospital branding, logo, Gulf/India timezones, currency decimal rules, and visitor validation grace period
        </p>
      </div>

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-green-bg)',
          color: 'var(--status-green)',
          border: '1px solid var(--status-green-border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <strong>{successMsg}</strong>
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

      {/* Compute Active Webhook URL */}
      {(() => {
        const effectivePort = customLanPort || networkInfo.server_port || 8000;
        const effectiveIp = customLanIp || networkInfo.detected_lan_ip || '192.168.100.4';
        const computedLocalUrl = `http://${effectiveIp}:${effectivePort}/api/v1/webhook/anpr`;
        const activeWebhookUrl = selectedWebhookType === 'server'
          ? networkInfo.server_webhook_url
          : selectedWebhookType === 'localhost'
            ? networkInfo.localhost_webhook_url
            : computedLocalUrl;

        return (
          <form onSubmit={handleSave}>
            {/* 0. ANPR Camera Webhook Integration & Push URL Card */}
            <div className="panel" style={{
              marginBottom: '16px',
              border: '1.5px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              background: 'var(--bg-panel)'
            }}>
              <div className="panel-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ec4899 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 2px 10px rgba(236,72,153,0.35)'
                  }}>
                    <Video size={20} />
                  </div>
                  <div>
                    <span className="panel-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                      ANPR Camera Webhook Integration & Push URL
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Enter this Webhook URL into your ANPR Camera Software (Hikvision, Dahua, Uniview, Hanwha, Milestone) to push vehicle plate events into this system.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(37, 99, 235, 0.15)',
                    color: 'var(--status-blue)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    HTTP POST
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--status-green)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    Endpoint Active
                  </span>
                </div>
              </div>

              <div className="panel-body" style={{ paddingTop: '16px' }}>
                {/* Step 1: Network / Environment Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={14} color="#ec4899" />
                    Select Target Network / Environment for Camera Webhook:
                  </label>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '12px'
                  }}>
                    {/* 1. Local Network Option */}
                    <div
                      onClick={() => setSelectedWebhookType('local')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: selectedWebhookType === 'local' 
                          ? '2px solid #ec4899' 
                          : '1px solid var(--border-color)',
                        background: selectedWebhookType === 'local' 
                          ? 'rgba(236, 72, 153, 0.08)' 
                          : 'var(--bg-input)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: selectedWebhookType === 'local' ? '#ec4899' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wifi size={15} /> Local Network (LAN IP)
                        </span>
                        {selectedWebhookType === 'local' && (
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Active Selection</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Use when ANPR cameras and this server run on the same local hospital/building network subnet.
                      </p>
                      <div style={{
                        marginTop: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {computedLocalUrl}
                      </div>
                    </div>

                    {/* 2. Cloud Server Option */}
                    <div
                      onClick={() => setSelectedWebhookType('server')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: selectedWebhookType === 'server' 
                          ? '2px solid #2563eb' 
                          : '1px solid var(--border-color)',
                        background: selectedWebhookType === 'server' 
                          ? 'rgba(37, 99, 235, 0.08)' 
                          : 'var(--bg-input)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: selectedWebhookType === 'server' ? '#2563eb' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Server size={15} /> Cloud Server (Domain URL)
                        </span>
                        {selectedWebhookType === 'server' && (
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Active Selection</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Use when deployed on a public domain name (e.g. parking.sandslab.com) with SSL encryption.
                      </p>
                      <div style={{
                        marginTop: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {networkInfo.server_webhook_url}
                      </div>
                    </div>

                    {/* 3. Localhost Option */}
                    <div
                      onClick={() => setSelectedWebhookType('localhost')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: selectedWebhookType === 'localhost' 
                          ? '2px solid #10b981' 
                          : '1px solid var(--border-color)',
                        background: selectedWebhookType === 'localhost' 
                          ? 'rgba(16, 185, 129, 0.08)' 
                          : 'var(--bg-input)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: selectedWebhookType === 'localhost' ? '#10b981' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Terminal size={15} /> Localhost (127.0.0.1)
                        </span>
                        {selectedWebhookType === 'localhost' && (
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Active Selection</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Use for testing directly on this same machine via Postman, curl, or development tools.
                      </p>
                      <div style={{
                        marginTop: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {networkInfo.localhost_webhook_url}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Primary Webhook URL Box with Copy Button */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)',
                  border: '1.5px solid #ec4899',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '14px',
                  boxShadow: '0 4px 16px rgba(236,72,153,0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ec4899' }}>
                      Selected ANPR Camera Webhook URL (Copy to Camera Software)
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Method: <strong style={{ color: '#fff' }}>POST</strong> | Format: <strong style={{ color: '#fff' }}>JSON</strong>
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      flex: 1,
                      minWidth: '280px',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#38bdf8',
                      overflowX: 'auto',
                      wordBreak: 'break-all',
                      userSelect: 'all'
                    }}>
                      {activeWebhookUrl}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => copyToClipboard(activeWebhookUrl, 'main_url')}
                        style={{
                          background: copiedKey === 'main_url' ? '#10b981' : 'linear-gradient(135deg, #ec4899 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          fontWeight: 700
                        }}
                      >
                        {copiedKey === 'main_url' ? <Check size={16} /> : <Copy size={16} />}
                        {copiedKey === 'main_url' ? 'Copied URL!' : 'Copy Webhook URL'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={testingWebhook}
                        onClick={handleTestWebhook}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}
                        title="Send a sample ANPR plate detection to test connection"
                      >
                        <Send size={15} />
                        {testingWebhook ? 'Testing...' : 'Test Webhook'}
                      </button>
                    </div>
                  </div>

                  {/* If Local Network: Configurable IP & Port */}
                  {selectedWebhookType === 'local' && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      fontSize: '0.78rem'
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Server LAN IP:</span>
                      <input
                        type="text"
                        className="form-input"
                        value={customLanIp}
                        onChange={(e) => setCustomLanIp(e.target.value)}
                        placeholder="e.g. 192.168.100.4"
                        style={{ width: '150px', padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>Port:</span>
                      <input
                        type="text"
                        className="form-input"
                        value={customLanPort}
                        onChange={(e) => setCustomLanPort(e.target.value)}
                        placeholder="8000"
                        style={{ width: '70px', padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                      />
                      {networkInfo.detected_lan_ip && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setCustomLanIp(networkInfo.detected_lan_ip);
                            setCustomLanPort(String(networkInfo.server_port || 8000));
                          }}
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        >
                          Use Host Detected IP ({networkInfo.detected_lan_ip})
                        </button>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                        💡 Tip: Set a static LAN IP on this host server so cameras never lose connection.
                      </span>
                    </div>
                  )}
                </div>

                {/* Test Webhook Result Alert */}
                {testResult && (
                  <div style={{
                    marginBottom: '14px',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.8rem'
                  }}>
                    {testResult.success ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: testResult.success ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                        {testResult.success ? 'Webhook Ping Successful!' : 'Webhook Ping Failed'}
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        {testResult.message || testResult.error}
                      </div>
                      {testResult.data && (
                        <div style={{
                          marginTop: '6px',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)'
                        }}>
                          Session: <strong>{testResult.data.session_code}</strong> | Barrier Action: <strong>{testResult.data.barrier_open ? 'BARRIER OPENED' : 'BARRIER CLOSED'}</strong> | Relay Command: <strong>{testResult.data.relay_info?.command || 'RELAY_PULSE'}</strong>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTestResult(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Step 3: Payload Guide & Camera Compatibility Dropdown */}
                <div style={{
                  background: 'var(--bg-input)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  <div
                    onClick={() => setShowPayloadGuide(!showPayloadGuide)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                      <Terminal size={14} color="#ec4899" />
                      <span>ANPR Camera Software Push Payload Specification & Sample JSON</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {showPayloadGuide ? 'Hide Specification ▲' : 'View Payload Specification ▼'}
                    </div>
                  </div>

                  {showPayloadGuide && (
                    <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                      <div style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>
                        Configure your ANPR camera (or LPR edge software) to send an <strong>HTTP POST</strong> request with header <code>Content-Type: application/json</code> and the following body schema:
                      </div>

                      <div style={{ position: 'relative' }}>
                        <pre style={{
                          background: 'rgba(0,0,0,0.5)',
                          padding: '12px',
                          borderRadius: '6px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: '#a7f3d0',
                          overflowX: 'auto',
                          margin: 0
                        }}>{`{
  "camera_id": "ANPR-ENTRY-CAM-01",
  "plate_number": "BHR 11223",
  "gate_code": "GATE-IN-01",
  "direction": "ENTRY",
  "confidence": 98.5,
  "vehicle_type": "car",
  "image_base64": "/9j/4AAQSkZJRg...",
  "timestamp": "2026-09-10 12:30:00"
}`}</pre>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => copyToClipboard(`{\n  "camera_id": "ANPR-ENTRY-CAM-01",\n  "plate_number": "BHR 11223",\n  "gate_code": "GATE-IN-01",\n  "direction": "ENTRY",\n  "confidence": 98.5,\n  "vehicle_type": "car",\n  "image_base64": "",\n  "timestamp": "2026-09-10 12:30:00"\n}`, 'sample_json')}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '0.7rem',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copiedKey === 'sample_json' ? <Check size={12} /> : <Copy size={12} />}
                          {copiedKey === 'sample_json' ? 'Copied JSON!' : 'Copy Sample JSON'}
                        </button>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Compatible Camera Systems:</span>
                        <span className="badge badge-gray">Hikvision ANPR (HTTP Listening)</span>
                        <span className="badge badge-gray">Dahua ITC (HTTP Push)</span>
                        <span className="badge badge-gray">Uniview LPR (Alarm Push)</span>
                        <span className="badge badge-gray">Hanwha Techwin</span>
                        <span className="badge badge-gray">Milestone XProtect</span>
                        <span className="badge badge-gray">Generic JSON Webhook</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Camera Manufacturer Presets & Field Mapping */}
                <div style={{
                  marginTop: '16px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={16} color="#ec4899" />
                      <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        Camera Manufacturer Profile & Parameter Mapping
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Auto-maps different camera JSON parameter names (Dahua, Hikvision, Uniview, Custom)
                    </span>
                  </div>

                  {/* Vendor Preset Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <button
                      type="button"
                      onClick={() => selectVendorPreset('dahua')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: anprMapping.preset === 'dahua' ? '2px solid #ec4899' : '1px solid var(--border-color)',
                        background: anprMapping.preset === 'dahua' ? 'rgba(236,72,153,0.15)' : 'var(--bg-panel)',
                        color: anprMapping.preset === 'dahua' ? '#ec4899' : 'var(--text-primary)'
                      }}
                    >
                      📷 Dahua Technology (ITC Series)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectVendorPreset('hikvision')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: anprMapping.preset === 'hikvision' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                        background: anprMapping.preset === 'hikvision' ? 'rgba(37,99,235,0.15)' : 'var(--bg-panel)',
                        color: anprMapping.preset === 'hikvision' ? '#2563eb' : 'var(--text-primary)'
                      }}
                    >
                      📷 Hikvision (Smart LPR)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectVendorPreset('uniview')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: anprMapping.preset === 'uniview' ? '2px solid #10b981' : '1px solid var(--border-color)',
                        background: anprMapping.preset === 'uniview' ? 'rgba(16,185,129,0.15)' : 'var(--bg-panel)',
                        color: anprMapping.preset === 'uniview' ? '#10b981' : 'var(--text-primary)'
                      }}
                    >
                      📷 Uniview (UNV LPR)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectVendorPreset('auto')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: anprMapping.preset === 'auto' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                        background: anprMapping.preset === 'auto' ? 'rgba(139,92,246,0.15)' : 'var(--bg-panel)',
                        color: anprMapping.preset === 'auto' ? '#8b5cf6' : 'var(--text-primary)'
                      }}
                    >
                      🤖 Auto-Detect (All Brands)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectVendorPreset('custom')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: anprMapping.preset === 'custom' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                        background: anprMapping.preset === 'custom' ? 'rgba(245,158,11,0.15)' : 'var(--bg-panel)',
                        color: anprMapping.preset === 'custom' ? '#f59e0b' : 'var(--text-primary)'
                      }}
                    >
                      ⚙️ Custom Parameter Mapping
                    </button>
                  </div>

                  {/* Mapping Fields Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>License Plate Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_plate}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_plate: e.target.value })}
                        placeholder="PlateNumber"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Channel / Gate Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_gate}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_gate: e.target.value })}
                        placeholder="Channel"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Timestamp Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_time}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_time: e.target.value })}
                        placeholder="TimeStamp"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Vehicle Type Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_type}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_type: e.target.value })}
                        placeholder="VehicleType"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Vehicle / Plate Color Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_color}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_color: e.target.value })}
                        placeholder="VehicleColor"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Image / Snapshot Key</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.field_image}
                        onChange={(e) => setAnprMapping({ ...anprMapping, field_image: e.target.value })}
                        placeholder="Image"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Channel for Entry Gate</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.channel_entry}
                        onChange={(e) => setAnprMapping({ ...anprMapping, channel_entry: e.target.value })}
                        placeholder="1"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Channel for Exit Gate</label>
                      <input
                        type="text"
                        className="form-input"
                        value={anprMapping.channel_exit}
                        onChange={(e) => setAnprMapping({ ...anprMapping, channel_exit: e.target.value })}
                        placeholder="2"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>

                  {/* Step 4: Image Upload Folder Path */}
                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Folder size={15} color="#2563eb" />
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        Camera Image & Snapshot Storage Folder Path
                      </span>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Folder Active & Writable</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'center' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Configured Directory Path (Relative or Absolute):</label>
                        <input
                          type="text"
                          className="form-input"
                          value={anprMapping.image_folder_path}
                          onChange={(e) => setAnprMapping({ ...anprMapping, image_folder_path: e.target.value })}
                          placeholder="storage/uploads/anpr_snapshots"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.72rem'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Resolved Absolute Path on Host Disk:</div>
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          {anprMapping.resolved_abs_path || 'E:\\parkingsolution\\backend\\storage\\uploads\\anpr_snapshots'}
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      💡 Incoming plate pictures pushed by Dahua/Hikvision cameras (Base64 data, multipart binary, or downloaded snapshots) will be saved here automatically.
                    </p>
                  </div>

                  {/* Step 5: Interactive Live Payload Tester */}
                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} color="#ec4899" />
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                          Test Camera Parameter Mapping (Paste Sample JSON):
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={testingMapping}
                        onClick={handleTestMapping}
                        style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Send size={12} />
                        {testingMapping ? 'Validating...' : 'Test Field Mapping'}
                      </button>
                    </div>

                    <textarea
                      className="form-input"
                      rows="5"
                      value={samplePayloadText}
                      onChange={(e) => setSamplePayloadText(e.target.value)}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#a7f3d0'
                      }}
                    />

                    {/* Mapping Test Result Display */}
                    {mappingTestResult && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: mappingTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${mappingTestResult.success ? '#10b981' : '#ef4444'}`,
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ fontWeight: 800, color: mappingTestResult.success ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
                          {mappingTestResult.success ? '✓ Mapping Test Passed: Fields Successfully Extracted!' : '✗ Mapping Error'}
                        </div>
                        {mappingTestResult.success ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.74rem',
                            marginTop: '6px'
                          }}>
                            <div>Plate: <strong style={{ color: '#fff' }}>{mappingTestResult.plate_number}</strong></div>
                            <div>Gate: <strong style={{ color: '#fff' }}>{mappingTestResult.gate_id}</strong></div>
                            <div>Direction: <strong style={{ color: '#10b981' }}>{mappingTestResult.direction}</strong></div>
                            <div>Vehicle Type: <strong style={{ color: '#fff' }}>{mappingTestResult.vehicle_type}</strong></div>
                            <div>Color: <strong style={{ color: '#fff' }}>{mappingTestResult.vehicle_color || 'N/A'}</strong></div>
                            <div>Image Data: <strong style={{ color: '#fff' }}>{mappingTestResult.has_image ? mappingTestResult.image_type : 'None'}</strong></div>
                          </div>
                        ) : (
                          <div style={{ color: '#ef4444' }}>{mappingTestResult.error || 'Plate number not found with current key.'}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
          {/* Branding & Hospital Info */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Building2 size={16} /> Hospital Branding & Identity
              </span>
            </div>
            <div className="panel-body">
              <div className="form-group">
                <label className="form-label">Hospital / Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Subtitle / Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.company_subtitle}
                  onChange={(e) => setFormData({ ...formData, company_subtitle: e.target.value })}
                />
              </div>

              {/* Logo Uploader */}
              <div className="form-group">
                <label className="form-label">Hospital Brand Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                  {formData.company_logo ? (
                    <img
                      src={formData.company_logo}
                      alt="Logo"
                      style={{ height: '48px', width: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', background: 'var(--bg-input)', border: '1px dashed var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      No Logo
                    </div>
                  )}

                  <div>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      <Upload size={13} /> Select Logo File
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </label>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      PNG, JPG, or SVG recommended
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Localization, Timezone & Currency Rules */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Globe size={16} /> Timezone & Currency Specifications
              </span>
            </div>
            <div className="panel-body">
              {/* Timezone (Gulf & India) */}
              <div className="form-group">
                <label className="form-label">
                  <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Regional Timezone (Gulf & India) *
                </label>
                <select
                  className="form-select"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  {Object.entries(timezones).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div className="form-group">
                <label className="form-label">System Date Format</label>
                <select
                  className="form-select"
                  value={formData.date_format}
                  onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 10/09/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-10)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/10/2026)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 10-Sep-2026)</option>
                </select>
              </div>

              {/* Currency Selector with Automatic Decimal Rule */}
              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Operating Currency *
                </label>
                <select
                  className="form-select"
                  value={formData.currency_code}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {Object.entries(supportedCurrencies).map(([code, cur]) => (
                    <option key={code} value={code}>
                      {code} — {cur.name} ({cur.symbol}) · {cur.decimals} Decimals
                    </option>
                  ))}
                </select>
              </div>

              {/* Decimal Precision Notice */}
              <div style={{
                padding: '8px 12px',
                background: isThreeDecimals ? 'var(--status-amber-bg)' : 'var(--status-blue-bg)',
                border: `1px solid ${isThreeDecimals ? 'var(--status-amber-border)' : 'var(--status-blue-border)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                color: isThreeDecimals ? 'var(--status-amber)' : 'var(--status-blue)',
                marginBottom: '14px'
              }}>
                <strong>Precision Rule: </strong>
                {isThreeDecimals ? (
                  <span>Bahrain (BHD) is locked to <strong>3 decimal places</strong> (e.g. BD 0.100).</span>
                ) : (
                  <span>Standard <strong>2 decimal places</strong> applied (e.g. {formData.currency_code} 10.00).</span>
                )}
              </div>

              {/* Admin Configurable Grace Minutes */}
              <div className="form-group">
                <label className="form-label">
                  Visitor Validation Grace Period (Minutes) *
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.default_grace_minutes}
                    onChange={(e) => setFormData({ ...formData, default_grace_minutes: e.target.value })}
                    min="1"
                    max="180"
                    style={{ width: '120px' }}
                    required
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>minutes</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Unvalidated sessions automatically flip to CHARGING after this duration (e.g. 5m, 10m, 30m, 45m).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Tier Parking Tariff Rates Configuration */}
        <div className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <span className="panel-title">
              <Receipt size={16} /> Parking Tariff Rates & Net Fee Calculations (Admin Configurable)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Rates used to compute visitor parking fees and prepaid passes
            </span>
          </div>
          <div className="panel-body">
            <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Define standard charges per minute, hour, day, week, and month. Vehicles without hospital validation or exceeding the grace period are charged automatically using these rates.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {/* Per Minute Charge */}
              <div className="form-group">
                <label className="form-label">
                  Per Minute Charge ({formData.currency_code})
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.001"
                    className="form-input"
                    value={formData.rate_per_minute}
                    onChange={(e) => setFormData({ ...formData, rate_per_minute: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Applied when minute-based billing is active
                </div>
              </div>

              {/* Per Hour Charge */}
              <div className="form-group">
                <label className="form-label">
                  Per Hour Charge ({formData.currency_code}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.010"
                    className="form-input"
                    value={formData.rate_per_hour}
                    onChange={(e) => setFormData({ ...formData, rate_per_hour: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Standard hourly parking rate after grace period
                </div>
              </div>

              {/* Per Day Charge (24-Hour Cap) */}
              <div className="form-group">
                <label className="form-label">
                  Per Day Charge / 24h Cap ({formData.currency_code}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.050"
                    className="form-input"
                    value={formData.rate_per_day}
                    onChange={(e) => setFormData({ ...formData, rate_per_day: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Daily parking pass rate & maximum 24h charge
                </div>
              </div>

              {/* Per Week Charge */}
              <div className="form-group">
                <label className="form-label">
                  Per Week Charge ({formData.currency_code}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.100"
                    className="form-input"
                    value={formData.rate_per_week}
                    onChange={(e) => setFormData({ ...formData, rate_per_week: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Prepaid 7-day pass rate
                </div>
              </div>

              {/* Per Month Charge */}
              <div className="form-group">
                <label className="form-label">
                  Per Month Charge ({formData.currency_code}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.500"
                    className="form-input"
                    value={formData.rate_per_month}
                    onChange={(e) => setFormData({ ...formData, rate_per_month: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Prepaid 30-day monthly pass subscription
                </div>
              </div>

              {/* Tariff Calculation Mode */}
              <div className="form-group">
                <label className="form-label">
                  Calculation Mode *
                </label>
                <select
                  className="form-select"
                  value={formData.tariff_mode}
                  onChange={(e) => setFormData({ ...formData, tariff_mode: e.target.value })}
                >
                  <option value="hourly_daily_cap">Hourly Rate with 24h Daily Cap (Recommended)</option>
                  <option value="per_minute">Strict Per-Minute Linear Billing</option>
                </select>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Determines how active session net fees accumulate
                </div>
              </div>
            </div>

            {/* Calculation Formula Preview Box */}
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={14} color="var(--accent)" /> Net Fee Calculation Formula Summary:
              </div>
              <div>• <strong>Duration ≤ {formData.default_grace_minutes} mins:</strong> Net Fee = <strong>{formData.currency_code} 0.000</strong> (100% Free Within Grace Period).</div>
              <div>• <strong>Duration &gt; {formData.default_grace_minutes} mins:</strong> Chargeable time = Total Duration - {formData.default_grace_minutes} mins.</div>
              <div>• <strong>Hourly Billing:</strong> Charged at <strong>{formData.currency_code} {formData.rate_per_hour}/hr</strong> up to a maximum daily cap of <strong>{formData.currency_code} {formData.rate_per_day}</strong> per 24 hours.</div>
              <div>• <strong>Prepaid Passes:</strong> Whitelisted vehicles with an active daily, weekly, or monthly pass are charged <strong>{formData.currency_code} 0.000</strong> at the barrier!</div>
            </div>
          </div>
        </div>

        {/* Navigation Menu Appearance & Pink-Blue Theme Customizer */}
        <div className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <span className="panel-title">
              <Palette size={16} /> Navigation Menu Color & Theme (Admin Configurable)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Default: Pink & Blue Combination
            </span>
          </div>
          <div className="panel-body">
            <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Configure the horizontal navigation menu theme and duo-tone color combinations. All system operators and administrators will see this theme applied.
            </div>

            {/* Quick Color Presets */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Popular Duo-Tone Theme Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', marginTop: '6px' }}>
                {[
                  { id: 'pink_blue', label: 'Pink & Blue (Default)', primary: '#ec4899', secondary: '#2563eb' },
                  { id: 'hotpink_navy', label: 'Hot Pink & Royal Blue', primary: '#f43f5e', secondary: '#1d4ed8' },
                  { id: 'magenta_cyan', label: 'Cyber Magenta & Cyan', primary: '#d946ef', secondary: '#06b6d4' },
                  { id: 'sunset_berry', label: 'Sunset Berry & Cobalt', primary: '#e11d48', secondary: '#3b82f6' },
                  { id: 'rose_indigo', label: 'Rose Pink & Deep Indigo', primary: '#fb7185', secondary: '#4f46e5' }
                ].map((preset) => {
                  const isSelected = formData.menu_color_primary === preset.primary && formData.menu_color_secondary === preset.secondary;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        menu_theme: preset.id,
                        menu_color_primary: preset.primary,
                        menu_color_secondary: preset.secondary
                      }))}
                      style={{
                        padding: '10px 12px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(236, 72, 153, 0.08)' : 'var(--bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        flexShrink: 0
                      }} />
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {preset.label}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                          {preset.primary} · {preset.secondary}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  Primary Color (Pink Tone Accent)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={formData.menu_color_primary}
                    onChange={(e) => setFormData(prev => ({ ...prev, menu_color_primary: e.target.value }))}
                    style={{ width: '42px', height: '36px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.menu_color_primary}
                    onChange={(e) => setFormData(prev => ({ ...prev, menu_color_primary: e.target.value }))}
                    placeholder="#ec4899"
                    style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Secondary Color (Blue Tone Accent)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={formData.menu_color_secondary}
                    onChange={(e) => setFormData(prev => ({ ...prev, menu_color_secondary: e.target.value }))}
                    style={{ width: '42px', height: '36px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.menu_color_secondary}
                    onChange={(e) => setFormData(prev => ({ ...prev, menu_color_secondary: e.target.value }))}
                    placeholder="#2563eb"
                    style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Menu Bar Background Style
                </label>
                <select
                  className="form-select"
                  value={formData.menu_bg_style}
                  onChange={(e) => setFormData(prev => ({ ...prev, menu_bg_style: e.target.value }))}
                >
                  <option value="gradient_accents">Sleek Dark with Pink-Blue Gradient Accents (Default)</option>
                  <option value="gradient_full">Vivid Pink-to-Blue Full Gradient Bar</option>
                  <option value="glassmorphic">Glassmorphic Frosted Slate with Glowing Border</option>
                </select>
              </div>
            </div>

            {/* Live Preview Strip */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color={formData.menu_color_primary} /> Live Menu Preview
              </label>
              <div style={{
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '6px',
                background: formData.menu_bg_style === 'gradient_full'
                  ? `linear-gradient(90deg, ${formData.menu_color_primary} 0%, #7c3aed 50%, ${formData.menu_color_secondary} 100%)`
                  : '#0f172a',
                border: `1px solid rgba(255,255,255,0.15)`,
                borderTop: `2px solid transparent`,
                borderImage: `linear-gradient(to right, ${formData.menu_color_primary}, ${formData.menu_color_secondary}) 1`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: `linear-gradient(135deg, ${formData.menu_color_primary} 0%, ${formData.menu_color_secondary} 100%)`,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    boxShadow: `0 3px 12px ${formData.menu_color_primary}55`
                  }}>
                    Dashboard (Active)
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.8rem'
                  }}>
                    Live Gate Monitor
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.8rem'
                  }}>
                    Visitor Validation
                  </div>
                </div>

                <div style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${formData.menu_color_primary} 0%, ${formData.menu_color_secondary} 100%)`,
                  color: '#fff',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  ANPR Simulator
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    );
  })()}
</div>
);
}
