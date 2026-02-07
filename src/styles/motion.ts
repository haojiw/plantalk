// Centralized animation parameters
// Change these values to alter the feel of every animation in the app.
// Midnight Ink: more deliberate, elegant pacing

export const motion = {
  springs: {
    swipe: { damping: 20, stiffness: 100 },
    press: { duration: 120 },
    pressReturn: { duration: 250 },
    reveal: { damping: 20, stiffness: 80 },
  },

  durations: {
    screenFadeIn: 350,
    cardEnter: 400,
    cardExit: 250,
    processingPulse: 1000,
    deleteCollapse: 350,
    deleteFade: 250,
    waveformBar: { min: 110, max: 160 },
    waveformIdle: 400,
  },

  layoutAnimations: {
    fadeIn: 400,
    fadeOut: 250,
  },

  screenTransitions: {
    rootStack: 'fade' as const,
    settingsStack: 'slide_from_right' as const,
  },

  gestureThresholds: {
    swipeOpenThreshold: 40,
    swipeOpenPosition: -80,
    swipeMaxExtent: -120,
  },
} as const;

export type Motion = typeof motion;
