import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

export default function CameraCapture({
  onFrameCaptured,
  onClose,
}: {
  onFrameCaptured: (uri: string) => void;
  onClose: () => void;
}) {
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  const [running, setRunning] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleFlash = () => {
    setFlashMode(prev => (prev === 'off' ? 'auto' : prev === 'auto' ? 'on' : 'off'));
  };

  const start = () => {
    if (!camera.current) return;

    setRunning(true);
    intervalRef.current = setInterval(async () => {
      try {
        const photo = await camera.current!.takePhoto({
          flash: flashMode,
          enableAutoRedEyeReduction: true,
        });

        const rawPath = photo.path;
        const photoUri = rawPath.startsWith('file://')
          ? rawPath
          : rawPath.startsWith('/')
            ? `file://${rawPath}`
            : `file:///${rawPath}`;
        onFrameCaptured(photoUri);
      } catch (e) {
        console.error('Capture failed', e);
      }
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  };

  if (!device) return <Text style={styles.loadingText}>Loading HD Camera…</Text>;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo
      />

      {/* Pothole Framing Alignment Overlay */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={styles.guidanceBanner}>
          <Text style={styles.guidanceTitle}>📐 POTHOLE ALIGNMENT FRAME</Text>
          <Text style={styles.guidanceSubtitle}>Keep camera 1–2m above road surface • Hold steady</Text>
        </View>

        <View style={styles.targetFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Control Toolbar */}
      <View style={styles.controls}>
        <Pressable style={styles.flashBtn} onPress={toggleFlash}>
          <Text style={styles.btnText}>⚡ Flash: {flashMode.toUpperCase()}</Text>
        </Pressable>

        {!running ? (
          <Pressable style={styles.btn} onPress={start}>
            <Text style={styles.btnText}>▶ Start AI Survey</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, styles.stop]} onPress={stop}>
            <Text style={styles.btnText}>⏹ Stop Survey</Text>
          </Pressable>
        )}

        <Pressable style={styles.close} onPress={onClose}>
          <Text style={styles.btnText}>✕ Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', textAlign: 'center', marginTop: 100 },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidanceBanner: {
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  guidanceTitle: { color: '#818cf8', fontWeight: 'bold', fontSize: 13 },
  guidanceSubtitle: { color: '#e0e7ff', fontSize: 11, marginTop: 2 },
  targetFrame: {
    width: 260,
    height: 260,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#6366f1',
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  controls: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  flashBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  btn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  stop: {
    backgroundColor: '#dc2626',
  },
  close: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
