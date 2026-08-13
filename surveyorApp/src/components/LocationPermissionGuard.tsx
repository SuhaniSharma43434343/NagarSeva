import React, { useEffect, useState } from 'react';
import {
    Platform,
    PermissionsAndroid,
    Alert,
    BackHandler,
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

interface Props {
    children: React.ReactNode;
}

export default function LocationPermissionGuard({ children }: Props) {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

    const checkAndRequestLocation = async () => {
        if (Platform.OS !== 'android') {
            setPermissionGranted(true);
            return;
        }

        try {
            const grantedFine = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            const grantedCoarse = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
            );

            if (grantedFine && grantedCoarse) {
                verifyGpsLocation();
            } else {
                const requestResult = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);

                const fineStatus = requestResult[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
                const coarseStatus = requestResult[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

                if (
                    fineStatus === PermissionsAndroid.RESULTS.GRANTED &&
                    coarseStatus === PermissionsAndroid.RESULTS.GRANTED
                ) {
                    verifyGpsLocation();
                } else {
                    handlePermissionDenied();
                }
            }
        } catch (err) {
            console.error('Location permission check error:', err);
            handlePermissionDenied();
        }
    };

    const verifyGpsLocation = () => {
        Geolocation.getCurrentPosition(
            () => {
                setPermissionGranted(true);
            },
            (error) => {
                console.warn('GPS position verification error:', error);
                setPermissionGranted(true);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
        );
    };

    const handlePermissionDenied = () => {
        setPermissionGranted(false);
        Alert.alert(
            '⚠️ Location Permission Required',
            'NagarSeva requires compulsory location access to record accurate issue coordinates and survey routes. Without location permission, the app cannot operate.',
            [
                {
                    text: 'Grant Permission',
                    onPress: () => checkAndRequestLocation(),
                },
                {
                    text: 'Exit App',
                    onPress: () => BackHandler.exitApp(),
                    style: 'destructive',
                },
            ],
            { cancelable: false }
        );
    };

    useEffect(() => {
        checkAndRequestLocation();
    }, []);

    if (permissionGranted === null) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Verifying Location Permissions...</Text>
            </View>
        );
    }

    if (permissionGranted === false) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorTitle}>Location Permission Required</Text>
                <Text style={styles.errorSubtitle}>
                    Location access is compulsory for NagarSeva to track issue coordinates. Please grant location permissions to continue.
                </Text>
                <TouchableOpacity style={styles.button} onPress={checkAndRequestLocation}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.exitButton]} onPress={() => BackHandler.exitApp()}>
                    <Text style={styles.buttonText}>Exit App</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 16,
        marginTop: 16,
        fontWeight: '500',
    },
    errorTitle: {
        color: '#F87171',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    errorSubtitle: {
        color: '#94A3B8',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    exitButton: {
        backgroundColor: '#DC2626',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
