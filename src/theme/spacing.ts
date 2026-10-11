export const spacing = {
  2: 2,
  4: 4,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
} as const;

export const layout = {
  screenWidth: 390,
  screenHeight: 844,
  screenPadding: spacing[24],
  contentWidth: 342,
  bottomNavigationHeight: 72,
} as const;
