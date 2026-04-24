import './src/services/firebase'; // must be first
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation';
import { authReady } from './src/services/firebase';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Force proceeding after timeout');
      setIsReady(true);
    }, 3000);

    authReady
      .then(() => {
        clearTimeout(timeout);
        setIsReady(true);
      })
      .catch((err) => {
        console.warn('authReady error:', err);
        clearTimeout(timeout);
        setIsReady(true);
      });

    return () => clearTimeout(timeout);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07101f' }}>
        <ActivityIndicator size="large" color="#133e81" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" backgroundColor="#07101f" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}