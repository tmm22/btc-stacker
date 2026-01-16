import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

type Keyring = Record<string, Buffer>;

const CIPHERTEXT_VERSION = "v1";
const LEGACY_KEY_ID = "legacy";

function parseHexKeyOrThrow(value: string, envName: string): Buffer {
  if (value.length !== 64) {
    throw new Error(`${envName} must be a 64-character hex string (32 bytes)`);
  }
  if (!/^[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`${envName} must be a hex string`);
  }
  return Buffer.from(value, "hex");
}

function getKeyring(): { keyring: Keyring; primaryKeyId: string } {
  const keysJson = process.env.ENCRYPTION_KEYS;
  const primaryKeyId = process.env.ENCRYPTION_PRIMARY_KEY_ID;

  if (keysJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(keysJson);
    } catch {
      throw new Error("ENCRYPTION_KEYS must be valid JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("ENCRYPTION_KEYS must be a JSON object map of keyId to 64-char hex");
    }

    const keyring: Keyring = {};
    for (const [keyId, keyHex] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof keyHex !== "string") {
        throw new Error(`ENCRYPTION_KEYS value for ${keyId} must be a string`);
      }
      keyring[keyId] = parseHexKeyOrThrow(keyHex, `ENCRYPTION_KEYS[${keyId}]`);
    }

    const resolvedPrimaryKeyId = primaryKeyId ?? Object.keys(keyring)[0];
    if (!resolvedPrimaryKeyId) {
      throw new Error("ENCRYPTION_KEYS must include at least one key");
    }
    if (!keyring[resolvedPrimaryKeyId]) {
      throw new Error("ENCRYPTION_PRIMARY_KEY_ID not found in ENCRYPTION_KEYS");
    }

    return { keyring, primaryKeyId: resolvedPrimaryKeyId };
  }

  const legacyKey = process.env.ENCRYPTION_KEY;
  if (!legacyKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  const keyring: Keyring = {
    [LEGACY_KEY_ID]: parseHexKeyOrThrow(legacyKey, "ENCRYPTION_KEY"),
  };

  return { keyring, primaryKeyId: LEGACY_KEY_ID };
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

function decryptWithKey(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function encrypt(plaintext: string): string {
  const { keyring, primaryKeyId } = getKeyring();
  const key = keyring[primaryKeyId];
  const legacy = encryptWithKey(plaintext, key);
  return `${CIPHERTEXT_VERSION}:${primaryKeyId}:${legacy}`;
}

export function decrypt(encryptedData: string): string {
  const { keyring } = getKeyring();
  const parts = encryptedData.split(":");

  if (parts.length === 3) {
    const legacyKey = keyring[LEGACY_KEY_ID];
    if (legacyKey) {
      return decryptWithKey(encryptedData, legacyKey);
    }

    for (const key of Object.values(keyring)) {
      try {
        return decryptWithKey(encryptedData, key);
      } catch {
        continue;
      }
    }

    throw new Error("Encryption key not found");
  }

  if (parts.length === 5) {
    const [version, keyId, ivHex, cipherHex, tagHex] = parts;
    if (version !== CIPHERTEXT_VERSION) {
      throw new Error("Unsupported encrypted data version");
    }
    const key = keyring[keyId];
    if (!key) {
      throw new Error("Encryption key not found");
    }
    return decryptWithKey(`${ivHex}:${cipherHex}:${tagHex}`, key);
  }

  throw new Error("Invalid encrypted data format");
}

export function rotateCiphertextIfNeeded(encryptedData: string): {
  plaintext: string;
  rotatedCiphertext?: string;
} {
  const { primaryKeyId } = getKeyring();
  const parts = encryptedData.split(":");

  if (parts.length === 5 && parts[0] === CIPHERTEXT_VERSION && parts[1] === primaryKeyId) {
    return { plaintext: decrypt(encryptedData) };
  }

  const plaintext = decrypt(encryptedData);
  const rotatedCiphertext = encrypt(plaintext);

  if (rotatedCiphertext === encryptedData) {
    return { plaintext };
  }

  return { plaintext, rotatedCiphertext };
}

export function decryptApiKeyHeader(encryptedHeader: string): {
  apiKey: string;
  rotatedCiphertext?: string;
} {
  try {
    const { plaintext, rotatedCiphertext } = rotateCiphertextIfNeeded(encryptedHeader);
    return { apiKey: plaintext, rotatedCiphertext };
  } catch (error) {
    const parts = encryptedHeader.split(":");

    // Back-compat: previously stored as "${encryptedApiKeyId}:${encryptedApiSecret}" where each
    // ciphertext was legacy 3-part "iv:cipher:tag". That yields 6 parts total.
    if (parts.length === 6) {
      const encryptedKeyId = parts.slice(0, 3).join(":");
      const encryptedSecret = parts.slice(3, 6).join(":");
      const keyId = decrypt(encryptedKeyId);
      const secret = decrypt(encryptedSecret);
      const fullApiKey = `${keyId}.${secret}`;
      return { apiKey: fullApiKey, rotatedCiphertext: encrypt(fullApiKey) };
    }

    // Defensive: if two v1 ciphertexts were concatenated (5 + 5 parts).
    if (parts.length === 10) {
      const encryptedKeyId = parts.slice(0, 5).join(":");
      const encryptedSecret = parts.slice(5, 10).join(":");
      const keyId = decrypt(encryptedKeyId);
      const secret = decrypt(encryptedSecret);
      const fullApiKey = `${keyId}.${secret}`;
      return { apiKey: fullApiKey, rotatedCiphertext: encrypt(fullApiKey) };
    }

    throw error;
  }
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
