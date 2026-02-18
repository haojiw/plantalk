import { Canvas, Image as SkiaImage, RuntimeShader, Skia, useImage } from '@shopify/react-native-skia';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing as REasing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenWrapper } from '@/shared/components';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

// Chapel hit area bounds (fraction of image dimensions)
const CHAPEL_BOUNDS = {
  top: 0.24,
  left: 0.38,
  width: 0.45,
  height: 0.30,
};

// Ripple shader parameters
const RIPPLE_AMPLITUDE = 12;
const RIPPLE_FREQUENCY = 15;
const RIPPLE_DECAY = 8;
const RIPPLE_SPEED = 1200;

const rippleSource = Skia.RuntimeEffect.Make(`
  uniform float2 u_origin;
  uniform float u_time;
  uniform float u_amplitude;
  uniform float u_frequency;
  uniform float u_decay;
  uniform float u_speed;
  uniform shader image;

  half4 main(float2 position) {
    float dist = distance(position, u_origin);
    float delay = dist / u_speed;
    float time = u_time - delay;
    time = max(0.0, time);
    float rippleAmount = u_amplitude * sin(u_frequency * time) * exp(-u_decay * time);
    float2 n = normalize(position - u_origin);
    float2 newPosition = position + rippleAmount * n;
    half4 color = image.eval(newPosition).rgba;
    color.rgb += 0.3 * (rippleAmount / u_amplitude) * color.a;
    return color;
  }
`)!;

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function EntryScreen() {
  const insets = useSafeAreaInsets();

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Ripple animation — driven by withTiming (no continuous clock)
  const rippleTime = useSharedValue(0);
  const rippleOriginX = useSharedValue(0);
  const rippleOriginY = useSharedValue(0);
  const isNavigating = useRef(false);

  // Load image using Skia
  const image = useImage(require('@assets/images/chapel.webp'));

  useFocusEffect(
    useCallback(() => {
      // Reset ripple and navigation guard when returning to this screen
      rippleTime.value = 0;
      isNavigating.current = false;
    }, [])
  );

  const date = useMemo(() => formatDate(), []);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setCanvasSize({ width, height: width * (4 / 3) });
  };

  const handleChapelPress = (e: GestureResponderEvent) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    const { locationX, locationY } = e.nativeEvent;

    // Convert hit area local coords to canvas coords
    const canvasX = canvasSize.width * CHAPEL_BOUNDS.left + locationX;
    const canvasY = canvasSize.height * CHAPEL_BOUNDS.top + locationY;

    // Start ripple animation
    rippleOriginX.value = canvasX;
    rippleOriginY.value = canvasY;
    rippleTime.value = 0;

    const totalDuration = motion.durations.rippleExpand + 500; // extra time for decay
    rippleTime.value = withTiming(totalDuration / 1000, {
      duration: totalDuration,
      easing: REasing.linear,
    });

    // Navigate after ripple plays — record screen fades in on top via native transition
    setTimeout(() => {
      try {
        router.push('/record');
      } catch (error) {
        console.error('Navigation error:', error);
        isNavigating.current = false;
      }
    }, motion.durations.rippleExpand - 400);
  };

  // Compute shader uniforms on UI thread
  const uniforms = useDerivedValue(() => ({
    u_origin: [rippleOriginX.value, rippleOriginY.value],
    u_time: rippleTime.value,
    u_amplitude: RIPPLE_AMPLITUDE,
    u_frequency: RIPPLE_FREQUENCY,
    u_decay: RIPPLE_DECAY,
    u_speed: RIPPLE_SPEED,
  }));

  return (
    <ScreenWrapper withPadding={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.date}>{date}.</Text>
        </View>

        <View style={[styles.chapelContainer, { marginBottom: -insets.bottom }]}>
          <View onLayout={handleLayout} style={styles.imageWrapper}>
            {image && canvasSize.width > 0 && (
              <Canvas style={{ width: canvasSize.width, height: canvasSize.height }}>
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  fit="cover"
                >
                  <RuntimeShader source={rippleSource} uniforms={uniforms} />
                </SkiaImage>
              </Canvas>
            )}
            {/* Chapel hit area - covers just the building */}
            <Pressable
              onPress={handleChapelPress}
              style={styles.chapelHitArea}
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  date: {
    ...theme.typography.handwriting,
    color: theme.colors.textMuted60,
    fontSize: 18,
    lineHeight: 20,
  },
  chapelContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  chapelHitArea: {
    position: 'absolute',
    top: `${CHAPEL_BOUNDS.top * 100}%`,
    left: `${CHAPEL_BOUNDS.left * 100}%`,
    width: `${CHAPEL_BOUNDS.width * 100}%`,
    height: `${CHAPEL_BOUNDS.height * 100}%`,
  },
});
