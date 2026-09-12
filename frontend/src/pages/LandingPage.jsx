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
  Sliders,
  Maximize2,
  CheckCircle,
  Compass,
  Laptop,
  Radio,
  Server,
  Key
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function LandingPage({ onLaunchPortal, onOpenGuide }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isDark = theme === 'dark';

  // State Management
  const [activeTab, setActiveTab] = useState('hardware'); // 'hardware', 'industries', 'simulator', 'architecture'
  const [activeIndustry, setActiveIndustry] = useState('hospital');
  const [activeHardware, setActiveHardware] = useState('barrier');
  const [sandsModalOpen, setSandsModalOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Barrier Simulator State
  const [barrierState, setBarrierState] = useState('closed'); // 'closed', 'scanning', 'opening', 'open', 'closing'
  const [simPlate, setSimPlate] = useState('BH-84920');
  const [simConfidence, setSimConfidence] = useState(99.8);
  const [simLog, setSimLog] = useState('ANPR Optical Sensor: Ready · Loop Detector: Waiting for vehicle approach...');
  const [simSessionId, setSimSessionId] = useState(null);
  const [simVehicleType, setSimVehicleType] = useState('Sedan / Private');

  // Display Panel Simulator State
  const [floors, setFloors] = useState({
    p1: { total: 60, vacant: 42, label: 'P1 Level (Ground)' },
    p2: { total: 40, vacant: 18, label: 'P2 Level (Upper)' },
    p3: { total: 30, vacant: 0, label: 'P3 Level (Roof Deck)' },
    vip: { total: 15, vacant: 7, label: 'VIP / Doctor Bay' }
  });

  // QR Code Live Generator Simulator State
  const [qrPatientName, setQrPatientName] = useState('Ahmed Al-Mansoor');
  const [qrDept, setQrDept] = useState('Cardiology Clinic');
  const [qrGeneratedToken, setQrGeneratedToken] = useState('KIMS-2026-98421');
  const [qrValidHours, setQrValidHours] = useState('3 Hours Free');
  const [qrCopied, setQrCopied] = useState(false);

  // Trigger Barrier Simulation Flow
  const runBarrierSimulation = () => {
    if (barrierState !== 'closed') return;
    setBarrierState('scanning');
    setSimLog(`Vehicle Detected over Ground Loop! Capturing HD frame for OCR plate recognition...`);

    setTimeout(() => {
      setBarrierState('opening');
      const newSession = 'SESS-' + Math.floor(100000 + Math.random() * 900000);
      setSimSessionId(newSession);
      setSimLog(`Plate "${simPlate}" Recognized (Confidence ${simConfidence}%) -> Whitelist Approved -> Actuating Barrier Relay 01 (<0.4s)...`);

      setTimeout(() => {
        setBarrierState('open');
        setSimLog(`Barrier Arm Raised. Vehicle cleared entrance gate. Session ${newSession} started at ${new Date().toLocaleTimeString()}.`);

        setTimeout(() => {
          setBarrierState('closing');
          setSimLog(`Vehicle cleared exit safety infrared photo-beam -> Lowering boom arm...`);

          setTimeout(() => {
            setBarrierState('closed');
            setSimLog(`Gate 01 [Entry]: ARMED & READY for next vehicle.`);
          }, 1200);
        }, 2800);
      }, 600);
    }, 800);
  };

  // Hardware Items
  const hardwareItems = [
    {
      id: 'barrier',
      name: 'Automated Boom Barrier & ANPR Gate',
      category: 'Perimeter Access',
      image: '/images/boom_barrier_gate.jpg',
      badge: '0.4s Fast Actuation',
      description: 'High-durability brushless DC barrier motor paired with IP67 deep-learning ANPR camera with integrated infrared illuminator for 24/7 day/night optical plate recognition.',
      hotspots: [
        { title: 'Sub-Second Barrier Relay', desc: '0.4s to 0.9s adjustable opening speeds with soft deceleration' },
        { title: '99.8% LPR Recognition', desc: 'Embedded deep-learning OCR reads GCC, EU, and US plates effortlessly' },
        { title: 'Dual Safety Interlocks', desc: 'Ground magnetic loop detector and dual photo-electric anti-crush beams' },
        { title: 'Illuminated LED Arm', desc: 'Dynamic Red/Green LED light strip integrated into the boom arm' }
      ]
    },
    {
      id: 'display',
      name: 'Smart Multi-Deck LED Guidance Totem',
      category: 'Wayfinding & Signage',
      image: '/images/led_display_board.jpg',
      badge: 'High-Brightness Outdoor',
      description: 'Rugged aluminum outdoor LED digital totem delivering real-time floor-by-floor vacancy counts, parking status banners, and directional guidance powered by our Android TV APK.',
      hotspots: [
        { title: 'Multi-Floor Vacancy Engine', desc: 'Dynamic P1, P2, P3, P4 vacancy meters with color-coded alerts' },
        { title: 'Android TV / Signage APK', desc: 'Direct HDMI output to any TV or commercial LED wall controller' },
        { title: 'Automatic Status Shift', desc: 'Instant switch between green "VACANT" and high-contrast red "FULL"' },
        { title: 'Custom Welcome Branding', desc: 'Customizable company logo, rate cards, and visitor announcements' }
      ]
    },
    {
      id: 'control-room',
      name: 'Unified Command Center & Video Wall',
      category: 'Operations & Monitoring',
      image: '/images/control_room_dashboard.jpg',
      badge: '24/7 Central Control',
      description: 'Comprehensive operator station featuring live RTSP multi-lane camera feeds, real-time 3D parking occupancy heatmaps, cashier collection audits, and one-click remote barrier triggers.',
      hotspots: [
        { title: 'Multi-Lane Live Streams', desc: 'Zero-latency RTSP camera streaming with overlay bounding boxes' },
        { title: '3D Floor Heatmaps', desc: 'Visual representation of occupied, vacant, and reserved parking bays' },
        { title: 'Financial Audit Dashboard', desc: 'Real-time shift collection reconciliation, card POS logs & receipts' },
        { title: 'Manual Security Override', desc: 'One-click gate opening for emergency services and authorized VIPs' }
      ]
    },
    {
      id: 'kiosk',
      name: 'Self-Service QR Barcode Pay Station',
      category: 'Payment & Validation',
      image: '/images/qr_payment_kiosk.jpg',
      badge: 'Contactless & Cashless',
      description: 'All-weather self-service payment kiosk featuring high-speed 2D QR code scanner, contactless NFC card terminal, thermal receipt printer, and live multi-lingual voice guidance.',
      hotspots: [
        { title: 'ISO/IEC 18004 QR Reader', desc: 'Scans paper thermal receipts and mobile phone wallet barcodes instantly' },
        { title: 'NFC & BenefitPay POS', desc: 'Accepts Apple Pay, Google Pay, Visa, Mastercard, and BenefitPay' },
        { title: 'Heavy-Duty Thermal Print', desc: 'High-speed 80mm receipt printer with automated paper-low alerts' },
        { title: 'Emergency VoIP Intercom', desc: 'Two-way crystal-clear audio connection to the central control desk' }
      ]
    }
  ];

  // Industry Solutions
  const industries = [
    {
      id: 'hospital',
      title: 'Hospitals & Medical Centers',
      icon: Building2,
      tag: 'Healthcare & Clinical Suites',
      color: '#0284c7',
      tagline: 'Bilateral HIMS / HIS Sync & Clinic QR Validation',
      summary: 'Automates patient parking validation upon clinic registration, synchronizes appointment tokens with hospital EHR systems, and provides priority green-corridor clearance for ambulances.',
      benefits: [
        'Live Bilateral REST API syncing with ANY Hospital Information System (HIMS)',
        'Printable thermal QR validation receipts issued at clinic consultation counters',
        'Automatic emergency ambulance priority barrier opening via ANPR whitelist',
        'Doctor and medical staff dedicated fast lanes with RFID and license plate tags',
        'Patient discount waivers configured by appointment duration (e.g. 2h free)'
      ],
      flow: [
        { step: '1', title: 'Patient Arrival', desc: 'ANPR registers plate and prints thermal barcode slip at gate.' },
        { step: '2', title: 'Clinic Consultation', desc: 'Nurse/Receptionist scans QR in HIMS to apply patient discount.' },
        { step: '3', title: 'Automatic Exit', desc: 'Barrier verifies validated QR token and opens automatically.' }
      ]
    },
    {
      id: 'supermarket',
      title: 'Supermarkets & Shopping Malls',
      icon: ShoppingBag,
      tag: 'Retail & Commercial Malls',
      color: '#10b981',
      tagline: 'POS Checkout Spend-to-Park Waivers',
      summary: 'Increases retail dwell time by linking POS checkout cash registers to automatic parking discounts. Features dynamic outdoor LED guidance to prevent weekend entry bottlenecks.',
      benefits: [
        'POS receipt barcode scan grants instant tiered parking fee waivers',
        'Spend-based validation rules (e.g. Spend BD 10 = 2 Hours Free Parking)',
        'Ticketless entry with license plate recognition for lightning-fast ingress',
        'Multi-deck LED guidance totems directing shoppers to vacant levels',
        'Integrated cashier POS terminal supporting card, cash, and split payments'
      ],
      flow: [
        { step: '1', title: 'Ticketless Entry', desc: 'Camera captures plate; barrier raises in 0.3s without queue delay.' },
        { step: '2', title: 'Checkout Scan', desc: 'Cashier POS prints discount barcode on customer grocery receipt.' },
        { step: '3', title: 'Free Exit', desc: 'Customer scans receipt at kiosk or exit gate for instant free exit.' }
      ]
    },
    {
      id: 'hotel',
      title: 'Hotels, Resorts & Valet Services',
      icon: Hotel,
      tag: 'Hospitality & Luxury Valet',
      color: '#f59e0b',
      tagline: 'PMS Integration & Digital SMS Valet Dispatch',
      summary: 'Integrates with Hotel Property Management Systems (PMS) for seamless guest stay parking privileges, VIP pre-arrival greetings, and digital SMS valet retrieval.',
      benefits: [
        'Direct synchronization with Hotel PMS room bookings (Opera, Fidelio, etc.)',
        'Digital SMS valet retrieval token for guests with estimated vehicle ready time',
        'VIP guest license plate pre-registration & automatic barrier greeting',
        'Banquet, wedding, and conference parking validation vouchers',
        'Anti-passback protection across multi-gate resort perimeters'
      ],
      flow: [
        { step: '1', title: 'Guest Check-In', desc: 'Front desk assigns room key and whitelists guest vehicle in PMS.' },
        { step: '2', title: 'Unlimited In/Out', desc: 'Boom barrier opens automatically for registered guest throughout stay.' },
        { step: '3', title: 'SMS Valet Recall', desc: 'Guest clicks SMS link to request valet car retrieval in 5 minutes.' }
      ]
    },
    {
      id: 'corporate',
      title: 'Corporate Tech Parks & Towers',
      icon: Layers,
      tag: 'Commercial Real Estate',
      color: '#6366f1',
      tagline: 'Multi-Tenant Company Quotas & Contractor Passes',
      summary: 'Manages complex multi-tenant office towers with company slot quotas, pre-registered visitor invitations, contractor QR badges, and monthly departmental billing reports.',
      benefits: [
        'Tenant company slot quota enforcement with overflow protection',
        'Pre-registered visitor invitations with digital QR wallet passes',
        'Tailgating detection and strict anti-passback security protocols',
        'Seamless integration with building speed-gates and elevator dispatch',
        'Comprehensive monthly tenant parking invoice and usage audits'
      ],
      flow: [
        { step: '1', title: 'Visitor Invite', desc: 'Tenant employee sends QR invitation link to client via email/WhatsApp.' },
        { step: '2', title: 'Gate Recognition', desc: 'Client scans QR at entrance kiosk or ANPR matches pre-registered plate.' },
        { step: '3', title: 'Quota Deduct', desc: 'System automatically attributes parking duration to host company quota.' }
      ]
    },
    {
      id: 'airport',
      title: 'Airports & Transit Terminals',
      icon: Plane,
      tag: 'Aviation & Municipal Hubs',
      color: '#ec4899',
      tagline: 'Multi-Tariff Engine & Ride-Share Staging',
      summary: 'Heavy-duty 24/7 municipal infrastructure featuring multi-tier tariffs (Drop-off 15min grace, Short-term, Long-term multi-day) and geo-fenced taxi/Uber dispatch queues.',
      benefits: [
        'Multi-tier dynamic tariff calculator (Hourly, Daily, Multi-day & Grace)',
        'Automated Taxi & Ride-share geo-fenced staging holding zones',
        'Blacklist plate alarms and security hotlist instant notifications',
        '100% offline edge resilience: Operates uninterrupted during WAN downtime',
        'Audited revenue collection and tamper-proof shift reconciliation'
      ],
      flow: [
        { step: '1', title: 'Drop-off Zone', desc: '15-minute free grace period calculated automatically by ANPR.' },
        { step: '2', title: 'Long-Term Lot', desc: 'Daily rate accumulation with multi-day discount calculation.' },
        { step: '3', title: 'Rapid Exit', desc: 'Contactless tap-and-go payment or pre-paid flight booking barcode scan.' }
      ]
    },
    {
      id: 'stadium',
      title: 'Stadiums & Event Arenas',
      icon: Ticket,
      tag: 'Events & Mass Venues',
      color: '#8b5cf6',
      tagline: 'Prepaid Ticket Barcode Ingress & Surge Clearance',
      summary: 'Built for high-volume crowds (50,000+ attendees). Scans prepaid event barcodes directly at boom barrier kiosks to achieve rapid clearance rates of 5,000+ cars/hour.',
      benefits: [
        'Prepaid event parking barcodes integrated with Ticketing platforms',
        'Dynamic lane reversal (Convert all lanes to Exit during dispersal)',
        'Bus and coach dedicated parking bay allocations',
        'VIP & press media license plate priority lanes',
        'Live digital directional boards guiding drivers to open bays'
      ],
      flow: [
        { step: '1', title: 'Pre-Purchased Pass', desc: 'Attendee buys parking ticket online along with event entry ticket.' },
        { step: '2', title: 'Rapid Ingress', desc: 'Kiosk scans barcode from phone screen in <0.3s; barrier raises.' },
        { step: '3', title: 'Event Dispersal', desc: 'All gates switch to free-flow exit mode to empty parking in minutes.' }
      ]
    }
  ];

  const currentHardware = hardwareItems.find(h => h.id === activeHardware) || hardwareItems[0];
  const currentInd = industries.find(i => i.id === activeIndustry) || industries[0];

  return (
    <div 
      className="modern-landing-container"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: isDark ? '#070b14' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background 0.3s ease, color 0.3s ease',
        overflowX: 'hidden'
      }}
    >
      {/* 1. TOP STICKY NAVIGATION BAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: isDark ? 'rgba(11, 17, 32, 0.95)' : 'rgba(255, 255, 255, 0.96)',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        backdropFilter: 'blur(16px)',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '12px clamp(20px, 4vw, 48px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Logo & SaNDS Lab Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}>
                <Car size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1.1, color: isDark ? '#ffffff' : '#0f172a' }}>
                  Smart Parking Solution
                </div>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Turnkey Facility Automation OS
                </div>
              </div>
            </div>

            {/* Official SaNDS Lab Header Badge */}
            <div 
              onClick={() => setSandsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '20px',
                background: isDark ? 'rgba(236, 72, 153, 0.14)' : 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Click to view SaNDS Lab profile & direct contact"
            >
              <img 
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png" 
                alt="SaNDS Lab" 
                style={{ height: '15px', width: 'auto', display: 'block' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ec4899', letterSpacing: '0.04em' }}>
                POWERED BY SaNDS LAB
              </span>
              <ExternalLink size={11} color="#ec4899" />
            </div>
          </div>

          {/* Right Navigation & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Navigation Tabs */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="d-none d-lg-flex">
              <a href="#hardware-section" style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px' }}>Hardware Suite</a>
              <a href="#industry-section" style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px' }}>Industry Solutions</a>
              <a href="#simulator-section" style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px' }}>Interactive Lab</a>
              <a href="#features-section" style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px' }}>Architecture</a>
            </nav>

            {/* Theme Toggle Button (Light by default) */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Guide Button */}
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
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
                padding: '9px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>{user ? 'Enter Control Room' : 'Sign In to Portal'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH BALANCED MARGINS & LIVE INTERACTIVE GATE WIDGET */}
      <section style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '50px clamp(20px, 4vw, 48px) 60px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '40px',
          alignItems: 'center'
        }}>
          {/* Hero Left Content */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '24px',
              background: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.35)',
              color: '#0284c7',
              fontSize: '0.78rem',
              fontWeight: 800,
              marginBottom: '20px'
            }}>
              <Sparkles size={14} />
              <span>ENTERPRISE SMART PARKING & ANPR OS 2026</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              color: isDark ? '#ffffff' : '#0f172a',
              marginBottom: '20px'
            }}>
              Intelligent Multi-Industry Parking & Facility Management
            </h1>

            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: isDark ? '#94a3b8' : '#475569',
              marginBottom: '30px'
            }}>
              A comprehensive automated parking solution engineered for <strong style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>Hospitals, Supermarkets, Commercial Tech Towers, Hotels, Transit Hubs, and Arenas</strong>. Featuring 99.8% ANPR license plate recognition, sub-second barrier actuation, multi-deck LED guidance, and seamless bilateral ERP/HIS integration.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
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
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Launch Live Control Room</span>
                <ArrowRight size={17} />
              </button>

              <a
                href="#simulator-section"
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
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Play size={16} color="#10b981" />
                <span>Test Live Interactive Simulator</span>
              </a>
            </div>

            {/* Live KPI Metric Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '16px',
              borderRadius: '14px',
              background: isDark ? '#111928' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7' }}>99.8%</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>ANPR Accuracy</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>&lt;0.4s</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Barrier Open</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>6+</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Industry Suites</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ec4899' }}>100%</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Offline Edge SLA</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Interactive Live Gate Showcase Card */}
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                borderRadius: '18px',
                overflow: 'hidden',
                background: isDark ? '#131d2e' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
                boxShadow: isDark ? '0 25px 60px -15px rgba(0,0,0,0.8)' : '0 20px 50px -15px rgba(2, 132, 199, 0.25)',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => setLightboxImg('/images/boom_barrier_gate.jpg')}
              title="Click to view full high-resolution image"
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

              {/* Floating Live Telemetry Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#10b981',
                fontSize: '0.74rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <span>GATE 01 [MEDITECH ENTRANCE]: LIVE ARMED</span>
              </div>

              {/* Bottom Telemetry Bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.7) 70%, transparent 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>Automated Barrier & ANPR Telemetry</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sub-second license plate OCR capture & auto-barrier trigger</div>
                </div>
                <div style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.18)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Maximize2 size={12} />
                  <span>Zoom 🔍</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HARDWARE & INFRASTRUCTURE INTERACTIVE SHOWCASE SECTION */}
      <section id="hardware-section" style={{
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: isDark ? '#0b1120' : '#f1f5f9',
        padding: '70px 0'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 48px)'
        }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px' }}>
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
              marginBottom: '12px'
            }}>
              Engineered for Real-World Gates, LED Totems & Control Rooms
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Click any equipment module below to inspect technical specifications, real-world deployment photos, and operational capabilities.
            </p>
          </div>

          {/* Interactive Hardware Segmented Switcher */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '36px'
          }}>
            {hardwareItems.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveHardware(h.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  background: activeHardware === h.id 
                    ? 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)'
                    : isDark ? '#151e2e' : '#ffffff',
                  border: activeHardware === h.id 
                    ? '1px solid #0284c7' 
                    : isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                  color: activeHardware === h.id ? '#ffffff' : isDark ? '#cbd5e1' : '#334155',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: activeHardware === h.id ? '0 6px 18px rgba(2, 132, 199, 0.4)' : '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{h.name}</span>
                <span style={{
                  fontSize: '0.66rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: activeHardware === h.id ? 'rgba(255,255,255,0.2)' : isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  color: activeHardware === h.id ? '#fff' : isDark ? '#94a3b8' : '#64748b'
                }}>
                  {h.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Active Hardware Detailed Interactive Card */}
          <div style={{
            borderRadius: '20px',
            background: isDark ? '#151e2e' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 20px 45px rgba(0,0,0,0.6)' : '0 16px 35px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            alignItems: 'stretch'
          }}>
            {/* Left Column: Image with Zoom */}
            <div 
              style={{ position: 'relative', minHeight: '360px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setLightboxImg(currentHardware.image)}
              title="Click to zoom image"
            >
              <img 
                src={currentHardware.image} 
                alt={currentHardware.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
              />
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '5px 12px',
                borderRadius: '20px',
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#38bdf8',
                fontSize: '0.72rem',
                fontWeight: 800,
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}>
                {currentHardware.category}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '14px',
                right: '14px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Maximize2 size={13} />
                <span>Click to Zoom</span>
              </div>
            </div>

            {/* Right Column: Spec Hotspots */}
            <div style={{ padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px'
                }}>
                  {currentHardware.badge}
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '10px' }}>
                  {currentHardware.name}
                </h3>

                <p style={{ fontSize: '0.92rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
                  {currentHardware.description}
                </p>

                {/* 4 Feature Points */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {currentHardware.hotspots.map((point, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: isDark ? '#0b1120' : '#f8fafc',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                          {point.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4 }}>
                        {point.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick Test CTA */}
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                  Want to test this hardware virtually?
                </span>
                <a 
                  href="#simulator-section" 
                  style={{
                    color: '#0284c7',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Open Simulation Lab</span>
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MULTI-INDUSTRY TURNKEY SUITES */}
      <section id="industry-section" style={{
        padding: '70px 0',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: isDark ? '#070b14' : '#ffffff'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 48px)'
        }}>
          {/* Heading */}
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
              Engineered for High-Throughput Facilities
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Select any industry below to inspect tailored workflows, discount validation schemes, and integration protocols.
            </p>
          </div>

          {/* Industry Tabs */}
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
                    background: isActive ? ind.color : isDark ? '#151e2e' : '#f8fafc',
                    border: isActive ? `1px solid ${ind.color}` : isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                    color: isActive ? '#ffffff' : isDark ? '#cbd5e1' : '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 6px 18px ${ind.color}45` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={16} />
                  <span>{ind.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Industry Deep-Dive */}
          <div style={{
            borderRadius: '20px',
            background: isDark ? '#151e2e' : '#f8fafc',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 35px rgba(0,0,0,0.06)',
            padding: '40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}>
            {/* Left: Summary & Benefits */}
            <div>
              <div style={{
                display: 'inline-block',
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
                {currentInd.tag}
              </div>

              <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '8px' }}>
                {currentInd.title}
              </h3>

              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: currentInd.color, marginBottom: '16px' }}>
                {currentInd.tagline}
              </div>

              <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: isDark ? '#94a3b8' : '#475569', marginBottom: '24px' }}>
                {currentInd.summary}
              </p>

              {/* Bullet points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentInd.benefits.map((b, bIdx) => (
                  <div key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: `${currentInd.color}20`,
                      color: currentInd.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Step-by-Step Flow Card */}
            <div style={{
              borderRadius: '16px',
              padding: '30px',
              background: isDark ? '#0b1120' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: currentInd.color, marginBottom: '20px' }}>
                ● Real-Time Operational Flow
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {currentInd.flow.map((st) => (
                  <div key={st.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: currentInd.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {st.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a' }}>
                        {st.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4, marginTop: '2px' }}>
                        {st.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIVE INTERACTIVE SIMULATION LAB (BARRIER + LED GUIDANCE + QR GENERATOR) */}
      <section id="simulator-section" style={{
        padding: '70px 0',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: isDark ? '#0b1120' : '#f1f5f9'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 48px)'
        }}>
          {/* Section Header */}
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
              Test the Boom Barrier, LED Display & QR Engine in Real-Time
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Interact directly with our digital twin models to experience how sub-second ANPR gates actuate and how floor vacancy syncs.
            </p>
          </div>

          {/* 3-Column Interactive Lab Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px'
          }}>
            {/* Simulator 1: Boom Barrier & ANPR Trigger */}
            <div style={{
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: isDark ? '#ffffff' : '#0f172a' }}>Gate 01 Boom Barrier</h3>
                      <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b' }}>0.4s relay actuation</div>
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: barrierState === 'open' ? '#10b981' : barrierState === 'closed' ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {barrierState === 'open' ? '● RAISED' : barrierState === 'closed' ? '● LOWERED' : '● MOVING...'}
                  </span>
                </div>

                {/* Barrier Canvas Simulation */}
                <div style={{
                  height: '160px',
                  borderRadius: '10px',
                  background: '#040812',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {/* Road */}
                  <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, height: '3px', background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 20px, transparent 20px, transparent 40px)' }} />

                  {/* Pillar */}
                  <div style={{
                    position: 'absolute',
                    left: '40px',
                    bottom: '20px',
                    width: '24px',
                    height: '65px',
                    background: '#f97316',
                    borderRadius: '3px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: '4px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: barrierState === 'open' ? '#10b981' : '#ef4444',
                      boxShadow: `0 0 8px ${barrierState === 'open' ? '#10b981' : '#ef4444'}`
                    }} />
                  </div>

                  {/* Boom Arm */}
                  <div style={{
                    position: 'absolute',
                    left: '60px',
                    bottom: '65px',
                    width: '180px',
                    height: '8px',
                    background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 15px, #ef4444 15px, #ef4444 30px)',
                    borderRadius: '4px',
                    transformOrigin: 'left center',
                    transform: barrierState === 'open' ? 'rotate(-65deg)' : barrierState === 'scanning' ? 'rotate(-10deg)' : barrierState === 'closing' ? 'rotate(-20deg)' : 'rotate(0deg)',
                    transition: 'transform 0.45s ease',
                    boxShadow: barrierState === 'open' ? '0 0 10px #10b981' : '0 0 8px #ef4444'
                  }} />

                  {/* Plate Tag */}
                  <div style={{
                    position: 'absolute',
                    bottom: '25px',
                    right: '30px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: '#ffffff',
                    color: '#000000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    border: '2px solid #000'
                  }}>
                    {simPlate}
                  </div>
                </div>

                {/* Console Log */}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isDark ? '#0b1120' : '#1e293b',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  lineHeight: 1.4,
                  minHeight: '44px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  &gt; {simLog}
                </div>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={runBarrierSimulation}
                  disabled={barrierState !== 'closed'}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: barrierState === 'closed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#64748b',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: barrierState === 'closed' ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={14} />
                  <span>Simulate Vehicle Approach</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const plates = ['BH-84920', 'KW-19402', 'SA-59201', 'DXB-92018', 'OM-38291'];
                    const rand = plates[Math.floor(Math.random() * plates.length)];
                    setSimPlate(rand);
                    setSimLog(`Plate updated to: ${rand}`);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: isDark ? '#0b1120' : '#e2e8f0',
                    border: 'none',
                    color: isDark ? '#fff' : '#0f172a',
                    cursor: 'pointer'
                  }}
                  title="Randomize License Plate"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Simulator 2: Multi-Floor LED Guidance Totem */}
            <div style={{
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sliders size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: isDark ? '#ffffff' : '#0f172a' }}>LED Guidance Display</h3>
                      <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b' }}>Android TV & totem sync</div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', padding: '3px 8px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)' }}>
                    APK REAL-TIME
                  </span>
                </div>

                {/* Digital LED Screen */}
                <div style={{
                  borderRadius: '10px',
                  background: '#040812',
                  padding: '14px 16px',
                  border: '2px solid #1e293b',
                  marginBottom: '14px'
                }}>
                  <div style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    ● PARKING ENTRANCE GUIDANCE
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                      <span style={{ color: '#fff' }}>P1 LEVEL :</span>
                      <span style={{ color: floors.p1.vacant > 0 ? '#10b981' : '#ef4444', textShadow: floors.p1.vacant > 0 ? '0 0 6px #10b981' : '0 0 6px #ef4444' }}>
                        {floors.p1.vacant > 0 ? `${floors.p1.vacant} VACANT` : 'FULL'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                      <span style={{ color: '#fff' }}>P2 LEVEL :</span>
                      <span style={{ color: floors.p2.vacant > 0 ? '#10b981' : '#ef4444', textShadow: floors.p2.vacant > 0 ? '0 0 6px #10b981' : '0 0 6px #ef4444' }}>
                        {floors.p2.vacant > 0 ? `${floors.p2.vacant} VACANT` : 'FULL'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                      <span style={{ color: '#fff' }}>P3 LEVEL :</span>
                      <span style={{ color: floors.p3.vacant > 0 ? '#10b981' : '#ef4444', textShadow: floors.p3.vacant > 0 ? '0 0 6px #10b981' : '0 0 6px #ef4444' }}>
                        {floors.p3.vacant > 0 ? `${floors.p3.vacant} VACANT` : 'FULL'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, width: '60px' }}>P1 Slots:</label>
                    <input 
                      type="range" min="0" max="60" value={floors.p1.vacant} 
                      onChange={(e) => setFloors(prev => ({ ...prev, p1: { ...prev.p1, vacant: parseInt(e.target.value, 10) } }))}
                      style={{ flex: 1, accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, width: '24px', textAlign: 'right' }}>{floors.p1.vacant}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, width: '60px' }}>P2 Slots:</label>
                    <input 
                      type="range" min="0" max="40" value={floors.p2.vacant} 
                      onChange={(e) => setFloors(prev => ({ ...prev, p2: { ...prev.p2, vacant: parseInt(e.target.value, 10) } }))}
                      style={{ flex: 1, accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, width: '24px', textAlign: 'right' }}>{floors.p2.vacant}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, width: '60px' }}>P3 Slots:</label>
                    <input 
                      type="range" min="0" max="30" value={floors.p3.vacant} 
                      onChange={(e) => setFloors(prev => ({ ...prev, p3: { ...prev.p3, vacant: parseInt(e.target.value, 10) } }))}
                      style={{ flex: 1, accentColor: '#ef4444' }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, width: '24px', textAlign: 'right' }}>{floors.p3.vacant}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <a 
                  href="/apks/DisplayBoard.apk" 
                  download 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#6366f1',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={13} />
                  <span>Download Android Display APK</span>
                </a>
              </div>
            </div>

            {/* Simulator 3: Live QR Code & Validation Token Generator */}
            <div style={{
              borderRadius: '16px',
              background: isDark ? '#151e2e' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ec4899', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: isDark ? '#ffffff' : '#0f172a' }}>QR Token Generator</h3>
                      <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#64748b' }}>ISO/IEC 18004 Engine</div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ec4899', padding: '3px 8px', borderRadius: '12px', background: 'rgba(236,72,153,0.15)' }}>
                    THERMAL PASS
                  </span>
                </div>

                {/* Printable Slip Render */}
                <div style={{
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '12px 14px',
                  border: '1px dashed #94a3b8',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Generated QR representation */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#000',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    <QrCode size={48} color="#fff" />
                  </div>

                  <div style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 900, color: '#000' }}>{qrPatientName}</div>
                    <div style={{ color: '#475569' }}>{qrDept}</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{qrGeneratedToken}</div>
                    <div style={{ fontWeight: 700, color: '#10b981', marginTop: '2px' }}>✓ {qrValidHours}</div>
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={qrPatientName}
                    onChange={(e) => setQrPatientName(e.target.value)}
                    placeholder="Visitor / Patient Name"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                      background: isDark ? '#0b1120' : '#f8fafc',
                      color: isDark ? '#fff' : '#0f172a',
                      fontSize: '0.78rem'
                    }}
                  />
                  <input
                    type="text"
                    value={qrDept}
                    onChange={(e) => setQrDept(e.target.value)}
                    placeholder="Clinic / Tenant Department"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                      background: isDark ? '#0b1120' : '#f8fafc',
                      color: isDark ? '#fff' : '#0f172a',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const token = 'PASS-' + Math.floor(100000 + Math.random() * 900000);
                  setQrGeneratedToken(token);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 1500);
                }}
                style={{
                  marginTop: '12px',
                  padding: '9px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {qrCopied ? '✓ New QR Generated!' : 'Generate New QR Token'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 8 CORE ARCHITECTURAL PILLARS */}
      <section id="features-section" style={{
        padding: '70px 0',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: isDark ? '#070b14' : '#ffffff'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 48px)'
        }}>
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
              marginBottom: '12px'
            }}>
              Everything Needed for Mission-Critical Parking
            </h2>
            <p style={{ fontSize: '0.98rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Built with zero third-party cloud dependencies, enterprise resilience, and modern web standards.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {[
              { icon: Video, title: 'Sub-Second ANPR Engine', badge: '99.8% Capture', desc: 'Hardware-agnostic optical plate recognition supporting Hikvision, Dahua, Uniview, and Axis RTSP streams.' },
              { icon: Globe, title: 'Universal REST API', badge: 'Any HIS / ERP', desc: 'Full bi-directional REST endpoints to sync appointments, generate parking QR tokens, and validate visits in real-time.' },
              { icon: QrCode, title: 'ISO/IEC 18004 QR Engine', badge: 'Pure PHP / Native', desc: 'Zero external library dependencies; produces ultra-sharp thermal receipts and phone-scannable QR barcodes.' },
              { icon: Layers, title: 'Multi-Floor Manager', badge: 'P1 · P2 · P3 · VIP', desc: 'Live floor-by-floor slot accounting with vacancy thresholds, reserved bays, and digital LED board updates.' },
              { icon: CreditCard, title: 'Cashier & POS Billing', badge: 'Split Payments', desc: 'Point-of-sale interface supporting cash, debit/credit cards, BenefitPay, discount coupons, and lost ticket fees.' },
              { icon: Smartphone, title: 'Android TV Display APK', badge: 'Smart TV & LED', desc: 'Standalone Android TV APK designed for full-screen LED gate totems and waiting area television screens.' },
              { icon: Zap, title: 'Barrier Relay Controls', badge: 'TCP/IP & RS485', desc: 'Instant physical gate actuation via IP relay boards and serial controllers with auto-close safety protection.' },
              { icon: ShieldCheck, title: 'Audits & Anti-Passback', badge: 'Tamper Proof', desc: 'Shift-wise financial reconciliation, plate blacklist hotlists, and strict anti-passback rule enforcement.' }
            ].map((p, pIdx) => {
              const Icon = p.icon;
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
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                      color: isDark ? '#94a3b8' : '#475569'
                    }}>
                      {p.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '6px' }}>
                    {p.title}
                  </h3>

                  <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER WITH SANDS LAB BRANDING & DIRECT CONTACT */}
      <footer style={{
        background: isDark ? '#040711' : '#0f172a',
        color: '#ffffff',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #1e293b',
        padding: '50px 0 30px'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 48px)'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            paddingBottom: '30px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Brand Info */}
            <div style={{ maxWidth: '440px' }}>
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
                <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>Smart Parking Solution OS</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                Next-generation facility automation architecture engineered by SaNDS Lab for healthcare, commercial, and retail hubs.
              </p>
            </div>

            {/* Direct Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
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
                <span>SaNDS Lab Hub</span>
              </button>

              <a
                href="https://sandslab.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
              >
                Official Website ↗
              </a>

              <a
                href="https://wa.me/97335078079"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#25D366', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}
              >
                WhatsApp (+973 35078079)
              </a>
            </div>
          </div>

          <div style={{
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
        </div>
      </footer>

      {/* 8. LIGHTBOX IMAGE ZOOM MODAL */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)}
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
              src={lightboxImg} 
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
              onClick={() => setLightboxImg(null)}
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

      {/* 9. SANDS LAB OFFICIAL MODAL POPUP */}
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
                Enterprise AI, Automation & Smart Facility Systems
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

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.6, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '20px' }}>
                SaNDS Lab develops high-reliability software architectures for medical centers, government sectors, shopping malls, and corporate real estate throughout the GCC region.
              </p>

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
