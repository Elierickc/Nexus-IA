import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elierickc.nexusia',
  appName: 'prompt-powered-ventures',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
