# Background Recording Setup Guide

This document outlines the configuration needed to ensure audio recording continues in the background and on lock screen.

## ✅ Completed Configurations

### 1. App Configuration (`app.config.js`)

#### iOS Settings:
- **UIBackgroundModes**: `["audio"]` - Enables background audio processing
- **NSMicrophoneUsageDescription**: Explicit microphone permission description
- **AVAudioSessionCategoryPlayAndRecord**: Enables recording in background
- **AVAudioSessionCategoryOptions**: Enhanced audio session options for better compatibility

#### Android Settings:
- **RECORD_AUDIO**: Basic recording permission
- **WAKE_LOCK**: Prevents device from sleeping during recording
- **FOREGROUND_SERVICE**: Allows background processing
- **FOREGROUND_SERVICE_MICROPHONE**: Specific microphone access in background

### 2. Audio Mode Configuration (`useRecorder.ts`)

```javascript
await setAudioModeAsync({
  allowsRecording: true,
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
  interruptionModeAndroid: 'doNotMix',
});
```

### 3. App State Monitoring
- Added AppState listener to track when app goes to background
- Provides logging for debugging background recording issues

## 🔧 Additional Considerations

### iOS Specific:

1. **Development vs Production**:
   - Background recording works fully only in production builds
   - Test with `expo run:ios` or TestFlight, not Expo Go

2. **Audio Session Interruptions**:
   - Phone calls will interrupt recording
   - Other audio apps may interrupt if they don't respect mixing

3. **Battery Optimization**:
   - iOS may terminate background apps for battery conservation
   - Recording apps are generally protected from this

### Android Specific:

1. **Battery Optimization**:
   - Users may need to disable battery optimization for your app
   - Different manufacturers have different settings (Samsung, Xiaomi, etc.)

2. **Foreground Service**:
   - Consider implementing a foreground service with notification for longer recordings
   - This makes the recording more visible and less likely to be killed

3. **Auto-start Management**:
   - Some devices have auto-start managers that can prevent background execution

## 🧪 Testing Background Recording

### Test Scenarios:
1. Start recording → Lock device → Wait → Unlock → Check if recording continued
2. Start recording → Switch to another app → Return → Verify recording state
3. Start recording → Receive phone call → After call ends → Check recording
4. Long recording sessions (30+ minutes) in background

### Debugging:
- Check console logs for app state changes
- Monitor recording duration to ensure it continues incrementing
- Test on actual devices, not simulators

## 📱 User Instructions

### For iOS:
1. Ensure microphone permissions are granted
2. Keep app in recent apps (don't force close)
3. Recording should continue even when device is locked

### For Android:
1. Grant microphone permissions
2. If recording stops in background:
   - Go to Settings → Apps → Plantalk → Battery → Don't optimize
   - Or Settings → Battery → Battery optimization → Plantalk → Don't optimize
3. Keep app in recent apps

## 🚨 Known Limitations

1. **Phone Calls**: Will always interrupt recording (system behavior)
2. **Low Memory**: System may terminate app if device is extremely low on memory
3. **Manual App Termination**: If user force-closes app, recording will stop
4. **Some Audio Apps**: May interrupt recording if they request exclusive audio access

## 🔍 Troubleshooting

If background recording stops:

1. **Check Permissions**: Ensure microphone permission is granted
2. **Check Battery Settings**: Disable battery optimization (Android)
3. **Check Audio Mode**: Verify `shouldPlayInBackground: true` is set
4. **Test Build Type**: Use production build, not development
5. **Check Device Settings**: Some manufacturers have additional restrictions

## 📋 Recommended Next Steps

1. **Test on Physical Devices**: Essential for accurate testing
2. **Add Foreground Service (Android)**: For enhanced reliability
3. **Implement Recording Persistence**: Save recording state to handle app restarts
4. **Add User Guidance**: In-app tips about battery optimization settings
5. **Consider Notification**: Show recording status in notification area

---

*This setup provides robust background recording for most use cases. For critical applications, consider implementing additional safeguards like periodic background state checks and automatic recording recovery.* 