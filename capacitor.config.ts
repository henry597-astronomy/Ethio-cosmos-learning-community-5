import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiocosmos.learning',
  appName: 'EthioCosmos',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'ethio-cosmos-learning-community-5.vercel.app',
    cleartext: true,
    allowNavigation: [
      '*.tiktok.com',
      '*.youtube.com',
      '*.youtube-nocookie.com',
      '*.googleapis.com',
      '*.supabase.co'
    ]
  },
  android: {
    webContentsDebuggingEnabled: true
  }
};

export default config;
