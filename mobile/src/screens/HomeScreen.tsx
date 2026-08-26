import React, { useCallback, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, Text, View } from "react-native";
import { NumberButton } from "../components/NumberButton";
import { sendButtonEvent } from "../api/client";
import { styles } from "./HomeScreen.styles";
import type { LogEntry } from "../types";

const DIGITS = Array.from({ length: 10 }, (_, i) => i);
const MAX_LOG = 6;

export default function HomeScreen() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const handlePress = useCallback(async (value: number) => {
    const id = `${value}-${Date.now()}`;
    const time = new Date().toLocaleTimeString();
    const newEntry: LogEntry = { id, value, status: "sending", time };

    setLog((prev) => [newEntry, ...prev].slice(0, MAX_LOG));
    setPendingCount((c) => c + 1);

    const result = await sendButtonEvent(value);

    setLog((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, status: result.ok ? "sent" : "failed" } : entry
      )
    );
    setPendingCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F8F4" />
      <View style={styles.header}>
        <Text style={styles.title}>PulseSync</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Tap a number to log an event</Text>
          {pendingCount > 0 && <ActivityIndicator size="small" color={styles.spinner.color} />}
        </View>
      </View>

      <View style={styles.grid}>
        {DIGITS.map((digit) => (
          <NumberButton key={digit} value={digit} onPress={handlePress} />
        ))}
      </View>

      <View style={styles.logPanel}>
        <Text style={styles.logTitle}>RECENT</Text>
        {log.length === 0 ? (
          <Text style={styles.logEmpty}>No presses yet this session.</Text>
        ) : (
          log.map((entry) => (
            <View key={entry.id} style={styles.logRow}>
              <Text style={styles.logValue}>{entry.value}</Text>
              <Text style={styles.logTime}>{entry.time}</Text>
              <Text
                style={[
                  styles.logStatus,
                  entry.status === "sent" && styles.statusSent,
                  entry.status === "failed" && styles.statusFailed,
                ]}
              >
                {entry.status}
              </Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}
