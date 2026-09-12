import React, { useState } from 'react';
import { Car, Lock, User, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function LoginPage({ onExploreFeatures }) {
  const { login } = useAuth();
  const { settings } = useSettings();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #091524 0%, #0f2744 50%, #091524 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '430px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Card Header */}
        <div style={{
          padding: '24px 24px 18px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-input)'
        }}>
          {settings.company_logo ? (
            <img 
              src={settings.company_logo} 
              alt="Logo" 
              style={{ height: '44px', width: 'auto', margin: '0 auto 10px', display: 'block' }} 
            />
          ) : (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f7bc4, #1a3a5c)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              boxShadow: '0 4px 12px rgba(15, 123, 196, 0.4)'
            }}>
              <Car size={24} />
            </div>
          )}

          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {settings.company_name || 'KIMSHEALTH'}
          </h1>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Smart Multi-Industry Parking & Visitor Management System
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              marginBottom: '16px',
              border: '1px solid var(--status-red-border)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', top: 9, left: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', top: 9, left: 10, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to Control Room'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Sign-in Helper */}
          <div style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px dashed var(--border-color)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Sparkles size={12} color="var(--gold)" />
              Quick Demo Access
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '6px', fontWeight: 600 }}
                onClick={() => setDemoUser('admin', 'Admin@12345')}
              >
                Admin
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '6px', fontWeight: 600 }}
                onClick={() => setDemoUser('operator', 'User@12345')}
              >
                Operator
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '6px', fontWeight: 600, color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }}
                onClick={() => setDemoUser('receptionist', 'User@12345')}
              >
                Reception
              </button>
            </div>
          </div>

          {/* Explore Features & Landing Page Action */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onExploreFeatures || (() => window.location.href = '/landing.html')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                border: '1px solid rgba(2, 132, 199, 0.35)',
                color: '#0284c7',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Building2 size={15} />
              <span>Explore Multi-Industry Features (Home Page)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px',
          background: 'var(--bg-input)',
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-color)'
        }}>
          Powered by SaNDS Lab Middle East W.L.L · Confidential & Secure
        </div>
      </div>
    </div>
  );
}
