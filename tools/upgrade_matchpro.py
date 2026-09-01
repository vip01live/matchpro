from pathlib import Path
import html
import re
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = 'https://matchpro.xo.je'
CHANNELS_FILE = ROOT / 'main' / 'js' / 'channels.js'


def read_channels():
    text = CHANNELS_FILE.read_text(encoding='utf-8')
    out = {}
    pattern = re.compile(
        r"\{id:(\d+),file:'([^']+)',nameRu:'([^']*)',nameEn:'([^']*)',logo:'([^']*)',"
        r"titleRu:'([^']*)',titleEn:'([^']*)',descriptionRu:'([^']*)',descriptionEn:'([^']*)',"
        r"keywordsRu:'([^']*)',keywordsEn:'([^']*)'\}"
    )
    for m in pattern.finditer(text):
        out[m.group(2)] = {
            'id': m.group(1), 'file': m.group(2), 'nameRu': m.group(3), 'nameEn': m.group(4),
            'logo': m.group(5), 'titleRu': m.group(6), 'titleEn': m.group(7),
            'descriptionRu': m.group(8), 'descriptionEn': m.group(9),
            'keywordsRu': m.group(10), 'keywordsEn': m.group(11)
        }
    return out


def upsert_meta(text, name, content):
    pattern = re.compile(r'<meta\s+name=["\']' + re.escape(name) + r'["\'][^>]*>', re.I)
    tag = f'<meta name="{name}" content="{html.escape(content, quote=True)}">'
    if pattern.search(text):
        return pattern.sub(tag, text, count=1)
    return re.sub(r'</head>', '    ' + tag + '\n</head>', text, count=1, flags=re.I)


def upsert_property(text, prop, content):
    pattern = re.compile(r'<meta\s+property=["\']' + re.escape(prop) + r'["\'][^>]*>', re.I)
    tag = f'<meta property="{prop}" content="{html.escape(content, quote=True)}">'
    if pattern.search(text):
        return pattern.sub(tag, text, count=1)
    return re.sub(r'</head>', '    ' + tag + '\n</head>', text, count=1, flags=re.I)


def upsert_link(text, rel, href, extra=''):
    pattern = re.compile(r'<link\s+[^>]*rel=["\']' + re.escape(rel) + r'["\'][^>]*>', re.I)
    tag = f'<link rel="{rel}" href="{html.escape(href, quote=True)}"{extra}>'
    if pattern.search(text):
        return pattern.sub(tag, text, count=1)
    return re.sub(r'</head>', '    ' + tag + '\n</head>', text, count=1, flags=re.I)


def ensure_asset(text, tag):
    if tag in text:
        return text
    return re.sub(r'</head>', '    ' + tag + '\n</head>', text, count=1, flags=re.I)


def replace_footer(text):
    text = re.sub(r'<a[^>]*href=["\']https://t\.me/nappsam["\'][^>]*>\s*Powered by NAPPS\s*</a>', 'Powered by <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">SkyXCode</a>', text, flags=re.I)
    text = re.sub(r'Powered by NAPPS', 'Powered by <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">SkyXCode</a>', text, flags=re.I)
    text = re.sub(r'©\s*202[0-9]\s*MatchPro', '© <span id="year"></span> MatchPro', text, flags=re.I)
    return text


def process_page(path, item=None):
    text = path.read_text(encoding='utf-8', errors='ignore')
    text = re.sub(r'\s*<base\s+href=[^>]*>\s*', '\n', text, flags=re.I)
    text = re.sub(r'<html([^>]*)lang=["\']hy["\']([^>]*)>', r'<html\1lang="ru"\2>', text, flags=re.I)
    if re.search(r'<html[^>]*lang=', text, re.I) is None:
        text = re.sub(r'<html([^>]*)>', r'<html\1 lang="ru">', text, count=1, flags=re.I)

    if item:
        text = re.sub(r'<title>.*?</title>', f'<title>{html.escape(item["titleRu"])}</title>', text, count=1, flags=re.I|re.S)
        text = upsert_meta(text, 'description', item['descriptionRu'])
        text = upsert_meta(text, 'keywords', item['keywordsRu'])
        text = upsert_meta(text, 'robots', 'index, follow, max-image-preview:large')
        text = upsert_meta(text, 'googlebot', 'index, follow')
        text = upsert_property(text, 'og:title', item['titleRu'])
        text = upsert_property(text, 'og:description', item['descriptionRu'])
        text = upsert_property(text, 'og:type', 'website')
        text = upsert_property(text, 'og:image', item['logo'])
        text = upsert_property(text, 'og:url', f'/?id={item["id"]}&lang=ru')
        text = upsert_link(text, 'canonical', f'./?id={item["id"]}&lang=ru')
        text = upsert_link(text, 'alternate', f'./?id={item["id"]}&lang=ru', ' hreflang="ru"')
        text = upsert_link(text, 'alternate', f'./?id={item["id"]}&lang=en', ' hreflang="en"')
        text = re.sub(r'<body([^>]*)>', rf'<body\1 data-matchpro-channel-id="{item["id"]}">', text, count=1, flags=re.I)
    else:
        text = re.sub(r'<title>.*?</title>', '<title>Спортивные каналы онлайн в прямом эфире | MatchPro</title>', text, count=1, flags=re.I|re.S)
        text = upsert_meta(text, 'description', 'Смотрите спортивные каналы и прямые трансляции онлайн на разных устройствах.')
        text = upsert_meta(text, 'keywords', 'спортивные каналы онлайн, прямой эфир, спорт онлайн, футбол, хоккей, баскетбол')
        text = upsert_meta(text, 'robots', 'index, follow, max-image-preview:large')
        text = upsert_meta(text, 'googlebot', 'index, follow')
        text = upsert_property(text, 'og:title', 'Спортивные каналы онлайн в прямом эфире | MatchPro')
        text = upsert_property(text, 'og:description', 'Смотрите спортивные каналы и прямые трансляции онлайн.')
        text = upsert_property(text, 'og:type', 'website')
        text = upsert_property(text, 'og:url', './')
        text = upsert_link(text, 'canonical', './')
        text = upsert_link(text, 'alternate', './?lang=ru', ' hreflang="ru"')
        text = upsert_link(text, 'alternate', './?lang=en', ' hreflang="en"')

    text = ensure_asset(text, '<link rel="stylesheet" href="/main/900-css/matchpro.css">')
    text = ensure_asset(text, '<script src="/main/js/player-config.js" defer></script>')
    text = ensure_asset(text, '<script src="/main/js/channels.js" defer></script>')
    text = ensure_asset(text, '<script src="/main/js/matchpro.js" defer></script>')
    text = ensure_asset(text, '<script src="/main/js/matchpro-enhance.js" defer></script>')
    text = replace_footer(text)
    path.write_text(text, encoding='utf-8')


def write_sitemap(channels):
    urls = [SITE_URL + '/']
    for item in channels.values():
        urls.append(f'{SITE_URL}/?id={item["id"]}&lang=ru')
        urls.append(f'{SITE_URL}/?id={item["id"]}&lang=en')
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        body.append('  <url><loc>' + html.escape(u, quote=False) + '</loc></url>')
    body.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(body) + '\n', encoding='utf-8')


def main():
    channels = read_channels()
    for path in ROOT.glob('*.html'):
        if path.name.lower() in {'404.html'}:
            continue
        item = channels.get(path.name)
        process_page(path, item)
    write_sitemap(channels)
    (ROOT / 'robots.txt').write_text(
        'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n', encoding='utf-8'
    )


if __name__ == '__main__':
    main()
