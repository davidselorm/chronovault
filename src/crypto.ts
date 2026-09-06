import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export class VaultCrypto {
  private key: Buffer;
  private hmacKey: Buffer;

  constructor(secretKey?: string, hmacSecret?: string) {
    if (secretKey) {
      this.key = Buffer.alloc(32, secretKey, 'utf-8');
    } else {
      this.key = randomBytes(32);
    }

    if (hmacSecret) {
      this.hmacKey = Buffer.from(hmacSecret, 'utf-8');
    } else {
      this.hmacKey = randomBytes(32);
    }
  }

  public encrypt(data: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag
    };
  }

  public decrypt(ciphertext: string, ivHex: string, authTagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public computeHmac(payload: string, prevHmac: string = ''): string {
    const hmac = createHmac('sha256', this.hmacKey);
    hmac.update(`${prevHmac}:${payload}`);
    return hmac.digest('hex');
  }
}
