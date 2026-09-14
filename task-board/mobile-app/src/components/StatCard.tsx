import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.iconBox, { backgroundColor: colors.redBg }]}>
          <Text style={[styles.iconText, { color: colors.redLight }]}>{icon}</Text>
        </View>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
  },
  iconBox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 11,
    fontWeight: '800',
  },
  value: {
    fontSize: 23,
    fontWeight: '800',
    marginTop: 8,
  },
});
