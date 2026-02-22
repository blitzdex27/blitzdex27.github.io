const DEFAULT_ITERATIONS = 210000;

const defaultAuthConfig = {
  version: 1,
  algorithm: "PBKDF2-SHA-256",
  iterations: DEFAULT_ITERATIONS,
  salt: "dWWOwkzTzK7xy4qRGMtuZA==",
  hash: "ogVCxEIXPj/WRzw3I5ei3++txnCZW/eJomTEmQp9gc4=",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function arrayToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToArray(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function isValidAuthConfig(config) {
  return Boolean(
    config &&
      typeof config.version === "number" &&
      typeof config.algorithm === "string" &&
      typeof config.iterations === "number" &&
      typeof config.salt === "string" &&
      typeof config.hash === "string"
  );
}

async function deriveHash(password, saltBase64, iterations) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToArray(saltBase64),
      iterations,
    },
    keyMaterial,
    256
  );

  return arrayToBase64(new Uint8Array(bits));
}

function constantTimeEqual(leftBase64, rightBase64) {
  const left = base64ToArray(leftBase64);
  const right = base64ToArray(rightBase64);

  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

export async function loadAdminAuth() {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/admin-auth.json`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Could not load admin-auth.json");
    }

    const data = await response.json();
    if (!isValidAuthConfig(data)) {
      throw new Error("Invalid auth configuration");
    }

    return data;
  } catch (_error) {
    return clone(defaultAuthConfig);
  }
}

export async function verifyPassword(password, authConfig) {
  if (!password || !isValidAuthConfig(authConfig)) {
    return false;
  }

  const hash = await deriveHash(
    password,
    authConfig.salt,
    authConfig.iterations || DEFAULT_ITERATIONS
  );
  return constantTimeEqual(hash, authConfig.hash);
}

export async function createAuthConfig(
  password,
  iterations = DEFAULT_ITERATIONS
) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const saltBase64 = arrayToBase64(salt);
  const hash = await deriveHash(password, saltBase64, iterations);

  return {
    version: 1,
    algorithm: "PBKDF2-SHA-256",
    iterations,
    salt: saltBase64,
    hash,
  };
}
