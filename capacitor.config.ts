import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // TODO: Update this to your production App ID from Apple Developer account
  // Format: com.yourcompany.appname or net.tastr.app
  appId: 'net.tastr.app', // Change this to your registered App ID before App Store submission
  appName: 'tastr',
  webDir: 'dist',
  // Development server configuration - REMOVED for production
  // Uncomment below for local development only:
  // server: {
  //   url: 'https://7931be68-9b35-48e6-b398-e003573917bf.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;