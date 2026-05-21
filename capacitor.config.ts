import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiocosmos.app',
  appName: 'Ethio-Cosmos',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
