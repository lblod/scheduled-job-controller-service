import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

export async function encrypt(data) {
  const cipher = crypto.createCipheriv(algorithm, process.env.SECRET_KEY, process.env.IV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export async function decrypt(data) {
  const decipher = crypto.createDecipheriv(algorithm, process.env.SECRET_KEY, process.env.IV);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}