import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';

import Navbar from './components/layout/Navbar';
import HorizontalMenu from './components/layout/HorizontalMenu';
import Footer from './components/layout/Footer';
import Modal from './components/common/Modal';
import LicenseLockModal from './components/license/LicenseLockModal';

import Dashboard from './pages/Dashboard';
import LiveLanes from './pages/LiveLanes';
import ParkingSessions from './pages/ParkingSessions';
import VisitorValidationPage from './pages/VisitorValidationPage';
import CashierTerminal from './pages/CashierTerminal';
import VehicleAccessPage from './pages/VehicleAccessPage';
import PrepaidParkingPage from './pages/PrepaidParkingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ServerConfigPage from './pages/ServerConfigPage';
import LicenseManagementPage from './pages/LicenseManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import DisplayBoardPage from './pages/DisplayBoardPage';
import LoginPage from './pages/LoginPage';

import AnprSimulatorModal from './components/simulator/AnprSimulatorModal';
import PaymentModal from './components/payment/PaymentModal';
import QrScannerModal from './components/validation/QrScannerModal';
import { api } from './services/api';

function MainApp() {
  const { user, loading } = useAuth();
  const { license } = useSettings();
  // Restore last active tab from localStorage so refresh keeps the user on the same page
  const [activeTab, setActiveTabState] = useState(
    () => localStorage.getItem('parking_active_tab') || 'dashboard'
  );

  const setActiveTab = (tab) => {
    localStorage.setItem('parking_active_tab', tab);
    setActiveTabState(tab);
  };
  
  // Modals state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  const [validationSession, setValidationSession] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  
  // Change Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}>
        Loading Car Parking Solution...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelfPasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    setPassLoading(true);

    try {
      const res = await api.changePassword({
        current_password: currentPass,
        new_password: newPass
      });
      if (res.success) {
        setPassSuccess('Your password has been changed successfully!');
        setCurrentPass('');
        setNewPass('');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* 1. Header Navigation Bar */}
      <Navbar 
        onOpenPasswordModal={() => setPasswordModalOpen(true)} 
      />

      {/* 2. Horizontal Navigation Menu (Directly after Header) */}
      <HorizontalMenu 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSimulator={() => setSimulatorOpen(true)}
      />

      {/* 3. Full-width Main Content Area */}
      <main className="content-body">
        {activeTab === 'dashboard' && (
          <Dashboard 
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenPayment={(sess) => setPaymentSession(sess)}
            onOpenValidation={(sess) => setValidationSession(sess)}
          />
        )}

        {activeTab === 'live-lanes' && (
          <LiveLanes onOpenSimulator={() => setSimulatorOpen(true)} />
        )}

        {activeTab === 'sessions' && (
          <ParkingSessions 
            onOpenPayment={(sess) => setPaymentSession(sess)}
            onOpenValidation={(sess) => setValidationSession(sess)}
          />
        )}

        {activeTab === 'prepaid' && (
          <PrepaidParkingPage />
        )}

        {activeTab === 'validation' && (
          <VisitorValidationPage />
        )}

        {activeTab === 'cashier' && (
          <CashierTerminal />
        )}

        {activeTab === 'vehicles' && (
          <VehicleAccessPage />
        )}

        {activeTab === 'reports' && (
          <ReportsPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage />
        )}

        {activeTab === 'server-config' && (
          <ServerConfigPage />
        )}

        {activeTab === 'license' && (
          <LicenseManagementPage />
        )}

        {activeTab === 'users' && (
          <UserManagementPage />
        )}

        {activeTab === 'display-board' && (
          <DisplayBoardPage />
        )}
      </main>

      {/* Sticky Footer */}
      <Footer />

      {/* Global ANPR Simulator Modal */}
      <AnprSimulatorModal 
        isOpen={simulatorOpen} 
        onClose={() => setSimulatorOpen(false)}
        onSimulated={() => {
          // Trigger refresh if needed
        }}
      />

      {/* Global Payment Modal */}
      <PaymentModal 
        isOpen={!!paymentSession} 
        session={paymentSession} 
        onClose={() => setPaymentSession(null)}
      />

      {/* Global Validation Modal */}
      <QrScannerModal
        isOpen={!!validationSession}
        onClose={() => setValidationSession(null)}
        onValidationSuccess={() => setValidationSession(null)}
      />

      {/* Self Password Change Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change My Account Password"
      >
        <form onSubmit={handleSelfPasswordChange}>
          {passSuccess && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--status-green-bg)',
              color: 'var(--status-green)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              marginBottom: '12px'
            }}>
              {passSuccess}
            </div>
          )}

          {passError && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              marginBottom: '12px'
            }}>
              {passError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password (min 6 chars)</label>
            <input
              type="password"
              className="form-input"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={passLoading}>
              {passLoading ? 'Updating...' : 'Update My Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. SaNDS Lab Software License Lock Screen (Blocks whole app if unlicensed or expired) */}
      {license && !license.is_valid && (
        <LicenseLockModal />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <MainApp />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
