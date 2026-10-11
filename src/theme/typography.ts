export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  display32: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 40 },
  title24: { fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 32 },
  title20: { fontFamily: fontFamilies.semiBold, fontSize: 20, lineHeight: 28 },
  body16: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  body14: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20 },
  label14: { fontFamily: fontFamilies.semiBold, fontSize: 14, lineHeight: 20 },
  label12: { fontFamily: fontFamilies.medium, fontSize: 12, lineHeight: 16 },
  caption11: { fontFamily: fontFamilies.medium, fontSize: 11, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;
