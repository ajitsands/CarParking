import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kiosk_config_v2';

const DEFAULT_CONFIG = {
  useCloud: false,
  localUrl: 'http://192.168.8.11:8081',
  cloudUrl: 'https://parking.sandslab.com',
  gateId: 'GATE-OUT-01',
  pollInterval: 2000,
  displayTimeout: 15, // seconds to show FREE screen before returning to IDLE
};

export default function ConfigScreen({ navigation }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.log('Config load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      Alert.alert('Error', 'Could not save configuration');
    }
  };

  const getActiveUrl = () => config.useCloud ? config.cloudUrl : config.localUrl;

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const url = getActiveUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `${url}/api/v1/kiosk/status?gate_id=${encodeURIComponent(config.gateId)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const json = await response.json();
      setTestResult({
        success: true,
        message: `✅ Connected! Gate: ${config.gateId} | Status: ${json.data?.display_state || json.display_state || 'IDLE'}`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `❌ Failed: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLaunch = async () => {
    await saveConfig();
    navigation.replace('Kiosk', { config });
  };

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050b18" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🖥️</Text>
          <Text style={styles.headerTitle}>Display Board Setup</Text>
          <Text style={styles.headerSub}>Exit Gate Kiosk Configuration</Text>
        </View>

        {/* Connection Mode Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📡 Connection Mode</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleOption}>
              <Text style={[styles.toggleLabel, !config.useCloud && styles.toggleLabelActive]}>
                🏠 Local WiFi
              </Text>
              <Text style={styles.toggleSub}>Same network (LAN)</Text>
            </View>
            <Switch
              value={config.useCloud}
              onValueChange={(v) => update('useCloud', v)}
              trackColor={{ false: '#3b82f6', true: '#8b5cf6' }}
              thumbColor="#fff"
            />
            <View style={styles.toggleOption}>
              <Text style={[styles.toggleLabel, config.useCloud && styles.toggleLabelActive]}>
                ☁️ Cloud / Internet
              </Text>
              <Text style={styles.toggleSub}>Remote server URL</Text>
            </View>
          </View>
        </View>

        {/* Local WiFi Settings */}
        {!config.useCloud && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏠 Local WiFi Settings</Text>
            <Text style={styles.inputLabel}>Backend Server IP : Port</Text>
            <TextInput
              style={styles.input}
              value={config.localUrl}
              onChangeText={(v) => update('localUrl', v)}
              placeholder="http://192.168.1.100:8080"
              placeholderTextColor="#4b5563"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Find your PC IP: Run "ipconfig" and use IPv4 Address + port 8080
            </Text>
          </View>
        )}

        {/* Cloud Settings */}
        {config.useCloud && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>☁️ Cloud Server Settings</Text>
            <Text style={styles.inputLabel}>Cloud / Production URL</Text>
            <TextInput
              style={styles.input}
              value={config.cloudUrl}
              onChangeText={(v) => update('cloudUrl', v)}
              placeholder="https://parking.sandslab.com"
              placeholderTextColor="#4b5563"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Your cloud parking backend URL (must have HTTPS for production)
            </Text>
          </View>
        )}

        {/* Gate Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚪 Gate Configuration</Text>

          <Text style={styles.inputLabel}>Exit Gate ID</Text>
          <TextInput
            style={styles.input}
            value={config.gateId}
            onChangeText={(v) => update('gateId', v.toUpperCase())}
            placeholder="GATE-OUT-01"
            placeholderTextColor="#4b5563"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>Must match the gate_id in your ANPR camera settings</Text>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Poll Interval (ms)</Text>
          <View style={styles.intervalRow}>
            {[1000, 2000, 3000, 5000].map(ms => (
              <TouchableOpacity
                key={ms}
                style={[styles.intervalChip, config.pollInterval === ms && styles.intervalChipActive]}
                onPress={() => update('pollInterval', ms)}
              >
                <Text style={[styles.intervalChipText, config.pollInterval === ms && styles.intervalChipTextActive]}>
                  {ms / 1000}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>FREE screen display time (seconds)</Text>
          <View style={styles.intervalRow}>
            {[8, 10, 15, 20].map(sec => (
              <TouchableOpacity
                key={sec}
                style={[styles.intervalChip, config.displayTimeout === sec && styles.intervalChipActive]}
                onPress={() => update('displayTimeout', sec)}
              >
                <Text style={[styles.intervalChipText, config.displayTimeout === sec && styles.intervalChipTextActive]}>
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Connection Test */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔌 Test Connection</Text>
          <Text style={styles.testUrl}>URL: {getActiveUrl()}</Text>

          <TouchableOpacity
            style={[styles.testBtn, testing && styles.testBtnDisabled]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.testBtnText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          {testResult && (
            <View style={[styles.testResult, testResult.success ? styles.testSuccess : styles.testError]}>
              <Text style={styles.testResultText}>{testResult.message}</Text>
            </View>
          )}
        </View>

        {/* Launch Button */}
        <TouchableOpacity style={styles.launchBtn} onPress={handleLaunch}>
          <Text style={styles.launchBtnText}>🚀  Launch Kiosk Display</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          SaNDS Lab Parking Solution © 2026{'\n'}
          Display Board App v1.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050b18',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050b18',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 20,
  },
  headerIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: '#f8fafc',
  },
  toggleSub: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#f8fafc',
    padding: 14,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputHint: {
    color: '#475569',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  intervalChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  intervalChipActive: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderColor: '#3b82f6',
  },
  intervalChipText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  intervalChipTextActive: {
    color: '#60a5fa',
  },
  testUrl: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 8,
  },
  testBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  testResult: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
  },
  testSuccess: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  testError: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  testResultText: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 20,
  },
  launchBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  launchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    color: '#334155',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
    lineHeight: 18,
  },
});
