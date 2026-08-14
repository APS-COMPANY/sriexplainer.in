import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.sriexplainer.app',
  appName: 'Sri Explainer',
  webDir: 'frontend/public',
  server: {
    url: 'https://sriexplainer.in',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#050811",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;
