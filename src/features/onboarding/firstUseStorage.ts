import AsyncStorage from '@react-native-async-storage/async-storage';
import { advanceFirstUseProgress, parseFirstUseProgress, type FirstUseProgress } from './firstUseProgress';

const key = (userId: string) => `wyd.first-use.v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
export const firstUseStorage = {
  async record(userId: string, observed: Partial<FirstUseProgress>): Promise<FirstUseProgress> {
    const task = writes.catch(() => undefined).then(async () => {
      const raw = await AsyncStorage.getItem(key(userId));
      const previous = parseFirstUseProgress(raw);
      const next = advanceFirstUseProgress(previous, observed);
      if (JSON.stringify(previous) !== JSON.stringify(next)) await AsyncStorage.setItem(key(userId), JSON.stringify(next));
      return next;
    });
    writes = task.then(() => undefined, () => undefined);
    return task;
  },
};
