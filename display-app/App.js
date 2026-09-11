import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ConfigScreen from './src/screens/ConfigScreen';
import KioskScreen from './src/screens/KioskScreen';

const Stack = createStackNavigator();
const STORAGE_KEY = 'kiosk_config_v2';

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [storedConfig, setStoredConfig] = useState(null);

  useEffect(() => {
    // Check if there's a saved config — if so, boot directly into Kiosk mode
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const cfg = JSON.parse(stored);
          // Only auto-launch if a URL is configured
          const url = cfg.useCloud ? cfg.cloudUrl : cfg.localUrl;
          if (url && url !== 'http://192.168.1.1:8080') {
            setStoredConfig(cfg);
            setInitialRoute('Kiosk');
            return;
          }
        }
      } catch {}
      setInitialRoute('Config');
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="light" hidden />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animationEnabled: true,
            cardStyle: { backgroundColor: '#050b18' },
          }}
        >
          <Stack.Screen name="Config" component={ConfigScreen} />
          <Stack.Screen
            name="Kiosk"
            component={KioskScreen}
            initialParams={storedConfig ? { config: storedConfig } : undefined}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#050b18',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
