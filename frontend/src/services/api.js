// Centralized API Client

const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  getMe: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data }),

  // Settings & Localization
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'POST', body: data }),
  uploadLogo: (image) => request('/settings/logo', { method: 'POST', body: { image } }),
  testAnprMapping: (data) => request('/settings/test-anpr-mapping', { method: 'POST', body: data }),

  // Superadmin Server Config
  getServerConfig: () => request('/superadmin/server-config'),
  updateServerConfig: (data) => request('/superadmin/server-config', { method: 'POST', body: data }),

  // Superadmin License
  getLicenseStatus: () => request('/license/status'),
  extendLicense: (days) => request('/license/extend', { method: 'POST', body: { days } }),
  setExactExpiry: (expires_at) => request('/license/set-expiry', { method: 'POST', body: { expires_at } }),

  // Users (RBAC)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // ANPR Webhook & Simulation
  sendAnprWebhook: (payload) => request('/webhook/anpr', { method: 'POST', body: payload }),

  // Parking Sessions
  getSessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sessions${qs ? '?' + qs : ''}`);
  },
  getSession: (id) => request(`/sessions/${id}`),
  completeSessionExit: (id, payload = {}) => request(`/sessions/${id}/complete-exit`, { method: 'POST', body: payload }),
  resolveManualReview: (id, data) => request(`/sessions/${id}/manual-review`, { method: 'POST', body: data }),

  // Visitor Validation
  validateByQr: (payload) => request('/validation/qr', { method: 'POST', body: payload }),
  validateByReception: (payload) => request('/validation/reception', { method: 'POST', body: payload }),
  searchAppointments: (q = '') => request(`/validation/appointments?q=${encodeURIComponent(q)}`),

  // Payments & Cashier
  calculateTariff: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payment/calculate${qs ? '?' + qs : ''}`);
  },
  processPayment: (payload) => request('/payment/process', { method: 'POST', body: payload }),

  // Barrier Control
  manualOverrideBarrier: (payload) => request('/barrier/manual-override', { method: 'POST', body: payload }),
  getBarrierLogs: () => request('/barrier/logs'),

  // Vehicle Access (Whitelist / Blacklist)
  getVehicles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/vehicles${qs ? '?' + qs : ''}`);
  },
  saveVehicle: (data) => request('/vehicles', { method: 'POST', body: data }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  // Dashboard & Analytics
  getDashboardMetrics: () => request('/dashboard/metrics'),
  getReportsSummary: () => request('/reports/summary'),

  // HIS Integration Endpoints
  hisSyncAppointment: (payload) => request('/his/appointments/sync', { method: 'POST', body: payload }),
  hisValidateVisitor: (payload) => request('/his/validate-visitor', { method: 'POST', body: payload }),
  hisCheckStatus: (plate) => request(`/his/parking-status?plate_number=${encodeURIComponent(plate)}`),
  hisEmergencyAccess: (payload) => request('/his/emergency-access', { method: 'POST', body: payload }),

  // Prepaid Parking & Vehicle Ledger
  getPrepaidPasses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/prepaid/passes${qs ? '?' + qs : ''}`);
  },
  calculatePrepaidCost: (payload) => request('/prepaid/calculate', { method: 'POST', body: payload }),
  issuePrepaidPass: (payload) => request('/prepaid/passes', { method: 'POST', body: payload }),
  renewPrepaidPass: (id, payload) => request(`/prepaid/passes/${id}/renew`, { method: 'POST', body: payload }),
  getPrepaidStats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/prepaid/stats${qs ? '?' + qs : ''}`);
  },
  getPrepaidLedger: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/prepaid/ledger${qs ? '?' + qs : ''}`);
  },
  getPrepaidVehicleHistory: (plate) => request(`/prepaid/vehicle/${encodeURIComponent(plate)}/history`)
};
