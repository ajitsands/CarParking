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
  Sparkles,
  WalletCards,
  Key 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function HorizontalMenu({ activeTab, setActiveTab, onOpenSimulator }) {
  const { isSuperadmin, isAdmin } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-lanes', label: 'Live Gate Monitor', icon: Video },
    { id: 'sessions', label: 'Parking Sessions', icon: Car },
    { id: 'prepaid', label: 'Prepaid Passes', icon: WalletCards },
    { id: 'validation', label: 'Visitor Validation', icon: QrCode },
    { id: 'cashier', label: 'Cashier Terminal', icon: CreditCard },
    { id: 'vehicles', label: 'Access Lists', icon: ShieldAlert },
    { id: 'reports', label: 'Reports & Audits', icon: BarChart3 }
  ];

  const adminItems = [
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'users', label: 'User Management', icon: Users }
  ];

  const superadminItems = [
    { id: 'server-config', label: 'Server & DB', icon: Server },
    { id: 'license', label: 'Software License', icon: Key }
  ];

  // Admin configurable menu colors (Default: Pink & Blue combination)
  const primaryColor = settings.menu_color_primary || '#ec4899';     // Pink
  const secondaryColor = settings.menu_color_secondary || '#2563eb'; // Blue
  const bgStyle = settings.menu_bg_style || 'gradient_accents';

  // Compute CSS styles based on background style
  let menuBarStyle = {};
  if (bgStyle === 'gradient_full') {
    menuBarStyle = {
      background: `linear-gradient(90deg, ${primaryColor} 0%, #7c3aed 50%, ${secondaryColor} 100%)`,
      borderBottom: '2px solid rgba(255, 255, 255, 0.25)',
      boxShadow: '0 4px 18px rgba(236, 72, 153, 0.2)'
    };
  } else if (bgStyle === 'glassmorphic') {
    menuBarStyle = {
      background: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(10px)',
      borderBottom: `2px solid ${primaryColor}`,
      boxShadow: `0 4px 20px ${secondaryColor}25`
    };
  } else {
    // Default: 'gradient_accents' (Sleek dark bar with Pink-Blue top/bottom gradients & glowing pills)
    menuBarStyle = {
      background: 'var(--bg-horizontal-menu, #0f172a)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      borderTop: `2px solid transparent`,
      borderImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor}) 1`,
      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.25)'
    };
  }

  return (
    <nav 
      className={`horizontal-menu-bar style-${bgStyle}`} 
      style={menuBarStyle}
      aria-label="Main Navigation"
    >
      <div className="horizontal-menu-inner">
        {/* Operations Navigation Links */}
        <div className="menu-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`horizontal-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  borderColor: primaryColor,
                  color: '#ffffff',
                  boxShadow: `0 3px 14px ${primaryColor}55`
                } : {}}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Administration Section */}
        {isAdmin && (
          <>
            <div className="menu-divider" />
            <div className="menu-group">
              <span className="menu-group-tag admin">Admin</span>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`horizontal-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      borderColor: primaryColor,
                      color: '#ffffff',
                      boxShadow: `0 3px 14px ${primaryColor}55`
                    } : {}}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Superadmin Section */}
        {isSuperadmin && (
          <>
            <div className="menu-divider" />
            <div className="menu-group">
              <span className="menu-group-tag superadmin">Superadmin</span>
              {superadminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`horizontal-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    style={isActive ? {
                      background: `linear-gradient(135deg, #f59e0b 0%, ${primaryColor} 100%)`,
                      borderColor: '#f59e0b',
                      color: '#ffffff',
                      boxShadow: '0 3px 14px rgba(245, 158, 11, 0.45)'
                    } : {
                      color: '#fef08a'
                    }}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Far Right Action: In-App ANPR Camera Simulator */}
        <div className="menu-right-actions">
          <button
            type="button"
            className="btn-anpr-simulator-pulse"
            onClick={onOpenSimulator}
            title="Open Live ANPR Camera Event Simulator"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              boxShadow: `0 2px 10px ${primaryColor}50`
            }}
          >
            <Sparkles size={14} className="sparkle-anim" />
            <span>ANPR Simulator</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
