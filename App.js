import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PolicyProvider } from './src/context/PolicyContext';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoadingSpinner } from './src/components/LoadingSpinner';
import { notificationService } from './src/services/notificationService';

const NavigationRoot = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="Restoring session..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <PolicyProvider>
          <NavigationRoot />
        </PolicyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
