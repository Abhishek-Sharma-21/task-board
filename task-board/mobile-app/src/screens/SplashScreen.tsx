import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.centerContent}>
        <View
          style={[
            styles.logo,
            {
              backgroundColor: colors.red,
              shadowColor: colors.red,
            },
          ]}
        >
          <Text style={styles.logoIcon}>✓</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Task<Text style={{ color: colors.red }}>Board</Text>
        </Text>

        <Text style={[styles.tagline, { color: colors.textMuted }]}>Plan. Collaborate. Complete.</Text>

        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your workspace...</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Build better. Together.</Text>
        <Text style={[styles.version, { color: colors.textSubtle }]}>Version 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  logoIcon: {
    color: '#ffffff',
    fontSize: 49,
    fontWeight: '900',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 24,
  },
  tagline: {
    fontSize: 12,
    marginTop: 8,
  },
  loaderBox: {
    marginTop: 35,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  version: {
    fontSize: 10,
    marginTop: 4,
  },
});
