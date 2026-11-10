import * as Updates from 'expo-updates';

/**
 * Verifica y aplica silenciosamente actualizaciones OTA al iniciar la app.
 * En modo desarrollo (__DEV__) o en Expo Go no aplica.
 */
export async function checkAndApplyOTAUpdates(): Promise<boolean> {
  if (__DEV__) return false;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      // Descargamos la nueva versión JS/assets al vuelo
      await Updates.fetchUpdateAsync();
      // Recarga la app con el nuevo código inmediatamente o en el siguiente arranque
      await Updates.reloadAsync();
      return true;
    }
  } catch (error) {
    // Si no hay conexión o falla la consulta, la app continúa normalmente con la versión en caché
    console.log('[expo-updates] Verificación OTA omitida o sin conexión:', error);
  }

  return false;
}
