"""Builds the Acme Labs HRMS add-ons from the source files.

    python3 source/build.py                          # updates Acme Labs HRMS_files/addons.js and addons.css
    python3 source/build.py --single OUT.html        # also writes the one-file version (everything inlined)

Edit the files in source/addons and source/styles, then run this script. Do not edit addons.js / addons.css
directly: they are rebuilt from the sources every time."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # the HRMS folder
FILES = os.path.join(ROOT, 'Acme Labs HRMS_files')
HTML = os.path.join(ROOT, 'Acme Labs HRMS.html')
STYLE_ORDER = ['documents', 'dashboard', 'tasks', 'incentives', 'payroll-layout', 'attendance-leave', 'attendance-import', 'people-modules', 'career-record', 'labour-news', 'privacy', 'holidays', 'dash-game', 'people-extra', 'theme', 'space-theme', 'space-extra']
LIBS = ['fonts.js', 'jspdf.min.js', 'xlsx.min.js', 'imported-data.js', 'logo.js', 'app.js']   # loaded before the add-ons
LAZY = ['html2canvas.min.js', 'docx.umd.js']                                                # loaded only when needed


def make_space_theme():
    # the dark "Space" theme is generated from the other stylesheets, so it always covers every screen
    import importlib.util
    spec = importlib.util.spec_from_file_location('space_theme', os.path.join(HERE, 'tools', 'space_theme.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.build()


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def build_addons():
    make_space_theme()
    styles = {n: read(os.path.join(HERE, 'styles', n + '.css')) for n in STYLE_ORDER}
    css = '/* Acme Labs HRMS add-ons. Built by source/build.py from source/styles/*.css: edit those files. */\n'
    css += '\n'.join(f'/* ---------- {n} ---------- */\n{styles[n]}' for n in STYLE_ORDER)
    modules = sorted(f for f in os.listdir(os.path.join(HERE, 'addons')) if f.endswith('.js'))
    body = '\n'.join(f'/* ===== {m} ===== */\n' + read(os.path.join(HERE, 'addons', m)) for m in modules)
    doc_css = json.dumps(styles['documents']).replace('</', '<\\/')
    assert body.count('__DOC_CSS__') == 1, 'the __DOC_CSS__ marker must appear once (10-documents.js)'
    body = body.replace('__DOC_CSS__', doc_css)
    js = ('/* Acme Labs HRMS add-ons: Dashboard, Tasks, Holidays, Documents (letters), Increments, Add incentives,\n'
          '   hide amounts. Loaded after app.js. Built by source/build.py from source/addons/*.js: edit those files. */\n'
          "(function(){\n'use strict';\n" + body + '\n})();\n')
    write(os.path.join(FILES, 'addons.css'), css)
    write(os.path.join(FILES, 'addons.js'), js)
    print('addons.js', len(js), 'bytes from', len(modules), 'modules;', 'addons.css', len(css), 'bytes')


def build_single(out, data=None):
    """one HTML file with every script, style, font and the logo inlined (works offline, nothing to unzip)"""
    h = read(HTML)
    safe = lambda js: js.replace('<!--', '<\\u0021--').replace('<script', '<\\u0073cript').replace('<SCRIPT', '<\\u0053CRIPT')
    for tag in ['<link rel="stylesheet" href="./Acme Labs HRMS_files/styles.css">\n',
                '<link rel="stylesheet" href="./Acme Labs HRMS_files/addons.css">\n']:
        assert h.count(tag) == 1, tag
        h = h.replace(tag, '')
    for f in LIBS + ['addons.js']:
        tag = f'  <script defer="" src="./Acme Labs HRMS_files/{f}"></script>\n'
        assert h.count(tag) == 1, f
        h = h.replace(tag, '')
    for f in LIBS + LAZY + ['addons.js']:
        assert '</script' not in read(os.path.join(FILES, f)).lower(), f
    logo = re.search(r"window\.ACMELABS_LOGO='([^']+)'", read(os.path.join(FILES, 'logo.js'))).group(1)
    h = h.replace('src="./Acme Labs HRMS_files/logo.png"', f'src="{logo}"')
    assert 'HRMS_files' not in h, 'a file reference is still left in the HTML'
    i = h.index('</head>')
    h = h[:i] + '<style>\n' + read(os.path.join(FILES, 'styles.css')) + '\n' + read(os.path.join(FILES, 'addons.css')) + '\n</style>\n' + h[i:]
    i = h.rindex('</body>')
    # a copy of the page as first loaded, so the HRMS can save itself as one file with the data inside (64-one-file.js)
    shell = "<script>/* shell */\nwindow.HRMS_SHELL = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;\n</script>\n"
    emb = ''
    if data:  # the saved data travels inside the file (window.HRMS_EMBEDDED), read before app.js
        emb = '<script>/* embedded data */\nwindow.HRMS_EMBEDDED = ' + safe(read(data).strip()).replace('</', '<\\/') + ';\n</script>\n'
    h = h[:i] + shell + emb + ''.join(f'<script>/* {f} */\n{safe(read(os.path.join(FILES, f)))}\n</script>\n' for f in LIBS + LAZY + ['addons.js']) + h[i:]
    write(out, h)
    print('single file', out, len(h), 'bytes')


if __name__ == '__main__':
    build_addons()
    if '--single' in sys.argv:
        data = sys.argv[sys.argv.index('--data') + 1] if '--data' in sys.argv else None
        build_single(sys.argv[sys.argv.index('--single') + 1], data)
