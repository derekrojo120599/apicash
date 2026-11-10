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

export interface ReminderMessage {
  title: string;
  body: string;
  moment: 'manana' | 'tarde' | 'noche';
}

export const REMINDER_MESSAGES: ReminderMessage[] = [
  // Mañana (10:30 AM)
  {
    title: '☕ ¿Un cafecito, toche?',
    body: 'Anotá ese gasto ligerito antes de que se le olvide.',
    moment: 'manana',
  },
  {
    title: '🥐 ¡Epa, primo!',
    body: '¿Te clavaste un pastelito? Anotá cuánto te costó ese coroto.',
    moment: 'manana',
  },
  {
    title: '📱 ¿Tiraste un Pago Móvil?',
    body: 'Métale mano al saldo antes de que se le descuadre.',
    moment: 'manana',
  },
  // Tarde (3:30 PM)
  {
    title: '🥟 ¡Vergación, qué molleja!',
    body: '¿Gastando sin anotar? Registrá la merienda o quedás pelando.',
    moment: 'tarde',
  },
  {
    title: '⚖️ Mire mijo, no ande a ojo',
    body: 'Cuadre los cobres y los verdes pa\' que no pase penas.',
    moment: 'tarde',
  },
  {
    title: '💸 ¡Qué molleja de gasto!',
    body: 'Anotalo de una vez pa\' que no chillés a fin de mes.',
    moment: 'tarde',
  },
  {
    title: '🧊 No sea flojo, toche',
    body: '30 segundos anotando y no pasa trabajo después.',
    moment: 'tarde',
  },
  // Noche (9:30 PM)
  {
    title: '🌙 ¿Se va a acostar así, toche?',
    body: 'Revise la cuenta pa\' que duerma con la paz del Señor.',
    moment: 'noche',
  },
  {
    title: '🧮 ¡A cerrá caja, mijo!',
    body: 'Anotá lo último del día o amanecés limpio mañana.',
    moment: 'noche',
  },
  {
    title: '🪙 ¿A dónde se fueron los reales?',
    body: 'Anotá y dejá todo cuadradito antes de jatear.',
    moment: 'noche',
  },
];

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

    if (permissionsInitialized) {
      // Programar silenciosamente las alertas diarias y de quincena al obtener permisos
      scheduleDailyReminders().catch(() => {});
      schedulePaydayReminders().catch(() => {});
    }

    return permissionsInitialized;
  } catch (e) {
    console.warn('Error inicializando permisos de notificación:', e);
    return false;
  }
}

/**
 * Programa exactamente 3 alertas locales diarias (Mañana, Tarde, Noche)
 * rotando aleatoriamente entre los 10 mensajes seleccionados.
 */
export async function scheduleDailyReminders(): Promise<boolean> {
  try {
    const hasPermission = await initNotificationsPermission();
    if (!hasPermission) return false;

    // 1. Limpiar recordatorios diarios previos para no duplicar
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // 2. Seleccionar aleatoriamente un mensaje por franja horaria
    const mananaPool = REMINDER_MESSAGES.filter((m) => m.moment === 'manana');
    const tardePool = REMINDER_MESSAGES.filter((m) => m.moment === 'tarde');
    const nochePool = REMINDER_MESSAGES.filter((m) => m.moment === 'noche');

    const msgManana = mananaPool[Math.floor(Math.random() * mananaPool.length)];
    const msgTarde = tardePool[Math.floor(Math.random() * tardePool.length)];
    const msgNoche = nochePool[Math.floor(Math.random() * nochePool.length)];

    // 3. Programar las 3 alertas
    // Mañana: 10:30 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msgManana.title,
        body: msgManana.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily_reminder', moment: 'manana' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 30,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });

    // Tarde: 3:30 PM (15:30)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msgTarde.title,
        body: msgTarde.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily_reminder', moment: 'tarde' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 15,
        minute: 30,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });

    // Noche: 9:30 PM (21:30)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msgNoche.title,
        body: msgNoche.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily_reminder', moment: 'noche' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 30,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });

    return true;
  } catch (e) {
    console.warn('Error programando recordatorios diarios:', e);
    return false;
  }
}

/**
 * Programa recordatorios de ingresos para los días 15 y fin de mes (días de cobro)
 */
export async function schedulePaydayReminders(): Promise<boolean> {
  try {
    const hasPermission = await initNotificationsPermission();
    if (!hasPermission) return false;

    // 1. Limpiar recordatorios de cobro previos
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'payday_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // 2. Alerta de Quincena (Día 15 a las 11:00 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 ¡Cayó la quincena, vergación!',
        body: 'Métale mano y anote los reales pa\' que no se le esfumen como agua.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'payday_reminder', moment: 'quincena' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: 15,
        hour: 11,
        minute: 0,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });

    // 3. Alerta de Fin de Mes (Día 30 a las 11:00 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💵 ¡Cobró a fin de mes, mijo!',
        body: 'Anotá el sueldo y los bonos, toche, pa\' que empiece el mes con los cobres claritos.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'payday_reminder', moment: 'fin_de_mes' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: 30,
        hour: 11,
        minute: 0,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });

    return true;
  } catch (e) {
    console.warn('Error programando recordatorios de quincena/fin de mes:', e);
    return false;
  }
}

export async function triggerSuccessNotification(title: string, body: string) {
  try {
    if (!permissionsInitialized) {
      await initNotificationsPermission();
    }

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
