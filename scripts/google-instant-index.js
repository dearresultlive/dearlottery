#!/usr/bin/env node

/**
 * Google Instant Indexing API Automation
 * Endpoint: https://indexing.googleapis.com/v3/urlNotifications:publish
 * Scope: https://www.googleapis.com/auth/indexing
 * 
 * Automatically signs RS256 OAuth2 JWT assertions using native Node.js crypto
 * and pings Google Indexing API whenever new Dear Lottery draws are published.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates an RS256 signed JWT for Google OAuth2
 */
export function createGoogleJwtAssertion(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64url');

  return `${unsigned}.${signature}`;
}

/**
 * Exchanges signed JWT assertion for an ephemeral Google Bearer access token
 */
export async function getGoogleAccessToken(clientEmail, privateKeyPem) {
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

  const data = await res.json();
  return data.access_token;
}

/**
 * Submits a single URL notification to Google Indexing API
 */
export async function notifyGoogleIndexing(url, accessToken, type = 'URL_UPDATED') {
  const endpoint = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      url: url,
      type: type
    })
  });

  const responseText = await res.text();
  let json;
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

/**
 * Core Hook / Helper function: publishToGoogleIndexing
 */
export async function publishToGoogleIndexing(options = {}) {
  const {
    urls = [],
    credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL,
    privateKey = process.env.GOOGLE_PRIVATE_KEY,
    type = 'URL_UPDATED'
  } = options;

  if (!urls || urls.length === 0) {
    console.warn('[Google Indexing] No URLs provided to ping.');
    return [];
  }

  let finalEmail = clientEmail;
  let finalKey = privateKey;

  const localDefaultPath = path.join(__dirname, '..', 'google-credentials.json');
  const targetCredPath = credentialsPath || (fs.existsSync(localDefaultPath) ? localDefaultPath : null);

  // Attempt to parse service account JSON file or env
  if (targetCredPath && fs.existsSync(targetCredPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(targetCredPath, 'utf8'));
      finalEmail = sa.client_email;
      finalKey = sa.private_key;
    } catch (e) {
      console.error('[Google Indexing] Failed to parse credentials file:', e.message);
    }
  } else if (credentialsJson) {
    try {
      const sa = JSON.parse(credentialsJson);
      finalEmail = sa.client_email;
      finalKey = sa.private_key;
    } catch (e) {
      console.error('[Google Indexing] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  if (!finalEmail || !finalKey) {
    console.error(
      '[Google Indexing] Missing Google Service Account Credentials!\n' +
      'Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.\n' +
      'Ensure the service account email is added as an OWNER in Google Search Console for https://dearresultlive.in.'
    );
    return [];
  }

  // Normalize private key line breaks
  finalKey = finalKey.replace(/\\n/g, '\n');

  console.log(`[Google Indexing] Authenticating service account: ${finalEmail}`);
  const accessToken = await getGoogleAccessToken(finalEmail, finalKey);
  console.log(`[Google Indexing] OAuth2 access token acquired. Pinging ${urls.length} URL(s)...`);

  const results = [];
  for (const url of urls) {
    const res = await notifyGoogleIndexing(url, accessToken, type);
    results.push(res);

    if (res.ok) {
      console.log(`✓ [Google Indexing 200 OK] Queued for crawling: ${url}`);
    } else {
      console.error(`✗ [Google Indexing ${res.status}] Failed for: ${url}`);
      console.error(`  Details:`, JSON.stringify(res.response));
      if (res.status === 403) {
        console.error(
          `  👉 Action Required: Add "${finalEmail}" as an 'Owner' under Search Console -> Settings -> Users & Permissions.`
        );
      }
    }
  }

  return results;
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('google-instant-index.js')) {
  const args = process.argv.slice(2);
  const baseUrl = process.env.FRONTEND_URL || 'https://dearresultlive.in';
  
  // Parse command-line flags
  let targetUrls = [];
  let date = new Date().toISOString().slice(0, 10);
  let slot = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      targetUrls.push(args[i + 1]);
      i++;
    } else if (args[i] === '--date' && args[i + 1]) {
      date = args[i + 1];
      i++;
    } else if (args[i] === '--slot' && args[i + 1]) {
      slot = args[i + 1].toLowerCase();
      i++;
    }
  }

  // If no specific URLs provided, construct standard draw URLs for today
  if (targetUrls.length === 0) {
    if (slot) {
      targetUrls = [
        `${baseUrl}/`,
        `${baseUrl}/results/${date}`,
        `${baseUrl}/results/${date}/${slot}`
      ];
    } else {
      targetUrls = [
        `${baseUrl}/`,
        `${baseUrl}/results/${date}`,
        `${baseUrl}/results/${date}/1pm`,
        `${baseUrl}/results/${date}/6pm`,
        `${baseUrl}/results/${date}/8pm`
      ];
    }
  }

  console.log(`\n🚀 Dear Lottery Google Instant Indexing Trigger`);
  console.log(`===============================================`);
  console.log(`Target Date: ${date}`);
  console.log(`URLs to Ping (${targetUrls.length}):\n${targetUrls.map(u => '  • ' + u).join('\n')}\n`);

  publishToGoogleIndexing({ urls: targetUrls })
    .then(() => {
      console.log(`\n🎉 Google Indexing ping batch completed.`);
    })
    .catch((err) => {
      console.error(`\n❌ Error executing Google Indexing ping:`, err);
      process.exit(1);
    });
}
