import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

import { AppModule } from './app/app.module';
import { NativeTabBar } from './app/services/native-tabbar';

// App nativa (iPhone/iPad o Android): el menú pasa a un dock inferior. En teléfonos (lado corto < 600)
// trae 6 iconos + "Más"; en tabletas (iPad ≥ 744pt, Android ≥ 600dp) usa todo el ancho (clase es-tablet).
// El navegador conserva el menú original.
// El login no lleva menú: al arrancar (o recargar) se asegura que la barra nativa de iOS esté oculta
if (Capacitor.getPlatform() === 'ios') NativeTabBar.hide().catch(() => { /* plugin ausente */ });
// es-ios: letra del sistema con el tamaño de texto de Ajustes (ios27.css)
if (Capacitor.getPlatform() === 'ios') document.documentElement.classList.add('es-ios');
// es-android: el dock y el relleno inferior respetan completa la barra de gestos/navegación (styles.css, navbar)
if (Capacitor.getPlatform() === 'android') document.documentElement.classList.add('es-android');

if (Capacitor.isNativePlatform()) {
  const esTablet = Math.min(screen.width, screen.height) >= 600;
  document.documentElement.classList.add('es-telefono');
  if (esTablet) document.documentElement.classList.add('es-tablet');
  else {
    // Evita que el sistema haga zoom al tocar un campo de texto y obligue a recentrar la pantalla
    document.querySelector('meta[name="viewport"]')?.setAttribute('content',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  }

  // Al cerrar el teclado, iOS/Android dejan la página desplazada hacia arriba (el formulario queda
  // tapado por el banner). Se guarda el scroll al enfocar un campo y se restaura al salir de él.
  const esCampo = (el: EventTarget | null) =>
    el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (el as HTMLInputElement).type !== 'checkbox' && (el as HTMLInputElement).type !== 'radio';
  let scrollPrevio: number | null = null;
  document.addEventListener('focusin', e => {
    if (esCampo(e.target) && scrollPrevio === null) scrollPrevio = window.scrollY;
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (esCampo(document.activeElement)) return;   // pasó a otro campo: el teclado sigue abierto
      if (scrollPrevio !== null) window.scrollTo({ top: scrollPrevio });
      scrollPrevio = null;
    }, 150);
  });
}

// Splash animada: el arranque nativo (imagen fija) se oculta en cuanto la app carga y deja ver #splash-app,
// idéntica a él, que anima el logo (rebote, brillo) y se funde hacia el login. Solo en la app nativa.
const inicio = Date.now();
const splashApp = document.getElementById('splash-app');
const quitarSplash = () => { splashApp?.remove(); SplashScreen.hide(); };
// Solo al abrir la app: "Salir" recarga la página y no debe repetir la animación (sessionStorage se borra al cerrar la app).
let yaVista = false;
try { yaVista = sessionStorage.getItem('splash-vista') === '1'; } catch { /* sin storage: se anima siempre */ }
const animar = Capacitor.isNativePlatform() && !yaVista;
if (animar) {
  document.documentElement.classList.add('es-nativa');
  try { sessionStorage.setItem('splash-vista', '1'); } catch { /* sin storage */ }
} else splashApp?.remove();

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!animar) { SplashScreen.hide({ fadeOutDuration: 0 }); return; }   // recarga tras "Salir": directo al login
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 0 });             // el nativo cede el paso al instante (se ve igual)
      requestAnimationFrame(() => setTimeout(() => splashApp?.classList.add('go'), 60));   // y arranca la animación
      setTimeout(() => splashApp?.classList.add('salir'), 800);   // fundido hacia el login
      setTimeout(() => splashApp?.remove(), 1200);
    }, Math.max(0, 350 - (Date.now() - inicio)));
  })
  .catch(err => { console.error(err); if (Capacitor.isNativePlatform()) quitarSplash(); });
