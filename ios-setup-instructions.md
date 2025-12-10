# iOS Setup Instructions for App Store Submission

## Step 1: Generate iOS Project (if not already done)

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
```

## Step 2: Add Location Permission String

After generating the iOS project, you need to add the location permission description to Info.plist.

**Location:** `ios/App/App/Info.plist`

**Add this key-value pair:**

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.</string>
```

### How to add it:

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Navigate to `App` → `App` → `Info.plist` in the project navigator
   - Right-click and select "Add Row"
   - Key: `Privacy - Location When In Use Usage Description` (or `NSLocationWhenInUseUsageDescription`)
   - Value: `tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.`

   OR manually edit the Info.plist file and add:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.</string>
   ```

## Step 3: Update App ID in capacitor.config.ts

Before building for production, update the `appId` in `capacitor.config.ts` to match your App ID registered in Apple Developer:

```typescript
appId: 'net.tastr.app', // Change to your actual App ID
```

Then sync:
```bash
npx cap sync ios
```

## Step 4: Configure Signing & Certificates

1. Open project in Xcode: `npx cap open ios`
2. Select the `App` target
3. Go to "Signing & Capabilities" tab
4. Select your Team
5. Ensure Bundle Identifier matches your App ID
6. Xcode will automatically manage certificates

## Step 5: Build for Production

```bash
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Step 6: Archive and Submit

1. In Xcode, select "Any iOS Device" as the destination
2. Product → Archive
3. Once archived, click "Distribute App"
4. Follow the App Store Connect submission process






