import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { StatusBar } from 'react-native';
import LocationPermissionGuard from './src/components/LocationPermissionGuard';

export default function App(): React.JSX.Element {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar barStyle="light-content" />
                <LocationPermissionGuard>
                    <NavigationContainer>
                        <RootNavigator />
                    </NavigationContainer>
                </LocationPermissionGuard>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
