export const colors = {
  background: {
    app: '#FFFDFC',
    card: '#FFFFFF',
    subtle: '#FAF8F7',
    accent: '#6C2CF5',
    accentSoft: '#F3E9FF',
    loveSoft: '#FFE8EE',
    camera: '#121214',
    cameraPreview: '#2B2B30',
  },
  text: {
    primary: '#241E2C',
    secondary: '#8A828C',
    heading: '#3C236D',
    onAccent: '#FFFFFF',
    onCameraMuted: '#B6B0B2',
  },
  border: {
    default: '#E9E3E7',
    selected: '#6C2CF5',
  },
  brand: {
    ink: '#1C1429',
    muted: '#635775',
    dark: '#17131F',
    light: '#FFF8F1',
  },
} as const;

export const gradients = {
  action: ['#6C2CF5', '#A08B9C'],
  title: ['#5C25E0', '#89797D'],
  soft: ['#F3E9FF', '#EFE5F4'],
} as const;

export const cardShadow = {
  shadowColor: '#1F1429', shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.08, shadowRadius: 18, elevation: 3,
} as const;
