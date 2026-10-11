import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';

if ('serviceWorker' in navigator) {
  const configureServiceWorker = async () => {
    if (import.meta.env.PROD) {
      await navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {
          /* IndexedDB still supports offline work in the open app. */
        });
      return;
    }

    // A production preview can leave its offline worker on localhost:5173.
    // Remove only Waypoint's app shell in development so Vite always serves current source.
    const registrations = await navigator.serviceWorker.getRegistrations();
    const controlledByOldWorker = Boolean(navigator.serviceWorker.controller);
    const [unregistered] = await Promise.all([
      Promise.all(
        registrations
          .filter((registration) => registration.scope.startsWith(window.location.origin))
          .map((registration) => registration.unregister())
      ),
      'caches' in window
        ? caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith('waypoint-shell-'))
                  .map((key) => caches.delete(key))
              )
            )
        : Promise.resolve([]),
    ]);

    if (controlledByOldWorker && unregistered.some(Boolean)) {
      window.location.reload();
    }
  };

  if (document.readyState === 'complete') {
    void configureServiceWorker();
  } else {
    window.addEventListener('load', () => void configureServiceWorker(), { once: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
