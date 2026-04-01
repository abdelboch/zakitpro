
from pathlib import Path
import re
from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, Image
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
from reportlab.graphics import renderPDF
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

ROOT = Path('/home/zak/projects/zakitpro')
PROMPTS_SRC = Path('/home/zak/.hermes/hermes-agent/50-ai-prompts-desktop-engineers.txt')
CHECKLIST_SRC = Path('/home/zak/.hermes/hermes-agent/deliverables/ai-output-validation-checklist-for-endpoint-teams.txt')
OUT_DIR = ROOT / 'public' / 'downloads'
OUT_DIR.mkdir(parents=True, exist_ok=True)
LOGO = ROOT / 'public' / 'logo.png'

PRIMARY = colors.HexColor('#0ea5e9')
PRIMARY_DARK = colors.HexColor('#0f172a')
SLATE = colors.HexColor('#334155')
MUTED = colors.HexColor('#64748b')
LIGHT = colors.HexColor('#e2e8f0')
ACCENT = colors.HexColor('#dbeafe')
SUCCESS = colors.HexColor('#dcfce7')
SUCCESS_DARK = colors.HexColor('#166534')
WARN = colors.HexColor('#fef3c7')
WARN_DARK = colors.HexColor('#92400e')

for candidate in [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'
]:
    if Path(candidate).exists():
        pdfmetrics.registerFont(TTFont('BodyFont', candidate))
        break
else:
    pass

for candidate in [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'
]:
    if Path(candidate).exists():
        pdfmetrics.registerFont(TTFont('HeadingFont', candidate))
        break

BODY_FONT = 'BodyFont' if 'BodyFont' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
HEAD_FONT = 'HeadingFont' if 'HeadingFont' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='SmallCaps', fontName=HEAD_FONT, fontSize=9, leading=11, textColor=PRIMARY, uppercase=True, spaceAfter=6))
styles.add(ParagraphStyle(name='ToolkitTitle', fontName=HEAD_FONT, fontSize=24, leading=28, textColor=colors.white, spaceAfter=12))
styles.add(ParagraphStyle(name='ToolkitSubtitle', fontName=BODY_FONT, fontSize=12, leading=17, textColor=colors.white, spaceAfter=10))
styles.add(ParagraphStyle(name='BodyX', fontName=BODY_FONT, fontSize=10.2, leading=14.5, textColor=SLATE, spaceAfter=7))
styles.add(ParagraphStyle(name='BodySmall', fontName=BODY_FONT, fontSize=8.8, leading=12, textColor=MUTED, spaceAfter=5))
styles.add(ParagraphStyle(name='SectionTitle', fontName=HEAD_FONT, fontSize=18, leading=22, textColor=PRIMARY_DARK, spaceAfter=8, spaceBefore=10))
styles.add(ParagraphStyle(name='CategoryTitle', fontName=HEAD_FONT, fontSize=15, leading=19, textColor=PRIMARY_DARK, spaceAfter=6, spaceBefore=10))
styles.add(ParagraphStyle(name='PromptTitle', fontName=HEAD_FONT, fontSize=11.5, leading=14, textColor=PRIMARY_DARK, spaceAfter=5))
styles.add(ParagraphStyle(name='CardLabel', fontName=HEAD_FONT, fontSize=8.5, leading=10, textColor=PRIMARY, spaceAfter=2))
styles.add(ParagraphStyle(name='BulletX', fontName=BODY_FONT, fontSize=10, leading=14, leftIndent=10, bulletIndent=0, textColor=SLATE, spaceAfter=3))
styles.add(ParagraphStyle(name='ChecklistTitle', fontName=HEAD_FONT, fontSize=14, leading=18, textColor=PRIMARY_DARK, spaceAfter=6, spaceBefore=10))

def clean(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def badge(text, fill=ACCENT, stroke=PRIMARY, fg=PRIMARY_DARK):
    tbl = Table([[Paragraph(f'<b>{clean(text)}</b>', ParagraphStyle(name='Badge', fontName=HEAD_FONT, fontSize=8, textColor=fg, alignment=1))]], colWidths=[2.0*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), fill),
        ('BOX', (0,0), (-1,-1), 0.8, stroke),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return tbl

def cover_canvas(canvas, doc, title, subtitle, bullets):
    w, h = LETTER
    canvas.saveState()
    canvas.setFillColor(PRIMARY_DARK)
    canvas.rect(0,0,w,h,fill=1,stroke=0)

    canvas.setFillColor(PRIMARY)
    canvas.circle(w-80, h-110, 70, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#38bdf8'))
    canvas.circle(w-150, h-140, 28, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#1d4ed8'))
    canvas.roundRect(50, h-250, 220, 110, 18, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(HEAD_FONT, 24)
    canvas.drawString(56, h-175, 'zakitpro')

    if LOGO.exists():
        canvas.drawImage(str(LOGO), 54, h-115, width=62, height=62, mask='auto')

    canvas.setFont(HEAD_FONT, 28)
    y = h-310
    for line in title.split('\\n'):
        canvas.drawString(54, y, line)
        y -= 34

    canvas.setFont(BODY_FONT, 12)
    text_obj = canvas.beginText(54, y-4)
    text_obj.setFillColor(colors.white)
    text_obj.setLeading(18)
    for line in subtitle.split('\\n'):
        text_obj.textLine(line)
    canvas.drawText(text_obj)

    bx = 54
    by = 210
    boxw = w - 108
    canvas.setFillColor(colors.white)
    canvas.setStrokeColor(colors.white)
    canvas.roundRect(bx, by, boxw, 110, 18, fill=0, stroke=1)
    canvas.setFont(HEAD_FONT, 11)
    canvas.drawString(bx+18, by+84, 'What you get inside')
    canvas.setFont(BODY_FONT, 10.5)
    yy = by+64
    for item in bullets:
        canvas.circle(bx+22, yy+3, 2.2, fill=1, stroke=0)
        canvas.drawString(bx+34, yy, item)
        yy -= 20

    canvas.setFont(BODY_FONT, 9)
    canvas.setFillColor(colors.HexColor('#cbd5e1'))
    canvas.drawString(54, 34, 'Free resource for desktop engineers • zakitpro.com')
    canvas.restoreState()

def later_pages(canvas, doc):
    canvas.saveState()
    w, h = LETTER
    canvas.setStrokeColor(LIGHT)
    canvas.line(50, h-42, w-50, h-42)
    if LOGO.exists():
        canvas.drawImage(str(LOGO), 50, h-34, width=20, height=20, mask='auto')
    canvas.setFont(HEAD_FONT, 9)
    canvas.setFillColor(PRIMARY_DARK)
    canvas.drawString(75, h-28, 'zakitpro')
    canvas.setFont(BODY_FONT, 8.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(w-50, h-28, f'Page {doc.page}')
    canvas.restoreState()

def build_prompt_pdf():
    lines = PROMPTS_SRC.read_text().splitlines()
    title = lines[0].strip()
    subtitle = lines[2].replace('Subtitle: ', '').strip()
    intro = []
    categories = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line == 'Introduction':
            i += 1
            continue
        if line.startswith('Why this exists') or line.startswith('How to use this guide'):
            head = line
            i += 1
            paras = []
            while i < len(lines) and lines[i].strip() and not lines[i].startswith('Category '):
                if not lines[i].strip().startswith(tuple(str(n) + ')' for n in range(1,60))):
                    paras.append(lines[i].strip())
                i += 1
            intro.append((head, ' '.join(paras)))
            continue
        m = re.match(r'Category\s+\d+:\s+(.+)', line)
        if m:
            category = {'title': m.group(1), 'prompts': []}
            i += 1
            while i < len(lines):
                line = lines[i].strip()
                if re.match(r'Category\s+\d+:', line):
                    break
                pm = re.match(r'(\d+)\) Prompt Title: (.+)', line)
                if pm:
                    num = pm.group(1)
                    prompt_title = pm.group(2)
                    i += 1
                    exact = when = caution = ''
                    mode = None
                    while i < len(lines):
                        s = lines[i].strip()
                        if re.match(r'(\d+)\) Prompt Title: ', s) or re.match(r'Category\s+\d+:', s) or s.startswith('Final Section:') or s.startswith('How to Validate AI Output Before Production'):
                            break
                        if s == 'Exact Prompt Text:': mode = 'exact'; i += 1; continue
                        if s == 'When to Use It:': mode = 'when'; i += 1; continue
                        if s == 'Caution / Validation Note:': mode = 'caution'; i += 1; continue
                        if s:
                            if mode == 'exact': exact += (' ' if exact else '') + s
                            elif mode == 'when': when += (' ' if when else '') + s
                            elif mode == 'caution': caution += (' ' if caution else '') + s
                        i += 1
                    category['prompts'].append({'num': num, 'title': prompt_title, 'exact': exact, 'when': when, 'caution': caution})
                    continue
                i += 1
            categories.append(category)
            continue
        i += 1

    doc = SimpleDocTemplate(str(OUT_DIR / '50-ai-prompts-for-desktop-engineers.pdf'), pagesize=LETTER,
                            leftMargin=50, rightMargin=50, topMargin=56, bottomMargin=46)
    story = []
    story.append(Spacer(1, 0.1*inch))
    story.append(PageBreak())
    story.append(Paragraph('Use this prompt library to move faster without letting AI make production decisions for you.', styles['BodyX']))
    story.append(Spacer(1, 6))
    story.append(Table([
        [badge('50 tested prompt patterns', SUCCESS, colors.HexColor('#86efac'), SUCCESS_DARK),
         badge('Intune + SCCM + PowerShell', ACCENT, PRIMARY, PRIMARY_DARK),
         badge('Built for enterprise workflows', WARN, colors.HexColor('#fbbf24'), WARN_DARK)]
    ], colWidths=[1.8*inch, 2.0*inch, 2.2*inch], style=[('VALIGN',(0,0),(-1,-1),'TOP')]))
    story.append(Spacer(1, 14))
    for h, body in intro:
        story.append(Paragraph(h, styles['SectionTitle']))
        story.append(Paragraph(clean(body), styles['BodyX']))
    story.append(Paragraph('How this guide is organized', styles['SectionTitle']))
    data = [[str(idx+1), c['title'], str(len(c['prompts']))] for idx, c in enumerate(categories)]
    tbl = Table([['#', 'Category', 'Prompts']] + data, colWidths=[0.45*inch, 4.85*inch, 1.0*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_DARK), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), HEAD_FONT), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('FONTNAME', (0,1), (-1,-1), BODY_FONT), ('GRID', (0,0), (-1,-1), 0.4, LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    for ci, category in enumerate(categories, 1):
        story.append(Paragraph(f'Category {ci}', styles['SmallCaps']))
        story.append(Paragraph(clean(category['title']), styles['SectionTitle']))
        story.append(Paragraph('Use these prompts as starting frameworks. Paste in your actual evidence, output, and environment details before trusting the result.', styles['BodySmall']))
        for p in category['prompts']:
            card = []
            header = Table([[Paragraph(f"{p['num']}. {clean(p['title'])}", styles['PromptTitle'])]], colWidths=[6.7*inch])
            header.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#eff6ff')),
                ('BOX',(0,0),(-1,-1),0.6, colors.HexColor('#bfdbfe')),
                ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
                ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
            ]))
            card.append(header)
            card.append(Spacer(1, 5))
            card.append(Paragraph('Exact prompt', styles['CardLabel']))
            card.append(Paragraph(clean(p['exact']), styles['BodyX']))
            card.append(Paragraph('When to use it', styles['CardLabel']))
            card.append(Paragraph(clean(p['when']), styles['BodyX']))
            card.append(Paragraph('Validation note', styles['CardLabel']))
            card.append(Paragraph(clean(p['caution']), styles['BodyX']))
            card.append(Spacer(1, 8))
            story.append(KeepTogether(card))
        if ci != len(categories):
            story.append(PageBreak())

    story.append(PageBreak())
    story.append(Paragraph('Validate AI output before production', styles['SectionTitle']))
    final_points = [
        'Confirm the real task, the scope, and the intended execution context.',
        'Check environment assumptions: OS, management state, permissions, modules, network, and tenant dependencies.',
        'Review for security risk, destructive actions, and sensitive data exposure.',
        'Test in layers: syntax, lab, pilot, then staged rollout.',
        'Require named human sign-off before production deployment.'
    ]
    for pt in final_points:
        story.append(Paragraph(clean(pt), styles['BulletX'], bulletText='•'))
    doc.build(story, onFirstPage=lambda c,d: cover_canvas(c,d,'50 AI Prompts\\nfor Desktop Engineers', subtitle,
                                                          ['50 enterprise-ready prompts', 'Intune, SCCM, PowerShell, Windows troubleshooting', 'Validation notes for every prompt']),
              onLaterPages=later_pages)

def build_checklist_pdf():
    text = CHECKLIST_SRC.read_text().splitlines()
    title = text[0].strip()
    subtitle = text[3].strip()
    # capture sections
    sections = []
    current = None
    intro = []
    for line in text[5:]:
        s = line.strip()
        if not s:
            continue
        if re.match(r'\d+\. ', s) and 'Purpose:' in s:
            if current: sections.append(current)
            header, purpose = s.split('Purpose:', 1)
            current = {'title': header.strip(), 'purpose': purpose.strip(), 'lines': []}
        elif current is None:
            intro.append(s)
        else:
            current['lines'].append(s)
    if current: sections.append(current)

    doc = SimpleDocTemplate(str(OUT_DIR / 'ai-output-validation-checklist-for-endpoint-teams.pdf'), pagesize=LETTER,
                            leftMargin=50, rightMargin=50, topMargin=56, bottomMargin=46)
    story = [Spacer(1, 0.1*inch), PageBreak()]
    story.append(Paragraph('Validation is the difference between using AI as an accelerator and letting it ship preventable mistakes into production.', styles['BodyX']))
    story.append(Spacer(1,8))
    steps_tbl = Table([
        ['1', 'Define the real task'],
        ['2', 'Verify assumptions'],
        ['3', 'Review for risk'],
        ['4', 'Test in layers'],
        ['5', 'Require human sign-off'],
    ], colWidths=[0.45*inch, 5.95*inch])
    steps_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f8fafc')),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.HexColor('#eff6ff'), colors.white]),
        ('BOX',(0,0),(-1,-1),0.6,LIGHT), ('GRID',(0,0),(-1,-1),0.3,LIGHT),
        ('FONTNAME',(0,0),(0,-1),HEAD_FONT), ('FONTNAME',(1,0),(1,-1),BODY_FONT),
        ('FONTSIZE',(0,0),(-1,-1),10), ('TEXTCOLOR',(0,0),(0,-1),PRIMARY_DARK),
        ('LEFTPADDING',(0,0),(-1,-1),8), ('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    story.append(steps_tbl)
    story.append(Spacer(1, 12))
    for para in intro[:6]:
        story.append(Paragraph(clean(para), styles['BodyX']))

    for sec in sections:
        story.append(Paragraph(clean(sec['title']), styles['SectionTitle']))
        story.append(Paragraph(clean(sec['purpose']), styles['BodySmall']))
        mode = None
        checklist, redflags, good = [], [], []
        for line in sec['lines']:
            if line == 'Checklist': mode = 'check'; continue
            if line == 'What good looks like': mode = 'good'; continue
            if line == 'Red flags': mode = 'red'; continue
            if mode == 'check' and line.startswith('- '): checklist.append(line[2:])
            elif mode == 'red' and line.startswith('- '): redflags.append(line[2:])
            elif mode == 'good': good.append(line)
        if good:
            good_tbl = Table([[Paragraph('<b>What good looks like</b>', styles['BodySmall']), Paragraph(clean(' '.join(good)), styles['BodySmall'])]], colWidths=[1.4*inch, 5.2*inch])
            good_tbl.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),SUCCESS), ('BOX',(0,0),(-1,-1),0.5, colors.HexColor('#86efac')),
                ('LEFTPADDING',(0,0),(-1,-1),8), ('RIGHTPADDING',(0,0),(-1,-1),8), ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
            ]))
            story.append(good_tbl)
            story.append(Spacer(1,6))
        for item in checklist[:10]:
            story.append(Paragraph(clean(item), styles['BulletX'], bulletText='□'))
        if len(checklist) > 10:
            story.append(Paragraph(f'{len(checklist)-10} additional review checks omitted here in layout? No — keep the master text version alongside this PDF for full detail.', styles['BodySmall']))
        if redflags:
            rf = Table([[Paragraph('<b>Red flags</b>', styles['BodySmall']), Paragraph(clean(' • '.join(redflags[:5])), styles['BodySmall'])]], colWidths=[1.0*inch, 5.6*inch])
            rf.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),WARN), ('BOX',(0,0),(-1,-1),0.5, colors.HexColor('#fbbf24')),
                ('LEFTPADDING',(0,0),(-1,-1),8), ('RIGHTPADDING',(0,0),(-1,-1),8), ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
            ]))
            story.append(Spacer(1,5))
            story.append(rf)
        story.append(Spacer(1,10))

    story.append(PageBreak())
    story.append(Paragraph('Printable one-page sign-off checklist', styles['SectionTitle']))
    printable = [
        'Task and scope are clearly defined.',
        'Environment assumptions have been reviewed and confirmed.',
        'Permissions and security impact have been checked.',
        'Sensitive data handling is compliant with policy.',
        'Scripts, queries, or logic have been reviewed line by line.',
        'Known positive and negative test cases have passed.',
        'Pilot scope is defined and limited.',
        'Rollback steps are documented and realistic.',
        'Monitoring signals are in place.',
        'A named human owner approved the change.'
    ]
    box_rows = []
    for item in printable:
        box_rows.append(['☐', item, ''])
    ptbl = Table([['', 'Checklist item', 'Owner / notes']] + box_rows, colWidths=[0.35*inch, 4.4*inch, 2.0*inch])
    ptbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),PRIMARY_DARK), ('TEXTCOLOR',(0,0),(-1,0),colors.white), ('FONTNAME',(0,0),(-1,0),HEAD_FONT),
        ('FONTNAME',(0,1),(-1,-1),BODY_FONT), ('FONTSIZE',(0,0),(-1,-1),9),
        ('GRID',(0,0),(-1,-1),0.4,LIGHT), ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor('#f8fafc')]),
        ('LEFTPADDING',(0,0),(-1,-1),6), ('RIGHTPADDING',(0,0),(-1,-1),6), ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    story.append(ptbl)
    doc.build(story, onFirstPage=lambda c,d: cover_canvas(c,d,'AI Output Validation\\nChecklist for Endpoint Teams', subtitle,
                                                          ['5-step validation framework', 'Review scripts, policies, detections, and reports', 'Printable sign-off page included']),
              onLaterPages=later_pages)

if __name__ == '__main__':
    build_prompt_pdf()
    build_checklist_pdf()
    print('Generated PDFs in', OUT_DIR)
