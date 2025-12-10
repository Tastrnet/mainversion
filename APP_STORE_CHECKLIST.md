# Apple App Store Review Guidelines Compliance Checklist

## ✅ COMPLIANT AREAS

### 1. Privacy Policy & Terms of Service
- ✅ Privacy Policy is accessible at `/privacy` route
- ✅ Terms of Service is accessible at `/terms` route
- ✅ Both documents are linked in Settings page
- ✅ Users must agree to Terms during signup
- ✅ Documents include required sections (GDPR, data collection, user rights, etc.)
- ✅ Contact email (admin@tastr.net) is clearly stated

### 2. User-Generated Content
- ✅ Content reporting system implemented (ReportDialog component)
- ✅ Users can report reviews and lists
- ✅ Report reasons include: spam, inappropriate content, misinformation, conflict of interest
- ✅ Terms include community guidelines and prohibited behavior
- ✅ Content moderation policies are stated

### 3. Account Management
- ✅ Users can delete their accounts (Settings page)
- ✅ Account deletion removes all user data (reviews, lists, photos, followers)
- ✅ Account deletion is clearly explained in Privacy Policy

### 4. Age Requirements
- ✅ Terms state minimum age of 13
- ✅ Privacy Policy includes Children's Privacy section
- ✅ Age verification during signup (implied by Terms agreement)

### 5. Location Services
- ✅ Location permissions are requested only when needed
- ✅ Privacy Policy explains location data usage
- ✅ Location data is not stored permanently
- ✅ Users can disable location services

## ✅ FIXED ISSUES

### 1. ✅ Capacitor Config - Development Server URL
**STATUS:** FIXED
- Development server URL has been commented out in `capacitor.config.ts`
- App ID placeholder updated to `net.tastr.app` (you need to update to your actual registered App ID)

### 2. ✅ iOS Setup Instructions Created
**STATUS:** DOCUMENTATION CREATED
- Created `ios-setup-instructions.md` with step-by-step guide
- Includes instructions for adding location permission string

## ⚠️ REMAINING ISSUES TO FIX BEFORE SUBMISSION

### 1. iOS Info.plist Location Permission Strings
**STATUS:** ⚠️ ACTION REQUIRED
**ISSUE:** Missing `NSLocationWhenInUseUsageDescription` in iOS Info.plist
**REQUIREMENT:** Apple requires a clear explanation of why location is needed
**FIX:** 
1. Generate iOS project: `npx cap add ios` (if not already done)
2. Add to `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>tastr uses your location to show nearby restaurants and calculate distances. Your location is not stored permanently.</string>
```
**SEE:** `ios-setup-instructions.md` for detailed steps

### 2. App ID Configuration
**STATUS:** ⚠️ ACTION REQUIRED
**ISSUE:** App ID is set to placeholder `net.tastr.app`
**REQUIREMENT:** Use your actual production App ID from Apple Developer account
**FIX:** 
1. Register your App ID in Apple Developer Portal (if not already done)
2. Update `capacitor.config.ts` with your actual App ID:
```typescript
appId: 'your.actual.app.id', // Replace with your registered App ID
```
3. Run `npx cap sync ios` to sync changes

### 4. Contact Information Accessibility
**ISSUE:** Contact email should be easily accessible without login
**CURRENT:** Contact info is in Terms/Privacy (requires navigation)
**RECOMMENDATION:** Consider adding contact info to Welcome/Login page footer

## 📋 APP STORE METADATA REQUIREMENTS

### Age Rating
**RECOMMENDED:** 12+ (due to user-generated content)
- User-generated content (reviews, photos)
- Social networking features
- No objectionable content expected

### App Description
Should mention:
- Social network for food experiences
- Age requirement (13+)
- User-generated content
- Location services (optional)

### Privacy Information
- Data collected: Email, username, profile info, reviews, photos, location (optional)
- Data used for: App functionality, social features, location-based services
- Data linked to user: Yes
- Tracking: No (no analytics/tracking libraries found)

### Support URL
**REQUIRED:** Provide a support page or email
**RECOMMENDATION:** Use admin@tastr.net or create a support page

## 🔍 ADDITIONAL RECOMMENDATIONS

### 1. Content Moderation
- ✅ Report system exists
- ⚠️ Consider implementing automated content filtering for profanity
- ⚠️ Ensure you have a process to review reports within 24-48 hours

### 2. User Safety
- ✅ Users can report content
- ✅ Users can block/unfollow others (via followers system)
- ⚠️ Consider adding explicit blocking feature if not already present

### 3. Data Security
- ✅ HTTPS/encryption mentioned in Privacy Policy
- ✅ Secure authentication (Supabase)
- ✅ Row-level security policies in database

### 4. Third-Party Services
- ✅ Supabase (backend) - GDPR compliant
- ✅ Capacitor (framework)
- ✅ Radix UI (components)
- ✅ Leaflet (mapping)
- All third-party services are disclosed in Privacy Policy

### 5. In-App Purchases
- ✅ No in-app purchases found
- ✅ No subscription services
- No additional configuration needed

## 📝 PRE-SUBMISSION CHECKLIST

Before submitting to App Store:

### Code Fixes (Required)
- [x] Remove development server URL from capacitor.config.ts ✅ FIXED
- [ ] Update appId to production App ID (currently set to placeholder `net.tastr.app`)
- [ ] Generate iOS project: `npx cap add ios` (if not already done)
- [ ] Add location permission string to iOS Info.plist (see `ios-setup-instructions.md`)

### Testing (Required)
- [ ] Test account deletion flow
- [ ] Test Terms/Privacy Policy accessibility (should work without login)
- [ ] Verify contact email (admin@tastr.net) is working and monitored
- [ ] Test location permission flow (request, deny, allow scenarios)
- [ ] Test content reporting flow
- [ ] Review all user-generated content for compliance
- [ ] Ensure no test/dummy data in production
- [ ] Build production version: `npm run build && npx cap sync ios`
- [ ] Test on physical iOS device (not just simulator)

### App Store Connect Setup (Required)
- [ ] Register App ID in Apple Developer Portal
- [ ] Create app listing in App Store Connect
- [ ] Prepare App Store screenshots (required: 6.5" and 5.5" displays)
- [ ] Write App Store description (include age requirement, features)
- [ ] Set age rating (recommended: 12+ due to user-generated content)
- [ ] Configure privacy information in App Store Connect
- [ ] Set support URL (can use email: admin@tastr.net)
- [ ] Prepare app preview video (optional but recommended)

## 🚨 COMMON REJECTION REASONS TO AVOID

1. **Missing Privacy Policy** - ✅ Fixed
2. **Missing Terms of Service** - ✅ Fixed
3. **No way to delete account** - ✅ Fixed
4. **Missing location permission description** - ⚠️ Action required (see ios-setup-instructions.md)
5. **Development server URL in production** - ✅ Fixed (commented out)
6. **Incomplete user-generated content moderation** - ✅ Has reporting system
7. **No contact information** - ✅ Has email in Terms/Privacy
8. **Wrong App ID** - ⚠️ Action required (update to your registered App ID)

## 📞 APPLE REVIEW CONTACT

If Apple reviewers have questions, they can contact:
- **Email:** admin@tastr.net
- **Response Time:** Ensure you can respond within 24-48 hours

## ✅ FINAL VERIFICATION

Before final submission, verify:
1. All legal documents are accessible without login
2. Contact information is clearly visible
3. Account deletion works correctly
4. Location permissions are properly requested
5. Content reporting system functions
6. No development/test data in production build
7. App functions correctly without internet (graceful degradation)






