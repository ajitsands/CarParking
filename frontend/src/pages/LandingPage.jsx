import React, { useState } from 'react';
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
  PhoneCall
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
      id: 'techpark',
      title: 'Corporate Parks & Business Towers',
      icon: Layers,
      badge: 'Enterprise & Tech Parks',
      color: '#6366f1',
      tagline: 'Multi-Tenant Allocation & Employee Access Control',
      description: 'Designed for high-density business hubs. Manages tenant slot allocations, employee monthly permits, contractor temporary passes, and visitor pre-registration with automated financial chargeback ledgers.',
      highlights: [
        'Multi-tenant slot quotas with over-capacity alerts',
        'Employee monthly & yearly prepaid ANPR subscriptions',
        'Self-service visitor invitation links with QR passes',
        'Departmental & company financial billing ledger reports',
        'Integration with corporate Active Directory & HRMS'
      ],
      stats: 'Zero Manual Gate Paperwork'
    },
    {
      id: 'airport',
      title: 'Airports & Multi-Storey Municipal Lots',
      icon: Plane,
      badge: 'Municipal & Transit',
      color: '#ec4899',
      tagline: 'Dynamic Tariff Engines & Multi-Floor Display Boards',
      description: 'High-capacity infrastructure for long-term and short-term airport terminals. Features tiered progressive pricing, Android LED display boards, lost ticket resolution, and multi-currency billing.',
      highlights: [
        'Progressive hourly & multi-day long-term tariff engines',
        'Free downloadable Android Parking Display Board APK',
        'Real-time floor-by-floor capacity & zone guidance',
        'Centralized cloud management across multiple city locations',
        'Comprehensive financial audit trail & cashier shift settlements'
      ],
      stats: '24/7 Heavy Transit Resilience'
    },
    {
      id: 'stadium',
      title: 'Stadiums, Arenas & Event Venues',
      icon: Ticket,
      badge: 'Events & Entertainment',
      color: '#8b5cf6',
      tagline: 'Surge-Rate Tariffs & Mass Throughput Automation',
      description: 'Handles tens of thousands of vehicles during concerts, matches, and trade expos. Includes rapid event barrier open modes, surge pricing rules, and cashless mobile scan-to-exit gates.',
      highlights: [
        'High-speed batch entry mode during peak match hours',
        'Pre-booked digital event QR passes on mobile phones',
        'Cashless exit terminals with instant BenefitPay QR payments',
        'Offline edge resilience — gates operate without internet',
        'VIP & press media dedicated access lanes'
      ],
      stats: '15,000+ Vehicles Handled Per Event'
    }
  ];

  const currentIndustry = industries.find(i => i.id === activeIndustry) || industries[0];

  // Core 8 Pillars
  const features = [
    {
      icon: Video,
      title: 'AI ANPR Camera Ingestion Engine',
      color: '#2563eb',
      desc: 'Native HTTP push listener compatible with Dahua, Hikvision, Uniview, Hanwha, and custom LPR edge cameras. Sub-second license plate recognition with 99.8% accuracy.'
    },
    {
      icon: Globe,
      title: 'Universal 3rd-Party REST API',
      color: '#0284c7',
      desc: 'Bilateral REST endpoints for ANY software — HIMS, ERP, POS, CRM, Hotel PMS, or custom mobile apps. Real-time availability pushing and automated consultation waivers.'
    },
    {
      icon: QrCode,
      title: 'Instant QR Code Generator & Printing',
      color: '#10b981',
      desc: 'Built-in pure-PHP ISO/IEC 18004 compliant QR generator. Emits high-resolution Base64 PNGs and SVG slips for POS thermal receipt printers (ESC/POS & Zebra).'
    },
    {
      icon: Layers,
      title: 'Floor-Wise Capacity & Zone Manager',
      color: '#6366f1',
      desc: 'Configure total facility capacity and floor-by-floor slot quotas. Real-time occupancy KPI counters, progress meters, and dynamic available spot updates.'
    },
    {
      icon: CreditCard,
      title: 'POS Cashier & Digital Payment Terminal',
      color: '#f59e0b',
      desc: 'Multi-currency cashier checkout supporting BenefitPay QR, credit cards, cash, and discount vouchers. Configurable tariffs with grace periods and anti-passback.'
    },
    {
      icon: Smartphone,
      title: 'Android Parking Display Board App',
      color: '#ec4899',
      desc: 'Free downloadable native Android APK for outdoor LED display totems and tablets. Shows real-time floor availability, welcome messages, and rate cards.'
    },
    {
      icon: ShieldCheck,
      title: 'Hardware Relay & Boom Barrier Control',
      color: '#14b8a6',
      desc: 'Direct IP relay, serial COM, and GPIO integration for instant boom barrier trigger. Configurable open pulses with safety loop sensor interlocking.'
    },
    {
      icon: BarChart3,
      title: 'Financial Ledger & Audit Analytics',
      color: '#8b5cf6',
      desc: 'Complete vehicle access history, shift settlement logs, revenue breakdown, and exportable PDF/Excel reports with role-based access security.'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#090d16' : '#f8fafc',
      color: isDark ? '#f1f5f9' : '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: isDark ? 'rgba(9, 13, 22, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
        padding: '12px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: '#ffffff',
              padding: '4px 10px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <img
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"
                alt="SaNDS Lab Logo"
                style={{ height: '32px', width: 'auto', display: 'block' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.3px', color: isDark ? '#fff' : '#0f172a' }}>
                SaNDS Smart Parking OS
              </div>
              <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                Universal Multi-Industry Facility Management
              </div>
            </div>
          </div>

          {/* Quick Links & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                const el = document.getElementById('industries-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 10px'
              }}
            >
              Multi-Industry Suites
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('features-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 10px'
              }}
            >
              Core Features
            </button>

            <a
              href="/HIMS_API_Integration_Guide.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#0284c7',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FileText size={14} /> API Guide
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              style={{
                background: isDark ? '#1e293b' : '#f1f5f9',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                color: isDark ? '#f59e0b' : '#0284c7',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.2s ease'
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Launch Portal CTA */}
            <button
              onClick={onLaunchPortal}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span>{user ? 'Open Dashboard' : 'Launch Portal'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section style={{
        padding: '60px 24px 40px',
        maxWidth: '1280px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        {/* Powered By Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: isDark ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe',
          border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
          padding: '6px 16px',
          borderRadius: '30px',
          marginBottom: '20px'
        }}>
          <Sparkles size={14} color="#0284c7" />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', letterSpacing: '0.5px' }}>
            POWERED BY SaNDS LAB &bull; ENTERPRISE SMART PARKING
          </span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.8px',
          margin: '0 auto 18px',
          maxWidth: '900px',
          background: isDark 
            ? 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 60%, #38bdf8 100%)' 
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0284c7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Next-Gen AI ANPR &amp; Barrier Automation for Any Multi-Facility Industry
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: '1.05rem',
          lineHeight: 1.6,
          color: isDark ? '#94a3b8' : '#475569',
          maxWidth: '780px',
          margin: '0 auto 30px'
        }}>
          A unified, high-speed parking OS engineered with bilateral REST APIs, sub-second barrier automation, pure-PHP ISO QR slip issuance, POS cashier terminals, and real-time floor occupancy intelligence.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '50px'
        }}>
          <button
            onClick={onLaunchPortal}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(2, 132, 199, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            <span>{user ? 'Enter Management Dashboard' : 'Launch Parking System'}</span>
            <ArrowRight size={16} />
          </button>

          <a
            href="/ParkingDisplayBoard_v1.0.apk"
            download
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Download size={16} color="#10b981" />
            <span>Download Android Display App</span>
          </a>

          <button
            onClick={() => setSandsModalOpen(true)}
            style={{
              background: 'transparent',
              color: isDark ? '#cbd5e1' : '#475569',
              border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              padding: '14px 20px',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <MessageCircle size={16} color="#ec4899" />
            <span>Contact SaNDS Lab</span>
          </button>
        </div>

        {/* Live Metric Highlights Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '16px',
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          borderRadius: '14px',
          padding: '24px 20px',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7' }}>99.8%</div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              ANPR OCR Recognition
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>&lt; 0.4s</div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              Boom Barrier Response
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>100%</div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              Offline Edge Resilience
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ec4899' }}>6+ Suites</div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              Multi-Industry Solutions
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6366f1' }}>Live IoT</div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              Floor &amp; Zone Capacity
            </div>
          </div>
        </div>
      </section>

      {/* ── Multi-Industry Interactive Solutions Section ────────────── */}
      <section id="industries-section" style={{
        padding: '60px 24px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#0284c7',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px'
          }}>
            Tailored Industry Architecture
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
            fontWeight: 800,
            margin: '0 0 10px'
          }}>
            Engineered for Multi-Facility Operations
          </h2>
          <p style={{ fontSize: '0.95rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '650px', margin: '0 auto' }}>
            Whether managing a hospital healthcare network, busy supermarket retail plaza, luxury resort valet, or commercial tower, SaNDS Smart Parking delivers tailored operational workflows.
          </p>
        </div>

        {/* Industry Selection Tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '28px'
        }}>
          {industries.map(ind => {
            const Icon = ind.icon;
            const isSelected = activeIndustry === ind.id;
            return (
              <button
                key={ind.id}
                onClick={() => setActiveIndustry(ind.id)}
                style={{
                  background: isSelected 
                    ? (isDark ? '#1e293b' : '#ffffff') 
                    : (isDark ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9'),
                  color: isSelected ? ind.color : (isDark ? '#94a3b8' : '#64748b'),
                  border: isSelected ? `2px solid ${ind.color}` : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  padding: '10px 18px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isSelected ? ind.color : (isDark ? '#64748b' : '#94a3b8')} />
                <span>{ind.title.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Active Industry Showcase Card */}
        <div style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1.5px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          borderRadius: '16px',
          padding: '36px',
          boxShadow: isDark ? '0 10px 35px rgba(0,0,0,0.3)' : '0 6px 25px rgba(0,0,0,0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '30px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: `${currentIndustry.color}15`,
              color: currentIndustry.color,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800,
              marginBottom: '12px'
            }}>
              {currentIndustry.badge}
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', color: isDark ? '#fff' : '#0f172a' }}>
              {currentIndustry.title}
            </h3>
            
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: currentIndustry.color, marginBottom: '14px' }}>
              {currentIndustry.tagline}
            </div>

            <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: isDark ? '#94a3b8' : '#475569', marginBottom: '20px' }}>
              {currentIndustry.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentIndustry.highlights.map((h, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.86rem' }}>
                  <CheckCircle2 size={16} color={currentIndustry.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Interactive Graphic / Widget */}
          <div style={{
            background: isDark ? '#020617' : '#f8fafc',
            border: `1px solid ${isDark ? '#1e293b' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: currentIndustry.color, letterSpacing: '0.5px' }}>
                ARCHITECTURE WORKFLOW
              </span>
              <span className="badge" style={{ background: `${currentIndustry.color}20`, color: currentIndustry.color, fontSize: '0.7rem' }}>
                {currentIndustry.stats}
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '0.78rem'
            }}>
              <div style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: currentIndustry.color, fontWeight: 800 }}>1.</span>
                <span>Vehicle Approaches Gate &bull; ANPR OCR Scans Plate</span>
              </div>

              <div style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: currentIndustry.color, fontWeight: 800 }}>2.</span>
                <span>Bilateral API Sync &bull; Dynamic QR Slip / Voucher</span>
              </div>

              <div style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: currentIndustry.color, fontWeight: 800 }}>3.</span>
                <span>Desk / Kiosk Validation &bull; Free Parking Waiver Applied</span>
              </div>

              <div style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: currentIndustry.color, fontWeight: 800 }}>4.</span>
                <span>Exit ANPR Verification &bull; Boom Barrier Auto-Opens</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={onLaunchPortal}
                style={{
                  flex: 1,
                  background: currentIndustry.color,
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>Launch {currentIndustry.title.split('&')[0]} Module</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8 Core Feature Pillars ──────────────────────────────────── */}
      <section id="features-section" style={{
        padding: '60px 24px',
        maxWidth: '1280px',
        margin: '0 auto',
        background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
        borderRadius: '24px',
        border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#0284c7',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px'
          }}>
            Complete Feature Ecosystem
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            fontWeight: 800,
            margin: '0 0 10px'
          }}>
            8 Core Pillars of the SaNDS Parking Platform
          </h2>
          <p style={{ fontSize: '0.95rem', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '650px', margin: '0 auto' }}>
            Built with zero unnecessary dependencies, ultra-fast SQLite/MySQL database engine, native pure-PHP QR generators, and instant GPIO/IP relay triggering.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                style={{
                  background: isDark ? '#0f172a' : '#f8fafc',
                  border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = feat.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = isDark ? '#1e293b' : '#e2e8f0';
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: `${feat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px'
                }}>
                  <Icon size={20} color={feat.color} />
                </div>

                <h4 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0 0 8px', color: isDark ? '#fff' : '#0f172a' }}>
                  {feat.title}
                </h4>

                <p style={{ fontSize: '0.84rem', lineHeight: 1.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0, flexGrow: 1 }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Downloadable Display App & Integration CTA Strip ────────── */}
      <section style={{
        padding: '60px 24px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #1e1b4b 100%)',
          borderRadius: '20px',
          padding: '40px 32px',
          color: '#ffffff',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          alignItems: 'center',
          boxShadow: '0 15px 40px rgba(0,0,0,0.2)'
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 800,
              marginBottom: '12px'
            }}>
              FREE COMPANION APP
            </div>
            <h3 style={{ fontSize: '1.7rem', fontWeight: 900, margin: '0 0 10px', color: '#fff' }}>
              Android Parking Display Board APK
            </h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 20px' }}>
              Deploy real-time parking spot counters on outdoor digital LED boards, Android TV totems, and reception tablets. Automatically synchronizes available slots per floor over LAN or Wi-Fi.
            </p>
            <a
              href="/ParkingDisplayBoard_v1.0.apk"
              download
              style={{
                background: '#10b981',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Download size={16} />
              <span>Download APK (v1.0 &bull; 81 MB)</span>
            </a>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '24px'
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
              Ready to Connect with Your Software?
            </h4>
            <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 16px' }}>
              Our engineering team at SaNDS Lab provides turnkey integration support for Hospital Information Systems, ERPs, POS hardware, and access control barriers.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSandsModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PhoneCall size={14} /> WhatsApp Support
              </button>
              <a
                href="/HIMS_API_Integration_Guide.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} /> Integration Manual
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{
        background: isDark ? '#020617' : '#ffffff',
        borderTop: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
        padding: '30px 24px',
        textAlign: 'center',
        fontSize: '0.86rem',
        color: isDark ? '#64748b' : '#64748b'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span>&copy; 2026 All Rights Reserved &mdash; <strong>{settings.company_name || 'SaNDS Smart Parking OS'}</strong></span>
          <span style={{ color: isDark ? '#334155' : '#cbd5e1' }}>|</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>Powered by</span>
            <button
              onClick={() => setSandsModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.86rem',
                textDecoration: 'underline'
              }}
            >
              SaNDS Lab
            </button>
          </div>
        </div>
      </footer>

      {/* ── SaNDS Lab Light Background Modal Popup ──────────────────── */}
      {sandsModalOpen && (
        <div
          onClick={() => setSandsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '36px 32px 28px',
              width: '360px',
              maxWidth: '92vw',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              color: '#0f172a'
            }}
          >
            <button
              onClick={() => setSandsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            <div style={{ margin: '0 auto 12px', width: 'fit-content' }}>
              <img
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"
                alt="SaNDS Lab Logo"
                style={{ height: '54px', width: 'auto', display: 'block', margin: '0 auto' }}
              />
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 24px', fontWeight: 500 }}>
              Innovative Solutions &amp; Digital Services
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="https://wa.me/97335078079"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  color: '#fff'
                }}
              >
                <MessageCircle size={18} />
                <span>Connect on WhatsApp</span>
              </a>

              <a
                href="https://www.sandslab.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff'
                }}
              >
                <Globe size={18} />
                <span>Visit Website</span>
              </a>

              <a
                href="https://products.sandslab.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  color: '#fff'
                }}
              >
                <Layers size={18} />
                <span>Explore All Products</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
