import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  button: {
    width: "16%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B9D8CA",
    alignItems: "center",
    justifyContent: "center",
    margin: "1%",
  },
  buttonPressed: {
    backgroundColor: "#D7F0E5",
    borderColor: "#16856A",
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 28,
    fontWeight: "700",
    color: "#173B35",
    fontVariant: ["tabular-nums"],
  },
});
