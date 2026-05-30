import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Convert a base64url VAPID public key into the Uint8Array the
// PushManager expects as applicationServerKey.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("This browser doesn't support notifications.");
    return;
  }

  try {
    // Register the service worker (served from the site root).
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Ask the user for permission.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    // Get the VAPID public key from the server.
    const { data } = await axios.get(`${API_URL}/push/public-key`);
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // Subscribe via the browser's push service.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Send the subscription to the backend.
    const sub = subscription.toJSON();
    await axios.post(`${API_URL}/push/subscribe`, {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    });

    alert("You'll now get tournament alerts!");
  } catch (err) {
    console.error('Push subscription failed:', err);
    alert('Could not enable notifications. Please try again.');
  }
}
