import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles, 
  WalletCards, 
  Key, 
  ChevronDown, 
  Monitor 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';

export default function HorizontalMenu({ activeTab, setActiveTab, onOpenSimulator }) {
  const { isSuperadmin, isAdmin, isReception } = useAuth();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isDark = theme === 'dark';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-lanes', label: 'Live Gate Monitor', icon: Video },
    { id: 'sessions', label: 'Parking Sessions', icon: Car },
    { id: 'prepaid', label: 'Prepaid Passes', icon: WalletCards },
    { id: 'validation', label: 'Visitor Validation', icon: QrCode },
    { id: 'cashier', label: 'Cashier Terminal', icon: CreditCard },
    { id: 'vehicles', label: 'Access Lists', icon: ShieldAlert },
    { id: 'reports', label: 'Reports & Audits', icon: BarChart3 },
    { id: 'display-board', label: 'Display Board', icon: Monitor }
  ];

  // For Reception, ONLY show Dashboard, Parking Sessions, and Visitor Validation
  const navItems = isReception
    ? allNavItems.filter(item => ['dashboard', 'sessions', 'validation'].includes(item.id))
    : allNavItems;

  // Admin configurable menu colors (Default: Pink & Blue combination)
  const primaryColor = settings.menu_color_primary || '#ec4899';     // Pink
  const secondaryColor = settings.menu_color_secondary || '#2563eb'; // Blue
  const bgStyle = settings.menu_bg_style || 'gradient_accents';

  // Check if any settings sub-tab is currently active
  const isSettingsActive = ['settings', 'users', 'server-config', 'license'].includes(activeTab);

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

  // Theme-aware dropdown styling tokens
  const dd = {
    bg: isDark ? 'rgba(15, 23, 42, 0.98)' : '#ffffff',
    border: isDark ? '1px solid rgba(236, 72, 153, 0.35)' : '1px solid #e2e8f0',
    shadow: isDark 
      ? '0 10px 35px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)' 
      : '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    textColor: isDark ? '#e2e8f0' : '#0f172a',
    subtextColor: isDark ? '#94a3b8' : '#64748b',
    headerColor: isDark ? '#94a3b8' : '#64748b',
    dividerColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
    hoverBg: isDark ? 'rgba(236, 72, 153, 0.16)' : '#f8fafc',
    activeBg: isDark ? 'rgba(236, 72, 153, 0.22)' : 'rgba(236, 72, 153, 0.12)',
    activeColor: isDark ? '#f472b6' : '#db2777'
  };

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

        {/* Right Section: Divider -> Settings Menu Dropdown -> ANPR Simulator */}
        <div className="menu-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Divider */}
          <div className="menu-divider" />

          {/* Unified Settings Dropdown (Contains System Settings, Users, Server & License) */}
          {(isAdmin || isSuperadmin) && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={`horizontal-nav-btn ${isSettingsActive ? 'active' : ''}`}
                onClick={() => setDropdownOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  ...(isSettingsActive ? {
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    borderColor: primaryColor,
                    color: '#ffffff',
                    boxShadow: `0 3px 14px ${primaryColor}55`
                  } : {})
                }}
                title="System Settings & Administration"
              >
                <Settings size={15} />
                <span>Settings</span>
                <ChevronDown 
                  size={13} 
                  style={{ 
                    transition: 'transform 0.2s ease', 
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                  }} 
                />
              </button>

              {/* Floating Dropdown Menu (Theme Responsive: Light / Dark) */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 9999,
                  minWidth: '240px',
                  background: dd.bg,
                  backdropFilter: 'blur(16px)',
                  border: dd.border,
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: dd.shadow,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  {/* Category: Administration */}
                  <div style={{
                    padding: '6px 10px 4px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: dd.headerColor
                  }}>
                    Administration
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTab === 'settings' ? dd.activeBg : 'transparent',
                      color: activeTab === 'settings' ? dd.activeColor : dd.textColor,
                      fontSize: '0.81rem',
                      fontWeight: activeTab === 'settings' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'settings') e.currentTarget.style.background = dd.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = activeTab === 'settings' ? dd.activeBg : 'transparent';
                    }}
                  >
                    <Settings size={15} color="#ec4899" />
                    <div>
                      <div style={{ lineHeight: 1.2 }}>System Settings</div>
                      <div style={{ fontSize: '0.68rem', color: dd.subtextColor, marginTop: '2px' }}>Rates, grace, cameras & theme</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('users');
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTab === 'users' ? dd.activeBg : 'transparent',
                      color: activeTab === 'users' ? (isDark ? '#93c5fd' : '#2563eb') : dd.textColor,
                      fontSize: '0.81rem',
                      fontWeight: activeTab === 'users' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'users') e.currentTarget.style.background = dd.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = activeTab === 'users' ? dd.activeBg : 'transparent';
                    }}
                  >
                    <Users size={15} color="#3b82f6" />
                    <div>
                      <div style={{ lineHeight: 1.2 }}>User Management</div>
                      <div style={{ fontSize: '0.68rem', color: dd.subtextColor, marginTop: '2px' }}>Staff accounts & permissions</div>
                    </div>
                  </button>

                  {/* Superadmin Exclusive Section */}
                  {isSuperadmin && (
                    <>
                      <div style={{
                        height: '1px',
                        background: dd.dividerColor,
                        margin: '4px 6px'
                      }} />

                      <div style={{
                        padding: '4px 10px 4px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isDark ? '#f59e0b' : '#b45309'
                      }}>
                        Superadmin Controls
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('server-config');
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: activeTab === 'server-config' ? dd.activeBg : 'transparent',
                          color: activeTab === 'server-config' ? (isDark ? '#fde047' : '#d97706') : dd.textColor,
                          fontSize: '0.81rem',
                          fontWeight: activeTab === 'server-config' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (activeTab !== 'server-config') e.currentTarget.style.background = dd.hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = activeTab === 'server-config' ? dd.activeBg : 'transparent';
                        }}
                      >
                        <Server size={15} color="#f59e0b" />
                        <div>
                          <div style={{ lineHeight: 1.2 }}>Server & Database</div>
                          <div style={{ fontSize: '0.68rem', color: dd.subtextColor, marginTop: '2px' }}>DB credentials & host endpoints</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('license');
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: activeTab === 'license' ? dd.activeBg : 'transparent',
                          color: activeTab === 'license' ? dd.activeColor : dd.textColor,
                          fontSize: '0.81rem',
                          fontWeight: activeTab === 'license' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (activeTab !== 'license') e.currentTarget.style.background = dd.hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = activeTab === 'license' ? dd.activeBg : 'transparent';
                        }}
                      >
                        <Key size={15} color="#ec4899" />
                        <div>
                          <div style={{ lineHeight: 1.2 }}>Software License</div>
                          <div style={{ fontSize: '0.68rem', color: dd.subtextColor, marginTop: '2px' }}>SaNDS Lab key & activation</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Far Right Action: In-App ANPR Camera Simulator (Hidden for Reception) */}
          {!isReception && (
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
          )}
        </div>
      </div>
    </nav>
  );
}
