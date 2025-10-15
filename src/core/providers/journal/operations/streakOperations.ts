import { databaseService } from '@/core/services/storage';

/**
 * Reset the current streak to 0
 */
export const resetStreak = async (): Promise<void> => {
  try {
    await databaseService.updateAppState({ streak: 0 });
  } catch (error) {
    console.error('[streakOperations] Failed to reset streak:', error);
  }
};

