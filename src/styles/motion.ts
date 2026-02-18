// Centralized animation parameters
// Change these values to alter the feel of every animation in the app.

export const motion = {
  springs: {
    swipe: { damping: 15, stiffness: 120 },
    press: { duration: 100 },
    pressReturn: { duration: 200 },
    reveal: { damping: 15, stiffness: 100 },
  },

  durations: {
    cardEnter: 300,
    cardExit: 200,
    processingPulse: 800,
    deleteCollapse: 300,
    deleteFade: 200,
    waveformBar: { min: 90, max: 130 },
    waveformIdle: 300,
    rippleExpand: 800,
  },

  layoutAnimations: {
    fadeIn: 300,
    fadeOut: 200,
  },

  screenTransitions: {
    rootStack: 'fade' as const,
    settingsStack: 'fade' as const,
    fadeDuration: 300,
  },

  gestureThresholds: {
    swipeOpenThreshold: 40,
    swipeOpenPosition: -80,
    swipeMaxExtent: -120,
  },
} as const;

export type Motion = typeof motion;
