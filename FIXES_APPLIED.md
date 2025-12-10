# Fixes Applied for App Store Submission

## ✅ Completed Fixes

### 1. Capacitor Configuration (`capacitor.config.ts`)
**Status:** ✅ FIXED

**Changes Made:**
- Commented out development server URL (required for production)
- Updated appId placeholder to `net.tastr.app` (you need to replace with your actual registered App ID)
- Added TODO comment for App ID update

**File:** `capacitor.config.ts`

**What You Need to Do:**
1. Register your App ID in Apple Developer Portal (if not already done)
2. Update `appId` in `capacitor.config.ts` to match your registered App ID
3. Run `npx cap sync ios` after updating

### 2. iOS Setup Documentation
**Status:** ✅ CREATED

**Created File:** `ios-setup-instructions.md`

**Contains:**
- Step-by-step instructions for iOS project setup
- Location permission string configuration
- App ID configuration steps
- Signing & certificate setup
- Build and submission process

## ⚠️ Remaining Actions Required

### 1. iOS Info.plist Location Permission
**Status:** ⚠️ ACTION REQUIRED

**What to Do:**
1. Generate iOS project (if not already done):
   ```bash
   npx cap add ios
   npx cap sync ios
   ```

2. Add location permission string to `ios/App/App/Info.plist`:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.</string>
   ```

   **OR** use Xcode:
   - Open project: `npx cap open ios`
   - Navigate to `App` → `App` → `Info.plist`
   - Add row: `Privacy - Location When In Use Usage Description`
   - Value: `tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.`

**See:** `ios-setup-instructions.md` for detailed instructions

### 2. Update App ID
**Status:** ⚠️ ACTION REQUIRED

**What to Do:**
1. Register App ID in Apple Developer Portal:
   - Go to https://developer.apple.com/account
   - Certificates, Identifiers & Profiles → Identifiers
   - Click "+" to create new App ID
   - Use format: `net.tastr.app` or `com.yourcompany.tastr`

2. Update `capacitor.config.ts`:
   ```typescript
   appId: 'your.registered.app.id', // Replace with your actual App ID
   ```

3. Sync changes:
   ```bash
   npx cap sync ios
   ```

## 📋 Next Steps Summary

1. ✅ Development server URL removed (DONE)
2. ⚠️ Update App ID in `capacitor.config.ts` (YOU NEED TO DO THIS)
3. ⚠️ Generate iOS project and add location permission (YOU NEED TO DO THIS)
4. ⚠️ Test on physical device
5. ⚠️ Submit to App Store Connect

## 📚 Reference Files

- `APP_STORE_CHECKLIST.md` - Complete compliance checklist
- `ios-setup-instructions.md` - Detailed iOS setup guide
- `capacitor.config.ts` - Updated configuration file






