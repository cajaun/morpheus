import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  BaseAnimationBuilder,
} from 'react-native-reanimated';

export type TextMorphProps = {
  children: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  entering?: BaseAnimationBuilder | typeof BaseAnimationBuilder;
  exiting?: BaseAnimationBuilder | typeof BaseAnimationBuilder;
};

const DEFAULT_SPRING = {
  stiffness: 280,
  damping: 18,
  mass: 0.3,
} as const;

export function TextMorph({
  children,
  style,
  textStyle,
  entering,
  exiting,
}: TextMorphProps) {
  // Stable unique prefix per component instance (mirrors useId())
  const uniqueId = useRef(
    `tm-${Math.random().toString(36).slice(2)}`
  ).current;

  const characters = useMemo(() => {
    const charCounts: Record<string, number> = {};
    return children.split('').map((char) => {
      const lowerChar = char.toLowerCase();
      charCounts[lowerChar] = (charCounts[lowerChar] || 0) + 1;
      return {
        id: `${uniqueId}-${lowerChar}${charCounts[lowerChar]}`,
        // Preserve spaces as non-breaking so they occupy layout space
        label: char === ' ' ? '\u00A0' : char,
      };
    });
  }, [children, uniqueId]);

  const defaultEntering = FadeIn.springify()
    .stiffness(DEFAULT_SPRING.stiffness)
    .damping(DEFAULT_SPRING.damping)
    .mass(DEFAULT_SPRING.mass);

  const defaultExiting = FadeOut.springify()
    .stiffness(DEFAULT_SPRING.stiffness)
    .damping(DEFAULT_SPRING.damping)
    .mass(DEFAULT_SPRING.mass);

  // Mirrors AnimatePresence mode="popLayout" — each character slides to its
  // new position as siblings are added/removed
  const layoutTransition = LinearTransition.springify()
    .stiffness(DEFAULT_SPRING.stiffness)
    .damping(DEFAULT_SPRING.damping)
    .mass(DEFAULT_SPRING.mass);

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={children}   // mirrors aria-label={children}
    >
      {characters.map((character) => (
        <Animated.Text
          key={character.id}
          entering={entering ?? defaultEntering}  // mirrors initial → animate
          exiting={exiting ?? defaultExiting}      // mirrors exit
          layout={layoutTransition}                // mirrors layoutId (positional morph)
          style={textStyle}
          importantForAccessibility="no"           // mirrors aria-hidden="true"
        >
          {character.label}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',   // mirrors display: inline-block on each span
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
});