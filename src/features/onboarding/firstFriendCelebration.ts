import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseFirstUseProgress } from './firstUseProgress';

let writes: Promise<void> = Promise.resolve();
export const firstFriendCelebration = {
  observe(userId: string, hasFriend: boolean): Promise<boolean> {
    const task = writes.catch(() => undefined).then(async () => {
      const key = `wyd.first-friend-celebration.v1:${userId}`;
      const previous = await AsyncStorage.getItem(key);
      if (previous === 'done') return false;
      if (previous === 'waiting') {
        if (!hasFriend) return false;
        await AsyncStorage.setItem(key, 'done');
        return true;
      }
      // Existing connections and previously completed onboarding are not new
      // milestones. Only celebrate the first live transition from zero friends.
      const progress = parseFirstUseProgress(await AsyncStorage.getItem(`wyd.first-use.v1:${userId}`));
      await AsyncStorage.setItem(key, hasFriend || progress.connected ? 'done' : 'waiting');
      return false;
    });
    writes = task.then(() => undefined, () => undefined);
    return task;
  },
};
