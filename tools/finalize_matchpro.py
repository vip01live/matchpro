from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parents[1]
CHANNELS_FILE = ROOT / 'main' / 'js' / 'channels.js'


def read_channels():
    text = CHANNELS_FILE.read_text(encoding='utf-8')
    pattern = re.compile(r"\{id:(\d+),file:'([^']+)',nameRu:'([^']*)',nameEn:'([^']*)'")
    return {m.group(2): m.group(1) for m in pattern.finditer(text)}


def footer(text):
    # Remove every old footer and replace it with one shared structure.
    shared = '''<footer class="matchpro-footer">
  <p>© <span id="year"></span></p>
</footer>'''
    text = re.sub(r'<footer\b[^>]*>.*?</footer>', shared, text, flags=re.I | re.S)
    if '<footer' not in text.lower():
        text = re.sub(r'</body>', shared + '\n</body>', text, count=1, flags=re.I)
    return text


def assets(text):
    tags = [
        '<link rel="stylesheet" href="/main/900-css/matchpro.css">',
        '<script src="/main/js/player-config.js" defer></script>',
        '<script src="/main/js/channels.js" defer></script>',
        '<script src="/main/js/ads-loader.js" defer></script>',
        '<script src="/main/js/matchpro.js" defer></script>',
        '<script src="/main/js/matchpro-enhance.js" defer></script>',
    ]
    for tag in tags:
        text = re.sub(re.escape(tag), '', text, flags=re.I)
        text = re.sub(r'</head>', '    ' + tag + '\n</head>', text, count=1, flags=re.I)
    return text


def id_links(text, channels):
    # Convert channel-page links to ID-only public URLs.
    for filename, cid in channels.items():
        escaped = re.escape(filename)
        text = re.sub(r'href=["\'](?:\./|/)?' + escaped + r'(?:\?[^"\']*)?["\']',
                      f'href="./?id={cid}"', text, flags=re.I)
    # Also remove language from generated channel URLs: channel identity is ID only.
    text = re.sub(r'(href=["\'][^"\']*\?id=\d+)[^"\']*["\']', r'\1"', text, flags=re.I)
    return text


def clean_body_attrs(text):
    # Keep exactly one channel id attribute when present.
    def fix(m):
        attrs = m.group(1)
        ids = re.findall(r'\sdata-matchpro-channel-id=["\']\d+["\']', attrs, flags=re.I)
        attrs = re.sub(r'\sdata-matchpro-channel-id=["\']\d+["\']', '', attrs, flags=re.I)
        return '<body' + attrs + (ids[-1] if ids else '') + '>'
    return re.sub(r'<body([^>]*)>', fix, text, count=1, flags=re.I)


def process(path, channels):
    text = path.read_text(encoding='utf-8', errors='ignore')
    text = footer(text)
    text = assets(text)
    text = id_links(text, channels)
    text = clean_body_attrs(text)
    path.write_text(text, encoding='utf-8')


def main():
    channels = read_channels()
    for path in ROOT.glob('*.html'):
        if path.name.lower() == '404.html':
            continue
        process(path, channels)

if __name__ == '__main__':
    main()
