import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

interface FinancialKeypadProps {
  value: string;
  onChangeValue: (nextVal: string) => void;
  onConfirm: () => void;
  confirmLabel?: string;
  allowOperations?: boolean;
}

export function FinancialKeypad({
  value,
  onChangeValue,
  onConfirm,
  confirmLabel = 'OK',
  allowOperations = true,
}: FinancialKeypadProps) {
  const { colors, isDarkMode } = useAppTheme();

  function triggerHaptic() {
    try {
      Vibration.vibrate(15);
    } catch {
      // Ignorar si no está disponible
    }
  }

  function handleKeyPress(key: string) {
    triggerHaptic();

    if (key === 'C') {
      if (value.length > 0) {
        onChangeValue(value.slice(0, -1));
      }
      return;
    }

    if (key === 'CLEAR_ALL') {
      onChangeValue('');
      return;
    }

    if (key === '.' || key === ',') {
      if (!value.includes('.')) {
        onChangeValue(value ? `${value}.` : '0.');
      }
      return;
    }

    if (key === '+' || key === '-') {
      if (!allowOperations || !value) return;
      // Operación simple
      return;
    }

    // Es un dígito (0..9)
    if (value === '0') {
      onChangeValue(key);
    } else {
      // Máximo 12 caracteres para evitar overflow
      if (value.length < 12) {
        onChangeValue(`${value}${key}`);
      }
    }
  }

  const buttons = [
    ['1', '2', '3', 'C'],
    ['4', '5', '6', '+'],
    ['7', '8', '9', '-'],
    ['0', '.', 'OK'],
  ];

  return (
    <View style={[styles.keypadContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
      {/* Fila 1 */}
      <View style={styles.row}>
        {['1', '2', '3'].map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.key, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}
            onPress={() => handleKeyPress(k)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{k}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.key, styles.keyAction, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
          onPress={() => handleKeyPress('C')}
          onLongPress={() => handleKeyPress('CLEAR_ALL')}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={22} color={isDarkMode ? '#ffffff' : '#0f172a'} />
        </TouchableOpacity>
      </View>

      {/* Fila 2 */}
      <View style={styles.row}>
        {['4', '5', '6'].map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.key, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}
            onPress={() => handleKeyPress(k)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{k}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.key, styles.keyAction, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
          onPress={() => handleKeyPress('+')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyActionText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Fila 3 */}
      <View style={styles.row}>
        {['7', '8', '9'].map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.key, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}
            onPress={() => handleKeyPress(k)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{k}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.key, styles.keyAction, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
          onPress={() => handleKeyPress('-')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyActionText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Fila 4 */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.key, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}
          onPress={() => handleKeyPress('0')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.key, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}
          onPress={() => handleKeyPress('.')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>,</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.keyOk, { backgroundColor: colors.p500 }]}
          onPress={() => {
            triggerHaptic();
            onConfirm();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.keyOkText}>{confirmLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keypadContainer: {
    padding: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  keyAction: {
    opacity: 0.9,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
  },
  keyActionText: {
    fontSize: 22,
    fontWeight: '800',
  },
  keyOk: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  keyOkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
