/**
 * Resample an array of amplitude levels to a target length using bucket averaging.
 *
 * Used at record time to downsample raw metering samples (e.g. thousands)
 * to a fixed storage size, and at playback time to fit stored samples
 * to the number of bars that fit the container width.
 */
export const resampleLevels = (levels: number[], targetCount: number): number[] => {
  if (levels.length === 0 || targetCount <= 0) return [];
  if (levels.length === targetCount) return [...levels];

  const result: number[] = [];
  const bucketSize = levels.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = i * bucketSize;
    const end = start + bucketSize;

    // Average all samples that fall into this bucket
    const startIdx = Math.floor(start);
    const endIdx = Math.min(Math.ceil(end), levels.length);

    let sum = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sum += levels[j];
      count++;
    }
    result.push(count > 0 ? sum / count : 0);
  }

  return result;
};
