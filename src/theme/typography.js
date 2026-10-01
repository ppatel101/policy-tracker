import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export const typography = {
  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  h2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  subtitle: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  captionBold: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  currencyLarge: {
    fontFamily,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  statValue: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
};
