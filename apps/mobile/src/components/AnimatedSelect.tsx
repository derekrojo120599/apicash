import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AnimatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  creatable?: boolean;
  onCreateOption?: (newLabel: string) => Promise<void>;
}

export function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  disabled = false,
  creatable = false,
  onCreateOption,
}: AnimatedSelectProps) {
  const { colors, isDarkMode } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedOption = options.find((o) => o.value === value && !o.disabled);
  const validOptions = options.filter((o) => !o.disabled);

  const filteredOptions = validOptions.filter((o) =>
    o.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const trimmed = searchTerm.trim();
  const exactExists = validOptions.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase()
  );
  const canCreate = creatable && trimmed.length > 0 && !exactExists && onCreateOption;

  async function handleCreate() {
    if (!canCreate || !onCreateOption) return;
    setCreating(true);
    try {
      await onCreateOption(trimmed);
      setSearchTerm('');
      setIsOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selectButton,
          !isDarkMode && styles.selectButtonLight,
          isOpen && { borderColor: colors.p500 },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => {
          if (!disabled) {
            setSearchTerm('');
            setIsOpen(true);
          }
        }}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.selectButtonText,
            !isDarkMode && { color: '#0f172a' },
            !selectedOption && { color: '#64748b' },
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#64748b"
        />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              !isDarkMode && styles.dropdownLight,
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.dropdownHeader,
                !isDarkMode && { borderBottomColor: '#e2e8f0' },
              ]}
            >
              <Text style={[styles.dropdownTitle, !isDarkMode && { color: '#0f172a' }]}>
                {placeholder}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {creatable || validOptions.length > 5 ? (
              <View
                style={[
                  styles.searchWrap,
                  !isDarkMode && styles.searchWrapLight,
                ]}
              >
                <Ionicons name="search-outline" size={16} color="#64748b" />
                <TextInput
                  style={[styles.searchInput, !isDarkMode && { color: '#0f172a' }]}
                  placeholder={creatable ? 'Buscar o crear nueva...' : 'Buscar...'}
                  placeholderTextColor="#64748b"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>
            ) : null}

            <ScrollView style={styles.optionsList}>
              {filteredOptions.length === 0 && !canCreate ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No se encontraron opciones</Text>
                </View>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionRow,
                        isSelected && { backgroundColor: `${colors.p500}20` },
                      ]}
                      onPress={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          !isDarkMode && { color: '#0f172a' },
                          isSelected && { color: colors.p500, fontWeight: '700' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color={colors.p500} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}

              {canCreate ? (
                <TouchableOpacity
                  style={[styles.createRow, { borderColor: colors.p500 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.p500} />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color={colors.p500} />
                      <Text style={[styles.createText, { color: colors.p500 }]}>
                        Crear "{trimmed}"
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '75%',
    overflow: 'hidden',
  },
  dropdownLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchWrapLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: '#ffffff',
  },
  optionsList: {
    padding: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    flex: 1,
  },
  emptyWrap: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  createText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
