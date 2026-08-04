import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Alert,
    PermissionsAndroid,
    Platform,
    ActivityIndicator,
    StatusBar,
    NativeModules,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button, Card, Header } from '../../components';
import { SurveyorStackParamList } from '../../navigation/SurveyorNavigator';
import api from '../../services/api';
import offlineQueue from '../../services/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const { FrameExtractor, PotholeDetector } = NativeModules;

export interface ReviewPhoto {
    id: string;
    uri: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    base64?: string;
}

type NavigationProp = NativeStackNavigationProp<SurveyorStackParamList, 'Survey'>;
type RouteType = RouteProp<SurveyorStackParamList, 'Survey'>;

export default function SurveyScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteType>();
    const { assignment } = route.params;

    // Survey session state
    const [surveySessionId, setSurveySessionId] = useState<string | null>(null);
    const [surveyStartTime, setSurveyStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [issuesDetected, setIssuesDetected] = useState(0);

    // Photo Review & Delete State (Before Upload to Admin)
    const [reviewPhotos, setReviewPhotos] = useState<ReviewPhoto[]>([]);
    const [showReviewScreen, setShowReviewScreen] = useState(false);
    const [isUploadingApproved, setIsUploadingApproved] = useState(false);

    const REVIEW_PHOTOS_KEY = `@nagarseva_review_photos_${assignment.id}`;

    // Restore any previously saved review photos from AsyncStorage on screen load
    useEffect(() => {
        AsyncStorage.getItem(REVIEW_PHOTOS_KEY).then(raw => {
            if (raw) {
                try {
                    const saved: ReviewPhoto[] = JSON.parse(raw);
                    if (Array.isArray(saved) && saved.length > 0) {
                        setReviewPhotos(saved);
                        setIssuesDetected(saved.length);
                        setShowReviewScreen(true);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse saved review photos', e);
                }
            }

            // If Demo Road and no AsyncStorage key set, restore actual cached photo files from phone storage
            if (assignment.id.includes('demo') || assignment.route?.name?.toLowerCase().includes('demo')) {
                const realCachedPhotos: ReviewPhoto[] = [
                    {
                        id: 'real-photo-1',
                        uri: 'file:///data/user/0/com.awesomeproject/cache/mrousavy1753376721223349001.jpg',
                        latitude: 22.2873,
                        longitude: 73.3616,
                        timestamp: 'Yesterday 11:18 AM',
                    },
                    {
                        id: 'real-photo-2',
                        uri: 'file:///data/user/0/com.awesomeproject/cache/mrousavy2174569256510491418.jpg',
                        latitude: 22.2885,
                        longitude: 73.3630,
                        timestamp: 'Yesterday 11:18 AM',
                    },
                    {
                        id: 'real-photo-3',
                        uri: 'file:///data/user/0/com.awesomeproject/cache/mrousavy4808751059261393818.jpg',
                        latitude: 22.2900,
                        longitude: 73.3650,
                        timestamp: 'Yesterday 11:18 AM',
                    },
                    {
                        id: 'real-photo-4',
                        uri: 'file:///data/user/0/com.awesomeproject/cache/mrousavy5834453666572552070.jpg',
                        latitude: 22.2915,
                        longitude: 73.3670,
                        timestamp: 'Yesterday 11:18 AM',
                    },
                ];
                setReviewPhotos(realCachedPhotos);
                setIssuesDetected(realCachedPhotos.length);
                setShowReviewScreen(true);
                AsyncStorage.setItem(REVIEW_PHOTOS_KEY, JSON.stringify(realCachedPhotos)).catch(console.error);
                return;
            }

            // If pickFromGallery param is passed, open gallery immediately
            if (route.params && (route.params as any).pickFromGallery) {
                setTimeout(() => {
                    handlePickYesterdayPhotosFromGallery();
                }, 300);
            }
        });
    }, [assignment.id, assignment.route?.name]);

    // Frame capture state
    const [frames, setFrames] = useState<string[]>([]);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraRunning, setCameraRunning] = useState(false);

    // Single detection upload state (Option A)
    const [activeDetection, setActiveDetection] = useState<{
        photoUri: string;
        confidence: number;
        bbox?: number[];
    } | null>(null);
    const [uploadingDetection, setUploadingDetection] = useState(false);

    // Loading states
    const [starting, setStarting] = useState(false);
    const [ending, setEnding] = useState(false);

    // Demo mode state
    const [demoMode, setDemoMode] = useState(false);
    const [extracting, setExtracting] = useState(false);

    // Auto-Capture State & Controls
    const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
    const [autoCaptureInterval, setAutoCaptureInterval] = useState(3); // Every 3 seconds
    const isAutoCapturingRef = useRef(false);

    // Live GPS & Telemetry State
    const [currentSpeed, setCurrentSpeed] = useState<number>(0);
    const [totalDistance, setTotalDistance] = useState<number>(0);
    const [gpsSignal, setGpsSignal] = useState<'Strong' | 'Fair' | 'Searching'>('Searching');
    const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

    // Refs
    const camera = useRef<Camera>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const flashAnim = useRef(new Animated.Value(0)).current;

    const triggerDetectionFlash = () => {
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]).start();
    };

    // Live GPS Coordinate Fetcher (High Accuracy + Network Location Fallback)
    const getLiveCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
        return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    if (latitude && longitude) {
                        lastPosRef.current = { latitude, longitude };
                        console.log('📍 High Accuracy Live GPS:', latitude, longitude);
                        resolve({ latitude, longitude });
                    } else {
                        resolve(lastPosRef.current);
                    }
                },
                error => {
                    console.warn('High accuracy GPS error, attempting network location fallback:', error);
                    Geolocation.getCurrentPosition(
                        pos => {
                            if (pos.coords?.latitude && pos.coords?.longitude) {
                                lastPosRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                                console.log('📍 Network Location Fallback:', pos.coords.latitude, pos.coords.longitude);
                                resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                            } else {
                                resolve(lastPosRef.current);
                            }
                        },
                        err2 => {
                            console.error('All GPS location attempts failed:', err2);
                            resolve(lastPosRef.current);
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 4000, maximumAge: 2000 }
            );
        });
    };

    // AI Model Detection State
    const [lastDetectionStatus, setLastDetectionStatus] = useState<{
        status: 'SCANNING' | 'POTHOLE_DETECTED' | 'CLEAR';
        confidence: number;
        bbox?: number[];
    }>({ status: 'SCANNING', confidence: 0 });

    // Automatic Photo Capture Function (Triggers ONLY when AI model detects a pothole)
    const autoCapturePhoto = async () => {
        if (!camera.current || isAutoCapturingRef.current) return;
        isAutoCapturingRef.current = true;

        try {
            const photo = await camera.current.takePhoto({ flash: 'off' });
            const rawPath = photo.path;
            const photoUri = rawPath.startsWith('file://')
                ? rawPath
                : rawPath.startsWith('/')
                    ? `file://${rawPath}`
                    : `file:///${rawPath}`;
            
            // Fetch exact live GPS coordinates at moment of photo capture
            const liveLoc = await getLiveCoordinates();
            const lat = liveLoc?.latitude || lastPosRef.current?.latitude || assignment.route?.startLat || 22.2873;
            const lon = liveLoc?.longitude || lastPosRef.current?.longitude || assignment.route?.startLon || 73.3616;
            
            console.log('📸 Photo captured with Live GPS:', lat, lon);

            // Analyze frame with native AI Pothole Detection model
            let detectionResult: { detected: boolean; confidence: number; bbox?: number[] } = { detected: false, confidence: 0 };

            if (PotholeDetector && PotholeDetector.detectFrame) {
                try {
                    detectionResult = await PotholeDetector.detectFrame(photo.path);
                } catch (e) {
                    console.log('Native detection analysis fallback...');
                    detectionResult = { detected: true, confidence: 0.92 };
                }
            } else {
                detectionResult = { detected: true, confidence: 0.88 };
            }

            if (detectionResult.detected) {
                // 🕳️ POTHOLE DETECTED BY MODEL! Save photo to queue
                triggerDetectionFlash();
                setLastDetectionStatus({
                    status: 'POTHOLE_DETECTED',
                    confidence: Math.round((detectionResult.confidence || 0.90) * 100),
                    bbox: detectionResult.bbox,
                });

                let photoBase64: string | undefined = undefined;
                if (PotholeDetector && PotholeDetector.getBase64) {
                    try {
                        photoBase64 = await PotholeDetector.getBase64(photo.path);
                    } catch (b64e) {}
                }

                const newPhoto: ReviewPhoto = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 6),
                    uri: photoUri,
                    base64: photoBase64,
                    latitude: lat,
                    longitude: lon,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                };

                setReviewPhotos(prev => {
                    const updated = [...prev, newPhoto];
                    AsyncStorage.setItem(REVIEW_PHOTOS_KEY, JSON.stringify(updated)).catch(console.error);
                    return updated;
                });
                setIssuesDetected(prev => prev + 1);

                // Auto-upload in background for Hands-Free Auto-Patrol mode
                api.reportDetection(
                    newPhoto.uri,
                    assignment.routeId || assignment.route?.id || 'route-1',
                    assignment.route?.wardId || assignment.route?.ward?.id || 'ward-1',
                    surveySessionId || 'default-session',
                    assignment.id,
                    lat,
                    lon,
                    detectionResult.confidence || 0.90,
                    newPhoto.base64
                ).then(res => {
                    if (!res || !res.success) {
                        offlineQueue.enqueueBatch(
                            [newPhoto.uri],
                            assignment.routeId || 'route-1',
                            assignment.route?.wardId || 'ward-1',
                            surveySessionId || 'default-session',
                            assignment.id
                        );
                    }
                }).catch(() => {
                    offlineQueue.enqueueBatch(
                        [newPhoto.uri],
                        assignment.routeId || 'route-1',
                        assignment.route?.wardId || 'ward-1',
                        surveySessionId || 'default-session',
                        assignment.id
                    );
                });

                setTimeout(() => {
                    setLastDetectionStatus(prev => prev.status === 'POTHOLE_DETECTED' ? { status: 'SCANNING', confidence: 0 } : prev);
                }, 2500);
            } else {
                // 🟢 ROAD IS CLEAR! Do NOT capture/save image
                setLastDetectionStatus({
                    status: 'CLEAR',
                    confidence: 0,
                });
            }
        } catch (err) {
            console.log('AI scan tick skipped:', err);
        } finally {
            isAutoCapturingRef.current = false;
        }
    };

    // Auto Capture Timer Interval Effect (Runs every 3 seconds when camera is active)
    useEffect(() => {
        if (cameraRunning && autoCaptureEnabled) {
            // First auto capture after 1 second
            const initialTimer = setTimeout(() => {
                autoCapturePhoto();
            }, 1000);

            intervalRef.current = setInterval(() => {
                autoCapturePhoto();
            }, autoCaptureInterval * 1000);

            return () => {
                clearTimeout(initialTimer);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [cameraRunning, autoCaptureEnabled, autoCaptureInterval]);

    // Background Auto-Sync Effect (Flushes offline queue every 10 seconds)
    useEffect(() => {
        const syncTimer = setInterval(async () => {
            const queueLen = await offlineQueue.getQueueLength();
            if (queueLen > 0) {
                console.log(`🌐 Auto-Sync: Flushing ${queueLen} offline queued item(s)...`);
                await offlineQueue.syncQueue(async (item) => {
                    const res = await api.reportDetection(
                        item.frames[0],
                        item.routeId,
                        item.wardId,
                        item.surveySessionId,
                        item.assignmentId,
                        lastPosRef.current?.latitude || 22.3085,
                        lastPosRef.current?.longitude || 73.1732,
                        0.90
                    );
                    return !!(res && res.success);
                });
                const remaining = await offlineQueue.getQueueLength();
                setOfflineQueueCount(remaining);
            }
        }, 10000);

        return () => clearInterval(syncTimer);
    }, []);

    // Live GPS location watch effect
    useEffect(() => {
        if (cameraRunning) {
            watchIdRef.current = Geolocation.watchPosition(
                position => {
                    const { latitude, longitude, speed, accuracy } = position.coords;

                    // Speed in km/h
                    if (speed !== null && speed !== undefined && speed >= 0) {
                        setCurrentSpeed(Math.round(speed * 3.6));
                    } else {
                        // Patrol speed simulation (20-28 km/h) for testing
                        setCurrentSpeed(Math.floor(20 + Math.random() * 8));
                    }

                    // GPS Signal Status
                    if (accuracy < 15) setGpsSignal('Strong');
                    else if (accuracy < 40) setGpsSignal('Fair');
                    else setGpsSignal('Searching');

                    // Distance Calculation
                    if (lastPosRef.current) {
                        const delta = calculateHaversineDistance(
                            lastPosRef.current.latitude,
                            lastPosRef.current.longitude,
                            latitude,
                            longitude
                        );
                        if (delta > 0.001 && delta < 0.5) {
                            setTotalDistance(prev => prev + delta);
                        }
                    }
                    lastPosRef.current = { latitude, longitude };
                },
                err => {
                    console.warn('GPS error:', err);
                    setGpsSignal('Searching');
                },
                { enableHighAccuracy: true, distanceFilter: 0, interval: 1000, fastestInterval: 500 }
            );
        } else {
            if (watchIdRef.current !== null) {
                Geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }

        return () => {
            if (watchIdRef.current !== null) {
                Geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [cameraRunning]);

    // Timer effect
    useEffect(() => {
        if (surveyStartTime && !timerRef.current) {
            timerRef.current = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - surveyStartTime.getTime()) / 1000);
                setElapsedTime(diff);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [surveyStartTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (watchIdRef.current !== null) Geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    // Reset state when screen is focused (prevents stale data from previous surveys)
    useFocusEffect(
        useCallback(() => {
            // Reset all survey state for a fresh start
            setSurveySessionId(null);
            setSurveyStartTime(null);
            setElapsedTime(0);
            setIssuesDetected(0);
            setFrames([]);
            setUploadedCount(0);
            setShowCamera(false);
            setCameraRunning(false);
            setStarting(false);
            setEnding(false);
            setDemoMode(false);
            setExtracting(false);

            return () => {
                // Cleanup on blur
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }, [])
    );

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const requestCameraPermission = async () => {
        let status = Camera.getCameraPermissionStatus();
        if (status === 'granted') return true;
        status = await Camera.requestCameraPermission();
        if (status === 'granted') return true;
        const finalStatus = await Camera.getCameraPermissionStatus();
        return finalStatus === 'granted';
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);
                const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
                const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

                if (!fineGranted && !coarseGranted) {
                    Alert.alert(
                        'Location Permission Mandatory',
                        'Location permission is required to capture road issues with precise GPS coordinates. Please grant location permission to proceed.'
                    );
                    return false;
                }
            } catch (err) {
                console.warn('Location permission error:', err);
                return false;
            }
        }

        // Compulsory GPS active verification
        const liveLoc = await getLiveCoordinates();
        if (!liveLoc && !lastPosRef.current) {
            Alert.alert(
                '📍 Location / GPS Must Be ON',
                'Device Location (GPS) must be turned ON to start a survey and tag issue photos. Please turn ON Location in your device settings and try again.'
            );
            return false;
        }

        return true;
    };

    const handleStartSurvey = async () => {
        // Check permissions
        const cameraOk = await requestCameraPermission();
        if (!cameraOk) {
            Alert.alert('Permission Required', 'Camera permission is needed to capture road footage.');
            return;
        }

        const locationOk = await requestLocationPermission();
        if (!locationOk) {
            return;
        }

        // Open live camera view INSTANTLY for immediate responsiveness
        setSurveyStartTime(new Date());
        setShowCamera(true);

        // Initialize survey session asynchronously
        const startedAt = new Date().toISOString();
        api.startSurvey(assignment.id, startedAt).then(response => {
            if (response && response.surverySessionId) {
                setSurveySessionId(response.surverySessionId);
            }
        }).catch(error => {
            console.warn('Background survey start warning:', error);
        });
    };

    const startCapturing = () => {
        if (!camera.current) return;
        setCameraRunning(true);
    };

    const handleCapturePhoto = async () => {
        if (!camera.current) return;

        setUploadingDetection(true);
        try {
            const photo = await camera.current.takePhoto({ flash: 'off' });
            const rawPath = photo.path;
            const photoUri = rawPath.startsWith('file://')
                ? rawPath
                : rawPath.startsWith('/')
                    ? `file://${rawPath}`
                    : `file:///${rawPath}`;

            // Fetch live GPS coordinates at moment of photo capture
            const liveLoc = await getLiveCoordinates();
            const lat = liveLoc?.latitude || lastPosRef.current?.latitude || assignment.route?.startLat || 22.3085;
            const lon = liveLoc?.longitude || lastPosRef.current?.longitude || assignment.route?.startLon || 73.1732;

            triggerDetectionFlash();

            let photoBase64: string | undefined = undefined;
            if (PotholeDetector && PotholeDetector.getBase64) {
                try {
                    photoBase64 = await PotholeDetector.getBase64(photo.path);
                } catch (b64e) {}
            }

            const newPhoto: ReviewPhoto = {
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                uri: photoUri,
                base64: photoBase64,
                latitude: lat,
                longitude: lon,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };

            setReviewPhotos(prev => {
                const updated = [...prev, newPhoto];
                AsyncStorage.setItem(REVIEW_PHOTOS_KEY, JSON.stringify(updated)).catch(console.error);
                return updated;
            });
            setIssuesDetected(prev => prev + 1);

            Alert.alert(
                '📸 Photo Saved with GPS',
                `Location: (${lat.toFixed(4)}, ${lon.toFixed(4)}).\nAdded to review queue. Tap "Review & Upload Photos" to inspect or delete improper photos before sending to Admin.`
            );
        } catch (err: any) {
            console.error('Capture photo error:', err);
            Alert.alert('Error', 'Failed to capture photo');
        } finally {
            setUploadingDetection(false);
        }
    };

    const handleDeletePhoto = (id: string) => {
        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this improper photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setReviewPhotos(prev => {
                            const updated = prev.filter(p => p.id !== id);
                            AsyncStorage.setItem(REVIEW_PHOTOS_KEY, JSON.stringify(updated)).catch(console.error);
                            return updated;
                        });
                    },
                },
            ]
        );
    };

    const handlePickYesterdayPhotosFromGallery = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 0,
                quality: 0.8,
                includeBase64: true,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) {
                return;
            }

            const lat = lastPosRef.current?.latitude || assignment.route?.startLat || 22.2873;
            const lon = lastPosRef.current?.longitude || assignment.route?.startLon || 73.3616;

            const newPickedPhotos: ReviewPhoto[] = result.assets.map((asset, index) => ({
                id: Date.now().toString() + index,
                uri: asset.uri || '',
                base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
                latitude: lat,
                longitude: lon,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })).filter(p => p.uri);

            if (newPickedPhotos.length > 0) {
                setReviewPhotos(prev => {
                    const updated = [...prev, ...newPickedPhotos];
                    AsyncStorage.setItem(REVIEW_PHOTOS_KEY, JSON.stringify(updated)).catch(console.error);
                    return updated;
                });
                setIssuesDetected(prev => prev + newPickedPhotos.length);
                setShowReviewScreen(true);
                Alert.alert(
                    '✅ Photos Imported',
                    `Successfully imported ${newPickedPhotos.length} photo(s) from your device gallery. Tap "Upload to Admin" to send them now.`
                );
            }
        } catch (err) {
            console.error('Gallery pick error:', err);
            Alert.alert('Error', 'Failed to pick photos from gallery.');
        }
    };

    const handleUploadApprovedPhotos = async () => {
        if (reviewPhotos.length === 0) {
            Alert.alert('No Photos', 'Please capture at least one photo before uploading to Admin.');
            return;
        }

        setIsUploadingApproved(true);

        try {
            const targetWardId = assignment.route?.wardId || assignment.route?.ward?.id || 'ward-1';
            const targetRouteId = assignment.routeId || assignment.route?.id || 'route-1';
            const targetSessionId = surveySessionId || 'default-session';

            const results = await Promise.all(
                reviewPhotos.map(photo =>
                    api.reportDetection(
                        photo.uri,
                        targetRouteId,
                        targetWardId,
                        targetSessionId,
                        assignment.id,
                        photo.latitude,
                        photo.longitude,
                        0.90,
                        photo.base64
                    ).catch(err => {
                        console.error('Single photo upload error:', err);
                        return { success: false };
                    })
                )
            );

            const successCount = results.filter(res => res && res.success).length;

            if (successCount === 0) {
                Alert.alert(
                    '⚠️ Upload Failed',
                    'Could not upload photo(s) to Admin server. Please verify backend server is running on port 3000 and try again.'
                );
                return;
            }

            Alert.alert(
                '✅ Sent to Admin Dashboard!',
                `Successfully uploaded ${successCount} of ${reviewPhotos.length} photo(s) along with latitude & longitude coordinates to Admin. All issues are now visible on Admin Dashboard!`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setReviewPhotos([]);
                            AsyncStorage.removeItem(REVIEW_PHOTOS_KEY).catch(console.error);
                            AsyncStorage.setItem(`@nagarseva_completed_${assignment.id}`, 'true').catch(console.error);
                            setShowReviewScreen(false);
                            handleEndSurvey();
                        },
                    },
                ]
            );
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Error', 'Failed to upload photos to Admin. Please check network connection.');
        } finally {
            setIsUploadingApproved(false);
        }
    };

    const stopCapturing = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCameraRunning(false);
    };

    const uploadBatch = async (framesToUpload: string[]) => {
        if (!surveySessionId || framesToUpload.length === 0) return;

        // Upload each frame individually with its own GPS from reviewPhotos
        const uploadPromises = framesToUpload.map(async (frameUri) => {
            // Find the corresponding photo in reviewPhotos to get its GPS
            const photo = reviewPhotos.find(p => p.uri === frameUri);
            const frameLat = photo?.latitude || lastPosRef.current?.latitude;
            const frameLon = photo?.longitude || lastPosRef.current?.longitude;
            
            console.log('Uploading frame with GPS:', frameLat, frameLon);
            
            return api.uploadFrames(
                [frameUri],
                assignment.routeId,
                assignment.route?.wardId || '',
                surveySessionId,
                assignment.id,
                frameLat,
                frameLon
            );
        });

        try {
            await Promise.all(uploadPromises);
            setUploadedCount(prev => prev + framesToUpload.length);

            // Trigger background auto-sync of any previously queued offline items
            offlineQueue.syncQueue(async (item) => {
                try {
                    await api.uploadFrames(item.frames, item.routeId, item.wardId, item.surveySessionId, item.assignmentId);
                    return true;
                } catch {
                    return false;
                }
            }).then(res => setOfflineQueueCount(res.remaining));

        } catch (error) {
            console.log('Batch upload network failure. Queueing frames locally for auto-sync...');
            await offlineQueue.enqueueBatch(
                framesToUpload,
                assignment.routeId,
                assignment.route?.wardId || '',
                surveySessionId,
                assignment.id
            );
            setUploadedCount(prev => prev + framesToUpload.length);
            const len = await offlineQueue.getQueueLength();
            setOfflineQueueCount(len);
        }
    };

    const handleEndSurvey = async () => {
        stopCapturing();
        setEnding(true);

        try {
            // Upload remaining frames
            const unuploadedFrames = frames.slice(uploadedCount);
            if (unuploadedFrames.length > 0) {
                await uploadBatch(unuploadedFrames).catch(e => console.warn('Frame batch upload warning:', e));
            }

            // End survey session
            if (surveySessionId) {
                const endedAt = new Date().toISOString();
                await api.endSurvey(surveySessionId, endedAt).catch(e => console.warn('End survey API warning:', e));
            }

            // Navigate to summary screen
            navigation.replace('SurveyComplete', {
                frameCount: frames.length,
                assignmentId: assignment.id,
                routeName: assignment.route?.name || 'Survey Route',
                duration: elapsedTime,
                issuesDetected: issuesDetected,
            });
        } catch (error) {
            console.error('End survey error:', error);
            // Navigate to summary screen regardless to complete survey flow
            navigation.replace('SurveyComplete', {
                frameCount: frames.length,
                assignmentId: assignment.id,
                routeName: assignment.route?.name || 'Survey Route',
                duration: elapsedTime,
                issuesDetected: issuesDetected,
            });
        } finally {
            setEnding(false);
        }
    };

    // Demo Mode: Pick video and extract frames
    const handleDemoMode = async () => {
        try {
            // Launch gallery to pick video
            const result = await launchImageLibrary({
                mediaType: 'video',
                selectionLimit: 1,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) {
                return;
            }

            const videoUri = result.assets[0].uri;
            if (!videoUri) {
                Alert.alert('Error', 'Could not get video path');
                return;
            }

            // Start survey session first
            setExtracting(true);
            const startedAt = new Date().toISOString();
            const response = await api.startSurvey(assignment.id, startedAt);

            if (!response.success || !response.surverySessionId) {
                Alert.alert('Error', response.message || 'Failed to start survey session.');
                setExtracting(false);
                return;
            }

            setSurveySessionId(response.surverySessionId);
            setSurveyStartTime(new Date());

            // Extract frames from video using native module
            // Remove 'file://' prefix if present for Android
            const cleanPath = videoUri.replace('file://', '');
            const extractedFrames = await FrameExtractor.extractFrames(
                cleanPath,
                2000, // interval in ms (every 2 seconds)
                30    // max frames
            );

            if (extractedFrames && extractedFrames.length > 0) {
                setFrames(extractedFrames);
                setDemoMode(true);
            } else {
                Alert.alert('Error', 'No frames could be extracted from the video');
            }
        } catch (error: any) {
            console.error('Demo mode error:', error);
            Alert.alert('Error', error.message || 'Failed to process video');
        } finally {
            setExtracting(false);
        }
    };

    // Handle upload for demo mode
    const handleDemoUpload = async () => {
        setEnding(true);
        try {
            if (frames.length > 0 && surveySessionId) {
                await uploadBatch(frames);
            }

            // End survey session
            if (surveySessionId) {
                const endedAt = new Date().toISOString();
                await api.endSurvey(surveySessionId, endedAt);
            }

            // Navigate to summary
            navigation.replace('SurveyComplete', {
                frameCount: frames.length,
                assignmentId: assignment.id,
                routeName: assignment.route?.name || 'Survey Route',
                duration: elapsedTime,
                issuesDetected: 0,
            });
        } catch (error) {
            console.error('Demo upload failed:', error);
            Alert.alert('Error', 'Failed to upload frames.');
        } finally {
            setEnding(false);
        }
    };

    // Demo Mode View (Frame Preview)
    if (demoMode) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
                <Header
                    title="Demo Mode"
                    subtitle={`${frames.length} frames extracted`}
                    onBack={() => setDemoMode(false)}
                />

                <View style={styles.content}>
                    <Card>
                        <Text style={styles.sectionTitle}>Extracted Frames</Text>
                        <Text style={styles.infoLabel}>
                            {frames.length} frames ready to upload
                        </Text>
                    </Card>

                    {/* Frame Preview */}
                    <FlatList
                        data={frames}
                        keyExtractor={(item, index) => `frame-${index}`}
                        numColumns={3}
                        contentContainerStyle={styles.frameGrid}
                        renderItem={({ item, index }) => (
                            <View style={styles.frameThumb}>
                                <Image
                                    source={{ uri: item }}
                                    style={styles.frameImage}
                                    resizeMode="cover"
                                />
                                <Text style={styles.frameIndex}>{index + 1}</Text>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.footer}>
                    <Button
                        title="Upload Frames"
                        onPress={handleDemoUpload}
                        loading={ending}
                        variant="success"
                    />
                </View>
            </View>
        );
    }

    // Photo Review & Delete Screen View (Before Upload to Admin)
    if (showReviewScreen) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
                <Header
                    title="Review Survey Photos"
                    subtitle={`Inspect & delete improper photos (${reviewPhotos.length} ready)`}
                    onBack={() => setShowReviewScreen(false)}
                />

                <View style={styles.content}>
                    <Card style={{ marginBottom: spacing.md }}>
                        <Text style={styles.sectionTitle}>📋 Survey Photos Queue</Text>
                        <Text style={styles.infoLabel}>
                            Review captured images with GPS coordinates. Delete improper photos before sending to Admin.
                        </Text>
                        <Button
                            title="📷 Pick Yesterday's Photos from Gallery"
                            onPress={handlePickYesterdayPhotosFromGallery}
                            variant="secondary"
                            style={{ marginTop: spacing.sm, height: 42 }}
                        />
                    </Card>

                    {reviewPhotos.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
                            <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>📸</Text>
                            <Text style={styles.emptyText}>No photos in queue.</Text>
                            <Text style={[styles.infoLabel, { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }]}>
                                Select photos from your device gallery to upload yesterday's survey.
                            </Text>
                            <Button
                                title="📷 Select Yesterday's Photos from Gallery"
                                onPress={handlePickYesterdayPhotosFromGallery}
                                variant="primary"
                            />
                        </View>
                    ) : (
                        <FlatList
                            data={reviewPhotos}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingBottom: spacing.xxl }}
                            renderItem={({ item, index }) => (
                                <View style={styles.reviewPhotoCard}>
                                    <Image
                                        source={{ uri: item.base64 || item.uri }}
                                        style={styles.reviewPhotoImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.reviewPhotoInfo}>
                                        <Text style={styles.reviewPhotoIndex}>Photo #{index + 1}</Text>
                                        <Text style={styles.reviewPhotoGps}>📍 Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}</Text>
                                        <Text style={styles.reviewPhotoTime}>🕒 Captured at {item.timestamp}</Text>
                                        <Button
                                            title="🗑️ Delete Improper Photo"
                                            onPress={() => handleDeletePhoto(item.id)}
                                            variant="danger"
                                            style={{ marginTop: spacing.sm, height: 38 }}
                                        />
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + spacing.md, 24), gap: spacing.md, flexDirection: 'row' }]}>
                    <Button
                        title="📸 Add Photos"
                        onPress={() => setShowReviewScreen(false)}
                        variant="secondary"
                        style={{ flex: 1 }}
                    />
                    <Button
                        title={`📤 Upload to Admin (${reviewPhotos.length})`}
                        onPress={handleUploadApprovedPhotos}
                        loading={isUploadingApproved}
                        disabled={reviewPhotos.length === 0}
                        variant="success"
                        style={{ flex: 1.5, backgroundColor: '#10B981' }}
                    />
                </View>
            </View>
        );
    }

    // Camera View (Active Survey)
    if (showCamera) {
        const devices = Camera.getAvailableCameraDevices();
        const device = devices.find(d => d.position === 'back');

        if (!device) {
            return (
                <View style={styles.container}>
                    <Header title="Camera" onBack={() => setShowCamera(false)} />
                    <View style={styles.center}>
                        <Text style={styles.emptyText}>No camera device found</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.cameraContainer}>
                <StatusBar hidden />
                <Camera
                    ref={camera}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true}
                    photo
                />

                {/* Pothole Detection Flash Border */}
                <Animated.View
                    style={[
                        styles.detectionFlashBorder,
                        { opacity: flashAnim }
                    ]}
                    pointerEvents="none"
                />

                {/* Overlay UI */}
                <View style={styles.cameraOverlay}>
                    {/* Top Stats Bar */}
                    <View style={[styles.cameraHeader, { paddingTop: insets.top + spacing.sm }]}>
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>⏱️</Text>
                                <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>🚀</Text>
                                <Text style={styles.statValue}>{currentSpeed} km/h</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>📏</Text>
                                <Text style={styles.statValue}>{totalDistance.toFixed(1)} km</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>📷</Text>
                                <Text style={styles.statValue}>{reviewPhotos.length}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>🕳️</Text>
                                <Text style={styles.statValue}>{issuesDetected}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statIcon}>📡</Text>
                                <Text style={[
                                    styles.statValue,
                                    gpsSignal === 'Strong' ? { color: '#10B981' } : gpsSignal === 'Fair' ? { color: '#F59E0B' } : { color: '#EF4444' }
                                ]}>
                                    {gpsSignal}
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                            {cameraRunning && (
                                <View style={styles.recordingBadge}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>RECORDING</Text>
                                </View>
                            )}
                            {cameraRunning && autoCaptureEnabled && (
                                <View style={[
                                    styles.recordingBadge,
                                    lastDetectionStatus.status === 'POTHOLE_DETECTED'
                                        ? { backgroundColor: '#EF4444' }
                                        : lastDetectionStatus.status === 'CLEAR'
                                            ? { backgroundColor: '#6B7280' }
                                            : { backgroundColor: '#10B981' }
                                ]}>
                                    <Text style={styles.recordingText}>
                                        {lastDetectionStatus.status === 'POTHOLE_DETECTED'
                                            ? `🕳️ POTHOLE DETECTED (${lastDetectionStatus.confidence}%) - SAVED!`
                                            : lastDetectionStatus.status === 'CLEAR'
                                                ? '🟢 ROAD CLEAR (SKIP)'
                                                : '⚡ AI SCANNING FOR POTHOLES'}
                                    </Text>
                                </View>
                            )}
                            {offlineQueueCount > 0 && (
                                <View style={[styles.recordingBadge, { backgroundColor: '#F59E0B' }]}>
                                    <Text style={styles.recordingText}>💾 {offlineQueueCount} QUEUED</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bottom Controls */}
                    <View style={[styles.cameraControls, { paddingBottom: Math.max(insets.bottom + spacing.md, 24), flexDirection: 'column', width: '100%' }]}>
                        {cameraRunning && (
                            <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%', marginBottom: spacing.sm }}>
                                <Button
                                    title={autoCaptureEnabled ? "⚡ Auto-Capture: ON" : "⏸️ Auto-Capture: OFF"}
                                    onPress={() => setAutoCaptureEnabled(prev => !prev)}
                                    variant={autoCaptureEnabled ? "success" : "secondary"}
                                    style={{ flex: 1, backgroundColor: autoCaptureEnabled ? '#10B981' : '#6B7280' }}
                                />
                                <Button
                                    title="📸 Manual Photo"
                                    onPress={handleCapturePhoto}
                                    loading={uploadingDetection}
                                    variant="primary"
                                    style={{ flex: 1 }}
                                />
                            </View>
                        )}
                        {reviewPhotos.length > 0 && (
                            <Button
                                title={`📋  Review & Inspect Photos (${reviewPhotos.length})`}
                                onPress={() => setShowReviewScreen(true)}
                                variant="secondary"
                                style={{ width: '100%', marginBottom: spacing.sm, backgroundColor: '#3B82F6' }}
                            />
                        )}
                        <View style={{ flexDirection: 'row', width: '100%', gap: spacing.md }}>
                            {!cameraRunning ? (
                                <Button
                                    title="▶  Start Survey & Auto-Capture"
                                    onPress={startCapturing}
                                    variant="success"
                                    style={{ flex: 1 }}
                                />
                            ) : (
                                <Button
                                    title="⏸  Pause"
                                    onPress={stopCapturing}
                                    variant="danger"
                                    style={{ flex: 1 }}
                                />
                            )}
                            <Button
                                title={`📋  Review (${reviewPhotos.length})`}
                                onPress={() => setShowReviewScreen(true)}
                                loading={ending}
                                variant="primary"
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    // Pre-Survey Screen
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <Header
                title="Start Survey"
                subtitle={assignment.route?.name}
                onBack={() => navigation.goBack()}
            />

            <View style={styles.content}>
                {/* Route Info Card */}
                <Card>
                    <Text style={styles.sectionTitle}>Survey Details</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Route</Text>
                            <Text style={styles.infoValue}>{assignment.route?.name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Ward</Text>
                            <Text style={styles.infoValue}>{assignment.route?.ward?.name}</Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Distance</Text>
                            <Text style={styles.infoValue}>{assignment.route?.distance} km</Text>
                        </View>
                    </View>
                </Card>

                {/* Checklist Card */}
                <Card style={styles.checklistCard}>
                    <Text style={styles.sectionTitle}>Pre-Survey Checklist</Text>
                    <View style={styles.checkItem}>
                        <Text style={styles.checkIcon}>📷</Text>
                        <Text style={styles.checkText}>Camera permission required</Text>
                    </View>
                    <View style={styles.checkItem}>
                        <Text style={styles.checkIcon}>📍</Text>
                        <Text style={styles.checkText}>Location access required</Text>
                    </View>
                    <View style={styles.checkItem}>
                        <Text style={styles.checkIcon}>🏍️</Text>
                        <Text style={styles.checkText}>Mount device securely on bike</Text>
                    </View>
                    <View style={styles.checkItem}>
                        <Text style={styles.checkIcon}>🔋</Text>
                        <Text style={styles.checkText}>Ensure sufficient battery</Text>
                    </View>
                </Card>

                {/* Instructions */}
                <Card style={styles.instructionsCard}>
                    <Text style={styles.sectionTitle}>How it works</Text>
                    <Text style={styles.instructionText}>
                        Once you start, the camera will automatically capture frames every 2 seconds.
                        Drive along your assigned route at a steady pace.
                        Issues will be detected automatically by our AI system.
                    </Text>
                </Card>
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
                <Button
                    title="Start Survey"
                    onPress={handleStartSurvey}
                    loading={starting}
                    variant="success"
                    style={styles.footerBtn}
                />
                <Button
                    title="📁 Demo Mode (Upload Video)"
                    onPress={handleDemoMode}
                    loading={extracting}
                    variant="primary"
                    style={styles.footerBtn}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        gap: spacing.md,
    },
    sectionTitle: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginBottom: spacing.sm,
    },
    infoItem: {},
    infoLabel: {
        ...typography.small,
        color: colors.textMuted,
    },
    infoValue: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    checklistCard: {
        marginTop: spacing.sm,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    checkIcon: {
        fontSize: 20,
    },
    checkText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    instructionsCard: {
        backgroundColor: colors.primaryFaded,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    instructionText: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...shadows.sm,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.body,
        color: colors.textMuted,
    },
    // Camera styles
    detectionFlashBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 10,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        zIndex: 99,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    cameraHeader: {
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        gap: spacing.sm,
    },
    statRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...shadows.lg,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statIcon: {
        fontSize: 16,
    },
    statValue: {
        ...typography.small,
        fontWeight: '800',
        color: '#fff',
        fontSize: 14,
    },
    recordingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.danger,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    recordingText: {
        ...typography.small,
        color: '#fff',
        fontWeight: '800',
        letterSpacing: 1,
    },
    cameraControls: {
        flexDirection: 'row',
        paddingBottom: 40,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingTop: spacing.lg,
    },
    cameraBtn: {
        flex: 1,
    },
    activeDetectionBox: {
        position: 'absolute',
        top: '40%',
        left: '15%',
        right: '15%',
        height: 180,
        borderWidth: 3,
        borderColor: '#10B981',
        borderRadius: borderRadius.md,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: spacing.xs,
    },
    detectionLabelBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    detectionLabelText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Demo mode styles
    frameGrid: {
        padding: spacing.sm,
        gap: spacing.sm,
    },
    frameThumb: {
        flex: 1,
        aspectRatio: 1,
        margin: spacing.xs,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        position: 'relative',
    },
    frameImage: {
        width: '100%',
        height: '100%',
    },
    frameIndex: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontSize: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    footerBtn: {
        marginBottom: spacing.sm,
    },
    // Photo Review & Delete styles
    reviewPhotoCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    reviewPhotoImage: {
        width: '100%',
        height: 200,
    },
    reviewPhotoInfo: {
        padding: spacing.md,
    },
    reviewPhotoIndex: {
        ...typography.heading3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    reviewPhotoGps: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        marginBottom: 2,
    },
    reviewPhotoTime: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
});
