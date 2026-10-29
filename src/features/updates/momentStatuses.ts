import type { UpdateStatus } from '@/src/models';

export const compositionStatuses = ['studying', 'working', 'eating', 'home', 'outside', 'gym', 'chilling', 'bedtime'] as const;
export const statusDetails: Record<UpdateStatus, { label: string; symbol: string }> = {
  studying: { label: 'Studying', symbol: '📚' },
  working: { label: 'Working', symbol: '💻' },
  eating: { label: 'Eating', symbol: '🍜' },
  home: { label: 'Home', symbol: '🏠' },
  outside: { label: 'Outside', symbol: '🌿' },
  gym: { label: 'Gym', symbol: '💪' },
  chilling: { label: 'Chilling', symbol: '☕' },
  bedtime: { label: 'Bedtime', symbol: '🌙' },
  // Retain labels for older saved drafts/statuses without adding extra choices.
  school: { label: 'School', symbol: '🎓' },
  morning: { label: 'Good morning', symbol: '☀️' },
};
