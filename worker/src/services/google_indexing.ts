import { Env } from '../types';

/**
 * Converts a PEM encoded RSA private key to a binary ArrayBuffer (PKCS#8).
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleanPem = pem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(cleanPem);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Base64URL encoder
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates an OAuth2 access token for Google APIs using Web Crypto RS256 signing.
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
    const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

    // Import PKCS#8 RSA private key
    const binaryKey = pemToArrayBuffer(privateKeyPem);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign using RS256
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      privateKey,
      new TextEncoder().encode(unsignedToken)
    );

    const binarySig = String.fromCharCode(...new Uint8Array(signature));
    const encodedSig = base64UrlEncode(binarySig);
    const jwt = `${unsignedToken}.${encodedSig}`;

    // Exchange JWT for OAuth2 Bearer Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenRes.ok) {
      console.error('Google OAuth token request failed:', await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json<{ access_token: string }>();
    return tokenData.access_token;
  } catch (err: any) {
    console.error('Error creating Google OAuth token:', err);
    return null;
  }
}

/**
 * Triggers Google Indexing API ping upon every successful D1 database write.
 */
export async function publishToGoogleIndexing(
  env: Env & { GOOGLE_CLIENT_EMAIL?: string; GOOGLE_PRIVATE_KEY?: string },
  urls: string[],
  drawId: string
): Promise<void> {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    console.log('Google Service Account not configured. Skipping Google Indexing API ping.');
    return;
  }

  const accessToken = await getGoogleAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY);
  if (!accessToken) return;

  for (const targetUrl of urls) {
    try {
      const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          url: targetUrl,
          type: 'URL_UPDATED'
        })
      });

      const isSuccess = res.status === 200;
      const resText = await res.text();

      await env.DB.prepare(`
        INSERT INTO indexing_logs (draw_id, service, status, response_payload)
        VALUES (?, 'GOOGLE_INDEXING', ?, ?)
      `).bind(
        drawId,
        isSuccess ? 'SUCCESS' : 'FAILED',
        `HTTP ${res.status}: ${resText.slice(0, 200)}`
      ).run();

      console.log(`[Google Indexing API] Pinged ${targetUrl} -> Status: ${res.status}`);
    } catch (e: any) {
      console.error(`Google Indexing error for ${targetUrl}:`, e);
    }
  }
}
