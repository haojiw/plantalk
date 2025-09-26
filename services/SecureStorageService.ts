import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

interface SecureStorageOptions {
  keychainService?: string;
  encrypt?: boolean;
}

class SecureStorageService {
  private static readonly ENCRYPTION_KEY = 'PLANTALK_ENCRYPTION_KEY';
  private static readonly DEFAULT_KEYCHAIN_SERVICE = 'plantalk-secure-storage';
  
  // Initialize encryption key (stored securely in keychain)
  async initializeEncryption(): Promise<void> {
    try {
      let encryptionKey = await SecureStore.getItemAsync(SecureStorageService.ENCRYPTION_KEY);
      
      if (!encryptionKey) {
        // Generate a new encryption key if one doesn't exist
        encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await SecureStore.setItemAsync(SecureStorageService.ENCRYPTION_KEY, encryptionKey);
        console.log('[SecureStorage] Generated new encryption key');
      } else {
        console.log('[SecureStorage] Using existing encryption key');
      }
    } catch (error) {
      console.error('[SecureStorage] Failed to initialize encryption:', error);
      throw new Error('Failed to initialize secure storage encryption');
    }
  }

  // Encrypt data using AES encryption
  private async encrypt(data: string): Promise<string> {
    try {
      const encryptionKey = await SecureStore.getItemAsync(SecureStorageService.ENCRYPTION_KEY);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }
      
      const encrypted = CryptoJS.AES.encrypt(data, encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('[SecureStorage] Encryption failed:', error);
      throw error;
    }
  }

  // Decrypt data using AES decryption
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const encryptionKey = await SecureStore.getItemAsync(SecureStorageService.ENCRYPTION_KEY);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('[SecureStorage] Decryption failed:', error);
      throw error;
    }
  }

  // Store sensitive data securely in keychain (small data like API keys, user preferences)
  async setSecureItem(key: string, value: string, options?: SecureStorageOptions): Promise<void> {
    try {
      const keychainService = options?.keychainService || SecureStorageService.DEFAULT_KEYCHAIN_SERVICE;
      
      if (options?.encrypt !== false) {
        value = await this.encrypt(value);
      }
      
      await SecureStore.setItemAsync(key, value, { keychainService });
      console.log(`[SecureStorage] Stored secure item: ${key}`);
    } catch (error) {
      console.error(`[SecureStorage] Failed to store secure item ${key}:`, error);
      throw error;
    }
  }

  // Retrieve sensitive data from keychain
  async getSecureItem(key: string, options?: SecureStorageOptions): Promise<string | null> {
    try {
      const keychainService = options?.keychainService || SecureStorageService.DEFAULT_KEYCHAIN_SERVICE;
      const value = await SecureStore.getItemAsync(key, { keychainService });
      
      if (!value) {
        return null;
      }
      
      if (options?.encrypt !== false) {
        return await this.decrypt(value);
      }
      
      return value;
    } catch (error) {
      console.error(`[SecureStorage] Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  // Remove sensitive data from keychain
  async removeSecureItem(key: string, options?: SecureStorageOptions): Promise<void> {
    try {
      const keychainService = options?.keychainService || SecureStorageService.DEFAULT_KEYCHAIN_SERVICE;
      await SecureStore.deleteItemAsync(key, { keychainService });
      console.log(`[SecureStorage] Removed secure item: ${key}`);
    } catch (error) {
      console.error(`[SecureStorage] Failed to remove secure item ${key}:`, error);
      throw error;
    }
  }

  // Store encrypted file (for larger data like journal entries)
  async setSecureFile(filePath: string, data: string): Promise<void> {
    try {
      const encryptedData = await this.encrypt(data);
      await FileSystem.writeAsStringAsync(filePath, encryptedData);
      console.log(`[SecureStorage] Stored encrypted file: ${filePath}`);
    } catch (error) {
      console.error(`[SecureStorage] Failed to store encrypted file ${filePath}:`, error);
      throw error;
    }
  }

  // Retrieve and decrypt file
  async getSecureFile(filePath: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return null;
      }
      
      const encryptedData = await FileSystem.readAsStringAsync(filePath);
      const decryptedData = await this.decrypt(encryptedData);
      console.log(`[SecureStorage] Retrieved encrypted file: ${filePath}`);
      return decryptedData;
    } catch (error) {
      console.error(`[SecureStorage] Failed to retrieve encrypted file ${filePath}:`, error);
      return null;
    }
  }

  // Create secure directory structure
  async createSecureDirectory(path: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
        console.log(`[SecureStorage] Created secure directory: ${path}`);
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to create secure directory ${path}:`, error);
      throw error;
    }
  }

  // Securely delete file (overwrite before deletion for security)
  async secureDeleteFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return;
      }

      // Overwrite with random data before deletion for security
      const randomData = CryptoJS.lib.WordArray.random(1024).toString();
      await FileSystem.writeAsStringAsync(filePath, randomData);
      
      // Delete the file
      await FileSystem.deleteAsync(filePath);
      console.log(`[SecureStorage] Securely deleted file: ${filePath}`);
    } catch (error) {
      console.error(`[SecureStorage] Failed to securely delete file ${filePath}:`, error);
      throw error;
    }
  }

  // Check if secure storage is available
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch (error) {
      console.error('[SecureStorage] Availability check failed:', error);
      return false;
    }
  }

  // Export encrypted backup of all secure data
  async createSecureBackup(backupPath: string, data: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        version: '1.0.0',
        timestamp,
        encrypted: true,
        data
      };
      
      await this.setSecureFile(backupPath, JSON.stringify(backupData));
      console.log(`[SecureStorage] Created secure backup: ${backupPath}`);
    } catch (error) {
      console.error(`[SecureStorage] Failed to create secure backup:`, error);
      throw error;
    }
  }

  // Restore from encrypted backup
  async restoreFromSecureBackup(backupPath: string): Promise<any> {
    try {
      const backupContent = await this.getSecureFile(backupPath);
      if (!backupContent) {
        throw new Error('Backup file not found or corrupted');
      }
      
      const backupData = JSON.parse(backupContent);
      
      if (!backupData.encrypted || backupData.version !== '1.0.0') {
        throw new Error('Invalid backup format');
      }
      
      console.log(`[SecureStorage] Restored from secure backup: ${backupPath}`);
      return backupData.data;
    } catch (error) {
      console.error(`[SecureStorage] Failed to restore from secure backup:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const secureStorageService = new SecureStorageService();
