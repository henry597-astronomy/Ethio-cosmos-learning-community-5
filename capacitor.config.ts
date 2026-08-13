import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiocosmos.learning',
  appName: 'EthioCosmos',
  webDir: 'dist'
};

// Simplified for maximum compatibility
config.server = {
  androidScheme: 'http'
};

export default config;
