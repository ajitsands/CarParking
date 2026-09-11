import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Car, 
  QrCode, 
  CreditCard, 
  ShieldAlert, 
  BarChart3, 
  Settings, 
  Users, 
  Server, 
  Clock, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function Sidebar({ activeTab, setActiveTab, onOpenSimulator }) {
  const { isSuperadmin, isAdmin, isReception } = useAuth();
  const { settings } = useSettings();

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-lanes', label: 'Live Gate Monitor', icon: Video },
    { id: 'sessions', label: 'Parking Sessions', icon: Car },
    { id: 'validation', label: 'Visitor Validation', icon: QrCode },
    { id: 'cashier', label: 'Cashier Terminal', icon: CreditCard },
    { id: 'vehicles', label: 'Vehicle Access Lists', icon: ShieldAlert },
    { id: 'reports', label: 'Reports & Audits', icon: BarChart3 }
  ];

  // For Reception, ONLY show Dashboard, Parking Sessions, and Visitor Validation
  const navItems = isReception
    ? allNavItems.filter(item => ['dashboard', 'sessions', 'validation'].includes(item.id))
    : allNavItems;

  const adminItems = [
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'users', label: 'User Management', icon: Users }
  ];

  const superadminItems = [
    { id: 'server-config', label: 'Server & DB Config', icon: Server },
    { id: 'license', label: 'License Duration', icon: Clock }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {settings.company_logo ? (
          <img src={settings.company_logo} alt="Logo" className="sidebar-brand-logo" />
        ) : (
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--accent)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#fff'
          }}>
            K
          </div>
        )}
        <div className="sidebar-brand-text">
          <h1>{settings.company_name ? settings.company_name.split(' ')[0] : 'KIMS'} PARKING</h1>
          <p>SaNDS Lab Solution</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </div>
          );
        })}

        {!isReception && isAdmin && (
          <>
            <div className="nav-section-title">Administration</div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </>
        )}

        {!isReception && isSuperadmin && (
          <>
            <div className="nav-section-title" style={{ color: 'var(--gold)' }}>
              Superadmin Control
            </div>
            {superadminItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={16} color="var(--gold)" />
                  <span style={{ color: activeTab === item.id ? '#fff' : '#fde047' }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </>
        )}

        {!isReception && (
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-warning"
              style={{ width: '100%', fontSize: '0.75rem', padding: '8px 10px', boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)' }}
              onClick={onOpenSimulator}
            >
              <Sparkles size={14} />
              Launch ANPR Simulator
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          v1.0 · SaNDS Lab Middle East
        </div>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} title="System Online" />
      </div>
    </aside>
  );
}
