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
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function HorizontalMenu({ activeTab, setActiveTab, onOpenSimulator }) {
  const { isSuperadmin, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

              {/* Floating Dropdown Menu */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 9999,
                  minWidth: '240px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(236, 72, 153, 0.35)',
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: '0 10px 35px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
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
                    color: '#94a3b8'
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
                      background: activeTab === 'settings' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                      color: activeTab === 'settings' ? '#f472b6' : '#e2e8f0',
                      fontSize: '0.81rem',
                      fontWeight: activeTab === 'settings' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'settings' ? 'rgba(236, 72, 153, 0.2)' : 'transparent'}
                  >
                    <Settings size={15} color="#ec4899" />
                    <div>
                      <div style={{ lineHeight: 1.2 }}>System Settings</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Rates, grace, cameras & theme</div>
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
                      background: activeTab === 'users' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                      color: activeTab === 'users' ? '#93c5fd' : '#e2e8f0',
                      fontSize: '0.81rem',
                      fontWeight: activeTab === 'users' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'users' ? 'rgba(37, 99, 235, 0.2)' : 'transparent'}
                  >
                    <Users size={15} color="#3b82f6" />
                    <div>
                      <div style={{ lineHeight: 1.2 }}>User Management</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Staff accounts & permissions</div>
                    </div>
                  </button>

                  {/* Superadmin Exclusive Section */}
                  {isSuperadmin && (
                    <>
                      <div style={{
                        height: '1px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        margin: '4px 6px'
                      }} />

                      <div style={{
                        padding: '4px 10px 4px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#f59e0b'
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
                          background: activeTab === 'server-config' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                          color: activeTab === 'server-config' ? '#fde047' : '#e2e8f0',
                          fontSize: '0.81rem',
                          fontWeight: activeTab === 'server-config' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'server-config' ? 'rgba(245, 158, 11, 0.2)' : 'transparent'}
                      >
                        <Server size={15} color="#f59e0b" />
                        <div>
                          <div style={{ lineHeight: 1.2 }}>Server & Database</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>DB credentials & host endpoints</div>
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
                          background: activeTab === 'license' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                          color: activeTab === 'license' ? '#f472b6' : '#e2e8f0',
                          fontSize: '0.81rem',
                          fontWeight: activeTab === 'license' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'license' ? 'rgba(236, 72, 153, 0.2)' : 'transparent'}
                      >
                        <Key size={15} color="#ec4899" />
                        <div>
                          <div style={{ lineHeight: 1.2 }}>Software License</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>SaNDS Lab key & activation</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Far Right Action: In-App ANPR Camera Simulator */}
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
