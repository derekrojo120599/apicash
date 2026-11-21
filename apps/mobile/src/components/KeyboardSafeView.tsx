import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  View,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface KeyboardSafeViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// KeyboardAvoidingView relies on the host window being resized, which does not
// happen reliably for transparent <Modal>s on Android. This view listens to
// keyboard events directly and applies the keyboard height as its own bottom
// padding, keeping focused inputs above the keyboard inside modals.
export function KeyboardSafeView({ children, style }: KeyboardSafeViewProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return (
    <View style={[style, keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : null]}>
      {children}
    </View>
  );
}
