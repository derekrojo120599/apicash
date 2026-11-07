import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

/**
 * 1. FadeIn (equivalente exacto al FadeIn de animejs en la web)
 * Easing: outCubic, entrada con opacidad + desplazamiento suave
 */
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 550,
  direction = 'up',
  distance = 20,
  style,
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(
    new Animated.Value(
      direction === 'up' || direction === 'left'
        ? distance
        : direction === 'down' || direction === 'right'
        ? -distance
        : 0
    )
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, distance, direction]);

  const transform =
    direction === 'left' || direction === 'right'
      ? [{ translateX: translate }]
      : direction === 'up' || direction === 'down'
      ? [{ translateY: translate }]
      : [];

  return (
    <Animated.View style={[style, { opacity, transform }]}>
      {children}
    </Animated.View>
  );
}

/**
 * 2. AnimatedNumber (equivalente exacto al contador de números outExpo de la web)
 */
interface AnimatedNumberProps {
  value: number;
  formatter?: (val: number) => string;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
}

export function AnimatedNumber({
  value,
  formatter = (v) => v.toFixed(2),
  duration = 1200,
  delay = 0,
  style,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = animVal.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v * 100) / 100);
    });

    Animated.timing(animVal, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();

    return () => {
      animVal.removeListener(id);
    };
  }, [value, duration, delay]);

  return <Text style={style}>{formatter(displayValue)}</Text>;
}

/**
 * 3. AnimatedProgressBar (equivalente exacto a la barra animada outExpo de la web)
 */
interface AnimatedProgressBarProps {
  progress: number;
  color: string;
  bgColor?: string;
  height?: number;
  duration?: number;
  delay?: number;
}

export function AnimatedProgressBar({
  progress,
  color,
  bgColor = '#1e293b',
  height = 8,
  duration = 1000,
  delay = 0,
}: AnimatedProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.max(0, Math.min(progress, 100));
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [progress, duration, delay]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        width: '100%',
        height,
        backgroundColor: bgColor,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: widthInterpolated,
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/**
 * 4. AnimatedScalePressable (equivalente al rebote elástico de AnimatedButton y AnimatedCard)
 */
interface AnimatedScalePressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export function AnimatedScalePressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  scaleTo = 0.96,
}: AnimatedScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
