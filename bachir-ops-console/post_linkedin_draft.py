#!/usr/bin/env python3
"""Publish a LinkedIn post, optionally with an uploaded image asset."""
import argparse
import json
import os
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = Path('/home/zak/.openclaw/workspace')
TOKEN_FILE = WORKSPACE_ROOT / 'memory' / 'linkedin_auth.json'
DEFAULT_POST_FILE = REPO_ROOT / 'Writers' / 'Social_Media' / 'ai-autopilot-esp-failure-triage-linkedin.txt'
DEFAULT_MEMBER_ID = 'WjEDGn4RZK'


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


def upload_image_to_linkedin(token: str, author: str, image_source: str) -> str:
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
    }
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
        timeout=30,
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


def publish_post(post_text: str, image_source: str | None = None, title: str = 'ZakitPro Update') -> dict:
    token, member_id = get_auth()
    author = f'urn:li:person:{member_id}'
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
    }

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
        timeout=30,
    )
    response.raise_for_status()
    result = response.json()
    urn = result.get('id', 'unknown')
    url = f'https://www.linkedin.com/feed/update/{urn}'
    return {'ok': True, 'urn': urn, 'url': url}


def main() -> int:
    parser = argparse.ArgumentParser(description='Publish a LinkedIn post with optional image upload')
    parser.add_argument('--file', '-f', default=str(DEFAULT_POST_FILE), help='File containing post text')
    parser.add_argument('--text', '-t', help='Inline post text')
    parser.add_argument('--image', '-i', help='Image path or URL')
    parser.add_argument('--title', default='AI + Autopilot ESP Triage', help='Image title')
    args = parser.parse_args()

    if args.text:
        post_text = args.text.strip()
    else:
        post_text = Path(args.file).read_text().strip()

    result = publish_post(post_text, image_source=args.image, title=args.title)
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except requests.HTTPError as e:
        body = e.response.text if e.response is not None else str(e)
        print(f'HTTP ERROR: {body}', file=sys.stderr)
        raise
