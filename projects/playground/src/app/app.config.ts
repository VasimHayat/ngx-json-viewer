import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter,withHashLocation } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { routes } from './app.routes';

/**
 * Playground bootstrap configuration. This is also the canonical example of how
 * a host app wires up ngx-json-editor: PrimeNG theme + animations are provided
 * by the host, not the library.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes,withHashLocation()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          // Keep PrimeNG's own dark selector out of the way; the editor manages
          // its own light/dark tokens. Host can flip this as desired.
          darkModeSelector: '.app-dark',
        },
      },
    }),
  ],
};
