import React, { useState, useEffect, useRef } from 'react';
import { Video, Maximize2, Minimize2, RefreshCw, AlertCircle, Wifi, Camera, HardDrive, Settings, Check, Radio } from 'lucide-react';

export default function LiveCameraStreamPlayer({
  streamPath = 'cam_entry', // default base path
  gateCode = 'GATE-IN-01',
  cameraIp = '192.168.8.200',
  cameraPort = 80,
  nvrIp = '192.168.8.110',
  nvrChannel = 1,
  rtspUrl = '',
  streamHost = window.location.hostname || 'localhost',
  webrtcPort = 8889,
  hlsPort = 8888,
  latestPlate = null,
  plateImageUrl = null,
  isBarrierOpen = false,
  isStandby = false
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [reloadKey, setReloadKey] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const containerRef = useRef(null);

  // Stream Source Selection: 'direct' (Camera IP) or 'nvr' (UNV NVR Channel)
  const storageKey = `parking_stream_source_${gateCode}`;
  const [streamSource, setStreamSource] = useState(() => {
    return localStorage.getItem(storageKey) || 'direct';
  });

  // Custom IPs
  const [customCameraIp, setCustomCameraIp] = useState(() => {
    return localStorage.getItem(`parking_cam_ip_${gateCode}`) || cameraIp || '192.168.8.200';
  });
  const [customNvrIp, setCustomNvrIp] = useState(() => {
    return localStorage.getItem(`parking_nvr_ip_${gateCode}`) || nvrIp || '192.168.8.110';
  });
  const [customNvrChannel, setCustomNvrChannel] = useState(() => {
    return localStorage.getItem(`parking_nvr_ch_${gateCode}`) || String(nvrChannel || '1');
  });

  const handleSourceChange = (newSource) => {
    setStreamSource(newSource);
    localStorage.setItem(storageKey, newSource);
    setReloadKey(prev => prev + 1);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem(`parking_cam_ip_${gateCode}`, customCameraIp);
    localStorage.setItem(`parking_nvr_ip_${gateCode}`, customNvrIp);
    localStorage.setItem(`parking_nvr_ch_${gateCode}`, customNvrChannel);
    setShowSettingsModal(false);
    setReloadKey(prev => prev + 1);
  };

  // Determine active stream path for MediaMTX WHEP
  const activeStreamPath = streamSource === 'nvr' ? 'cam_entry_nvr' : (streamPath || 'cam_entry');
  const hasActiveStream = Boolean(activeStreamPath && !isStandby);
  const iframeUrl = hasActiveStream
    ? `http://${streamHost}:${webrtcPort}/${activeStreamPath}?autoplay=true&muted=true`
    : null;

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="lane-camera-viewport"
      style={{
        position: 'relative',
        background: '#090d16',
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: isFullscreen ? '100vh' : '235px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {hasActiveStream ? (
        /* 1. Active WebRTC Live Video Stream */
        <iframe
          key={reloadKey}
          src={iframeUrl}
          title={`Live Stream - ${gateCode}`}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            border: 'none',
            objectFit: 'cover',
            zIndex: 1,
            backgroundColor: '#050811'
          }}
          allow="autoplay; fullscreen"
          onLoad={() => setStreamStatus('playing')}
          onError={() => setStreamStatus('error')}
        />
      ) : (
        /* 2. Standby / Waiting for Exit Camera Viewport */
        <div style={{ textAlign: 'center', color: '#94a3b8', zIndex: 1, padding: '20px' }}>
          <Video size={44} style={{ opacity: 0.25, margin: '0 auto 8px', color: '#38bdf8' }} />
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
            {gateCode} · IP: {cameraIp}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
            Exit Payment & Barrier Interlock (Port {cameraPort})
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.65rem',
            fontWeight: 700
          }}>
            STANDBY · READY FOR EXIT CAMERA
          </div>
        </div>
      )}

      {/* Top Left: Stream Status Badge & Source Selector */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10
      }}>
        {/* Live Indicator Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(6px)',
          padding: '3px 8px',
          borderRadius: '4px',
          border: hasActiveStream ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)',
          color: hasActiveStream ? '#ef4444' : '#94a3b8',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          {hasActiveStream && (
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444',
              animation: 'pulse 1.5s infinite'
            }} />
          )}
          <span>{hasActiveStream ? 'LIVE 30 FPS' : 'CAMERA STANDBY'}</span>
        </div>

        {/* Source Toggle Pills: Direct ANPR vs UNV NVR */}
        {hasActiveStream && (
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(6px)',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.15)',
            gap: '2px'
          }}>
            <button
              onClick={() => handleSourceChange('direct')}
              title={`Direct Stream from ANPR Camera (${customCameraIp})`}
              style={{
                background: streamSource === 'direct' ? 'var(--primary, #0284c7)' : 'transparent',
                color: streamSource === 'direct' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 7px',
                fontSize: '0.65rem',
                fontWeight: streamSource === 'direct' ? 800 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <Camera size={10} />
              <span>Direct Camera</span>
            </button>

            <button
              onClick={() => handleSourceChange('nvr')}
              title={`Stream via UNV NVR Channel ${customNvrChannel} (${customNvrIp})`}
              style={{
                background: streamSource === 'nvr' ? 'var(--status-blue, #3b82f6)' : 'transparent',
                color: streamSource === 'nvr' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 7px',
                fontSize: '0.65rem',
                fontWeight: streamSource === 'nvr' ? 800 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <HardDrive size={10} />
              <span>UNV NVR Ch{customNvrChannel}</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Right: Active IP Badge & Controls */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10
      }}>
        {/* Active Source IP Badge */}
        <span style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(6px)',
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          color: '#38bdf8',
          fontSize: '0.68rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)'
        }}>
          {streamSource === 'nvr' ? `NVR: ${customNvrIp}:554 (Ch${customNvrChannel})` : `CAM: ${customCameraIp}:${cameraPort}`}
        </span>

        {hasActiveStream && (
          <>
            {/* Stream Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Stream Source Settings (NVR / Camera IP)"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#cbd5e1',
                borderRadius: '4px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings size={11} />
            </button>

            {/* Reload Stream Button */}
            <button
              onClick={() => setReloadKey(prev => prev + 1)}
              title="Reload Live Stream"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#cbd5e1',
                borderRadius: '4px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={11} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Live View"}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#cbd5e1',
                borderRadius: '4px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
          </>
        )}
      </div>

      {/* Bottom Floating ANPR Optical Recognition Badge */}
      <div className="lane-anpr-plate-overlay" style={{ zIndex: 10 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>
          ANPR SENSOR ({gateCode}):
        </span>
        <span style={{ fontWeight: 800 }}>
          {latestPlate || (hasActiveStream ? 'MONITORING ACTIVE' : 'WAITING FOR VEHICLE')}
        </span>
        <span style={{
          fontSize: '0.65rem',
          color: isBarrierOpen ? '#38bdf8' : '#10b981',
          fontWeight: 700
        }}>
          {isBarrierOpen ? 'BARRIER OPEN' : 'ARMED / READY'}
        </span>
      </div>

      {/* Quick Stream Source Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.92)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card, #111827)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '16px',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>
                <Video size={16} color="#38bdf8" /> Stream Source Options
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              {/* Option 1: Direct ANPR Camera */}
              <div
                onClick={() => setStreamSource('direct')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: streamSource === 'direct' ? '1px solid var(--primary, #0284c7)' : '1px solid rgba(255,255,255,0.08)',
                  background: streamSource === 'direct' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255,255,255,0.02)',
                  marginBottom: '10px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={14} color="#38bdf8" /> Direct from ANPR Camera
                  </span>
                  {streamSource === 'direct' && <Check size={14} color="#38bdf8" />}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Pulls ultra low-latency video directly from camera IP.
                </div>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px' }}
                  value={customCameraIp}
                  onChange={(e) => setCustomCameraIp(e.target.value)}
                  placeholder="Camera IP (e.g. 192.168.8.200)"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Option 2: Via UNV NVR */}
              <div
                onClick={() => setStreamSource('nvr')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: streamSource === 'nvr' ? '1px solid var(--status-blue, #3b82f6)' : '1px solid rgba(255,255,255,0.08)',
                  background: streamSource === 'nvr' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                  marginBottom: '14px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={14} color="#60a5fa" /> Stream via UNV NVR
                  </span>
                  {streamSource === 'nvr' && <Check size={14} color="#60a5fa" />}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Pulls RTSP stream from NVR Channel (unicast/c1/s0/live).
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px' }}
                    value={customNvrIp}
                    onChange={(e) => setCustomNvrIp(e.target.value)}
                    placeholder="NVR IP (192.168.8.110)"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px' }}
                    value={customNvrChannel}
                    onChange={(e) => setCustomNvrChannel(e.target.value)}
                    placeholder="Ch (1)"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 14px' }}
                >
                  Save & Switch Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

