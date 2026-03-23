#!/usr/bin/env python3
"""Publish a LinkedIn post, optionally with an uploaded image asset.

This script publishes via the legacy UGC Posts API because that is what the
current workflow already uses. It also performs minimal post-publish
verification when possible so the caller gets a more trustworthy result than a
blindly constructed feed URL.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = Path('/home/zak/.openclaw/workspace')
TOKEN_FILE = WORKSPACE_ROOT / 'memory' / 'linkedin_auth.json'
DEFAULT_POST_FILE = REPO_ROOT / 'Writers' / 'Social_Media' / 'ai-autopilot-esp-failure-triage-linkedin.txt'
DEFAULT_MEMBER_ID = 'WjEDGn4RZK'
LINKEDIN_API_TIMEOUT = 30
VERIFICATION_DELAYS_SECONDS = (0, 2, 4)


def get_auth() -> tuple[str, str]:
    env_token = os.environ.get('LINKEDIN_ACCESS_TOKEN')
    env_member = os.environ.get('LINKEDIN_MEMBER_ID')
    if env_token and env_member:
        return env_token, env_member

    if TOKEN_FILE.exists():
        data = json.loads(TOKEN_FILE.read_text())
        token = data.get('access_token')
        member_id = data.get('member_id') or DEFAULT_MEMBER_ID
        if token:
            return token, member_id

    raise RuntimeError('LinkedIn credentials not found. Use env vars or /home/zak/.openclaw/workspace/memory/linkedin_auth.json only.')


def linkedin_headers(token: str) -> dict[str, str]:
    return {
        'Authorization': f'Bearer {token}',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
    }


def parse_urn(urn: str | None) -> dict[str, str | None]:
    if not urn or not urn.startswith('urn:li:'):
        return {'urn': urn, 'entity_type': None, 'entity_id': None}

    parts = urn.split(':', 3)
    entity_type = parts[2] if len(parts) > 2 else None
    entity_id = parts[3] if len(parts) > 3 else None
    return {'urn': urn, 'entity_type': entity_type, 'entity_id': entity_id}


def build_permalink_details(urn: str | None) -> dict[str, str | bool | None]:
    urn_info = parse_urn(urn)
    entity_type = urn_info['entity_type']

    if not urn:
        return {
            'url': None,
            'confidence': 'none',
            'displayable': False,
            'reason': 'No URN available.',
        }

    if entity_type == 'ugcPost':
        return {
            'url': f'https://www.linkedin.com/feed/update/{urn}/',
            'confidence': 'high',
            'displayable': True,
            'reason': 'LinkedIn docs explicitly describe the feed/update/urn:li:ugcPost:<id>/ pattern for published UGC posts.',
        }

    if entity_type == 'share':
        return {
            'url': f'https://www.linkedin.com/feed/update/{urn}/',
            'confidence': 'low',
            'displayable': False,
            'reason': 'Share URNs can be valid API identifiers, but this URL pattern is not reliably displayable in the LinkedIn web UI.',
        }

    return {
        'url': f'https://www.linkedin.com/feed/update/{urn}/',
        'confidence': 'low',
        'displayable': False,
        'reason': 'Unknown URN type; returning best-effort feed URL only.',
    }


def upload_image_to_linkedin(token: str, author: str, image_source: str) -> str:
    headers = linkedin_headers(token)
    register_payload = {
        'registerUploadRequest': {
            'recipes': ['urn:li:digitalmediaRecipe:feedshare-image'],
            'owner': author,
            'serviceRelationships': [{
                'relationshipType': 'OWNER',
                'identifier': 'urn:li:userGeneratedContent',
            }],
        }
    }
    reg_resp = requests.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        headers=headers,
        json=register_payload,
        timeout=LINKEDIN_API_TIMEOUT,
    )
    reg_resp.raise_for_status()
    reg_result = reg_resp.json()
    upload_url = reg_result['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl']
    image_urn = reg_result['value']['asset']

    if image_source.startswith('http://') or image_source.startswith('https://'):
        img_resp = requests.get(image_source, timeout=60)
        img_resp.raise_for_status()
        img_data = img_resp.content
    else:
        img_data = Path(image_source).read_bytes()

    upload_resp = requests.put(
        upload_url,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/octet-stream'},
        data=img_data,
        timeout=60,
    )
    upload_resp.raise_for_status()
    return image_urn


def extract_created_urn(response: requests.Response) -> str | None:
    header_urn = response.headers.get('x-restli-id') or response.headers.get('X-RestLi-Id')
    if header_urn:
        return header_urn

    body = response.text.strip()
    if not body:
        return None

    try:
        payload = response.json()
    except ValueError:
        return None

    if isinstance(payload, dict):
        return payload.get('id')
    return None


def fetch_ugc_post(token: str, urn: str, view_context: str = 'AUTHOR') -> tuple[requests.Response, dict | None]:
    encoded_urn = quote(urn, safe='')
    response = requests.get(
        f'https://api.linkedin.com/v2/ugcPosts/{encoded_urn}',
        headers=linkedin_headers(token),
        params={'viewContext': view_context},
        timeout=LINKEDIN_API_TIMEOUT,
    )
    payload = None
    if response.content:
        try:
            payload = response.json()
        except ValueError:
            payload = None
    return response, payload


def summarize_verified_post(payload: dict | None) -> dict:
    payload = payload or {}
    post_id = payload.get('id')
    post_urn_info = parse_urn(post_id)
    share_content = payload.get('specificContent', {}).get('com.linkedin.ugc.ShareContent', {})
    visibility = payload.get('visibility', {}).get('com.linkedin.ugc.MemberNetworkVisibility')

    return {
        'id': post_id,
        'id_type': post_urn_info['entity_type'],
        'entity_id': post_urn_info['entity_id'],
        'author': payload.get('author'),
        'lifecycleState': payload.get('lifecycleState'),
        'visibility': visibility,
        'shareMediaCategory': share_content.get('shareMediaCategory'),
        'firstPublishedAt': payload.get('firstPublishedAt'),
        'lastModified': payload.get('lastModified'),
    }


def verify_created_post(token: str, created_urn: str | None) -> dict:
    if not created_urn:
        return {
            'attempted': False,
            'ok': False,
            'reason': 'No URN returned from create response; cannot verify.',
        }

    last_status = None
    last_payload = None
    last_error = None

    for delay in VERIFICATION_DELAYS_SECONDS:
        if delay:
            time.sleep(delay)

        response, payload = fetch_ugc_post(token, created_urn, view_context='AUTHOR')
        last_status = response.status_code
        last_payload = payload

        if response.ok and isinstance(payload, dict):
            summary = summarize_verified_post(payload)
            lifecycle_state = summary.get('lifecycleState')
            if lifecycle_state == 'PROCESSING':
                last_error = 'Post exists but is still PROCESSING.'
                continue

            return {
                'attempted': True,
                'ok': lifecycle_state == 'PUBLISHED',
                'http_status': response.status_code,
                'method': 'GET /v2/ugcPosts/{urn}?viewContext=AUTHOR',
                'post': summary,
                'reason': (
                    'Post retrieved successfully and is published.'
                    if lifecycle_state == 'PUBLISHED'
                    else f'Post retrieved successfully but lifecycleState={lifecycle_state}.'
                ),
            }

        if response.status_code in (401, 403):
            return {
                'attempted': True,
                'ok': False,
                'http_status': response.status_code,
                'method': 'GET /v2/ugcPosts/{urn}?viewContext=AUTHOR',
                'reason': 'Publish likely succeeded, but token could not read the post back for verification (missing/insufficient read scope or token issue).',
            }

        if response.status_code == 404:
            last_error = 'Post not found yet via read-after-write lookup.'
            continue

        body = response.text.strip()
        last_error = f'Unexpected verification response ({response.status_code}): {body[:500]}'
        break

    result = {
        'attempted': True,
        'ok': False,
        'http_status': last_status,
        'method': 'GET /v2/ugcPosts/{urn}?viewContext=AUTHOR',
        'reason': last_error or 'Verification did not confirm a published post.',
    }
    if isinstance(last_payload, dict):
        result['post'] = summarize_verified_post(last_payload)
    return result


def publish_post(post_text: str, image_source: str | None = None, title: str = 'ZakitPro Update', verify: bool = True) -> dict:
    token, member_id = get_auth()
    author = f'urn:li:person:{member_id}'
    headers = linkedin_headers(token)

    if image_source:
        image_urn = upload_image_to_linkedin(token, author, image_source)
        ugc = {
            'author': author,
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {'text': post_text},
                    'shareMediaCategory': 'IMAGE',
                    'media': [{
                        'status': 'READY',
                        'media': image_urn,
                        'title': {'text': title},
                        'description': {'text': 'Whiteboard-style endpoint engineering visual'},
                    }],
                }
            },
            'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'},
        }
    else:
        ugc = {
            'author': author,
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {'text': post_text},
                    'shareMediaCategory': 'NONE',
                }
            },
            'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'},
        }

    response = requests.post(
        'https://api.linkedin.com/v2/ugcPosts',
        headers=headers,
        json=ugc,
        timeout=LINKEDIN_API_TIMEOUT,
    )
    response.raise_for_status()

    created_urn = extract_created_urn(response)
    created_urn_info = parse_urn(created_urn)
    verification = verify_created_post(token, created_urn) if verify else {
        'attempted': False,
        'ok': False,
        'reason': 'Verification disabled by caller.',
    }

    canonical_urn = created_urn
    if verification.get('ok') and isinstance(verification.get('post'), dict):
        canonical_urn = verification['post'].get('id') or canonical_urn

    permalink = build_permalink_details(canonical_urn)

    return {
        'ok': True,
        'author': author,
        'urn': created_urn,
        'urn_type': created_urn_info['entity_type'],
        'entity_id': created_urn_info['entity_id'],
        'canonical_urn': canonical_urn,
        'canonical_urn_type': parse_urn(canonical_urn)['entity_type'],
        'url': permalink.get('url'),
        'url_confidence': permalink.get('confidence'),
        'permalink': permalink,
        'verification': verification,
        'trustworthy_result': bool(verification.get('ok')),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Publish a LinkedIn post with optional image upload')
    parser.add_argument('--file', '-f', default=str(DEFAULT_POST_FILE), help='File containing post text')
    parser.add_argument('--text', '-t', help='Inline post text')
    parser.add_argument('--image', '-i', help='Image path or URL')
    parser.add_argument('--title', default='AI + Autopilot ESP Triage', help='Image title')
    parser.add_argument('--no-verify', action='store_true', help='Skip post-publish verification lookup')
    args = parser.parse_args()

    if args.text:
        post_text = args.text.strip()
    else:
        post_text = Path(args.file).read_text().strip()

    result = publish_post(post_text, image_source=args.image, title=args.title, verify=not args.no_verify)
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except requests.HTTPError as e:
        body = e.response.text if e.response is not None else str(e)
        print(f'HTTP ERROR: {body}', file=sys.stderr)
        raise
