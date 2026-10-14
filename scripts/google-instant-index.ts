/**
 * Google Instant Indexing API Automation (TypeScript)
 * Endpoint: https://indexing.googleapis.com/v3/urlNotifications:publish
 */

import crypto from 'crypto';
import fs from 'fs';

export interface GoogleIndexingOptions {
  urls: string[];
  credentialsPath?: string;
  credentialsJson?: string;
  clientEmail?: string;
  privateKey?: string;
  type?: 'URL_UPDATED' | 'URL_DELETED';
}

export interface GoogleIndexingResult {
  url: string;
  status: number;
  ok: boolean;
  response: any;
}

export function createGoogleJwtAssertion(clientEmail: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64url');

  return `${unsigned}.${signature}`;
}

export async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const jwt = createGoogleJwtAssertion(clientEmail, privateKeyPem);
  
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google OAuth2 Token Request failed [${res.status}]: ${errorBody}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function notifyGoogleIndexing(
  url: string,
  accessToken: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<GoogleIndexingResult> {
  const endpoint = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      url,
      type
    })
  });

  const responseText = await res.text();
  let json: any;
  try {
    json = JSON.parse(responseText);
  } catch {
    json = { raw: responseText };
  }

  return {
    url,
    status: res.status,
    ok: res.ok,
    response: json
  };
}

export async function publishToGoogleIndexing(
  options: GoogleIndexingOptions
): Promise<GoogleIndexingResult[]> {
  const {
    urls,
    credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL,
    privateKey = process.env.GOOGLE_PRIVATE_KEY,
    type = 'URL_UPDATED'
  } = options;

  let finalEmail = clientEmail;
  let finalKey = privateKey;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      finalEmail = sa.client_email;
      finalKey = sa.private_key;
    } catch (e: any) {
      console.error('[Google Indexing] Failed to parse credentials file:', e.message);
    }
  } else if (credentialsJson) {
    try {
      const sa = JSON.parse(credentialsJson);
      finalEmail = sa.client_email;
      finalKey = sa.private_key;
    } catch (e: any) {
      console.error('[Google Indexing] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  if (!finalEmail || !finalKey) {
    console.error(
      '[Google Indexing] Missing Google Service Account Credentials!\n' +
      'Please configure GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.'
    );
    return [];
  }

  finalKey = finalKey.replace(/\\n/g, '\n');
  const accessToken = await getGoogleAccessToken(finalEmail, finalKey);

  const results: GoogleIndexingResult[] = [];
  for (const url of urls) {
    const res = await notifyGoogleIndexing(url, accessToken, type);
    results.push(res);
  }

  return results;
}
