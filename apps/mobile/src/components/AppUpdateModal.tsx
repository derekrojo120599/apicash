import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import appConfig from '../../app.json';

const CURRENT_VERSION = appConfig.expo.version || '1.0.0';
const GITHUB_REPO = 'derekrojo120599/apicash';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const PERMANENT_APK_URL = 'https://jkoxmyefjmokdycjlfqb.supabase.co/storage/v1/object/public/downloads/apicash.apk';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  notes?: string;
}

/**
 * Compara dos versiones semánticas (ej: '1.1.0' > '1.0.0')
 */
function isNewerVersion(remote: string, current: string): boolean {
  const cleanRemote = remote.replace(/^v/, '');
  const cleanCurrent = current.replace(/^v/, '');

  const rParts = cleanRemote.split('.').map((n) => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export function AppUpdateModal() {
  const { colors, isDarkMode } = useAppTheme();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkLatestVersion();
  }, []);

  async function checkLatestVersion() {
    try {
      const res = await fetch(RELEASES_API, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const remoteTag = data.tag_name || '';

      if (isNewerVersion(remoteTag, CURRENT_VERSION)) {
        // Verificar si el usuario ya descartó esta versión específica hoy
        const dismissedKey = `apicash_dismissed_update_${remoteTag}`;
        const alreadyDismissed = await AsyncStorage.getItem(dismissedKey);

        const apkAsset = (data.assets || []).find((a: any) =>
          a.name?.endsWith('.apk')
        );
        const downloadUrl = PERMANENT_APK_URL;

        if (!alreadyDismissed) {
          setUpdateInfo({
            version: remoteTag,
            downloadUrl,
            notes: data.body || '',
          });
          setVisible(true);
        }
      }
    } catch {
      // Falla silenciosa si no hay internet o no hay releases
    }
  }

  const handleDownload = () => {
    if (!updateInfo) return;
    Linking.openURL(updateInfo.downloadUrl);
    setVisible(false);
  };

  const handleDismiss = async () => {
    if (updateInfo) {
      const dismissedKey = `apicash_dismissed_update_${updateInfo.version}`;
      await AsyncStorage.setItem(dismissedKey, 'true');
    }
    setVisible(false);
  };

  if (!visible || !updateInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, !isDarkMode && styles.cardLight]}>
          {/* Badge superior */}
          <View style={[styles.iconBadge, { backgroundColor: `${colors.p500}22` }]}>
            <Ionicons name="sparkles" size={28} color={colors.p500} />
          </View>

          <Text style={[styles.title, !isDarkMode && styles.textDark]}>
            ¡Nueva versión disponible!
          </Text>

          <View style={[styles.versionPill, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={[styles.versionText, { color: colors.p500 }]}>
              {updateInfo.version} (Actual: v{CURRENT_VERSION})
            </Text>
          </View>

          <Text style={styles.description}>
            Hay una actualización oficial de Apicash lista con mejoras de rendimiento, nuevo diseño y ajustes del sistema.
          </Text>

          {/* Botones de acción */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.dismissBtn, !isDarkMode && styles.dismissBtnLight]}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissText, !isDarkMode && { color: '#64748b' }]}>
                Más tarde
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: colors.p600 }]}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#ffffff" />
              <Text style={styles.downloadText}>Actualizar APK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Función utilitaria para chequear manualmente desde la pantalla de Perfil
 */
export async function manualCheckUpdate(): Promise<{ hasUpdate: boolean; version?: string; downloadUrl?: string }> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return { hasUpdate: false };

    const data = await res.json();
    const remoteTag = data.tag_name || '';

    if (isNewerVersion(remoteTag, CURRENT_VERSION)) {
      const apkAsset = (data.assets || []).find((a: any) =>
        a.name?.endsWith('.apk')
      );
      const downloadUrl = PERMANENT_APK_URL;
      return { hasUpdate: true, version: remoteTag, downloadUrl };
    }
    return { hasUpdate: false };
  } catch {
    return { hasUpdate: false };
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  textDark: {
    color: '#0f172a',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnLight: {
    backgroundColor: '#f1f5f9',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  downloadBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  downloadText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
