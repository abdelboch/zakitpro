#!/usr/bin/env python3
"""Generate a whiteboard-style social image using Gemini image generation.

Expected prompt file format:
- line 1: topic/title
- line 2: objective/summary
- next 7 non-empty lines: panel descriptions
"""
import argparse
import base64
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests

MODEL = "gemini-2.5-flash-image"
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROMPT_FILE = REPO_ROOT / 'Writers' / 'Social_Media' / 'ai-autopilot-esp-failure-triage-whiteboard-prompt.txt'
DEFAULT_OUTPUT = REPO_ROOT / 'public' / 'images' / 'social-whiteboard' / 'ai-autopilot-esp-failure-triage-whiteboard-20260322.png'


def load_prompt_parts(prompt_file: Path) -> tuple[str, str, list[str]]:
    lines = [line.strip() for line in prompt_file.read_text().splitlines() if line.strip()]
    if len(lines) < 9:
        raise ValueError(f"Prompt file must contain at least 9 non-empty lines, got {len(lines)}")
    topic_name = lines[0]
    summary = lines[1]
    sections = lines[2:9]
    return topic_name, summary, sections


def build_prompt(topic_name: str, summary: str, sections: list[str]) -> str:
    section_text = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(sections[:7]))
    return f'''A photograph of a glossy WHITEBOARD with an aluminum frame, showing a structured business infographic drawn in professional dry-erase marker. The style is "business doodling" or "graphic recording," featuring clean line art, simple icons, and handwritten-style lettering. The bottom tray of the whiteboard must hold realistic markers and an eraser.

CRITICAL: This is a WHITEBOARD, NOT a blackboard/chalkboard. The surface must be bright white and all text/art must appear as dry-erase marker on a white surface. NO dark background. NO chalk. NO chalk dust.

The main title at the top is: "{topic_name}" in bold blue marker. Directly below it, add a section labeled "Objective: {summary}" in black marker.

Divide the main board space into exactly seven structured, numbered panels (1 through 7) in a grid layout (two columns of three, and a single wide panel at the bottom). Fill each panel according to this specific list of requirements:

{section_text}

Use a high-contrast palette of red, blue, green, and yellow markers with thick black outlines for all elements. The composition must include subtle whiteboard surface texture, slight reflections, and visible erase marks. The overall look is structured, professional, yet analog. Make all panel text large enough to be readable in a LinkedIn feed preview.'''


def generate_whiteboard_image(prompt_text: str, output_path: Path) -> Path:
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY is required and must never be hardcoded in source code')
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=180,
    )
    response.raise_for_status()
    data = response.json()

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                img_bytes = base64.b64decode(part["inlineData"]["data"])
                output_path.write_bytes(img_bytes)
                return output_path

    print(json.dumps(data, indent=2))
    raise RuntimeError("No image data found in Gemini response")


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate a whiteboard social image')
    parser.add_argument('--prompt-file', default=str(DEFAULT_PROMPT_FILE), help='Filled prompt text file')
    parser.add_argument('--output', default=str(DEFAULT_OUTPUT), help='PNG output path')
    args = parser.parse_args()

    prompt_file = Path(args.prompt_file)
    output_path = Path(args.output)

    topic_name, summary, sections = load_prompt_parts(prompt_file)
    prompt_text = build_prompt(topic_name, summary, sections)
    image_path = generate_whiteboard_image(prompt_text, output_path)
    print(f"IMAGE_PATH={image_path}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
