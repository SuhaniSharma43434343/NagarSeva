import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../screens/Splash/SplashScreen';
import AuthNavigator from './AuthNavigator';
import SurveyorNavigator from './SurveyorNavigator';
import EngineerNavigator from './EngineerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { isAuthenticated, isLoading, role } = useAuth();

    if (isLoading) {
        return <SplashScreen />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            ) : role === 'SURVEYOR' ? (
                <Stack.Screen name="SurveyorApp" component={SurveyorNavigator} />
            ) : role === 'ENGINEER' ? (
                <Stack.Screen name="EngineerApp" component={EngineerNavigator} />
            ) : (
                // Fallback in case of an invalid role
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
}
