import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, Building2, ShieldCheck, LogOut, KeyRound } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function Navbar({ onOpenPasswordModal }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { settings, license } = useSettings();

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const tz = settings.timezone || 'Asia/Bahrain';
        const formatted = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(now);
        setCurrentTime(formatted);
      } catch (e) {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [settings.timezone]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          {settings.company_logo ? (
            <img src={settings.company_logo} alt="Logo" style={{ height: '28px', width: 'auto', borderRadius: '4px' }} />
          ) : (
            <div style={{
              width: '28px',
              height: '28px',
              background: 'linear-gradient(135deg, #ec4899, #2563eb)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)'
            }}>
              K
            </div>
          )}
          <span>{settings.company_name || 'KIMSHEALTH'}</span>
          <span className="topbar-hospital-pill">
            <Building2 size={12} />
            Smart Parking Solution
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live Clock with Timezone */}
        <div className="clock-pill" title={`Configured Timezone: ${settings.timezone || 'Asia/Bahrain'}`}>
          <Clock size={13} color="var(--accent)" />
          <span>{currentTime}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            ({(settings.timezone || 'Asia/Bahrain').split('/')[1] || 'Gulf'})
          </span>
        </div>

        {/* Currency Pill */}
        <div className="currency-pill" title={`Currency: ${settings.currency_code || 'BHD'} (${settings.currency_decimals || 3} decimals)`}>
          <span>{settings.currency_symbol || 'BD'}</span>
          <span style={{ fontSize: '0.65rem' }}>{settings.currency_code || 'BHD'}</span>
        </div>

        {/* Software License Pill */}
        {license && (
          <div 
            className={`license-pill ${license.status === 'active' ? (license.days_remaining > 30 ? 'active' : 'warning') : 'expired'}`}
            title={`License Expires: ${license.expires_at || 'Perpetual'}`}
          >
            <ShieldCheck size={13} />
            <span>
              {license.status === 'active' ? `${license.days_remaining}d Validity` : 'License Expired'}
            </span>
          </div>
        )}

        {/* Theme Toggle (Light by default, Dark optional) */}
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User Pill */}
        {user && (
          <div className="user-menu-pill">
            <div className="user-avatar-circle">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className="user-pill-name">{user.full_name || user.username}</span>
              <span className="user-role-badge">{user.role}</span>
            </div>
            
            <button 
              type="button" 
              className="btn-icon" 
              style={{ width: '26px', height: '26px', marginLeft: '4px' }}
              onClick={onOpenPasswordModal}
              title="Change Password"
            >
              <KeyRound size={13} />
            </button>

            <button 
              type="button" 
              className="btn-icon" 
              style={{ width: '26px', height: '26px' }}
              onClick={logout}
              title="Logout"
            >
              <LogOut size={13} color="var(--status-red)" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
