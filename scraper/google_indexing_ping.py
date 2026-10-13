"""
Standalone Python script to trigger Google Indexing API ping upon successful lottery publication.
Supports execution in GitHub Actions or locally using Google Service Account credentials.
"""

import sys
import os
import json
import time
import argparse
import urllib.parse
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None


def generate_jwt_assertion(client_email: str, private_key_pem: str) -> str:
    """
    Creates an RS256 signed JWT for Google OAuth2 using standard Python libraries.
    """
    import base64
    import json
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.serialization import load_pem_private_key

    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    payload = {
        "iss": client_email,
        "scope": "https://www.googleapis.com/auth/indexing",
        "aud": "https://oauth2.googleapis.com/token",
        "exp": now + 3600,
        "iat": now
    }

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

    header_b64 = b64url(json.dumps(header).encode('utf-8'))
    payload_b64 = b64url(json.dumps(payload).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')

    private_key = load_pem_private_key(private_key_pem.encode('utf-8'), password=None)
    signature = private_key.sign(
        signing_input,
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    sig_b64 = b64url(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def get_google_access_token(service_account_info: dict) -> str:
    """
    Exchanges signed JWT for Google OAuth2 Bearer Access Token.
    """
    client_email = service_account_info.get("client_email")
    private_key = service_account_info.get("private_key")

    jwt = generate_jwt_assertion(client_email, private_key)

    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt
        },
        timeout=15
    )
    resp.raise_for_status()
    return resp.json().get("access_token")


def ping_google_indexing_api(urls: list[str], service_account_path_or_json: str):
    if not requests:
        print("requests library not found. Skipping Google Indexing API ping.")
        return

    # Load service account credentials
    if os.path.isfile(service_account_path_or_json):
        with open(service_account_path_or_json, 'r') as f:
            sa_info = json.load(f)
    else:
        try:
            sa_info = json.loads(service_account_path_or_json)
        except Exception as e:
            print(f"Invalid service account JSON: {e}")
            return

    try:
        token = get_google_access_token(sa_info)
    except Exception as e:
        print(f"Failed to obtain Google access token: {e}")
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    for url in urls:
        body = {
            "url": url,
            "type": "URL_UPDATED"
        }
        try:
            r = requests.post(
                "https://indexing.googleapis.com/v3/urlNotifications:publish",
                json=body,
                headers=headers,
                timeout=15
            )
            print(f"Google Indexing API [{r.status_code}] -> {url}")
        except Exception as e:
            print(f"Error pinging {url}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Trigger Google Indexing API Ping for Dear Lottery")
    parser.add_argument("--url", action="append", help="URL to index (can specify multiple)")
    parser.add_argument("--sa-key", default=os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"), help="Path to service account JSON or JSON string")

    args = parser.parse_args()

    urls = args.url or [
        f"{os.environ.get('FRONTEND_URL', 'https://dearresultlive.in')}/",
        f"{os.environ.get('FRONTEND_URL', 'https://dearresultlive.in')}/results/{datetime.now().strftime('%Y-%m-%d')}"
    ]

    if not args.sa_key:
        print("GOOGLE_APPLICATION_CREDENTIALS or --sa-key not specified. Skipping.")
        sys.exit(0)

    ping_google_indexing_api(urls, args.sa_key)


if __name__ == "__main__":
    main()
