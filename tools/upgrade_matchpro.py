from __future__ import annotations

import html
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = os.environ.get("MATCHPRO_SITE_URL", "https://matchprotv.vercel.app").rstrip("/")
CHANNELS_FILE = ROOT / "main" / "js" / "channels.js"


def read_channels() -> dict[str, dict]:
    source = CHANNELS_FILE.read_text(encoding="utf-8")
    match = re.search(r"window\.MATCHPRO_CHANNELS\s*=\s*(\[.*\])\s*;\s*$", source, re.S)
    if not match:
        raise ValueError("Could not parse main/js/channels.js as a JSON-compatible channel registry.")
    channels = json.loads(match.group(1))
    return {item["file"]: item for item in channels}


def set_meta(source: str, name: str, content: str) -> str:
    tag = f'<meta name="{name}" content="{html.escape(content, quote=True)}">'
    pattern = re.compile(r'<meta\b(?=[^>]*\bname=["\']' + re.escape(name) + r'["\'])[^>]*>', re.I)
    if pattern.search(source):
        return pattern.sub(tag, source, count=1)
    return re.sub(r"</head\s*>", "    " + tag + "\n</head>", source, count=1, flags=re.I)


def set_property(source: str, prop: str, content: str) -> str:
    tag = f'<meta property="{prop}" content="{html.escape(content, quote=True)}">'
    pattern = re.compile(r'<meta\b(?=[^>]*\bproperty=["\']' + re.escape(prop) + r'["\'])[^>]*>', re.I)
    if pattern.search(source):
        return pattern.sub(tag, source, count=1)
    return re.sub(r"</head\s*>", "    " + tag + "\n</head>", source, count=1, flags=re.I)


def set_link(source: str, rel: str, href: str, hreflang: str | None = None) -> str:
    if hreflang:
        pattern = re.compile(
            r'<link\b(?=[^>]*\brel=["\']' + re.escape(rel) + r'["\'])'
            r'(?=[^>]*\bhreflang=["\']' + re.escape(hreflang) + r'["\'])[^>]*>',
            re.I,
        )
        tag = f'<link rel="{rel}" href="{html.escape(href, quote=True)}" hreflang="{hreflang}">'
    else:
        pattern = re.compile(r'<link\b(?=[^>]*\brel=["\']' + re.escape(rel) + r'["\'])[^>]*>', re.I)
        tag = f'<link rel="{rel}" href="{html.escape(href, quote=True)}">'
    if pattern.search(source):
        return pattern.sub(tag, source, count=1)
    return re.sub(r"</head\s*>", "    " + tag + "\n</head>", source, count=1, flags=re.I)


def ensure_asset(source: str, tag: str) -> str:
    if tag in source:
        return source
    return re.sub(r"</head\s*>", "    " + tag + "\n</head>", source, count=1, flags=re.I)


def replace_footer(source: str) -> str:
    source = re.sub(
        r'<a[^>]*href=["\']https://t\.me/nappsam["\'][^>]*>\s*Powered by NAPPS\s*</a>',
        'Powered by <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer">SkyXCode</a>',
        source,
        flags=re.I,
    )
    source = re.sub(r"Powered by NAPPS", "Powered by SkyXCode", source, flags=re.I)
    source = re.sub(r"©\s*202[0-9]\s*MatchPro", '© <span id="year"></span> MatchPro', source, flags=re.I)
    source = re.sub(r"(<header[^>]*>\s*<a\s+)href=[\"'][^\"']+[\"']", r'\1href="./"', source, count=1, flags=re.I | re.S)
    return source


def set_html_language(source: str, language: str = "hy") -> str:
    if re.search(r"<html\b[^>]*\blang=", source, re.I):
        return re.sub(r'(<html\b[^>]*\blang=["\'])[^"\']*(["\'])', rf"\g<1>{language}\2", source, count=1, flags=re.I)
    return re.sub(r"<html\b", f'<html lang="{language}"', source, count=1, flags=re.I)


def process_page(path: Path, item: dict | None = None) -> None:
    source = path.read_text(encoding="utf-8", errors="ignore")
    source = re.sub(r"\s*<base\s+href=[^>]*>\s*", "\n", source, flags=re.I)
    source = set_html_language(source, "hy")

    if item:
        channel_id = str(item["id"])
        title = item.get("titleHy") or item.get("titleRu") or item.get("titleEn") or "Մարզական ալիքներ | MatchPro"
        description = item.get("descriptionHy") or item.get("descriptionRu") or item.get("descriptionEn") or ""
        keywords = item.get("keywordsHy") or item.get("keywordsRu") or item.get("keywordsEn") or ""
        url = f"{SITE_URL}/?id={channel_id}&lang=hy"
        source = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", source, count=1, flags=re.I | re.S)
        for name, value in [
            ("description", description),
            ("keywords", keywords),
            ("robots", "index, follow, max-image-preview:large"),
            ("googlebot", "index, follow"),
        ]:
            source = set_meta(source, name, value)
        for prop, value in [
            ("og:title", title),
            ("og:description", description),
            ("og:type", "website"),
            ("og:image", item.get("logo", "")),
            ("og:url", url),
        ]:
            source = set_property(source, prop, value)
        source = set_link(source, "canonical", url)
        for language in ("hy", "ru", "en"):
            source = set_link(source, "alternate", f"{SITE_URL}/?id={channel_id}&lang={language}", language)
        def replace_body_tag(match: re.Match) -> str:
            attributes = re.sub(r'\sdata-matchpro-channel-id=["\'][^"\']*["\']', '', match.group(1), flags=re.I)
            return '<body' + attributes + f' data-matchpro-channel-id="{html.escape(channel_id, quote=True)}">'

        source = re.sub(r"<body\b([^>]*)>", replace_body_tag, source, count=1, flags=re.I)
    else:
        title = "Մարզական ալիքներ՝ ուղիղ եթերում | MatchPro"
        description = "Դիտեք ֆուտբոլի, հոկեյի, բասկետբոլի և այլ մարզաձևերի ուղիղ հեռարձակումները MatchPro-ում։"
        keywords = "մարզական ալիքներ առցանց, ուղիղ եթեր, ֆուտբոլ, հոկեյ, բասկետբոլ, MatchPro"
        source = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", source, count=1, flags=re.I | re.S)
        for name, value in [
            ("description", description),
            ("keywords", keywords),
            ("robots", "index, follow, max-image-preview:large"),
            ("googlebot", "index, follow"),
        ]:
            source = set_meta(source, name, value)
        for prop, value in [
            ("og:title", title),
            ("og:description", description),
            ("og:type", "website"),
            ("og:url", SITE_URL + "/"),
        ]:
            source = set_property(source, prop, value)
        source = set_link(source, "canonical", SITE_URL + "/")
        for language in ("hy", "ru", "en"):
            source = set_link(source, "alternate", f"{SITE_URL}/?lang={language}", language)

    source = ensure_asset(source, '<link rel="stylesheet" href="/main/900-css/matchpro.css">')
    source = ensure_asset(source, '<script src="/main/js/player-config.js" defer></script>')
    source = ensure_asset(source, '<script src="/main/js/channels.js" defer></script>')
    source = ensure_asset(source, '<script src="/main/js/matchpro.js" defer></script>')
    source = ensure_asset(source, '<script src="/main/js/matchpro-enhance.js" defer></script>')
    source = replace_footer(source)
    path.write_text(source, encoding="utf-8")


def write_sitemap(channels: dict[str, dict]) -> None:
    urls = [SITE_URL + "/"]
    for item in channels.values():
        for language in ("hy", "ru", "en"):
            urls.append(f'{SITE_URL}/?id={item["id"]}&lang={language}')
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    body.extend("  <url><loc>" + html.escape(url, quote=False) + "</loc></url>" for url in urls)
    body.append("</urlset>")
    sitemap = "\n".join(body) + "\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (ROOT / "sitemap-matchprotv.xml").write_text(sitemap, encoding="utf-8")


def main() -> None:
    channels = read_channels()
    for path in ROOT.glob("*.html"):
        if path.name.lower() in {"403.html", "404.html", "500.html", "copyright-en.html", "copyright-ru.html", "copyright-hy.html", "p2p-player.html"}:
            continue
        process_page(path, channels.get(path.name))
    write_sitemap(channels)
    (ROOT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nSitemap: " + SITE_URL + "/sitemap.xml\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
