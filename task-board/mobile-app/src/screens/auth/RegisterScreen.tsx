import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        message = 'Server is taking too long to respond. Please try again in a moment.';
      } else if (error?.message?.includes('Network') || error?.code === 'ERR_NETWORK') {
        message = `Cannot connect to server. Make sure the backend is running on port 4000.\n\nURL: ${require('../../config/env').default.API_BASE_URL}`;
      } else {
        const data = error?.response?.data;
        if (data?.message) {
          message = data.message;
        } else if (data?.details?.fieldErrors) {
          const fieldErrors = data.details.fieldErrors;
          const firstKey = Object.keys(fieldErrors)[0];
          if (firstKey && fieldErrors[firstKey]?.length > 0) {
            message = fieldErrors[firstKey][0];
          }
        } else if (error?.message) {
          message = error.message;
        }
      }
      Alert.alert('Registration Failed', message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>TB</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Get started with Task Board
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderInput, color: colors.textPrimary }]}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15 },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 15 },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkContainer: { alignItems: 'center', marginTop: 24 },
  linkText: { fontSize: 14 },
});
