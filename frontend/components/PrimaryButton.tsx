import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface Props {
    title: string;
    onPress: () => void;
    disabled?: boolean;
}

export const PrimaryButton = ({ title, onPress, disabled = false }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
