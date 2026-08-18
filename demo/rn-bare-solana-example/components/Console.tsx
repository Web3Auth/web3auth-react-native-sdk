import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface ConsoleProps {
  output: string;
}

/**
 * Read-only scrollable output box used to display blockchain call results.
 */
export function Console({ output }: ConsoleProps) {
  return (
    <View style={styles.area}>
      <Text style={styles.label}>Console</Text>
      <ScrollView style={styles.scroll}>
        <Text selectable>{output}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  scroll: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 10,
    alignSelf: "stretch",
  },
});
