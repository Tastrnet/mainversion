# Xcode Build Warnings Explained

## ✅ These Are WARNINGS, Not Errors

**Your app will build and run successfully despite these warnings!** They are informational messages, not blocking errors.

## Warning Types

### 1. **WKProcessPool Deprecation Warning** ⚠️ (Harmless)

**Message:** `'WKProcessPool' is deprecated: first deprecated in iOS 15.0`

**What it means:**
- CapacitorCordova (a dependency) uses an iOS API that Apple deprecated in iOS 15
- The API still works, but Apple recommends not using it
- This is a **library issue**, not your code

**Impact:** None - the app works fine

**Can you fix it?** No - this is in the CapacitorCordova library. You'd need to wait for Capacitor to update their code.

**Action:** **IGNORE** - This is safe to ignore

### 2. **CocoaPods Script Warning** ⚠️ (Harmless)

**Message:** `Run script build phase '[CP] Embed Pods Frameworks' will be run during every build because it does not specify any outputs`

**What it means:**
- CocoaPods script doesn't specify output files
- Xcode runs it every time (even if nothing changed)
- This makes builds slightly slower, but doesn't break anything

**Impact:** Slightly slower builds (negligible)

**Can you fix it?** Yes, but it's optional:
1. In Xcode: Select **App** target → **Build Phases**
2. Find **"[CP] Embed Pods Frameworks"** script
3. Uncheck **"Based on dependency analysis"**
4. This will suppress the warning

**Action:** **OPTIONAL** - You can ignore this or fix it as above

## Summary

✅ **All warnings are harmless**  
✅ **App will build and run successfully**  
✅ **No action required** (unless you want to suppress the CocoaPods warning)

## How to Suppress Warnings (Optional)

If the warnings bother you:

### Suppress Deprecation Warnings:

1. In Xcode: Select **App** project → **App** target
2. Go to **Build Settings**
3. Search for: `Other Warning Flags`
4. Add: `-Wno-deprecated-declarations`
5. This will hide deprecation warnings (but they're harmless anyway)

### Suppress CocoaPods Warning:

1. In Xcode: Select **App** target → **Build Phases**
2. Find **"[CP] Embed Pods Frameworks"** script
3. Uncheck **"Based on dependency analysis"**

## Bottom Line

**These warnings are normal for Capacitor apps and don't affect functionality.** Your app will work perfectly fine. You can safely ignore them!


