import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Car, 
  Video, 
  QrCode, 
  CreditCard, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Globe, 
  ArrowRight, 
  CheckCircle2, 
  Download, 
  Terminal, 
  Sparkles, 
  Sun, 
  Moon, 
  ExternalLink, 
  Activity, 
  Zap, 
  FileText, 
  Lock, 
  Smartphone, 
  BarChart3, 
  ShoppingBag, 
  Hotel, 
  Plane, 
  Ticket, 
  Share2, 
  ChevronRight,
  MessageCircle,
  Clock,
  PhoneCall,
  Play,
  RotateCcw,
  Check,
  Eye,
  Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function LandingPage({ onLaunchPortal, onOpenGuide }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isDark = theme === 'dark';

  const [activeIndustry, setActiveIndustry] = useState('hospital');
  const [sandsModalOpen, setSandsModalOpen] = useState(false);

  // Interactive Barrier Demo State
  const [barrierState, setBarrierState] = useState('closed'); // 'closed', 'opening', 'open', 'closing'
  const [demoPlate, setDemoPlate] = useState('BH-84920');
  const [demoLog, setDemoLog] = useState('Gate 01 [Entry]: Waiting for vehicle approach...');

  // Interactive Display Board Demo State
  const [p1Slots, setP1Slots] = useState(42);
  const [p2Slots, setP2Slots] = useState(18);
  const [p3Slots, setP3Slots] = useState(0);

  // Lightbox / Image Zoom State
  const [selectedImage, setSelectedImage] = useState(null);

  const triggerBarrierDemo = () => {
    if (barrierState !== 'closed') return;
    setBarrierState('opening');
    setDemoLog(`ANPR Capture: Plate "${demoPlate}" recognized (Confidence 99.8%) -> Triggering Relay Gate 01...`);
    
    setTimeout(() => {
      setBarrierState('open');
      setDemoLog(`Barrier Arm Raised (0.35s). Vehicle entry granted. Session started #${Math.floor(100000 + Math.random() * 900000)}`);
      
      setTimeout(() => {
        setBarrierState('closing');
        setDemoLog('Vehicle cleared safety loop detector -> Lowering barrier arm...');
        
        setTimeout(() => {
          setBarrierState('closed');
          setDemoLog('Gate 01 [Entry]: ARMED & READY for next vehicle.');
        }, 1200);
      }, 2500);
    }, 600);
  };

  // Hardware & Software Showcase items
  const hardwareGallery = [
    {
      id: 'barrier',
      title: 'Automated Boom Barrier & ANPR System',
      badge: 'High-Speed Physical Access',
      image: '/images/boom_barrier_gate.jpg',
      tagline: 'Sub-second 0.4s barrier arm actuation with IP67 deep-learning ANPR camera.',
      specs: [
        '99.8% License plate recognition rate under all lighting conditions',
        'Direct RS485 / TCP-IP barrier relay trigger board integration',
        'Dual safety infrared photo-beams & ground magnetic loop detector',
        'Multi-color red/green LED illuminated boom arm for night guidance'
      ]
    },
    {
      id: 'display',
      title: 'Multi-Deck LED Parking Guidance Display',
      badge: 'Real-Time Occupancy Signage',
      image: '/images/led_display_board.jpg',
      tagline: 'Ultra-bright digital outdoor totem & Android TV display board APK integration.',
      specs: [
        'Live floor-by-floor vacancy counts (P1, P2, P3, P4)',
        'Automatic green "VACANT" / red "FULL" status switching',
        'Native Android TV APK / Commercial HDMI digital signage support',
        'Customizable enterprise logos, welcome messages & tariff notices'
      ]
    },
    {
      id: 'control-room',
      title: 'Central Command Center & Video Wall',
      badge: 'Multi-Lane Master Operations',
      image: '/images/control_room_dashboard.jpg',
      tagline: '24/7 unified control room monitoring all gate lanes, sessions, and financial audits.',
      specs: [
        'Live RTSP camera feeds with real-time bounding box recognition',
        '3D interactive floor occupancy heatmaps and dwell-time alerts',
        'Live cashier reconciliation, collection audits and POS logs',
        'Emergency one-click manual barrier override for security teams'
      ]
    },
    {
      id: 'kiosk',
      title: 'Self-Service QR Barcode Pay Station & Kiosk',
      badge: 'Cashless & Contactless POS',
      image: '/images/qr_payment_kiosk.jpg',
      tagline: 'Weatherproof outdoor totem for ISO/IEC 18004 thermal receipts and tap payments.',
      specs: [
        'High-density 2D QR barcode scanner for tickets and phone screens',
        'Integrated Contactless NFC / Credit Card / BenefitPay reader',
        'Heavy-duty industrial thermal receipt printer with paper-low alerts',
        'Voice intercom and video assistance for remote operator support'
      ]
    }
  ];

  // Industry solutions data
  const industries = [
    {
      id: 'hospital',
      title: 'Hospitals & Medical Centers',
      icon: Building2,
      badge: 'Healthcare Suite',
      color: '#0284c7',
      tagline: 'Bilateral HIMS / HIS Integration & Patient Validation Desks',
      description: 'Synchronizes clinic appointments directly from Hospital Information Systems (HIMS/HIS), auto-generates printable thermal QR slips, and authorizes validated patient parking while giving emergency ambulances instant priority clearance.',
      highlights: [
        'Live Bilateral REST API with ANY HIMS / EHR software',
        'Printable thermal QR slips for consultation desks',
        'Automatic emergency ambulance priority barrier opening',
        'Doctor & staff whitelist with RFID/ANPR fast lanes',
        'Visitor & patient validation portals (Method A, B & C)'
      ],
      stats: '100% Patient Flow Synchronization'
    },
    {
      id: 'supermarket',
      title: 'Supermarkets & Shopping Malls',
      icon: ShoppingBag,
      badge: 'Retail & Commercial',
      color: '#10b981',
      tagline: 'POS Spend-to-Park Waivers & Rapid Flow Management',
      description: 'Boost customer satisfaction and dwell time by linking cashier checkout barcodes to free parking waivers. Supports high-throughput weekend rushes with automated barrier opens and dynamic outdoor LED lane guidance.',
      highlights: [
        'POS receipt barcode scan for instant parking discounts',
        'Tiered spend-to-park validation rules (e.g. BD 10 = 2 Hours Free)',
        'Multi-level parking guidance with floor-by-floor slot meters',
        'Automated cashier POS terminal with BenefitPay & Card payments',
        'Ticketless entry reducing paper consumption and queue times'
      ],
      stats: '0.3s Ingress Rate during Peak Hours'
    },
    {
      id: 'hotel',
      title: 'Hotels, Resorts & Valet Services',
      icon: Hotel,
      badge: 'Hospitality & Valet',
      color: '#f59e0b',
      tagline: 'PMS Integration & Digital SMS Valet Retrieval',
      description: 'Seamless integration with Hotel Property Management Systems (PMS). Registered guests enjoy automatic barrier access throughout their stay, while valet operators track vehicles with digital SMS tokens and vehicle inspection logs.',
      highlights: [
        'Direct synchronization with Hotel PMS room bookings',
        'Digital SMS valet retrieval token for hotel guests',
        'VIP guest license plate pre-registration & greeting alerts',
        'Banquet & wedding event parking validation vouchers',
        'Anti-passback protection across multi-gate resort perimeters'
      ],
      stats: '5-Star Guest Arrival Experience'
    },
    {
      id: 'corporate',
      title: 'Corporate Tech Parks & Towers',
      icon: Layers,
      badge: 'Enterprise Business',
      color: '#6366f1',
      tagline: 'Multi-Tenant Company Allocations & Contractor Passes',
      description: 'Manage complex multi-company commercial towers with quota-based slot allocations per tenant company, visitor pre-registration links, automated contractor QR passes, and consolidated monthly tenant parking invoices.',
      highlights: [
        'Tenant company slot quota enforcement and billing',
        'Pre-registered visitor invitations with QR wallet passes',
        'Tailgating detection & anti-passback security protocols',
        'Integration with building turnstiles and elevator access',
        'Real-time executive dashboard for facility directors'
      ],
      stats: 'Zero Unauthorized Parking Violations'
    },
    {
      id: 'airport',
      title: 'Airports & Transit Municipal Terminals',
      icon: Plane,
      badge: 'Aviation & Transit',
      color: '#ec4899',
      tagline: 'High-Volume Multi-Tariff Engine & Ride-Share Staging',
      description: 'Heavy-duty municipal architecture designed for 24/7 unhindered throughput. Features multi-tier tariffs (Drop-off 15min grace, Short-Term, Long-Term multi-day), taxi dispatch queue management, and automated license plate audits.',
      highlights: [
        'Multi-tier dynamic tariff calculator (Hourly, Daily, Grace)',
        'Automated Taxi & Uber/Ride-share geo-fence staging zones',
        'License plate blacklist & security hotlist alarm alerts',
        'Offline edge resilience: 100% operational during WAN outages',
        'Automated audit reports for municipal audit compliance'
      ],
      stats: '99.99% Enterprise Uptime SLA'
    },
    {
      id: 'stadium',
      title: 'Stadiums, Arenas & Event Venues',
      icon: Ticket,
      badge: 'Events & Entertainment',
      color: '#8b5cf6',
      tagline: 'Mass Surge Clearance & Prepaid Ticket Gate Scanners',
      description: 'Handle 50,000+ attendee surges with lightning-fast gate clearance. Attendees scan their event entry barcode or prepaid digital parking ticket directly at entrance kiosks for instant barrier opening.',
      highlights: [
        'Prepaid event parking barcodes integrated with Ticketing platforms',
        'Dynamic lane reversal (Convert all lanes to Exit during dispersal)',
        'Bus and coach dedicated parking bay allocations',
        'VIP & press media license plate priority lanes',
        'Live digital directional boards guiding drivers to open bays'
      ],
      stats: '5,000+ Vehicles Cleared / Hour'
    }
  ];

  const currentInd = industries.find(i => i.id === activeIndustry) || industries[0];

  // 8 Pillars Data
  const platformPillars = [
    {
      icon: Video,
      title: 'Sub-Second ANPR Engine',
      badge: 'Hardware Agnostic',
      desc: 'Connects to Hikvision, Dahua, Uniview, Axis, and RTSP IP cameras. High-accuracy 99.8% capture with zero lag.'
    },
    {
      icon: Globe,
      title: 'Universal Integration REST API',
      badge: 'Any HIS / ERP / POS',
      desc: 'Full bi-directional REST endpoints to sync appointments, generate parking QR tokens, and validate visits in real-time.'
    },
    {
      icon: QrCode,
      title: 'ISO/IEC 18004 QR Generator',
      badge: 'Zero External Libs',
      desc: 'Native PHP ISO-standard QR engine creating sharp, scan-ready receipts for thermal printers and mobile screens.'
    },
    {
      icon: Layers,
      title: 'Multi-Floor Capacity Manager',
      badge: 'P1 · P2 · P3 · VIP',
      desc: 'Live floor-by-floor slot accounting with vacancy thresholds, reserved bays, and dynamic digital LED board updates.'
    },
    {
      icon: CreditCard,
      title: 'Cashier & POS Terminal Desk',
      badge: 'Split Payments',
      desc: 'Dedicated point-of-sale interface supporting cash, debit/credit cards, BenefitPay, discount coupons, and lost ticket fees.'
    },
    {
      icon: Smartphone,
      title: 'Android Display Board APK',
      badge: 'Smart TV & LED Wall',
      desc: 'Standalone Android APK and browser dashboard designed for full-screen LED gate totems and waiting area TV screens.'
    },
    {
      icon: Zap,
      title: 'Relay Barrier Controllers',
      badge: 'TCP/IP & RS485',
      desc: 'Instant physical gate actuation via IP relay boards and serial controllers with auto-close safety loop protection.'
    },
    {
      icon: ShieldCheck,
      title: 'Audits & Anti-Passback',
      badge: 'Tamper Proof',
      desc: 'Comprehensive shift-wise financial reconciliation, plate blacklist hotlists, and unauthorized passback enforcement.'
    }
  ];

  return (
    <div 
      className="landing-page-root"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: isDark ? '#090d16' : '#f8fafc',
        color: isDark ? '#e2e8f0' : '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        overflowX: 'hidden'
      }}
    >
      {/* 1. TOP ANNOUNCEMENT & BRANDING HEADER (100% Full Width) */}
      <header style={{
        width: '100%',
        background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          width: '100%',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Left: Brand & SaNDS Lab Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              cursor: 'pointer'
            }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
              }}>
                <Car size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Smart Parking Solution
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Next-Gen Multi-Industry Facility OS
                </div>
              </div>
            </div>

            {/* Official SaNDS Lab Tag */}
            <div 
              onClick={() => setSandsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: isDark ? 'rgba(236, 72, 153, 0.12)' : 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Click to view SaNDS Lab profile & direct contact"
            >
              <img 
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png" 
                alt="SaNDS Lab" 
                style={{ height: '16px', width: 'auto', display: 'block' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ec4899', letterSpacing: '0.04em' }}>
                POWERED BY SaNDS LAB
              </span>
              <ExternalLink size={11} color="#ec4899" />
            </div>
          </div>

          {/* Right: Actions (Theme Toggle + Launch Portal + Guide) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Quick Navigation Anchor Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="d-none d-md-flex">
              <a href="#hardware-showcase" style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>Hardware & Gates</a>
              <a href="#industries" style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>Industry Suites</a>
              <a href="#live-demo" style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>Live Interactive Demo</a>
              <a href="#features" style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>Architecture</a>
            </nav>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* ANPR Guide Link */}
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1',
                  color: isDark ? '#93c5fd' : '#0284c7',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <FileText size={15} />
                <span>Integration Guide</span>
              </button>
            )}

            {/* Launch Control Room Portal Button */}
            <button
              type="button"
              onClick={onLaunchPortal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>{user ? 'Open Control Room' : 'Sign In to Portal'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (100% Full Width Split Grid with High-Res Boom Barrier Visual) */}
      <section style={{
        width: '100%',
        padding: '50px 32px 60px',
        background: isDark 
          ? 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(2, 132, 199, 0.25), transparent), #090d16'
          : 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(2, 132, 199, 0.15), transparent), #ffffff',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '40px',
          alignItems: 'center'
        }}>
          {/* Left Column: Hero Text & Value Proposition */}
          <div>
            {/* Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '24px',
              background: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              color: '#0284c7',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              marginBottom: '20px'
            }}>
              <Sparkles size={14} color="#0284c7" />
              <span>ENTERPRISE SMART PARKING PLATFORM 2026</span>
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              color: isDark ? '#ffffff' : '#0f172a',
              marginBottom: '20px'
            }}>
              Intelligent Multi-Industry Parking & Visitor Validation OS
            </h1>

            {/* Sub-Headline */}
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: isDark ? '#94a3b8' : '#475569',
              marginBottom: '28px'
            }}>
              A turnkey automated parking management suite built for <strong style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>Hospitals, Supermarkets, Commercial Tech Parks, Hotels, Transit Hubs, and Arenas</strong>. Featuring 99.8% accurate ANPR recognition, sub-second boom barrier control, multi-floor LED guidance, and seamless bilateral ERP/HIS integration.
            </p>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '32px' }}>
              <button
                type="button"
                onClick={onLaunchPortal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '13px 28px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Launch Live Control Room</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const demoSec = document.getElementById('live-demo');
                  if (demoSec) demoSec.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  borderRadius: '10px',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Play size={16} color="#10b981" />
                <span>Interactive Hardware Simulator</span>
              </button>
            </div>

            {/* Live Key Stats Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '16px',
              borderRadius: '12px',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>99.8%</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>ANPR Accuracy</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>&lt;0.4s</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Barrier Response</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>6+</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Industry Suites</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ec4899', lineHeight: 1 }}>100%</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Offline Edge Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Real Hardware Visual Card (Boom Barrier & ANPR) */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: isDark 
                ? '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                : '0 20px 50px -10px rgba(2, 132, 199, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
              background: isDark ? '#1e293b' : '#ffffff',
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedImage('/images/boom_barrier_gate.jpg')}
            title="Click to view full image"
            >
              <img 
                src="/images/boom_barrier_gate.jpg" 
                alt="Automated Boom Barrier with ANPR Recognition Camera" 
                style={{
                  width: '100%',
                  height: '380px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {/* Floating Live Overlay Tag on Image */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span>LIVE GATE 01: ARMED · ANPR ACTIVE</span>
              </div>

              {/* Floating Bottom Spec Strip */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.6) 70%, transparent 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Automated Barrier & ANPR Telemetry</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Sub-second license plate optical capture & relay barrier open</div>
                </div>
                <div style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.15)',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  Click to Zoom 🔍
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HARDWARE & INFRASTRUCTURE VISUAL GALLERY (100% Full Width) */}
      <section id="hardware-showcase" style={{
        width: '100%',
        padding: '70px 32px',
        background: isDark ? '#0b1120' : '#f1f5f9',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        <div style={{ width: '100%' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 50px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px'
            }}>
              <Video size={13} />
              <span>PHYSICAL HARDWARE & CONTROL INFRASTRUCTURE</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: isDark ? '#ffffff' : '#0f172a',
              lineHeight: 1.2,
              marginBottom: '14px'
            }}>
              Engineered for Real-World Gates, LED Totems & Control Rooms
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
              Seamlessly integrates with professional barriers, high-brightness multi-level display panels, outdoor QR payment terminals, and centralized operator command video walls.
            </p>
          </div>

          {/* 4 Large Photo Showcase Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
            gap: '30px',
            width: '100%'
          }}>
            {hardwareGallery.map((item) => (
              <div 
                key={item.id}
                style={{
                  borderRadius: '16px',
                  background: isDark ? '#151e2e' : '#ffffff',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                  boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isDark ? '0 16px 40px rgba(0,0,0,0.7)' : '0 16px 35px rgba(2, 132, 199, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.05)';
                }}
              >
                {/* Photo with Overlay */}
                <div 
                  style={{ position: 'relative', height: '280px', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setSelectedImage(item.image)}
                  title="Click to zoom image"
                >
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />

                  {/* Top Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    {item.badge}
                  </div>

                  {/* Zoom hint */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    🔍 Zoom
                  </div>
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '8px' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5, marginBottom: '18px' }}>
                      {item.tagline}
                    </p>

                    {/* Bullet Specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {item.specs.map((spec, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.8rem', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.4 }}>
                            {spec}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. LIVE INTERACTIVE HARDWARE SIMULATION LAB (100% Full Width) */}
      <section id="live-demo" style={{
        width: '100%',
        padding: '70px 32px',
        background: isDark ? '#090d16' : '#ffffff',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px'
            }}>
              <Play size={13} />
              <span>LIVE INTERACTIVE SIMULATION LAB</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: isDark ? '#ffffff' : '#0f172a',
              lineHeight: 1.2,
              marginBottom: '12px'
            }}>
              Test the Boom Barrier & Multi-Floor LED Display in Real-Time
            </h2>
            <p style={{ fontSize: '0.96rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Interact with our live digital twin models to see how ANPR triggers the barrier relay and how floor capacity adjusts instantly on the LED board.
            </p>
          </div>

          {/* 2-Column Interactive Simulator Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
            gap: '30px',
            width: '100%'
          }}>
            {/* Interactive Model 1: Boom Barrier & ANPR Trigger */}
            <div style={{
              padding: '28px',
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#f8fafc',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', margin: 0 }}>
                      Gate 01 Boom Barrier Simulation
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Sub-second relay barrier actuation</div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: barrierState === 'open' ? '#10b981' : barrierState === 'closed' ? '#ef4444' : '#f59e0b',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {barrierState === 'open' ? '● BARRIER RAISED' : barrierState === 'closed' ? '● BARRIER LOWERED' : '● MOVING...'}
                </div>
              </div>

              {/* Graphic Representation of Barrier */}
              <div style={{
                height: '180px',
                borderRadius: '12px',
                background: isDark ? '#0b1120' : '#0f172a',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {/* Road Lane Lines */}
                <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, height: '4px', background: 'repeating-linear-gradient(90deg, #f8fafc 0px, #f8fafc 30px, transparent 30px, transparent 60px)' }} />
                
                {/* Barrier Pillar */}
                <div style={{
                  position: 'absolute',
                  left: '60px',
                  bottom: '20px',
                  width: '32px',
                  height: '80px',
                  background: '#f97316',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: '6px'
                }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: barrierState === 'open' ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${barrierState === 'open' ? '#10b981' : '#ef4444'}` }} />
                </div>

                {/* Animated Boom Arm */}
                <div style={{
                  position: 'absolute',
                  left: '88px',
                  bottom: '80px',
                  width: '260px',
                  height: '10px',
                  background: 'repeating-linear-gradient(90deg, #ffffff 0px, #ffffff 20px, #ef4444 20px, #ef4444 40px)',
                  borderRadius: '5px',
                  transformOrigin: 'left center',
                  transform: barrierState === 'open' ? 'rotate(-65deg)' : barrierState === 'opening' ? 'rotate(-40deg)' : barrierState === 'closing' ? 'rotate(-25deg)' : 'rotate(0deg)',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: barrierState === 'open' ? '0 0 12px #10b981' : '0 0 12px #ef4444'
                }} />

                {/* ANPR Camera Mount */}
                <div style={{
                  position: 'absolute',
                  right: '50px',
                  top: '25px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: '#0284c7',
                    color: '#fff',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    marginBottom: '4px'
                  }}>
                    ANPR CAM
                  </div>
                  <div style={{ width: '28px', height: '14px', background: '#38bdf8', borderRadius: '3px' }} />
                  <div style={{ width: '4px', height: '50px', background: '#64748b' }} />
                </div>

                {/* Vehicle Simulation Plate Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '110px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  border: '2px solid #000000',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}>
                  {demoPlate}
                </div>
              </div>

              {/* Console Log Output */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: isDark ? '#0b1120' : '#1e293b',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '0.74rem',
                lineHeight: 1.4,
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: '42px',
                display: 'flex',
                alignItems: 'center'
              }}>
                &gt; {demoLog}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={triggerBarrierDemo}
                  disabled={barrierState !== 'closed'}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: barrierState === 'closed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#64748b',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: barrierState === 'closed' ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: barrierState === 'closed' ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                >
                  <Play size={15} />
                  <span>Simulate Vehicle Approach & Open Gate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const plates = ['BH-84920', 'KW-19402', 'SA-59201', 'DXB-92018', 'OM-38291'];
                    const rand = plates[Math.floor(Math.random() * plates.length)];
                    setDemoPlate(rand);
                    setDemoLog(`Plate changed to: ${rand}`);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    border: 'none',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Generate Random License Plate"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Interactive Model 2: Multi-Floor LED Display Board Totem */}
            <div style={{
              padding: '28px',
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#f8fafc',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', margin: 0 }}>
                      Multi-Floor LED Display Board Totem
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Live LED dot-matrix vacancy guidance</div>
                  </div>
                </div>

                <div style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  ANDROID TV APK SYNC
                </div>
              </div>

              {/* Digital LED Screen Render */}
              <div style={{
                borderRadius: '12px',
                background: '#040812',
                padding: '20px',
                border: '3px solid #1e293b',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.9), 0 8px 20px rgba(0,0,0,0.4)',
                marginBottom: '20px'
              }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    ● PARKING ENTRANCE GUIDANCE
                  </div>
                </div>

                {/* Floor Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* P1 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>P1 LEVEL :</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: p1Slots > 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', textShadow: p1Slots > 0 ? '0 0 8px #10b981' : '0 0 8px #ef4444' }}>
                      {p1Slots > 0 ? `${p1Slots} VACANT` : 'FULL'}
                    </span>
                  </div>

                  {/* P2 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>P2 LEVEL :</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: p2Slots > 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', textShadow: p2Slots > 0 ? '0 0 8px #10b981' : '0 0 8px #ef4444' }}>
                      {p2Slots > 0 ? `${p2Slots} VACANT` : 'FULL'}
                    </span>
                  </div>

                  {/* P3 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>P3 LEVEL :</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: p3Slots > 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', textShadow: p3Slots > 0 ? '0 0 8px #10b981' : '0 0 8px #ef4444' }}>
                      {p3Slots > 0 ? `${p3Slots} VACANT` : 'FULL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Sliders to test capacity changing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, width: '70px', color: isDark ? '#cbd5e1' : '#334155' }}>P1 Capacity:</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    value={p1Slots} 
                    onChange={(e) => setP1Slots(parseInt(e.target.value, 10))}
                    style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, width: '30px', textAlign: 'right' }}>{p1Slots}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, width: '70px', color: isDark ? '#cbd5e1' : '#334155' }}>P2 Capacity:</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="40" 
                    value={p2Slots} 
                    onChange={(e) => setP2Slots(parseInt(e.target.value, 10))}
                    style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, width: '30px', textAlign: 'right' }}>{p2Slots}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, width: '70px', color: isDark ? '#cbd5e1' : '#334155' }}>P3 Capacity:</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={p3Slots} 
                    onChange={(e) => setP3Slots(parseInt(e.target.value, 10))}
                    style={{ flex: 1, accentColor: '#ef4444', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, width: '30px', textAlign: 'right' }}>{p3Slots}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MULTI-INDUSTRY TURNKEY SUITES (100% Full Width) */}
      <section id="industries" style={{
        width: '100%',
        padding: '70px 32px',
        background: isDark ? '#0b1120' : '#f8fafc',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        <div style={{ width: '100%' }}>
          {/* Section Heading */}
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)',
              color: '#0284c7',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px'
            }}>
              <Building2 size={13} />
              <span>SPECIALIZED MULTI-INDUSTRY ARCHITECTURES</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: isDark ? '#ffffff' : '#0f172a',
              lineHeight: 1.2,
              marginBottom: '12px'
            }}>
              Tailored for High-Throughput Facilities
            </h2>
            <p style={{ fontSize: '0.96rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Select any industry below to explore bespoke workflows, validation schemes, and integration protocols.
            </p>
          </div>

          {/* Industry Filter Buttons Strip */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '36px'
          }}>
            {industries.map((ind) => {
              const Icon = ind.icon;
              const isActive = activeIndustry === ind.id;
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setActiveIndustry(ind.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '30px',
                    background: isActive 
                      ? ind.color 
                      : isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: isActive 
                      ? `1px solid ${ind.color}` 
                      : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                    color: isActive ? '#ffffff' : isDark ? '#cbd5e1' : '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 6px 18px ${ind.color}45` : '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={16} />
                  <span>{ind.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Industry Deep-Dive Card */}
          <div style={{
            width: '100%',
            borderRadius: '20px',
            background: isDark ? '#151e2e' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 35px rgba(0,0,0,0.06)',
            padding: '40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}>
            {/* Left Column: Details */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: `${currentInd.color}20`,
                color: currentInd.color,
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '14px'
              }}>
                {currentInd.badge}
              </div>

              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#0f172a',
                lineHeight: 1.2,
                marginBottom: '10px'
              }}>
                {currentInd.title}
              </h3>

              <div style={{
                fontSize: '0.98rem',
                fontWeight: 700,
                color: currentInd.color,
                marginBottom: '16px'
              }}>
                {currentInd.tagline}
              </div>

              <p style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: isDark ? '#94a3b8' : '#475569',
                marginBottom: '24px'
              }}>
                {currentInd.description}
              </p>

              {/* Highlights List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentInd.highlights.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: `${currentInd.color}20`,
                      color: currentInd.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Workflow Diagram / KPI Visual */}
            <div style={{
              borderRadius: '16px',
              padding: '30px',
              background: isDark ? '#0b1120' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: currentInd.color }}>
                ● Real-Time Operational Flow
              </div>

              {/* Workflow Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: currentInd.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>Vehicle Approach & Optical Scan</div>
                    <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b' }}>ANPR camera captures plate within 0.1s & queries local whitelist cache.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: currentInd.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>Third-Party Token or QR Matching</div>
                    <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b' }}>Bilateral REST API syncs with HIMS appointment, hotel PMS room, or POS receipt.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: currentInd.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>Sub-Second Barrier Actuation & Guidance</div>
                    <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b' }}>Boom barrier raises automatically; outdoor LED panel directs driver to nearest open floor.</div>
                  </div>
                </div>
              </div>

              {/* KPI Banner */}
              <div style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: `${currentInd.color}15`,
                border: `1px solid ${currentInd.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: currentInd.color }}>
                  Verified Benchmark Result:
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a' }}>
                  {currentInd.stats}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 8 CORE PLATFORM PILLARS (100% Full Width) */}
      <section id="features" style={{
        width: '100%',
        padding: '70px 32px',
        background: isDark ? '#090d16' : '#ffffff',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 50px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isDark ? 'rgba(236, 72, 153, 0.18)' : 'rgba(236, 72, 153, 0.1)',
              color: '#ec4899',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px'
            }}>
              <Cpu size={13} />
              <span>CORE ARCHITECTURAL PILLARS</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: isDark ? '#ffffff' : '#0f172a',
              lineHeight: 1.2,
              marginBottom: '14px'
            }}>
              Everything Needed to Run Mission-Critical Parking
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Engineered with zero third-party dependencies, enterprise resilience, and modern web standards.
            </p>
          </div>

          {/* 8-Grid Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            width: '100%'
          }}>
            {platformPillars.map((pillar, pIdx) => {
              const Icon = pillar.icon;
              return (
                <div 
                  key={pIdx}
                  style={{
                    padding: '24px',
                    borderRadius: '14px',
                    background: isDark ? '#151e2e' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = '#0284c7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={20} />
                    </div>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                      color: isDark ? '#94a3b8' : '#475569'
                    }}>
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '8px' }}>
                    {pillar.title}
                  </h3>

                  <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. ANDROID DISPLAY BOARD & DOWNLOAD BANNER (100% Full Width) */}
      <section style={{
        width: '100%',
        padding: '60px 32px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: '#ffffff',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '40px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(236, 72, 153, 0.2)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              color: '#f472b6',
              fontSize: '0.74rem',
              fontWeight: 800,
              marginBottom: '16px'
            }}>
              <Smartphone size={13} />
              <span>HARDWARE ACCESSORY APPS</span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: '14px' }}>
              Android LED Display Board APK & Thermal Kiosks
            </h2>

            <p style={{ fontSize: '0.94rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '24px' }}>
              Download our standalone Android TV / Tablet application to transform any HDMI TV or LED outdoor totem into a real-time smart parking guidance display with zero PC hardware required.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <a
                href="/apks/DisplayBoard.apk"
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(236, 72, 153, 0.4)'
                }}
              >
                <Download size={16} />
                <span>Download Display Board APK</span>
              </a>

              <a
                href="https://wa.me/97335078079?text=Hi%20SaNDS%20Lab%20Team%2C%20I%20need%20information%20about%20the%20Smart%20Parking%20System."
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)'
                }}
              >
                <MessageCircle size={16} />
                <span>Chat with SaNDS Engineers</span>
              </a>
            </div>
          </div>

          {/* Display Board Preview Graphic */}
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.15)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedImage('/images/led_display_board.jpg')}
          title="Click to zoom image"
          >
            <img 
              src="/images/led_display_board.jpg" 
              alt="LED Guidance Totem" 
              style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* 8. FOOTER WITH SANDS LAB BRANDING & DIRECT CONTACT (100% Full Width) */}
      <footer style={{
        width: '100%',
        padding: '40px 32px 30px',
        background: isDark ? '#060911' : '#0f172a',
        color: '#ffffff',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #1e293b'
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          paddingBottom: '30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Brand Info */}
          <div style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Car size={18} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>Smart Parking OS</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Enterprise turnkey software architecture designed and engineered by SaNDS Lab for global multi-parking operations.
            </p>
          </div>

          {/* SaNDS Lab Hub Links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSandsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(236, 72, 153, 0.15)',
                border: '1px solid rgba(236, 72, 153, 0.4)',
                color: '#ec4899',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              <span>SaNDS Lab Portal</span>
            </button>

            <a
              href="https://sandslab.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              Official Website ↗
            </a>

            <a
              href="https://wa.me/97335078079"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#25D366', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
            >
              WhatsApp: +973 35078079
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          width: '100%',
          paddingTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <div>© 2026 Smart Parking Solution. All Rights Reserved.</div>
          <div>Powered by SaNDS Lab Middle East W.L.L · ISO/IEC 18004 Standard Compliant</div>
        </div>
      </footer>

      {/* 9. LIGHTBOX IMAGE ZOOM MODAL */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out'
          }}
        >
          <div style={{ maxWidth: '1100px', width: '100%', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Hardware Preview" 
              style={{
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
              }} 
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 10. SANDS LAB OFFICIAL MODAL POPUP */}
      {sandsModalOpen && (
        <div 
          onClick={() => setSandsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              border: isDark ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid #e2e8f0',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px 24px 18px',
              background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 50%, #2563eb 100%)',
              color: '#ffffff',
              textAlign: 'center',
              position: 'relative'
            }}>
              <img 
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png" 
                alt="SaNDS Lab" 
                style={{ height: '34px', width: 'auto', margin: '0 auto 10px', display: 'block' }}
              />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>SaNDS Lab Middle East W.L.L</h3>
              <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '4px' }}>
                Next-Generation Smart AI & Facility Automation Solutions
              </div>

              <button
                type="button"
                onClick={() => setSandsModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: 'none',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.6, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '20px' }}>
                SaNDS Lab engineers enterprise software products for healthcare facilities, government bodies, commercial real-estate, and retail centers across the GCC & Middle East.
              </p>

              {/* Contact / Links Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href="https://sandslab.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    color: isDark ? '#ffffff' : '#0f172a',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe size={16} color="#0284c7" />
                    <span>Official Corporate Website</span>
                  </div>
                  <ExternalLink size={14} color="#94a3b8" />
                </a>

                <a
                  href="https://wa.me/97335078079?text=Hello%20SaNDS%20Lab%20Team%2C%20I%20would%20like%20to%20inquire%20about%20the%20Smart%20Parking%20System."
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(37, 211, 102, 0.1)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    color: '#25D366',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageCircle size={16} />
                    <span>WhatsApp Direct Support (+973 35078079)</span>
                  </div>
                  <ExternalLink size={14} />
                </a>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setSandsModalOpen(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
