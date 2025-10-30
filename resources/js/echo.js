import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// expose Pusher to window for debug or other libs
window.Pusher = Pusher;

// Setup Echo instance using environment variables injected into window.Laravel
// Ensure you set in your blade layout or window.Laravel the following keys:
// window.Laravel = { pusherKey: 'your-key', pusherCluster: 'mt1', authEndpoint: '/broadcasting/auth' }

const makeEcho = () => {
  try {
    const cfg = window.Laravel || {};
    const key = cfg.pusherKey || process.env.MIX_PUSHER_APP_KEY || process.env.VITE_PUSHER_APP_KEY;
    const cluster = cfg.pusherCluster || process.env.MIX_PUSHER_APP_CLUSTER || process.env.VITE_PUSHER_APP_CLUSTER;
    if (!key) {
      // Silently return null if Pusher is not configured (common in development)
      return null;
    }

    const echo = new Echo({
      broadcaster: 'pusher',
      key: key,
      cluster: cluster || undefined,
      forceTLS: true,
      authEndpoint: cfg.authEndpoint || '/broadcasting/auth',
      auth: {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      }
    });

    window.Echo = echo;
    return echo;
  } catch (e) {
    console.error('Failed to initialize Echo', e);
    return null;
  }
};

export default makeEcho();
