import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.org.scouts.eventos',
  appName: 'Eventos Scouts',
  webDir: 'dist/angular-scouts',
  plugins: {
    // La pantalla de arranque se oculta a mano desde main.ts (fundido hacia el login)
    SplashScreen: { launchAutoHide: false, backgroundColor: '#5a3380' },
    // Las llamadas HTTP de Angular (HttpClient/XHR) se hacen de forma nativa,
    // así la API https://apis.scouts.org.mx no bloquea por CORS dentro de la app.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
