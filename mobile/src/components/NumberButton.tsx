import React from "react";
import { Pressable, Text } from "react-native";
import { styles } from "./NumberButton.styles";
import type { NumberButtonProps } from "../types";

export function NumberButton({ value, disabled, onPress }: NumberButtonProps) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Send button ${value}`}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.label}>{value}</Text>
    </Pressable>
  );
}
