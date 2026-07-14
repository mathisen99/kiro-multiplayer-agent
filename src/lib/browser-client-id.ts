const CLIENT_ID_KEY = "launch-room:client-id";

type BrowserCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (bytes: Uint8Array) => Uint8Array;
};

function uuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createBrowserClientId(
  browserCrypto: BrowserCrypto | undefined = globalThis.crypto,
): string {
  if (typeof browserCrypto?.randomUUID === "function") {
    try {
      return browserCrypto.randomUUID();
    } catch {
      // Some browsers expose randomUUID but reject it outside a secure context.
    }
  }

  const bytes = new Uint8Array(16);
  if (typeof browserCrypto?.getRandomValues === "function") {
    try {
      browserCrypto.getRandomValues(bytes);
      return uuidFromBytes(bytes);
    } catch {
      // Client IDs are demo identity, not authorization; a non-cryptographic fallback is safe here.
    }
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return uuidFromBytes(bytes);
}

export function getBrowserClientId(): string {
  const stored = localStorage.getItem(CLIENT_ID_KEY);
  if (stored) return stored;

  const clientId = createBrowserClientId();
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}
