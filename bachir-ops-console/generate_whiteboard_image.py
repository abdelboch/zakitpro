#!/usr/bin/env python3
"""Generate a whiteboard-style social image.

Primary path:
- Gemini image generation via GEMINI_API_KEY

Fallback path:
- local Pillow renderer that creates a readable sketchnote-style whiteboard graphic

Expected prompt file format:
- line 1: topic/title
- line 2: objective/summary
- next 7 non-empty lines: panel descriptions
- optional final 3 non-empty lines: badge labels
"""
import argparse
import base64
import json
import os
import textwrap
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont

MODEL = "gemini-2.5-flash-image"
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROMPT_FILE = REPO_ROOT / 'Writers' / 'Social_Media' / 'ai-autopilot-esp-failure-triage-whiteboard-prompt.txt'
DEFAULT_OUTPUT = REPO_ROOT / 'public' / 'images' / 'social-whiteboard' / 'ai-autopilot-esp-failure-triage-whiteboard-20260322.png'

CANVAS = (1080, 1080)
MARGIN = 36
PANEL_GAP = 22
COLORS = {
    'black': '#101418',
    'blue': '#2563eb',
    'green': '#059669',
    'orange': '#ea580c',
    'red': '#dc2626',
    'gray': '#64748b',
    'frame': '#cbd5e1',
    'surface': '#fbfdff',
}


def load_prompt_parts(prompt_file: Path) -> tuple[str, str, list[str], list[str]]:
    lines = [line.strip() for line in prompt_file.read_text().splitlines() if line.strip()]
    if len(lines) < 9:
        raise ValueError(f"Prompt file must contain at least 9 non-empty lines, got {len(lines)}")
    topic_name = lines[0]
    summary = lines[1]
    sections = lines[2:9]
    badges = lines[9:12] if len(lines) >= 12 else []
    return topic_name, summary, sections, badges


def build_prompt(topic_name: str, summary: str, sections: list[str]) -> str:
    section_text = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(sections[:7]))
    return f'''A photograph of a glossy WHITEBOARD with an aluminum frame, showing a structured business infographic drawn in professional dry-erase marker. The style is "business doodling" or "graphic recording," featuring clean line art, simple icons, and handwritten-style lettering. The bottom tray of the whiteboard must hold realistic markers and an eraser.

CRITICAL: This is a WHITEBOARD, NOT a blackboard/chalkboard. The surface must be bright white and all text/art must appear as dry-erase marker on a white surface. NO dark background. NO chalk. NO chalk dust.

The main title at the top is: "{topic_name}" in bold blue marker. Directly below it, add a section labeled "Objective: {summary}" in black marker.

Divide the main board space into exactly seven structured, numbered panels (1 through 7) in a grid layout (two columns of three, and a single wide panel at the bottom). Fill each panel according to this specific list of requirements:

{section_text}

Use a high-contrast palette of red, blue, green, and yellow markers with thick black outlines for all elements. The composition must include subtle whiteboard surface texture, slight reflections, and visible erase marks. The overall look is structured, professional, yet analog. Make all panel text large enough to be readable in a LinkedIn feed preview.'''


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates += [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
        ]
    candidates += [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ''
    for word in words:
        candidate = word if not current else f'{current} {word}'
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _fit_font(draw: ImageDraw.ImageDraw, text: str, width: int, start_size: int, min_size: int = 22, bold: bool = True):
    for size in range(start_size, min_size - 1, -2):
        font = _load_font(size, bold=bold)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= width:
            return font
    return _load_font(min_size, bold=bold)


def render_local_whiteboard(topic_name: str, summary: str, sections: list[str], output_path: Path, badges: list[str] | None = None) -> Path:
    img = Image.new('RGB', CANVAS, COLORS['surface'])
    draw = ImageDraw.Draw(img)

    # Whiteboard frame
    draw.rounded_rectangle((8, 8, CANVAS[0] - 8, CANVAS[1] - 8), radius=18, outline=COLORS['frame'], width=10)
    draw.rounded_rectangle((24, 24, CANVAS[0] - 24, CANVAS[1] - 48), radius=14, outline='#e2e8f0', width=3)
    draw.rectangle((160, CANVAS[1] - 46, CANVAS[0] - 160, CANVAS[1] - 26), fill='#d6dde5', outline='#94a3b8')

    # subtle marker wipe texture
    for y in range(70, CANVAS[1] - 70, 80):
        draw.line((45, y, CANVAS[0] - 45, y + 10), fill='#f1f5f9', width=3)

    title_font = _fit_font(draw, topic_name, CANVAS[0] - MARGIN * 2, 44, min_size=28, bold=True)
    sub_font = _load_font(24, bold=False)
    panel_title_font = _load_font(24, bold=True)
    panel_body_font = _load_font(19, bold=False)
    badge_font = _load_font(20, bold=True)

    draw.text((MARGIN, 34), topic_name, font=title_font, fill=COLORS['blue'])
    draw.line((MARGIN, 90, CANVAS[0] - MARGIN, 90), fill=COLORS['blue'], width=4)

    objective_lines = _wrap(draw, f'Objective: {summary}', sub_font, CANVAS[0] - MARGIN * 2)
    y = 104
    for line in objective_lines[:3]:
        draw.text((MARGIN, y), line, font=sub_font, fill=COLORS['black'])
        y += 30

    top = y + 12
    left_x = MARGIN
    right_x = CANVAS[0] // 2 + PANEL_GAP // 2
    panel_w = (CANVAS[0] - MARGIN * 2 - PANEL_GAP) // 2
    panel_h = 165

    accents = [COLORS['blue'], COLORS['green'], COLORS['orange'], COLORS['red'], COLORS['blue'], COLORS['green'], COLORS['orange']]

    rects = []
    for row in range(3):
        rects.append((left_x, top + row * (panel_h + PANEL_GAP), left_x + panel_w, top + row * (panel_h + PANEL_GAP) + panel_h))
        rects.append((right_x, top + row * (panel_h + PANEL_GAP), right_x + panel_w, top + row * (panel_h + PANEL_GAP) + panel_h))
    bottom_y = top + 3 * (panel_h + PANEL_GAP)
    rects.append((MARGIN, bottom_y, CANVAS[0] - MARGIN, bottom_y + 120))

    for idx, (rect, section) in enumerate(zip(rects, sections[:7]), start=1):
        accent = accents[idx - 1]
        x1, y1, x2, y2 = rect
        draw.rounded_rectangle(rect, radius=16, outline=COLORS['black'], width=4, fill='#ffffff')
        draw.line((x1 + 12, y1 + 12, x2 - 12, y1 + 12), fill=accent, width=5)
        draw.ellipse((x1 + 14, y1 + 14, x1 + 48, y1 + 48), outline=accent, width=4, fill='#ffffff')
        draw.text((x1 + 25, y1 + 18), str(idx), font=panel_title_font, fill=accent)

        cleaned = section.replace(':', ' —', 1)
        title = cleaned.split('—', 1)[0].strip()
        body = cleaned.split('—', 1)[1].strip() if '—' in cleaned else cleaned
        draw.text((x1 + 60, y1 + 18), title[:32], font=panel_title_font, fill=COLORS['black'])
        body_lines = _wrap(draw, body, panel_body_font, (x2 - x1) - 34)
        ty = y1 + 58
        max_lines = 5 if idx < 7 else 3
        for line in body_lines[:max_lines]:
            draw.text((x1 + 18, ty), line, font=panel_body_font, fill=COLORS['gray'])
            ty += 24

        # doodle arrow/shape cue
        if idx < 6:
            draw.line((x2 - 40, y2 - 22, x2 - 14, y2 - 22), fill=accent, width=4)
            draw.polygon([(x2 - 14, y2 - 22), (x2 - 24, y2 - 29), (x2 - 24, y2 - 15)], fill=accent)

    badges = badges or ['Protect Ring Scope', 'Review Graph Payload', 'Validate Read-Back']
    badges = (badges + ['Protect Ring Scope', 'Review Graph Payload', 'Validate Read-Back'])[:3]
    bx = MARGIN + 10
    by = CANVAS[1] - 108
    for i, badge in enumerate(badges):
        bw = 290 if i < 2 else 340
        draw.rounded_rectangle((bx, by, bx + bw, by + 42), radius=18, outline=COLORS['black'], width=3, fill='#ffffff')
        draw.text((bx + 16, by + 10), badge, font=badge_font, fill=accents[i])
        bx += bw + 14

    img = img.filter(ImageFilter.SMOOTH_MORE)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    return output_path


def generate_whiteboard_image(prompt_text: str, output_path: Path, topic_name: str, summary: str, sections: list[str], badges: list[str] | None = None) -> tuple[Path, str]:
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        payload = {
            'contents': [{'parts': [{'text': prompt_text}]}],
            'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']},
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}',
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=180,
        )
        if response.ok:
            data = response.json()
            for candidate in data.get('candidates', []):
                for part in candidate.get('content', {}).get('parts', []):
                    if 'inlineData' in part:
                        img_bytes = base64.b64decode(part['inlineData']['data'])
                        output_path.write_bytes(img_bytes)
                        return output_path, 'gemini'
        print('WARN: Gemini image generation unavailable, using local Pillow fallback.')

    return render_local_whiteboard(topic_name, summary, sections, output_path, badges=badges), 'local-fallback'


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate a whiteboard social image')
    parser.add_argument('--prompt-file', default=str(DEFAULT_PROMPT_FILE), help='Filled prompt text file')
    parser.add_argument('--output', default=str(DEFAULT_OUTPUT), help='PNG output path')
    args = parser.parse_args()

    prompt_file = Path(args.prompt_file)
    output_path = Path(args.output)

    topic_name, summary, sections, badges = load_prompt_parts(prompt_file)
    prompt_text = build_prompt(topic_name, summary, sections)
    image_path, mode = generate_whiteboard_image(prompt_text, output_path, topic_name, summary, sections, badges=badges)
    print(f'IMAGE_PATH={image_path}')
    print(f'IMAGE_MODE={mode}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
