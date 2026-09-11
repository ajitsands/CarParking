import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useKioskPoller
 *
 * Polls GET /api/v1/kiosk/status every `intervalMs` milliseconds.
 * Returns the latest display state data from the backend.
 *
 * @param {string} backendUrl  - e.g. "http://192.168.1.100:8080" or "https://cloud.example.com"
 * @param {string} gateId      - e.g. "GATE-OUT-01"
 * @param {number} intervalMs  - polling interval in ms (default: 2000)
 */
export function useKioskPoller(backendUrl, gateId, intervalMs = 2000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!backendUrl || !gateId) return;

    try {
      const url = `${backendUrl}/api/v1/kiosk/status?gate_id=${encodeURIComponent(gateId)}&server_url=${encodeURIComponent(backendUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();

      if (mountedRef.current) {
        setData(json.data || json);
        setError(null);
        setIsConnected(true);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        if (mountedRef.current) {
          setError('Connection timeout — retrying...');
          setIsConnected(false);
        }
      } else {
        if (mountedRef.current) {
          setError(err.message || 'Connection failed');
          setIsConnected(false);
        }
      }
    }
  }, [backendUrl, gateId]);

  useEffect(() => {
    mountedRef.current = true;

    if (!backendUrl || !gateId) {
      setError('Backend URL and Gate ID are required');
      return;
    }

    // Poll immediately on mount
    poll();

    // Then poll at interval
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [poll, intervalMs, backendUrl, gateId]);

  return { data, error, isConnected, lastUpdated, refetch: poll };
}
