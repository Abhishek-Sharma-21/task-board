import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RegisterScreenProps {
  onRegister: (name: string, email: string, pass: string) => Promise<void>;
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegister,
  onNavigateLogin,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (name.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters long');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await onRegister(name.trim(), email.trim(), password);
    } catch (err: any) {
      console.log('[mobile-app] Registration error:', err?.response?.data || err?.message);

      let msg = 'Failed to create account. Please try again.';

      if (err.response?.data?.details?.fieldErrors) {
        const fieldErrors = err.response.data.details.fieldErrors;
        const firstKey = Object.keys(fieldErrors)[0];
        if (firstKey && fieldErrors[firstKey]?.[0]) {
          msg = `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1)}: ${fieldErrors[firstKey][0]}`;
        }
      } else if (err.response?.data?.message) {
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

      <Text style={[styles.heading, { color: colors.text }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Join your team and get work done together.</Text>

      {errorMsg ? (
        <View style={[styles.errorBox, { borderColor: colors.red }]}>
          <Text style={[styles.errorText, { color: colors.red }]}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Name *</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
          ]}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(txt) => {
            setName(txt);
            if (errorMsg) setErrorMsg('');
          }}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSubtle }]}>Email *</Text>
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
          onChangeText={(txt) => {
            setEmail(txt);
            if (errorMsg) setErrorMsg('');
          }}
        />
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Password *</Text>
          <Text style={[styles.hintText, { color: colors.textMuted }]}>min. 8 characters</Text>
        </View>
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
          onChangeText={(txt) => {
            setPassword(txt);
            if (errorMsg) setErrorMsg('');
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.red }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account? </Text>
        <TouchableOpacity onPress={onNavigateLogin}>
          <Text style={[styles.linkText, { color: colors.red }]}>Sign in</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },
  hintText: {
    fontSize: 10,
    marginBottom: 7,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 11,
    padding: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
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
