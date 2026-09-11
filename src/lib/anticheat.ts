export interface SessionToken {
  sessionId: string;
  startTime: number; // Unix timestamp in milliseconds, signed by the server.
  token: string;
}

export interface ScoreSubmission extends SessionToken {
  name: string;
  score: number;
  wave: number;
}

export type ValidationResult =
  | { valid: true; duration: number; submission: ScoreSubmission }
  | { valid: false; error: string };

const encoder = new TextEncoder();

function hmacKey(secret: string): Promise<CryptoKey> {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("ANTICHEAT_SECRET must contain at least 32 characters");
  }
  return crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false,
    ["sign", "verify"],
  );
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A signed game start needs no database write or server-side session store. */
export async function createSessionToken(secret: string): Promise<SessionToken> {
  const sessionId = hex(crypto.getRandomValues(new Uint8Array(16)));
  const startTime = Date.now();
  const signature = await crypto.subtle.sign(
    "HMAC", await hmacKey(secret), encoder.encode(`${sessionId}:${startTime}`),
  );
  return { sessionId, startTime, token: hex(new Uint8Array(signature)) };
}

/** Validate untrusted JSON. D1's unique session_id enforces replay protection. */
export async function validateSubmission(value: unknown, secret: string): Promise<ValidationResult> {
  const invalid = (error: string): ValidationResult => ({ valid: false, error });
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid("invalid submission");
  }
  const { name, score, wave, sessionId, startTime, token } = value as Record<string, unknown>;
  if (typeof name !== "string") return invalid("invalid name");
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 6) {
    return invalid("name must be 1-6 characters");
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmedName)) return invalid("name must be alphanumeric");
  if (
    typeof score !== "number" || !Number.isSafeInteger(score) || score < 0 ||
    typeof wave !== "number" || !Number.isSafeInteger(wave) || wave < 1
  ) {
    return invalid("invalid score or wave");
  }
  if (
    typeof sessionId !== "string" || !/^[a-f0-9]{32}$/.test(sessionId) ||
    typeof startTime !== "number" || !Number.isSafeInteger(startTime) || startTime < 0 ||
    typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)
  ) {
    return invalid("invalid token");
  }
  const signature = Uint8Array.from({ length: 32 }, (_, i) =>
    Number.parseInt(token.slice(i * 2, i * 2 + 2), 16),
  );
  // Native HMAC verification avoids comparing secret-derived strings in JS.
  const verified = await crypto.subtle.verify(
    "HMAC", await hmacKey(secret), signature, encoder.encode(`${sessionId}:${startTime}`),
  );
  if (!verified) return invalid("invalid token");

  const duration = (Date.now() - startTime) / 1000;
  if (duration < 2) return invalid("game too short");
  // Equivalent to summing 30 * (5 + 3*w) per wave, plus the existing 50% buffer.
  // Closed form keeps work constant even for an attacker-supplied large wave.
  const maxScore = Math.floor(45 * (5 * wave + 3 * wave * (wave + 1) / 2));
  if (score > maxScore) return invalid("score too high for wave");
  if (score > duration * 200) return invalid("score rate too high");
  return {
    valid: true,
    duration,
    submission: { name: trimmedName.toUpperCase(), score, wave, sessionId, startTime, token },
  };
}
