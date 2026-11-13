import { StorageService } from '../services/storage';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Error registrando el Service Worker:', err);
    return null;
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; message: string; subscription?: PushSubscription }> {
  if (!isPushSupported()) {
    return {
      success: false,
      message: 'Tu navegador actual no admite notificaciones Web Push. En Android, utiliza Google Chrome o Samsung Internet.'
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      message: 'Permiso de notificaciones denegado. Ve a los ajustes del sitio en tu navegador y habilita "Notificaciones".'
    };
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    return { success: false, message: 'No se pudo iniciar el Service Worker necesario para Web Push.' };
  }

  try {
    // 1. Obtener clave pública VAPID del servidor o usar la pública predeterminada
    let vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    try {
      const res = await fetch('/api/push/vapid-public-key');
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey) vapidPublicKey = data.publicKey;
      }
    } catch {
      // Usar clave pública fallback
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 2. Suscribir a través del PushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey.buffer as ArrayBuffer
      });
    }

    // 3. Enviar la suscripción al Cloudflare Worker
    const prefs = StorageService.getPreferences();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        settings: {
          timezone: prefs.notifications.timezone,
          morningTime: prefs.notifications.morningTime,
          middayTime: prefs.notifications.middayTime,
          eveningTime: prefs.notifications.eveningTime
        }
      })
    }).catch(e => console.warn('Worker no disponible de inmediato, suscripción local completada:', e));

    prefs.notifications.enabled = true;
    StorageService.savePreferences(prefs);

    return {
      success: true,
      message: '¡Notificaciones activadas con éxito! Recibirás los avisos en tus horarios configurados.',
      subscription
    };
  } catch (err) {
    console.error('Error al suscribir a Web Push:', err);
    return {
      success: false,
      message: `Error al conectar con el servicio Push: ${(err as Error).message}`
    };
  }
}

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg) return { success: false, message: 'Service worker no activo.' };

  const subscription = await reg.pushManager.getSubscription();

  // Intentar vía backend
  if (subscription) {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      if (res.ok) {
        return { success: true, message: 'Notificación de prueba enviada a través de la infraestructura Push.' };
      }
    } catch {
      // Si el backend no está disponible en localhost, mostrar notificación nativa local de prueba
    }
  }

  // Notificación local de verificación del dispositivo si el backend no respondió
  if (Notification.permission === 'granted') {
    await reg.showNotification('Daily • Prueba de Notificación', {
      body: '¡Excelente! Tu dispositivo Android está listo para recibir avisos de Daily.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'test-notification'
    });
    return { success: true, message: 'Notificación de verificación mostrada en tu pantalla.' };
  }

  return { success: false, message: 'Permiso no otorgado aún.' };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
