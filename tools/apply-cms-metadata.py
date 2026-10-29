#!/usr/bin/env python3
"""Generate static SEO metadata for MatchPro pages during the Pages build."""
from pathlib import Path
import hashlib
import html
import json
import re
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

ROOT = Path(".")
SETTINGS_PATH = ROOT / "main/js/site-settings.json"
CHANNELS_PATH = ROOT / "main/js/channels.js"
LANGS = {"hy", "ru", "en"}
DOMAIN_FALLBACK = "https://vip01live.github.io/matchpro/"

def parse_channel_array():
    source = CHANNELS_PATH.read_text(encoding="utf-8")
    start, end = source.find("["), source.rfind("]")
    if start < 0 or end < start:
        raise ValueError("Cannot parse main/js/channels.js")
    value = json.loads(source[start:end + 1])
    if not isinstance(value, list):
        raise ValueError("Channel data must be an array")
    return value

def attr(value):
    return html.escape(str(value or ""), quote=True)

def versioned_asset(value):
    """Return local image URLs with a content hash so replaced files cannot stay stale in browser/CDN caches."""
    raw = str(value or "").strip()
    if not raw or re.match(r"^(?:https?:)?//|^(?:data:|blob:)", raw, re.I):
        return raw
    parts = urlsplit(raw)
    if parts.scheme or parts.netloc or not parts.path:
        return raw
    local_path = parts.path.lstrip("/")
    candidate = ROOT / local_path
    if not candidate.is_file() and local_path.startswith("matchpro/"):
        candidate = ROOT / local_path[len("matchpro/"):]
    if not candidate.is_file():
        return raw
    digest = hashlib.sha256(candidate.read_bytes()).hexdigest()[:12]
    query = [(key, item) for key, item in parse_qsl(parts.query, keep_blank_values=True) if key != "v"]
    query.append(("v", digest))
    path = parts.path if parts.path.startswith("/") else "/" + parts.path
    return urlunsplit(("", "", path, urlencode(query), parts.fragment))


def set_html_attr(tag, name, value):
    escaped = attr(value)
    quoted = re.compile(r"(\s" + re.escape(name) + r"\s*=\s*)([\"'])(.*?)\2", re.I | re.S)
    match = quoted.search(tag)
    if match:
        return tag[:match.start()] + match.group(1) + '"' + escaped + '"' + tag[match.end():]
    unquoted = re.compile(r"(\s" + re.escape(name) + r"\s*=\s*)([^\s>]+)", re.I)
    match = unquoted.search(tag)
    if match:
        return tag[:match.start()] + match.group(1) + '"' + escaped + '"' + tag[match.end():]
    if tag.rstrip().endswith("/>"):
        index = tag.rfind("/>")
        return tag[:index] + " " + name + '="' + escaped + '"' + tag[index:]
    index = tag.rfind(">")
    return tag[:index] + " " + name + '="' + escaped + '"' + tag[index:]


def apply_branding(source, logo, favicon):
    logo_url = versioned_asset(logo or "/media/logo.png")
    favicon_url = versioned_asset(favicon or "/media/fv/favicon-32x32.png")
    header_pattern = re.compile(r"(<header\b[^>]*>)(.*?)(</header\s*>)", re.I | re.S)

    def update_header(match):
        inner = match.group(2)
        image = re.search(r"<img\b[^>]*>", inner, re.I | re.S)
        if not image:
            return match.group(0)
        tag = image.group(0)
        for name, value in (("src", logo_url), ("alt", "MatchPro"), ("loading", "eager"),
                            ("decoding", "async"), ("fetchpriority", "high")):
            tag = set_html_attr(tag, name, value)
        inner = inner[:image.start()] + tag + inner[image.end():]
        return match.group(1) + inner + match.group(3)

    source = header_pattern.sub(update_header, source)

    if favicon_url:
        tags = list(re.finditer(r"<link\b[^>]*>", source, re.I | re.S))
        for match in reversed(tags):
            rel = re.search(r"\brel\s*=\s*([\"'])(.*?)\1", match.group(0), re.I | re.S)
            if rel and ("icon" in rel.group(2).lower() or "apple-touch-icon" in rel.group(2).lower()):
                tag = set_html_attr(match.group(0), "href", favicon_url)
                source = source[:match.start()] + tag + source[match.end():]

    if logo_url:
        preload = '<link id="matchpro-logo-preload" rel="preload" as="image" href="' + attr(logo_url) + '" fetchpriority="high">'
        preload_pattern = re.compile(r"<link\b(?=[^>]*\bid\s*=\s*([\"'])matchpro-logo-preload\1)[^>]*>", re.I | re.S)
        updated = replace_tag(source, preload_pattern, preload)
        if updated is not None:
            source = updated
        else:
            source = re.sub(r"</head\s*>", lambda _: preload + "\n</head>", source, count=1, flags=re.I)
    return source


def apply_home_channel_grid(source, channels, language):
    pattern = re.compile(
        r"""(<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bchannel-grid\b[^"']*["'])[^>]*>).*?(</section\s*>)""",
        re.I | re.S,
    )
    visible = [channel for channel in channels if channel.get("published") is not False]
    if not visible:
        return source
    suffix = {"hy": "Hy", "ru": "Ru", "en": "En"}.get(language, "En")
    cards = []
    for index, channel in enumerate(visible):
        channel_id = str(channel.get("id", ""))
        name = (channel.get("name" + suffix) or channel.get("nameHy") or
                channel.get("nameRu") or channel.get("nameEn") or "Sports channel")
        logo = versioned_asset(channel.get("logo", ""))
        if not channel_id or not logo:
            continue
        loading = "eager" if index < 4 else "lazy"
        href = "./?id=" + channel_id + "&lang=" + str(language)
        cards.append(
            '<a class="channel" href="' + attr(href) + '"><img src="' + attr(logo) +
            '" alt="' + attr(name) + '" loading="' + loading +
            '" decoding="async"></a>'
        )
    if not cards:
        return source
    return pattern.sub(lambda match: match.group(1) + "".join(cards) + match.group(2), source, count=1)


def version_channel_assets(channels):
    """Version channel logo URLs in the generated Pages artifact without changing committed source files."""
    for channel in channels:
        if channel.get("logo"):
            channel["logo"] = versioned_asset(channel["logo"])
    source = CHANNELS_PATH.read_text(encoding="utf-8")
    start, end = source.find("["), source.rfind("]")
    if start < 0 or end < start:
        raise ValueError("Cannot rewrite main/js/channels.js")
    updated = source[:start] + json.dumps(channels, ensure_ascii=False, indent=2) + source[end + 1:]
    if updated != source:
        CHANNELS_PATH.write_text(updated, encoding="utf-8")
    return channels


def ensure_navigation_transitions(source):
    css = """<style id="matchpro-navigation-transitions">
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: matchpro-view-out 120ms ease both; }
::view-transition-new(root) { animation: matchpro-view-in 180ms ease both; }
@keyframes matchpro-view-out { to { opacity: 0; } }
@keyframes matchpro-view-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }
}
</style>"""
    pattern = re.compile(r"<style\b(?=[^>]*\bid\s*=\s*([\"'])matchpro-navigation-transitions\1)[^>]*>.*?</style\s*>", re.I | re.S)
    updated = replace_tag(source, pattern, css)
    if updated is not None:
        return updated
    return re.sub(r"</head\s*>", lambda _: css + "\n</head>", source, count=1, flags=re.I)


def absolute_url(value, domain):
    value = str(value or "").strip()
    if not value:
        return ""
    value = versioned_asset(value)
    if re.match(r"^https?://", value, re.I):
        return value
    base = str(domain or DOMAIN_FALLBACK)
    base_parts = urlsplit(base)
    value_parts = urlsplit(value)
    base_path = base_parts.path.rstrip("/")
    if base_path and (value_parts.path == base_path or value_parts.path.startswith(base_path + "/")):
        return urlunsplit((base_parts.scheme, base_parts.netloc, value_parts.path, value_parts.query, value_parts.fragment))
    return urljoin(base.rstrip("/") + "/", value.lstrip("/"))

def replace_tag(source, pattern, replacement):
    matches = list(pattern.finditer(source))
    if not matches:
        return None
    out = []
    cursor = 0
    for index, match in enumerate(matches):
        out.append(source[cursor:match.start()])
        out.append(replacement if index == 0 else "")
        cursor = match.end()
    out.append(source[cursor:])
    return "".join(out)

def set_title(source, value):
    if value is None or str(value) == "":
        return source
    tag = "<title>" + html.escape(str(value), quote=False) + "</title>"
    pattern = re.compile(r"<title\b[^>]*>.*?</title\s*>", re.I | re.S)
    updated = replace_tag(source, pattern, tag)
    if updated is not None:
        return updated
    return re.sub(r"</head\s*>", lambda _: tag + "\n</head>", source, count=1, flags=re.I)

def set_meta(source, kind, name, value):
    pattern = re.compile(
        r"<meta\b(?=[^>]*\b" + re.escape(kind) +
        r"\s*=\s*([\"'])" + re.escape(name) + r"\1)[^>]*>",
        re.I
    )
    if value is None or str(value) == "":
        return pattern.sub("", source)
    tag = '<meta ' + kind + '="' + attr(name) + '" content="' + attr(value) + '">'
    updated = replace_tag(source, pattern, tag)
    if updated is not None:
        return updated
    return re.sub(r"</head\s*>", lambda _: tag + "\n</head>", source, count=1, flags=re.I)

def set_link(source, rel, href, hreflang=None):
    if not href:
        return source
    if hreflang:
        pattern = re.compile(
            r"<link\b(?=[^>]*\brel\s*=\s*([\"'])alternate\1)"
            r"(?=[^>]*\bhreflang\s*=\s*([\"'])" + re.escape(hreflang) + r"\2)[^>]*>",
            re.I
        )
        tag = '<link rel="alternate" hreflang="' + attr(hreflang) + '" href="' + attr(href) + '">'
    else:
        pattern = re.compile(r"<link\b(?=[^>]*\brel\s*=\s*([\"'])" + re.escape(rel) + r"\1)[^>]*>", re.I)
        tag = '<link rel="' + attr(rel) + '" href="' + attr(href) + '">'
    updated = replace_tag(source, pattern, tag)
    if updated is not None:
        return updated
    return re.sub(r"</head\s*>", lambda _: tag + "\n</head>", source, count=1, flags=re.I)

def set_jsonld(source, data, canonical, language, identity, image):
    schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": data.get("title") or identity.get("name") or "MatchPro",
        "description": data.get("description") or None,
        "url": canonical,
        "inLanguage": language,
        "isPartOf": {
            "@type": "WebSite",
            "name": identity.get("name") or "MatchPro",
            "url": identity.get("domain") or DOMAIN_FALLBACK
        }
    }
    if image:
        schema["primaryImageOfPage"] = {"@type": "ImageObject", "url": image}
    tag = '<script id="matchpro-cms-schema" type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + "</script>"
    pattern = re.compile(
        r"<script\b(?=[^>]*\bid\s*=\s*([\"'])matchpro-cms-schema\1)[^>]*>.*?</script\s*>",
        re.I | re.S
    )
    updated = replace_tag(source, pattern, tag)
    if updated is not None:
        return updated
    return re.sub(r"</head\s*>", lambda _: tag + "\n</head>", source, count=1, flags=re.I)

def apply_metadata(source, data, identity, language, canonical):
    title = data.get("title") or data.get("seoTitle")
    description = data.get("description")
    keywords = data.get("keywords")
    robots = data.get("robots") or "index, follow"
    og_title = data.get("ogTitle") or title
    og_description = data.get("ogDescription") or description
    og_type = data.get("ogType") or "website"
    og_image = absolute_url(data.get("ogImage") or identity.get("defaultOgImage"), identity.get("domain"))
    twitter_card = data.get("twitterCard") or "summary_large_image"
    twitter_title = data.get("twitterTitle") or og_title
    twitter_description = data.get("twitterDescription") or og_description
    twitter_image = absolute_url(data.get("twitterImage") or og_image or identity.get("defaultOgImage"), identity.get("domain"))
    canonical_url = canonical
    if not re.match(r"^https?://", canonical_url, re.I):
        canonical_url = absolute_url(canonical_url, identity.get("domain"))

    source = set_title(source, title)
    for name, value in [
        ("description", description), ("keywords", keywords), ("robots", robots),
        ("googlebot", robots), ("theme-color", identity.get("themeColor"))
    ]:
        source = set_meta(source, "name", name, value)
    for name, value in [
        ("og:title", og_title), ("og:description", og_description), ("og:type", og_type),
        ("og:url", canonical_url), ("og:image", og_image),
        ("og:image:alt", data.get("ogImageAlt") or data.get("twitterImageAlt")),
        ("og:site_name", identity.get("name") or "MatchPro"),
        ("og:locale", {"hy": "hy_AM", "ru": "ru_RU", "en": "en_US"}.get(language, "en_US"))
    ]:
        source = set_meta(source, "property", name, value)
    for name, value in [
        ("twitter:card", twitter_card), ("twitter:title", twitter_title),
        ("twitter:description", twitter_description), ("twitter:image", twitter_image),
        ("twitter:image:alt", data.get("twitterImageAlt") or data.get("ogImageAlt")),
        ("twitter:site", data.get("twitterSite") or identity.get("twitterSite")),
        ("twitter:creator", data.get("twitterCreator"))
    ]:
        source = set_meta(source, "name", name, value)
    source = set_link(source, "canonical", canonical_url)

    domain = str(identity.get("domain") or DOMAIN_FALLBACK)
    alternate_path = "?lang="
    if canonical.startswith("?id="):
        prefix = canonical.split("&lang=", 1)[0]
        for lang in sorted(LANGS):
            source = set_link(source, "alternate", domain.rstrip("/") + "/" + prefix + "&lang=" + lang, lang)
    elif canonical.startswith("?lang=") or canonical == domain or canonical == domain.rstrip("/") + "/":
        for lang in sorted(LANGS):
            source = set_link(source, "alternate", domain.rstrip("/") + "/?lang=" + lang, lang)

    if "cms-runtime.js" not in source:
        source = re.sub(
            r"</head\s*>",
            lambda _: '<script src="/main/js/cms-runtime.js" defer></script>\n</head>',
            source, count=1, flags=re.I
        )
    source = set_jsonld(source, data, canonical_url, language, identity, og_image)
    return source

def main():
    settings = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    channels = version_channel_assets(parse_channel_array())
    identity = settings.get("identity") or {}
    domain = str(identity.get("domain") or DOMAIN_FALLBACK)
    default_language = identity.get("defaultLanguage") or "en"
    if default_language not in LANGS:
        default_language = "en"
    by_file = {str(c.get("file", "")).lower(): c for c in channels if c.get("file")}
    total = 0

    for path in sorted(ROOT.glob("*.html")):
        if not path.is_file():
            continue
        filename = path.name.lower()
        if filename in {"403.html", "404.html", "500.html"}:
            continue
        source = path.read_text(encoding="utf-8")
        original = source
        source = apply_branding(source, settings.get("logo"), settings.get("favicon"))
        source = ensure_navigation_transitions(source)
        if filename == "index.html":
            source = apply_home_channel_grid(source, channels, default_language)

        if filename == "index.html":
            language = default_language
            key = "home"
            data = dict((settings.get("home") or {}).get(language) or {})
            data.update((((settings.get("seo") or {}).get("pages") or {}).get(key) or {}).get(language) or {})
            canonical = domain.rstrip("/") + "/"
        elif filename in by_file:
            channel = by_file[filename]
            language = default_language
            suffix = {"hy": "Hy", "ru": "Ru", "en": "En"}[language]
            key = "channel:" + str(channel.get("id"))
            data = {
                "title": channel.get("title" + suffix) or channel.get("titleHy") or channel.get("titleRu") or channel.get("titleEn"),
                "description": channel.get("description" + suffix) or channel.get("descriptionHy") or channel.get("descriptionRu") or channel.get("descriptionEn"),
                "keywords": channel.get("keywords" + suffix) or channel.get("keywordsHy") or channel.get("keywordsRu") or channel.get("keywordsEn"),
                "h1": channel.get("name" + suffix) or channel.get("nameHy") or channel.get("nameRu") or channel.get("nameEn"),
                "ogImage": channel.get("logo"),
                "twitterImage": channel.get("logo"),
                "twitterCard": "summary_large_image",
                "robots": "index, follow" if channel.get("published") is not False and channel.get("indexable") is not False else "noindex, nofollow"
            }
            data.update((((settings.get("seo") or {}).get("pages") or {}).get(key) or {}).get(language) or {})
            canonical = "?id=" + str(channel.get("id")) + "&lang=" + language
        else:
            key = "page:" + path.name
            match = re.search(r"-(hy|ru|en)\.html?$", filename)
            language = match.group(1) if match else default_language
            data = (((settings.get("seo") or {}).get("pages") or {}).get(key) or {}).get(language) or {}
            canonical = data.get("canonical") or path.name
            if not data:
                if "cms-runtime.js" not in source:
                    source = re.sub(r"</head\s*>", '<script src="/main/js/cms-runtime.js" defer></script>\n</head>', source, count=1, flags=re.I)
                if source != original:
                    path.write_text(source, encoding="utf-8")
                    total += 1
                continue

        # Use only stored, explicitly configured values; defaults preserve current page content.
        source = apply_metadata(source, data, identity, language, canonical)
        if source != original:
            path.write_text(source, encoding="utf-8")
            total += 1
    print("MatchPro CMS metadata build completed; files updated:", total)

if __name__ == "__main__":
    main()
