import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.hashtopic.mystorefront',
  appName: 'MyStorefront',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
