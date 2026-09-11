import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { useKioskPoller } from '../hooks/useKioskPoller';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const day   = String(d.getDate()).padStart(2, '0');
    const mon   = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    const hh    = String(d.getHours()).padStart(2, '0');
    const mm    = String(d.getMinutes()).padStart(2, '0');
    const ss    = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${mon}/${year}  ${hh}:${mm}:${ss}`;
  } catch {
    return isoStr;
  }
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function LiveClock({ isPortrait }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');
  const day  = time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <View style={[styles.clockBox, isPortrait && styles.clockBoxPortrait]}>
      <Text style={[styles.clockTime, isPortrait && styles.clockTimePortrait]}>{hh}:{mm}:{ss}</Text>
      <Text style={styles.clockDate}>{day}</Text>
    </View>
  );
}

// ── IDLE Screen ──────────────────────────────────────────────────────────────

function IdleScreen({ error, isConnected, gateId }) {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const pulse = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] });

  return (
    <View style={[styles.screen, styles.idleScreen]}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.idleContent}>
        {/* Logo / Icon */}
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <View style={[styles.idleIconWrapper, isPortrait && { width: 130, height: 130, borderRadius: 65 }]}>
            <Text style={[styles.idleIcon, isPortrait && { fontSize: 56 }]}>🚗</Text>
            {/* Scan line animation */}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]} />
          </View>
        </Animated.View>

        <Text style={[styles.idleTitle, isPortrait && { fontSize: 24 }]}>DRIVE THROUGH TO EXIT</Text>
        <Text style={[styles.idleSub, isPortrait && { fontSize: 13 }]}>Automatic Number Plate Recognition Active</Text>

        <View style={styles.idleStatusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.idleStatus, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
            {isConnected ? `System Online  ·  ${gateId}` : (error || 'Connecting...')}
          </Text>
        </View>
      </View>

      <LiveClock isPortrait={isPortrait} />
    </View>
  );
}

// ── FREE EXIT Screen ─────────────────────────────────────────────────────────

function FreeExitScreen({ data, isPaid }) {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(60)).current;
  const gateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(gateAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(gateAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.delay(500),
      ])
    ).start();
  }, []);

  const gateColor = gateAnim.interpolate({ inputRange: [0, 1], outputRange: ['#16a34a', '#4ade80'] });
  const amountDisplay = isPaid ? (data.formatted_amount || 'BD 0.000') : 'FREE';
  const amountLabel   = isPaid ? 'AMOUNT PAID' : 'PARKING FEE';
  const statusMsg     = isPaid ? '✅ PAYMENT CONFIRMED — GATE OPENING' : '✅ FREE PARKING — GATE OPENING';

  return (
    <View style={[styles.screen, styles.freeScreen]}>
      <View style={styles.freeGlow} />

      <Animated.View style={[styles.freeContent, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Top status bar */}
        <Animated.View style={[styles.statusBanner, { backgroundColor: gateColor }]}>
          <Text style={[styles.statusBannerText, isPortrait && { fontSize: 16 }]}>{statusMsg}</Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.infoGrid, isPortrait && styles.infoGridPortrait]}
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle & Timing */}
          <View style={[styles.infoLeft, isPortrait && styles.infoLeftPortrait]}>
            {/* Plate */}
            <View style={styles.plateCard}>
              <Text style={styles.plateLabel}>VEHICLE</Text>
              <Text style={[styles.plateFree, isPortrait && { fontSize: 36, letterSpacing: 4 }]}>{data.plate_number || '—'}</Text>
            </View>

            {/* Time rows */}
            <View style={styles.timeGrid}>
              <View style={styles.timeRow}>
                <View style={styles.timeIcon}><Text style={styles.timeIconText}>🟢</Text></View>
                <View>
                  <Text style={styles.timeLabel}>ENTRY</Text>
                  <Text style={styles.timeValue}>{formatDateTime(data.entry_time)}</Text>
                </View>
              </View>
              <View style={[styles.timeRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                <View style={styles.timeIcon}><Text style={styles.timeIconText}>🔴</Text></View>
                <View>
                  <Text style={styles.timeLabel}>EXIT</Text>
                  <Text style={styles.timeValue}>{formatDateTime(data.exit_time)}</Text>
                </View>
              </View>
              <View style={[styles.timeRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                <View style={styles.timeIcon}><Text style={styles.timeIconText}>⏱️</Text></View>
                <View>
                  <Text style={styles.timeLabel}>DURATION</Text>
                  <Text style={styles.timeValue}>{formatDuration(data.duration_minutes)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Amount & Gate */}
          <View style={[styles.infoRight, isPortrait && styles.infoRightPortrait]}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>{amountLabel}</Text>
              <Text style={[styles.amountFree, isPortrait && { fontSize: 42 }]}>{amountDisplay}</Text>
              {data.tariff_reason && (
                <Text style={styles.tariffReason}>{data.tariff_reason}</Text>
              )}
            </View>

            {/* Gate graphic */}
            <View style={styles.gateGraphic}>
              <Text style={styles.gateIcon}>🚦</Text>
              <Animated.Text style={[styles.gateStatus, { color: gateColor }]}>
                GATE OPEN
              </Animated.Text>
              <Text style={styles.gateSub}>Please proceed</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── PAYMENT REQUIRED Screen ──────────────────────────────────────────────────

function PaymentScreen({ data, backendUrl }) {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const qrScale = useRef(new Animated.Value(0.8)).current;
  const alertPulse = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(qrScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(alertPulse, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(alertPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    const cd = setInterval(() => setCountdown(prev => prev <= 1 ? 30 : prev - 1), 1000);
    return () => clearInterval(cd);
  }, []);

  const qrSize = isPortrait ? Math.min(width * 0.52, 210) : Math.min(width * 0.28, height * 0.55, 260);

  return (
    <View style={[styles.screen, styles.payScreen]}>
      <View style={styles.payGlow} />

      <Animated.View style={[styles.payContent, { opacity: fadeIn }]}>
        {/* Top alert bar */}
        <Animated.View style={[styles.payAlertBar, { transform: [{ scale: alertPulse }] }]}>
          <Text style={[styles.payAlertText, isPortrait && { fontSize: 13 }]}>
            ⚠️  PAYMENT REQUIRED — PLEASE SCAN QR CODE TO PAY
          </Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.payGrid, isPortrait && styles.payGridPortrait]}
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle Info */}
          <View style={[styles.payLeft, isPortrait && styles.payLeftPortrait]}>
            <View style={styles.payPlateCard}>
              <Text style={styles.payPlateLabel}>VEHICLE</Text>
              <Text style={[styles.payPlateNum, isPortrait && { fontSize: 32, letterSpacing: 3 }]}>
                {data.plate_number || '—'}</Text>
            </View>

            {/* Time info */}
            <View style={styles.payTimeCard}>
              <View style={styles.payTimeRow}>
                <Text style={styles.payTimeLabel}>🟢 ENTRY</Text>
                <Text style={styles.payTimeVal}>{formatDateTime(data.entry_time)}</Text>
              </View>
              <View style={styles.payTimeDivider} />
              <View style={styles.payTimeRow}>
                <Text style={styles.payTimeLabel}>🔴 EXIT</Text>
                <Text style={styles.payTimeVal}>{formatDateTime(data.exit_time)}</Text>
              </View>
              <View style={styles.payTimeDivider} />
              <View style={styles.payTimeRow}>
                <Text style={styles.payTimeLabel}>⏱️ DURATION</Text>
                <Text style={styles.payTimeVal}>{formatDuration(data.duration_minutes)}</Text>
              </View>
            </View>

            {/* Amount Due */}
            <View style={styles.amountDueCard}>
              <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
              <Text style={[styles.amountDueValue, isPortrait && { fontSize: 38 }]}>
                {data.formatted_amount || `${data.currency_symbol || 'BD'} ${Number(data.amount_due || 0).toFixed(3)}`}
              </Text>
              {data.tariff_reason ? (
                <Text style={styles.amountDueReason}>{data.tariff_reason}</Text>
              ) : null}
            </View>
          </View>

          {/* QR Code */}
          <View style={[styles.payRight, isPortrait && styles.payRightPortrait]}>
            <Text style={[styles.qrTitle, isPortrait && { fontSize: 18 }]}>SCAN TO PAY</Text>
            <Text style={styles.qrSub}>Open camera on your phone</Text>

            <Animated.View style={[styles.qrWrapper, { transform: [{ scale: qrScale }] }]}>
              <View style={styles.qrInner}>
                {data.qr_payload ? (
                  <QRCode
                    value={data.qr_payload}
                    size={qrSize}
                    color="#000000"
                    backgroundColor="#ffffff"
                    quietZone={10}
                  />
                ) : (
                  <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
                    <Text style={styles.qrPlaceholderText}>Generating QR...</Text>
                  </View>
                )}
              </View>

              <View style={[styles.qrCorner, styles.qrCornerTL]} />
              <View style={[styles.qrCorner, styles.qrCornerTR]} />
              <View style={[styles.qrCorner, styles.qrCornerBL]} />
              <View style={[styles.qrCorner, styles.qrCornerBR]} />
            </Animated.View>

            <View style={styles.qrFooter}>
              <Text style={styles.qrCountdown}>🔄 Auto-refresh in {countdown}s</Text>
              <Text style={styles.qrNote}>Gate opens automatically after payment</Text>
            </View>

            {/* Payment methods */}
            <View style={styles.payMethods}>
              <Text style={styles.payMethodsLabel}>Pay with</Text>
              <View style={styles.payMethodRow}>
                <View style={styles.payMethodBadge}><Text style={styles.payMethodText}>📱 BenefitPay</Text></View>
                <View style={styles.payMethodBadge}><Text style={styles.payMethodText}>💳 QR Scan</Text></View>
                <View style={styles.payMethodBadge}><Text style={styles.payMethodText}>🏦 Bank App</Text></View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Main KioskScreen ─────────────────────────────────────────────────────────

export default function KioskScreen({ navigation, route }) {
  useKeepAwake();

  const config = route?.params?.config || {};
  const backendUrl = config.useCloud ? config.cloudUrl : config.localUrl;
  const gateId     = config.gateId || 'GATE-OUT-01';
  const pollMs     = config.pollInterval || 2000;
  const freeDisplayTimeout = (config.displayTimeout || 15) * 1000;

  const { data, error, isConnected } = useKioskPoller(backendUrl, gateId, pollMs);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          await Brightness.setSystemBrightnessAsync(1);
        }
      } catch {}
    })();
  }, []);

  const [displayData, setDisplayData] = useState(null);
  const [displayState, setDisplayState] = useState('IDLE');
  const freeTimeoutRef = useRef(null);
  const dismissedSessionRef = useRef(null);

  useEffect(() => {
    if (!data) return;

    const state = data.display_state || 'IDLE';
    const sessionId = data.session_id || data.id || (data.plate_number ? `${data.plate_number}_${data.exit_time || data.entry_time}` : null);

    if (state === 'PAYMENT_REQUIRED') {
      if (freeTimeoutRef.current) {
        clearTimeout(freeTimeoutRef.current);
        freeTimeoutRef.current = null;
      }
      dismissedSessionRef.current = null;
      setDisplayData(data);
      setDisplayState('PAYMENT_REQUIRED');
    } else if (state === 'FREE_EXIT') {
      // If this session was already displayed and timed out on client, stay IDLE
      if (sessionId && dismissedSessionRef.current === sessionId) {
        return;
      }

      if (!freeTimeoutRef.current) {
        setDisplayData(data);
        setDisplayState('FREE_EXIT');

        // Auto-revert to IDLE after timeout (default 10s)
        const timeoutMs = freeDisplayTimeout || 10000;
        freeTimeoutRef.current = setTimeout(() => {
          dismissedSessionRef.current = sessionId;
          setDisplayState('IDLE');
          setDisplayData(null);
          freeTimeoutRef.current = null;
        }, timeoutMs);
      }
    } else if (state === 'IDLE') {
      if (freeTimeoutRef.current) {
        clearTimeout(freeTimeoutRef.current);
        freeTimeoutRef.current = null;
      }
      dismissedSessionRef.current = null;
      setDisplayState('IDLE');
      setDisplayData(null);
    }
  }, [data, freeDisplayTimeout]);

  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleScreenTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      navigation.replace('Config');
    }
  };

  const isPaid = displayData?.payment_status === 'paid' || displayData?.status === 'PAID';

  return (
    <TouchableOpacity style={styles.root} onPress={handleScreenTap} activeOpacity={1}>
      <StatusBar hidden />

      {displayState === 'IDLE' && (
        <IdleScreen error={error} isConnected={isConnected} gateId={gateId} />
      )}

      {displayState === 'FREE_EXIT' && displayData && (
        <FreeExitScreen data={displayData} isPaid={isPaid} />
      )}

      {displayState === 'PAYMENT_REQUIRED' && displayData && (
        <PaymentScreen data={displayData} backendUrl={backendUrl} />
      )}

      {/* Connection indicator pill */}
      <View style={[styles.connPill, { backgroundColor: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
        <View style={[styles.connDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
        <Text style={[styles.connText, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
          {isConnected ? gateId : 'Offline'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050b18' },
  screen: { flex: 1, position: 'relative', overflow: 'hidden' },

  connPill: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    zIndex: 99,
  },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  clockBox: {
    position: 'absolute',
    bottom: 20,
    right: 24,
    alignItems: 'flex-end',
  },
  clockBoxPortrait: {
    position: 'relative',
    bottom: 'auto',
    right: 'auto',
    alignItems: 'center',
    marginTop: 20,
  },
  clockTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  clockTimePortrait: {
    fontSize: 26,
  },
  clockDate: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 2,
  },

  // IDLE
  idleScreen: { backgroundColor: '#050b18', justifyContent: 'center', alignItems: 'center', padding: 20 },
  orb1: {
    position: 'absolute', width: 400, height: 400,
    borderRadius: 200, backgroundColor: 'rgba(59,130,246,0.06)',
    top: -100, left: -100,
  },
  orb2: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(139,92,246,0.05)',
    bottom: -80, right: -80,
  },
  idleContent: { alignItems: 'center', gap: 16 },
  idleIconWrapper: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  idleIcon: { fontSize: 72 },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(59,130,246,0.6)',
    top: 30,
  },
  idleTitle: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  idleSub: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  idleStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  idleStatus: { fontSize: 13, fontWeight: '600' },

  // FREE EXIT
  freeScreen: { backgroundColor: '#020f07' },
  freeGlow: {
    position: 'absolute',
    top: -200, left: -200, right: -200, bottom: -200,
    backgroundColor: 'rgba(22,163,74,0.04)',
  },
  freeContent: { flex: 1, padding: 16 },
  statusBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoGridPortrait: { flexDirection: 'column', gap: 14 },
  infoLeft: { flex: 1.3, gap: 14 },
  infoLeftPortrait: { flex: undefined, width: '100%' },
  infoRight: { flex: 1, gap: 14 },
  infoRightPortrait: { flex: undefined, width: '100%' },

  plateCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)',
    padding: 16,
    alignItems: 'center',
  },
  plateLabel: { color: '#4ade80', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  plateFree: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  timeGrid: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  timeIcon: { width: 28, alignItems: 'center' },
  timeIconText: { fontSize: 16 },
  timeLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  timeValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  amountCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  amountLabel: { color: '#4ade80', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  amountFree: {
    color: '#4ade80',
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tariffReason: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, textAlign: 'center' },

  gateGraphic: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    padding: 14,
    gap: 6,
  },
  gateIcon: { fontSize: 40 },
  gateStatus: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  gateSub: { color: '#64748b', fontSize: 12 },

  // PAYMENT REQUIRED
  payScreen: { backgroundColor: '#0d0505' },
  payGlow: {
    position: 'absolute',
    top: -200, left: -200, right: -200, bottom: -200,
    backgroundColor: 'rgba(220,38,38,0.03)',
  },
  payContent: { flex: 1, padding: 14 },
  payAlertBar: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  payAlertText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  payGrid: { flexDirection: 'row', gap: 14 },
  payGridPortrait: { flexDirection: 'column', gap: 12 },
  payLeft: { flex: 1.1, gap: 10 },
  payLeftPortrait: { flex: undefined, width: '100%' },
  payRight: { flex: 1, alignItems: 'center', gap: 8 },
  payRightPortrait: { flex: undefined, width: '100%' },

  payPlateCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.35)',
    padding: 12,
    alignItems: 'center',
  },
  payPlateLabel: { color: '#f87171', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  payPlateNum: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  payTimeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 12,
  },
  payTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  payTimeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  payTimeLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  payTimeVal: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  amountDueCard: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  amountDueLabel: { color: '#f87171', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  amountDueValue: {
    color: '#fbbf24',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 1,
  },
  amountDueReason: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, textAlign: 'center' },

  qrTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  qrSub: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  qrWrapper: { position: 'relative', padding: 4 },
  qrInner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  qrPlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholderText: { color: '#64748b', fontSize: 13 },

  qrCorner: { position: 'absolute', width: 18, height: 18, borderColor: '#f59e0b', borderWidth: 3 },
  qrCornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  qrCornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  qrCornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  qrCornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  qrFooter: { alignItems: 'center', gap: 2, marginTop: 4 },
  qrCountdown: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  qrNote: { color: '#64748b', fontSize: 11, textAlign: 'center' },

  payMethods: { alignItems: 'center', gap: 6, marginTop: 4 },
  payMethodsLabel: { color: '#64748b', fontSize: 11, letterSpacing: 1 },
  payMethodRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  payMethodBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  payMethodText: { color: '#94a3b8', fontSize: 10 },
});
