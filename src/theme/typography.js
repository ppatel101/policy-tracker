import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export const typography = {
  h1: {
    fontFamily,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  h2: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  h3: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  subtitle: {
    fontFamily,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  body: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  bodyBold: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  caption: {
    fontFamily,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  captionBold: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  currencyLarge: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  statValue: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
};
