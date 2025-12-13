import crypto from 'crypto';

// Ensure key is always 32 bytes
const KEY_STRING = process.env.ENCRYPTION_KEY || 'temporary-key-for-development-use';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(KEY_STRING).digest(); // Always 32 bytes
const ALGORITHM = 'aes-256-cbc';

export function encryptSSN(ssn: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(ssn, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptSSN(encryptedSSN: string): string {
  const parts = encryptedSSN.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function maskSSN(ssn: string): string {
  const decrypted = ssn.includes(':') ? decryptSSN(ssn) : ssn;
  return `***-**-${decrypted.slice(-4)}`;
}