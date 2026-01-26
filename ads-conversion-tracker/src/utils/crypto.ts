import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-min-32-characters-long-key';

// Ensure key is 32 bytes for AES-256
const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

export function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex');
}

export function encryptPhone(phone: string): string {
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(phone, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

export function decryptPhone(encrypted: string): string {
  try {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '');
}
