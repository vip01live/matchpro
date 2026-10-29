#!/usr/bin/env python3
"""Generate static SEO metadata for MatchPro pages during the Pages build."""
from pathlib import Path
import html
import json
import re

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

def absolute_url(value, domain):
    value = str(value or "").strip()
    if not value:
        return ""
    if re.match(r"^https?://", value, re.I):
        return value
    base = str(domain or DOMAIN_FALLBACK)
    return base.rstrip("/") + "/" + value.lstrip("/")

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
    channels = parse_channel_array()
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
