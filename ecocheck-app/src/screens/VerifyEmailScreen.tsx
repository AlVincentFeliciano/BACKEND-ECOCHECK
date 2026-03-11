import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import client from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VerifyEmailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params as { email: string };

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await client.post("/auth/verify-email", {
        email,
        code,
      });

      if (res.data.success) {
        // Don't auto-login, redirect to login screen instead
        Alert.alert("Success", "Email verified successfully! Please log in with your credentials.", [
          {
            text: "OK",
            onPress: () => (navigation as any).replace("Login"),
          },
        ]);
      }
    } catch (err: any) {
      console.error("❌ Verification error:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    // TODO: Implement resend verification code endpoint
    Alert.alert("Info", "Resend code feature coming soon");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit verification code to:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit code"
        placeholderTextColor="#555"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        autoFocus
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResendCode} style={styles.resendButton}>
        <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login" as never)}>
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  resendButton: {
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  resendText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
  linkText: {
    marginTop: 15,
    color: "#666",
    textAlign: "center",
    fontSize: 14,
  },
});

export default VerifyEmailScreen;
