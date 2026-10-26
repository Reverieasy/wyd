import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

const ReducedMotionContext = createContext(true);

// One system subscription serves every animation in the app.
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  return <ReducedMotionContext.Provider value={reduced}>{children}</ReducedMotionContext.Provider>;
}

export const useReducedMotion = () => useContext(ReducedMotionContext);
