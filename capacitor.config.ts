import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiocosmos.learning',
  appName: 'EthioCosmos',
  webDir: 'dist'
};

config.server = {
  androidScheme: 'https'
};

export default config;
