"""Builds source/styles/space-theme.css: the dark "Space" look of the HRMS (matches the hyperspace loading screen).

It reads every stylesheet of the app and, for each rule that sets a light background, a dark text colour or a
light border, writes the same rule under `html.space` with a matching dark-theme colour (hue kept, lightness
moved). Letters / document pages (documents.css, the A4 paper) stay white because they are printed and sent.
Run by build.py, so new screens pick up the theme automatically; hand-tuned rules live in space-extra.css.
"""
import colorsys, os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_FILES = {'documents.css', 'space-theme.css', 'space-extra.css', 'dash-game.css'}  # dash-game.css carries its own Space rules
# selectors that belong to printed / exported documents and must stay light
KEEP_LIGHT = re.compile(r'\.a4|\.paper|\.pages|\.lbody|\.slip-sheet|#slipDoc|\.doc-page|\.dprev|@page|print')

NAMED = {'white': '#ffffff', 'black': '#000000'}
COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b')


def parse(c):
    c = NAMED.get(c, c)
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4):
            h = ''.join(x * 2 for x in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return r, g, b, a
    nums = re.findall(r'[\d.]+%?', c)
    if len(nums) < 3:
        return None
    r, g, b = (float(n.rstrip('%')) * (2.55 if n.endswith('%') else 1) for n in nums[:3])
    a = float(nums[3].rstrip('%')) / (100 if nums[3].endswith('%') else 1) if len(nums) > 3 else 1
    return r, g, b, a


def fmt(r, g, b, a=1):
    r, g, b = (max(0, min(255, round(x))) for x in (r, g, b))
    return f'#{r:02x}{g:02x}{b:02x}' if a >= 0.999 else f'rgba({r},{g},{b},{a:.3g})'


def hls(r, g, b):
    return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)


def from_hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return r * 255, g * 255, b * 255


SURFACE = (18, 22, 54)  # #121636: cards and panels


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def bg(c):
    p = parse(c)
    if not p:
        return c
    r, g, b, a = p
    h, l, s = hls(r, g, b)
    if a < 0.999 and l > 0.6:  # light translucent wash: becomes a faint light-on-dark wash
        return fmt(160, 175, 255, min(a, 0.10) if s < 0.2 else a * 0.5)
    if l >= 0.93:  # white / off-white surfaces
        base = SURFACE if l >= 0.985 else (14, 17, 44)
        tint = from_hls(h, 0.5, min(1, s))
        return fmt(*mix(base, tint, 0.10 if s > 0.25 else 0), a)
    if l >= 0.74:  # soft tints (pale blue, pale green, pale red badges)
        tint = from_hls(h, 0.5, min(1, s))
        return fmt(*mix((20, 24, 60), tint, 0.24 if s > 0.15 else 0.06), a)
    return c  # strong colours (buttons, chips) keep their colour


def fg(c):
    p = parse(c)
    if not p:
        return c
    r, g, b, a = p
    h, l, s = hls(r, g, b)
    if l < 0.3:  # near-black and dark navy text
        return fmt(*((232, 236, 255) if s < 0.35 else from_hls(h, 0.86, 0.7)), a)
    if s < 0.15 and l < 0.75:  # grey text
        return fmt(154, 163, 199, a) if l > 0.38 else fmt(196, 202, 226, a)
    if l < 0.62:  # saturated colours (brand, status) brightened to stay readable on dark
        return fmt(*from_hls(h, 0.68, min(1, s * 1.05)), a)
    return c


def line(c):
    p = parse(c)
    if not p:
        return c
    r, g, b, a = p
    h, l, s = hls(r, g, b)
    if l >= 0.72:
        return fmt(150, 170, 255, 0.16 if s < 0.3 else 0.28)
    if l < 0.62 and s > 0.15:
        return fmt(*from_hls(h, 0.66, s), a)
    return c


PROP = {
    'background': bg, 'background-color': bg, 'background-image': bg,
    'color': fg, 'fill': fg, 'stroke': fg, 'caret-color': fg, 'accent-color': None,
    'border': line, 'border-color': line, 'border-top': line, 'border-bottom': line, 'border-left': line,
    'border-right': line, 'border-top-color': line, 'border-bottom-color': line, 'outline': line,
    'border-left-color': line, 'border-right-color': line,
}


def convert_decls(body):
    out = []
    for decl in body.split(';'):
        if ':' not in decl:
            continue
        prop, val = decl.split(':', 1)
        prop = prop.strip().lower()
        f = PROP.get(prop)
        if not f or not COLOR_RE.search(val):
            continue
        new = COLOR_RE.sub(lambda m: f(m.group(0)), val)
        if new.strip() != val.strip():
            out.append(f'{prop}:{new.strip()}')
    return out


def scoped(selector):
    parts = []
    for sel in selector.split(','):
        sel = sel.strip()
        if not sel:
            continue
        if sel.startswith(':root'):
            continue
        if re.match(r'^(html|body)\b', sel):
            parts.append('html.space ' + sel[4:] if sel.startswith('html') else 'html.space ' + sel)
        else:
            parts.append('html.space ' + sel)
    return ','.join(parts)


def walk(css, wrap=None):
    out = []
    i = 0
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    while i < len(css):
        j = css.find('{', i)
        if j < 0:
            break
        head = css[i:j].strip()
        if head.startswith('@media') or head.startswith('@supports'):
            depth, k = 1, j + 1
            while depth and k < len(css):
                depth += {'{': 1, '}': -1}.get(css[k], 0)
                k += 1
            if 'print' not in head:
                inner = walk(css[j + 1:k - 1])
                if inner:
                    out.append(head + '{' + ''.join(inner) + '}')
            i = k
            continue
        if head.startswith('@'):
            depth, k = 1, j + 1
            while depth and k < len(css):
                depth += {'{': 1, '}': -1}.get(css[k], 0)
                k += 1
            i = k
            continue
        k = css.find('}', j)
        body = css[j + 1:k]
        i = k + 1
        if KEEP_LIGHT.search(head):
            continue
        decls = convert_decls(body)
        sel = scoped(head)
        if decls and sel:
            out.append(sel + '{' + ';'.join(decls) + '}')
    return out


def build():
    files = [os.path.join(os.path.dirname(HERE), 'Acme Labs HRMS_files', 'styles.css')]
    files += sorted(os.path.join(HERE, 'styles', f) for f in os.listdir(os.path.join(HERE, 'styles')) if f.endswith('.css') and f not in SKIP_FILES)
    rules = []
    for f in files:
        rules.append(f'/* from {os.path.basename(f)} */')
        rules += walk(open(f, encoding='utf-8').read())
    head = ('/* GENERATED by source/tools/space_theme.py from the other stylesheets: do not edit by hand.\n'
            '   Hand-tuned parts of the Space theme are in space-extra.css. */\n')
    open(os.path.join(HERE, 'styles', 'space-theme.css'), 'w', encoding='utf-8').write(head + '\n'.join(rules) + '\n')
    return len(rules)


if __name__ == '__main__':
    print(build(), 'rules')
