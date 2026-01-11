import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { encrypt, decrypt, generateEncryptionKey } from "../lib/crypto";

describe("Encryption Utilities", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("encrypt and decrypt", () => {
    test("round-trips simple string", () => {
      const plaintext = "hello world";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test("round-trips API key format", () => {
      const apiKey = "abc123.secretkey456";
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(apiKey);
    });

    test("round-trips special characters", () => {
      const text = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    test("round-trips unicode characters", () => {
      const text = "Bitcoin ₿ 日本語 🚀";
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    test("round-trips empty string", () => {
      const text = "";
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    test("round-trips long string", () => {
      const text = "a".repeat(10000);
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    test("produces different ciphertext for same plaintext", () => {
      const plaintext = "same text";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    test("encrypted format has three parts", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");

      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(32);
      expect(parts[2].length).toBe(32);
    });
  });

  describe("decrypt validation", () => {
    test("throws on invalid format", () => {
      expect(() => decrypt("invalid")).toThrow("Invalid encrypted data format");
    });

    test("throws on tampered ciphertext", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      parts[1] = "00" + parts[1].slice(2);
      const tampered = parts.join(":");

      expect(() => decrypt(tampered)).toThrow();
    });

    test("throws on tampered IV", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      parts[0] = "00" + parts[0].slice(2);
      const tampered = parts.join(":");

      expect(() => decrypt(tampered)).toThrow();
    });

    test("throws on tampered auth tag", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      parts[2] = "00" + parts[2].slice(2);
      const tampered = parts.join(":");

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("generateEncryptionKey", () => {
    test("generates 64-character hex string", () => {
      const key = generateEncryptionKey();

      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    test("generates unique keys", () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe("missing encryption key", () => {
    test("throws when ENCRYPTION_KEY is not set", () => {
      const saved = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY environment variable is not set");

      process.env.ENCRYPTION_KEY = saved;
    });

    test("throws when ENCRYPTION_KEY is wrong length", () => {
      const saved = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = "tooshort";

      expect(() => encrypt("test")).toThrow("64-character hex string");

      process.env.ENCRYPTION_KEY = saved;
    });
  });
});
