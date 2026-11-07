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
    title: '☕ ¿Un café o una compra rápida?',
    body: 'Anotalo ahora en 10 segundos antes de que se te pase por alto.',
    moment: 'manana',
  },
  {
    title: '🍔 ¿Qué tal el almuerzo de hoy?',
    body: 'No dejes que los gastos del mediodía se te escapen del radar. Registralo en El Sencillo.',
    moment: 'manana',
  },
  {
    title: '📊 ¿Hiciste algún Pago Móvil hoy?',
    body: 'Anotalo antes de que te olvides del monto o la tasa del momento.',
    moment: 'manana',
  },
  // Tarde (3:30 PM)
  {
    title: '⏱️ 30 segundos te ahorran horas a fin de mes',
    body: 'Mantené tu saldo al día: registrá los movimientos de la tarde.',
    moment: 'tarde',
  },
  {
    title: '⚖️ Que no te cuadre "a ojo"',
    body: 'Anotá tus pagos en VES y USD para ver tu balance neto real en tiempo real.',
    moment: 'tarde',
  },
  {
    title: '🎯 Cuidá tu presupuesto',
    body: '¿Tuviste algún gasto imprevisto hoy? Anotalo y mirá cuánto te queda disponible.',
    moment: 'tarde',
  },
  {
    title: '💡 El secreto del ahorro es la constancia',
    body: 'No es ganar más, es saber con precisión a dónde se va cada bolívar y cada dólar.',
    moment: 'tarde',
  },
  // Noche (9:30 PM)
  {
    title: '🌙 Cierre de caja personal',
    body: 'Un minuto antes de acostarte para registrar tus gastos y dormir con las cuentas claras.',
    moment: 'noche',
  },
  {
    title: '🧾 ¿Día movido? Que tus cuentas no se desordenen',
    body: 'Revisá tus consumos de hoy y dejá tu saldo impecable para mañana.',
    moment: 'noche',
  },
  {
    title: '🚀 Tu bolsillo te lo va a agradecer',
    body: 'Registrá el último movimiento del día y no dejes cabos sueltos en tu balance.',
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
      // Programar silenciosamente las 3 alertas diarias al obtener permisos
      scheduleDailyReminders().catch(() => {});
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
