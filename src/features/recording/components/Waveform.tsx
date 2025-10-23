import { theme } from '@/styles/theme';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface WaveformProps {
  waveformValues: Array<{ value: number }>;
}

export const Waveform: React.FC<WaveformProps> = ({ waveformValues }) => {
  return (
    <View style={styles.waveformContainer}>
      <View style={styles.waveform}>
        {waveformValues.map((waveform, index) => (
          <Animated.View 
            key={index} 
            style={[
              styles.waveBar, 
              { height: Math.max(8, waveform.value * 100) }
            ]} 
          />
        ))}
      </View>
      
      {/* Plant Image */}
      <Image 
        source={require('@assets/images/tree.png')} 
        style={styles.plantImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    width: '80%',
    alignSelf: 'center',
  },
  waveform: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 120,
    marginBottom: theme.spacing.xl,
  },
  waveBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    minHeight: 8,
  },
  plantImage: {
    width: 200,
    height: 200,
  },
}); 