import 'dotenv/config';

export default {
  expo: {
    name: "plantalk",
    slug: "plantalk",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "plantalk",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/bonsai.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.haoji.plantalk",
      infoPlist: {
        UIBackgroundModes: [
          "audio"
        ],
        NSMicrophoneUsageDescription: "Plantalk needs microphone access to record your voice journal entries.",
        // Ensure audio session continues in background
        AVAudioSessionCategoryPlayAndRecord: true,
        AVAudioSessionCategoryOptions: [
          "AVAudioSessionCategoryOptionMixWithOthers",
          "AVAudioSessionCategoryOptionAllowBluetooth",
          "AVAudioSessionCategoryOptionDefaultToSpeaker"
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.WAKE_LOCK",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MICROPHONE"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/bonsai.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-audio",
        {
          "microphonePermission": "Plantalk needs microphone access to record your voice journal entries."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      WHISPER_API_KEY: process.env.WHISPER_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      eas: {
        projectId: "f32ebaa2-c90e-4631-a5ef-947dd6ca515c"
      }
    }
  }
}; 