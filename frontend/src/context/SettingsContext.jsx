import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    company_name: 'KIMSHEALTH Medical Center',
    company_subtitle: 'Smart Hospital Parking & Visitor Validation',
    company_logo: '',
    timezone: 'Asia/Bahrain',
    date_format: 'DD/MM/YYYY',
    currency_code: 'BHD',
    currency_symbol: 'BD',
    currency_decimals: '3',
    default_grace_minutes: '30',
    menu_theme: 'pink_blue',
    menu_color_primary: '#ec4899',
    menu_color_secondary: '#2563eb',
    menu_bg_style: 'gradient_accents'
  });

  const [license, setLicense] = useState({
    is_valid: true,
    status: 'active',
    days_remaining: 365,
    expires_at: null,
    issued_to: 'KIMSHEALTH'
  });

  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const [settingsRes, licenseRes] = await Promise.allSettled([
        api.getSettings(),
        api.getLicenseStatus()
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.success) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.value.data.settings,
          current_currency: settingsRes.value.data.current_currency
        }));
      }

      if (licenseRes.status === 'fulfilled' && licenseRes.value?.success) {
        setLicense(licenseRes.value.data.license);
      }
    } catch (err) {
      console.warn('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Currency Formatter adhering strictly to:
  // Bahrain: 3 decimals (e.g. BD 0.100 / BHD 1.500)
  // Others: 2 decimals (e.g. AED 10.00 / ₹ 150.00)
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    const code = (settings.currency_code || 'BHD').toUpperCase();
    const isThreeDecimals = (code === 'BHD' || code === 'KWD' || code === 'OMR');
    const decimals = isThreeDecimals ? 3 : 2;
    const formatted = num.toFixed(decimals);
    const symbol = settings.currency_symbol || code;
    return `${symbol} ${formatted}`;
  };

  const formatRawAmount = (amount) => {
    const num = parseFloat(amount || 0);
    const code = (settings.currency_code || 'BHD').toUpperCase();
    const isThreeDecimals = (code === 'BHD' || code === 'KWD' || code === 'OMR');
    return num.toFixed(isThreeDecimals ? 3 : 2);
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      license,
      loading,
      refreshSettings: loadSettings,
      formatCurrency,
      formatRawAmount
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
