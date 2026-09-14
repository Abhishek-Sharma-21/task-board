import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AvatarProps {
  letter: string;
  size?: 'small' | 'normal' | 'large';
  bg?: string;
  isRed?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  letter,
  size = 'normal',
  bg,
  isRed = false,
}) => {
  const { colors } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 24, height: 24, fontSize: 9, borderRadius: 12 };
      case 'large':
        return { width: 76, height: 76, fontSize: 29, borderRadius: 38 };
      default:
        return { width: 32, height: 32, fontSize: 11, borderRadius: 16 };
    }
  };

  const dim = getDimensions();
  const backgroundColor = isRed
    ? colors.red
    : bg || colors.surface3;
  const borderColor = isRed ? colors.redLight : colors.border;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dim.width,
          height: dim.height,
          borderRadius: dim.borderRadius,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: dim.fontSize, color: isRed || bg ? '#ffffff' : colors.text }]}>
        {letter.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '800',
  },
});
