import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar para que las notificaciones aparezcan como banner superior incluso con la app abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionsInitialized = false;

export async function initNotificationsPermission() {
  if (permissionsInitialized) return true;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    permissionsInitialized = finalStatus === 'granted';
    return permissionsInitialized;
  } catch (e) {
    console.warn('Error inicializando permisos de notificación:', e);
    return false;
  }
}

export async function triggerSuccessNotification(title: string, body: string) {
  try {
    // Si no se han pedido permisos todavía, pedir en background sin bloquear
    if (!permissionsInitialized) {
      initNotificationsPermission();
    }

    // Disparar sin timer artificial (instantáneo en 0ms)
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
    });
  } catch (e) {
    console.warn('No se pudo disparar la notificación nativa:', e);
  }
}
