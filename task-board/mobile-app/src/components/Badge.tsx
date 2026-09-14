import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BadgeProps {
  label: string;
  type?: 'red' | 'yellow' | 'green' | 'blue' | 'muted';
}

export const Badge: React.FC<BadgeProps> = ({ label, type = 'red' }) => {
  const { colors } = useTheme();

  const getStyle = () => {
    switch (type) {
      case 'yellow':
        return { color: colors.yellowLight, bg: colors.yellowBg };
      case 'green':
        return { color: colors.greenLight, bg: colors.greenBg };
      case 'blue':
        return { color: colors.blueLight, bg: colors.blueBg };
      case 'muted':
        return { color: colors.textMuted, bg: colors.surface3 };
      default:
        return { color: colors.redLight, bg: colors.redBg };
    }
  };

  const styleConfig = getStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg }]}>
      <Text style={[styles.text, { color: styleConfig.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
  },
});
