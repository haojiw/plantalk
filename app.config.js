import 'dotenv/config';

export default {
  expo: {
    name: "plantalk",
    slug: "plantalk",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/bonsai.png",
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
      bundleIdentifier: "com.haoji.plantalk"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/bonsai.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/bonsai.png"
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