import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onNavigateRegister,
}) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err: any) {
      console.log('[mobile-app] Login error:', err?.response?.data || err?.message);

      let msg = 'Invalid email or password';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message && err.message.includes('Network Error')) {
        msg = 'Unable to connect to server. Please check backend connection.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your workspace administrator to reset your password or sign in via the web application.'
    );
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In',
      'Google Sign-In is configured on the web application. On mobile, please use your email and password to log in.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.brandRow}>
        <View style={[styles.brandIcon, { backgroundColor: colors.red }]}>
          <Text style={styles.brandIconText}>✓</Text>
        </View>
        <Text style={[styles.brandTitle, { color: colors.text }]}>
          Task<Text style={{ color: colors.red }}>Board</Text>
        </Text>
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>Welcome Back</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to continue to your workspace.</Text>

      {errorMsg ? (
        <View style={[styles.errorBox, { borderColor: colors.red }]}>
          <Text style={[styles.errorText, { color: colors.red }]}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
          ]}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Password</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
          ]}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.forgotLink} onPress={handleForgotPassword}>
        <Text style={[styles.forgotText, { color: colors.red }]}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.red }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        activeOpacity={0.8}
        onPress={handleGoogleSignIn}
      >
        <Text style={[styles.googleBtnText, { color: colors.text }]}>🌈   Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Don't have an account? </Text>
        <TouchableOpacity onPress={onNavigateRegister}>
          <Text style={[styles.linkText, { color: colors.red }]}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 35,
  },
  brandIcon: {
    width: 33,
    height: 33,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    padding: 10,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 11,
    padding: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    paddingHorizontal: 9,
  },
  googleBtn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 11,
    padding: 12,
    alignItems: 'center',
  },
  googleBtnText: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 11,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
