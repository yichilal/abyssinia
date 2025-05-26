import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getPasswordStrength,
  getPasswordStrengthLabel,
  passwordRequirements,
} from "../utils/validations";

const PasswordStrengthIndicator = ({ password }) => {
  const strength = getPasswordStrength(password);
  const { label, color } = getPasswordStrengthLabel(strength);

  return (
    <View style={styles.container}>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            { width: `${strength}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.strengthText, { color }]}>{label}</Text>

      <View style={styles.requirementsContainer}>
        {passwordRequirements.map((requirement, index) => (
          <View key={index} style={styles.requirementRow}>
            <View
              style={[
                styles.requirementDot,
                {
                  backgroundColor: requirement.re.test(password)
                    ? color
                    : "#E5E7EB",
                },
              ]}
            />
            <Text style={styles.requirementText}>{requirement.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  requirementsContainer: {
    marginTop: 12,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  requirementText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

export default PasswordStrengthIndicator;
