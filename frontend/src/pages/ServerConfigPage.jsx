import React, { useState, useEffect } from 'react';
import { Server, Database, Save, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function ServerConfigPage() {
  const [config, setConfig] = useState({
    environment: 'local',
    server_url: 'http://localhost:8000',
    db_host: '127.0.0.1',
    db_port: 3306,
    db_name: 'car_parking_solution',
    db_user: 'root',
    db_password: '',
    production_server_url: 'https://parking.sandslab.com',
    production_db_host: 'parking.sandslab.com',
    production_db_port: 3306,
    production_db_name: 'sandsl23_parking_db',
    production_db_user: 'sandsl23_parking_users',
    production_db_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const loadConfig = async () => {
    try {
      const res = await api.getServerConfig();
      if (res.success) {
        setConfig(prev => ({
          ...prev,
          ...res.data.config
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load server configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.updateServerConfig(config);
      if (res.success) {
        setSuccessMsg('Server & Database parameters successfully updated by Superadmin!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update server parameters');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Server URL & MySQL Database Configuration
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Superadmin exclusive portal to configure central server endpoint, database host, name, and connection credentials
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: 'var(--status-purple-bg)',
        border: '1px solid var(--status-purple-border)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '16px',
        color: 'var(--status-purple)'
      }}>
        <ShieldAlert size={20} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          <strong>Superadmin Authority:</strong> Modifications here directly govern backend database routing and the target server environment.
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

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Active / Local Server Settings */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Server size={16} /> Local / Current Environment Settings
              </span>
              <span className="badge badge-blue">{config.environment.toUpperCase()}</span>
            </div>
            <div className="panel-body">
              <div className="form-group">
                <label className="form-label">Active Environment Mode</label>
                <select
                  className="form-select"
                  value={config.environment}
                  onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                >
                  <option value="local">Localhost (Development)</option>
                  <option value="production">Production Server (parking.sandslab.com)</option>
                  <option value="custom">Custom Server</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Server Application URL *</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.server_url}
                  onChange={(e) => setConfig({ ...config, server_url: e.target.value })}
                  placeholder="e.g. http://localhost:8000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Host *</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.db_host}
                  onChange={(e) => setConfig({ ...config, db_host: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.db_name}
                  onChange={(e) => setConfig({ ...config, db_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Username *</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.db_user}
                  onChange={(e) => setConfig({ ...config, db_user: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={config.db_password}
                    onChange={(e) => setConfig({ ...config, db_password: e.target.value })}
                    placeholder="Leave blank to keep existing"
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ position: 'absolute', right: 4, top: 4, height: 26, width: 26 }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Production Server Parameters */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Database size={16} /> Production Server Parameters (parking.sandslab.com)
              </span>
              <span className="badge badge-green">PRODUCTION READY</span>
            </div>
            <div className="panel-body">
              <div className="form-group">
                <label className="form-label">Production Server URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.production_server_url}
                  onChange={(e) => setConfig({ ...config, production_server_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Production Database Host</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.production_db_host}
                  onChange={(e) => setConfig({ ...config, production_db_host: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Production Database Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.production_db_name}
                  onChange={(e) => setConfig({ ...config, production_db_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Production Database User</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.production_db_user}
                  onChange={(e) => setConfig({ ...config, production_db_user: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Production Database Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={config.production_db_password}
                  onChange={(e) => setConfig({ ...config, production_db_password: e.target.value })}
                  placeholder="Enter production password"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Server Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
