# 🖥️ Parking Exit Gate — Display Board App

A full-screen React Native (Expo) kiosk app for Android tablets mounted at parking exit gates.

## Features

- **IDLE Screen**: Animated "Drive Through to Exit" when no vehicle detected
- **FREE EXIT Screen**: Green full-screen with plate, entry/exit times, amount, gate-opening animation
- **PAYMENT REQUIRED Screen**: Large QR code + vehicle details + amount due (driver scans to pay from car)
- Always-on screen (keeps awake, max brightness)
- Polls backend every 2 seconds
- Supports both **Local WiFi** and **Cloud/Internet** backend URLs
- Tap screen 5 times to return to Config screen

## Setup (Android Device)

### Prerequisites
- Node.js 18+
- [Expo Go app](https://expo.dev/go) installed on the Android tablet, OR
- Build a standalone APK with `eas build`

### Install & Run

```bash
cd display-app
npm install --legacy-peer-deps
npx expo start --android
```

### Configuration (First Launch)

1. Open the app → **Display Board Setup** screen appears
2. **Connection Mode**: Toggle between Local WiFi or Cloud
   - **Local WiFi**: Enter `http://<PC-IP>:8080` (find PC IP with `ipconfig`)
   - **Cloud**: Enter your cloud backend URL, e.g. `https://parking.sandslab.com`
3. **Gate ID**: Enter the exit gate ID (must match ANPR camera config), e.g. `GATE-OUT-01`
4. **Test Connection**: Tap "Test Connection" to verify
5. **Launch**: Tap "🚀 Launch Kiosk Display"

The app auto-saves config and launches directly into Kiosk mode on next boot.

## Backend API Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/kiosk/status?gate_id=GATE-OUT-01` | GET | Poll vehicle state (public) |
| `/api/v1/kiosk/pay-qr?token=...` | GET/POST | QR payment confirmation (public) |
| `/api/v1/kiosk/simulate-approach` | POST | Demo/test simulation (auth required) |

## Demo Flow

1. Start backend: `php -S 0.0.0.0:8080 -t public` (from `backend/` folder)
2. Configure the app with your PC's local IP
3. In the admin web panel → **Live Lanes** → Use **ANPR Simulator** to simulate a vehicle exit
4. Watch the display board switch to FREE or PAYMENT screen automatically

## Future: BenefitPay Integration

The QR code currently encodes a web URL. Once BenefitPay gateway is integrated:
- Replace the QR payload with a BenefitPay deep-link/QR
- The gateway POSTs success/failure to `/api/v1/kiosk/pay-qr`
- The display board reacts to the gateway response in real-time

## Kiosk Mode Tips

- **To return to Config**: Tap the screen 5 times quickly
- **Screen stays on**: Uses `expo-keep-awake` + `expo-brightness`
- **Landscape mode**: App is locked to landscape for wide display boards
