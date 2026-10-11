import { useEffect, useState } from 'react';

export function useResendCooldown(availableAt: number | null) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!availableAt || availableAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [availableAt]);

  return availableAt ? Math.max(0, Math.ceil((availableAt - now) / 1_000)) : 0;
}
