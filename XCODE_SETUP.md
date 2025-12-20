
# Xcode Setup Guide - Fixing Blank Screen

## ✅ How to Open Xcode Correctly

**IMPORTANT:** You MUST open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### Method 1: Using Terminal
```bash
cd /Users/Felix/Downloads/mainversion-main/ios/App
open App.xcworkspace
```

### Method 2: Using Finder
1. Open Finder
2. Navigate to: `/Users/Felix/Downloads/mainversion-main/ios/App/`
3. **Double-click `App.xcworkspace`** (NOT `App.xcodeproj`)

### Method 3: Using the Script
```bash
cd /Users/Felix/Downloads/mainversion-main
./open-xcode.sh
```

## ✅ After Opening Xcode

1. **Select the Scheme:**
   - At the top toolbar, click the scheme dropdown (next to the device selector)
   - Make sure **"App"** is selected (not "Capacitor" or "Pods-App")

2. **Select a Device/Simulator:**
   - Click the device selector (next to the scheme)
   - Choose an iOS Simulator (e.g., "iPhone 17 Pro", "iPhone 16e", etc.)
   - The Run button should become active

3. **Configure Signing (if needed):**
   - Click the **App** project in the left sidebar
   - Select the **App** target
   - Go to **Signing & Capabilities** tab
   - Check **"Automatically manage signing"**
   - Select your **Team**

## 🔍 Debugging the Blank Screen

### Step 1: Check Xcode Console
1. In Xcode, go to **View → Debug Area → Activate Console** (or press Cmd + Shift + Y)
2. Run the app (Cmd + R)
3. Look for red error messages in the console

### Step 2: Check Safari Web Inspector
1. Run the app in the simulator
2. In Xcode: **Debug → Open Web Inspector**
   - OR in Safari: **Develop → Simulator → Your App**
3. In the Console tab, look for JavaScript errors
4. Common errors:
   - Network errors (Supabase connection)
   - localStorage errors
   - Missing assets

### Step 3: Verify Assets Are Loaded
1. In Safari Web Inspector, go to **Network** tab
2. Refresh the app
3. Check if all assets (JS, CSS) are loading (status 200)
4. If you see 404 errors, the assets aren't synced properly

### Step 4: Rebuild and Sync
If assets are missing:
```bash
cd /Users/Felix/Downloads/mainversion-main
npm run build
npx cap sync ios
```

Then in Xcode:
- **Product → Clean Build Folder** (Shift + Cmd + K)
- **Product → Build** (Cmd + B)
- **Product → Run** (Cmd + R)

## 🐛 Common Issues

### Issue: Run Button is Grey
**Solution:**
- Make sure you opened `App.xcworkspace` (not `.xcodeproj`)
- Select a device/simulator from the dropdown
- Select the "App" scheme

### Issue: Blank Screen
**Possible Causes:**
1. **JavaScript Error** - Check Safari Web Inspector console
2. **Network Error** - Supabase connection failing
3. **Missing Assets** - Assets not synced properly
4. **localStorage Issue** - May need Capacitor Preferences (usually works though)

**Solution:**
- Check console for errors
- Verify Supabase URL is accessible
- Rebuild and sync: `npm run build && npx cap sync ios`

### Issue: "No such process" Error
**Solution:**
- Clean build folder: **Product → Clean Build Folder**
- Reset simulator: `xcrun simctl shutdown all && xcrun simctl erase all`
- Rebuild and run

## 📝 Quick Checklist

- [ ] Opened `App.xcworkspace` (not `.xcodeproj`)
- [ ] Selected "App" scheme
- [ ] Selected a simulator device
- [ ] Configured signing (Team selected)
- [ ] Built the web app: `npm run build`
- [ ] Synced Capacitor: `npx cap sync ios`
- [ ] Cleaned build folder in Xcode
- [ ] Checked console for errors
- [ ] Checked Safari Web Inspector for JavaScript errors





