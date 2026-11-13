/**
 * Implementación nativa de Web Push (RFC 8291 / RFC 8292) para Cloudflare Workers
 * Utiliza WebCrypto estándar sin dependencias pesadas de Node.js.
 */

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
  timezone?: string;
  created?: string;
}

export interface VapidKeys {
  publicKey: string;  // Base64URL
  privateKey: string; // Base64URL
  subject: string;    // mailto:contacto@ejemplo.com
}

// Convertir base64url a Uint8Array
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convertir Uint8Array a base64url
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Crea la cabecera de autorización VAPID (JWT firmado con ES256)
 */
export async function createVapidHeader(
  audience: string,
  subject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = {
    alg: 'ES256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 horas
    sub: subject
  };

  const enc = new TextEncoder();
  const encodedHeader = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Importar clave privada ECDSA P-256 en formato PKCS8 / JWK
  // Si la clave viene en formato Base64URL de raw scalar 'd'
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: vapidPrivateKey,
    // La clave pública se puede derivar o pasar si está disponible
    x: vapidPublicKey.length > 40 ? vapidPublicKey.slice(0, 43) : undefined,
    ext: true
  };

  // Importar clave con WebCrypto
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } catch {
    // Si falla por formato JWK de d suelto, importar via raw/pkcs8 si aplica
    throw new Error('Formato de clave VAPID privada no compatible con JWK');
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    enc.encode(signingInput)
  );

  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
  const jwt = `${signingInput}.${encodedSignature}`;

  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

/**
 * Cifra la carga útil según RFC 8291 (aes128gcm) y envía la petición Web Push
 */
export async function sendWebPush(
  subscription: PushSubscriptionData,
  payload: string | object,
  vapid: VapidKeys
): Promise<Response> {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const vapidHeader = await createVapidHeader(
    audience,
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey
  );

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payloadString);

  // Generar par de claves efímero local para ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Importar clave pública del receptor (p256dh)
  const clientPublicKeyBytes = base64UrlToUint8Array(subscription.keys.p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // Derivar secreto compartido ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Clave de autenticación del receptor
  const authSecret = base64UrlToUint8Array(subscription.keys.auth);

  // Exportar clave pública local en formato raw
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  // Generar Salt criptográfico aleatorio de 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derivación HKDF para aes128gcm (RFC 8291)
  // IKM = HKDF-Extract(authSecret, sharedSecret)
  const authHkdfKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Contexto info para IKM: "WebPush: info" || 0x00 || clientKey || localKey
  const encInfoPrefix = enc.encode('WebPush: info\0');
  const infoIkm = new Uint8Array(encInfoPrefix.length + clientPublicKeyBytes.length + localPublicKeyRaw.length);
  infoIkm.set(encInfoPrefix, 0);
  infoIkm.set(clientPublicKeyBytes, encInfoPrefix.length);
  infoIkm.set(localPublicKeyRaw, encInfoPrefix.length + clientPublicKeyBytes.length);

  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(sharedSecret),
      info: infoIkm
    },
    authHkdfKey,
    256
  );

  // Derivar Content Encryption Key (CEK) y Nonce a partir del Salt
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = enc.encode('Content-Encoding: nonce\0');

  const cek = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: cekInfo
    },
    ikmKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: nonceInfo
    },
    ikmKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Padding de 2 bytes (0x02 para delimitador de registro de bloque final RFC 8291)
  const record = new Uint8Array(payloadBytes.length + 2);
  record.set(payloadBytes, 0);
  record[payloadBytes.length] = 2; // Delimitador estándar
  record[payloadBytes.length + 1] = 0;

  // Cifrar con AES-GCM
  const encryptedRecord = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cek,
    record
  );

  // Formato del cuerpo RFC 8291 (aes128gcm):
  // salt (16 bytes) + record_size (4 bytes, e.g. 4096 = 0x00001000) + idlen (1 byte = 65) + localPublicKey (65 bytes) + encryptedData
  const recordSize = 4096;
  const headerLen = 16 + 4 + 1 + localPublicKeyRaw.length;
  const body = new Uint8Array(headerLen + encryptedRecord.byteLength);

  body.set(salt, 0);
  const view = new DataView(body.buffer);
  view.setUint32(16, recordSize, false);
  body[20] = localPublicKeyRaw.length;
  body.set(localPublicKeyRaw, 21);
  body.set(new Uint8Array(encryptedRecord), headerLen);

  // Realizar el envío HTTP al endpoint de push
  return await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high'
    },
    body: body
  });
}
