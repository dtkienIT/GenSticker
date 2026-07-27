export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    process.env.NODE_ENV !== 'production' ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }
  return navigator.serviceWorker.register('/sw.js');
}
