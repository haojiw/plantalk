import * as FileSystem from 'expo-file-system/legacy';

/**
 * Audio Path Utility
 * 
 * Handles conversion between relative and absolute audio paths.
 * This ensures audio files survive iOS app updates where the container UUID changes.
 * 
 * Storage Strategy:
 * - Store RELATIVE paths in database: "audio/audio_123.m4a"
 * - Convert to ABSOLUTE paths at runtime: "file:///.../Documents/audio/audio_123.m4a"
 */

/**
 * Convert a relative or absolute audio path to an absolute path.
 * 
 * @param relativeOrAbsolutePath - The audio URI from the database (can be relative or absolute)
 * @returns Absolute file path, or undefined if input is undefined
 * 
 * @example
 * // Relative path (new style)
 * getAbsoluteAudioPath("audio/audio_123.m4a")
 * // Returns: "file:///var/mobile/.../Documents/audio/audio_123.m4a"
 * 
 * @example
 * // Absolute path (old style - backward compatible)
 * getAbsoluteAudioPath("file:///old/path/audio/audio_123.m4a")
 * // Returns: "file:///old/path/audio/audio_123.m4a" (unchanged)
 */
export const getAbsoluteAudioPath = (relativeOrAbsolutePath: string | undefined): string | undefined => {
  if (!relativeOrAbsolutePath) return undefined;
  
  // If already absolute (starts with file:// or /), return as-is
  // This handles backward compatibility during migration
  if (relativeOrAbsolutePath.startsWith('file://') || 
      relativeOrAbsolutePath.startsWith('/')) {
    return relativeOrAbsolutePath;
  }
  
  // Convert relative to absolute using current container path
  return `${FileSystem.documentDirectory}${relativeOrAbsolutePath}`;
};

/**
 * Convert an absolute audio path to a relative path.
 * 
 * @param absolutePath - The absolute file path
 * @returns Relative path (e.g., "audio/audio_123.m4a"), or original if already relative
 * 
 * @example
 * getRelativeAudioPath("file:///var/mobile/.../Documents/audio/audio_123.m4a")
 * // Returns: "audio/audio_123.m4a"
 */
export const getRelativeAudioPath = (absolutePath: string | undefined): string | undefined => {
  if (!absolutePath) return undefined;
  
  // If already relative (doesn't start with file:// or /), return as-is
  if (!absolutePath.startsWith('file://') && !absolutePath.startsWith('/')) {
    return absolutePath;
  }
  
  // Extract relative path by removing the document directory prefix
  const docDir = FileSystem.documentDirectory;
  if (docDir && absolutePath.startsWith(docDir)) {
    return absolutePath.substring(docDir.length);
  }
  
  // If path doesn't start with document directory, try to extract just the filename portion
  // This handles edge cases with different path formats
  const audioMatch = absolutePath.match(/audio\/[^/]+$/);
  return audioMatch ? audioMatch[0] : absolutePath;
};

/**
 * Check if a path is relative (not absolute).
 */
export const isRelativePath = (path: string | undefined): boolean => {
  if (!path) return false;
  return !path.startsWith('file://') && !path.startsWith('/');
};

/**
 * Get the relative audio directory path.
 */
export const AUDIO_DIR_RELATIVE = 'audio/';

/**
 * Get the absolute audio directory path.
 */
export const getAudioDirectory = (): string => {
  return `${FileSystem.documentDirectory}${AUDIO_DIR_RELATIVE}`;
};

