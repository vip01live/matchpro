#!/usr/bin/env python3
"""Regression checks for MatchPro cache-safe branding, image rendering, and navigation."""
from pathlib import Path
import hashlib
import json
import re
from urllib.parse import parse_qs, urlsplit

ROOT = Path(".")
SETTINGS_PATH = ROOT / "main/js/site-settings.json"
CHANNELS_PATH = ROOT / "main/js/channels.js"
PUBLIC_HTML_EXCLUDES = {"403.html", "404.html", "500.html"}


def fail(message):
    raise SystemExit("Performance validation failed: " + message)


def attr(tag, name):
    match = re.search(r"\b" + re.escape(name) + r"\s*=\s*(['\"])(.*?)\1", tag, re.I | re.S)
    return match.group(2) if match else ""


def local_asset_path(url):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = parts.path.lstrip("/")
    if path.startswith("matchpro/"):
        path = path[len("matchpro/"):]
    return ROOT / path


def check_versioned_asset(url, label, require_version=True):
    if not url:
        fail(label + " is missing")
    path = local_asset_path(url)
    if path is None:
        return
    if not path.is_file():
        fail(label + " points to a missing local file: " + str(path))
    query = parse_qs(urlsplit(url).query)
    versions = query.get("v", [])
    if require_version and not versions:
        fail(label + " is missing a content-hash cache key: " + url)
    if versions:
        expected = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        if versions[-1] != expected:
            fail(label + " has a stale or incorrect cache key: " + url)


def parse_channels():
    source = CHANNELS_PATH.read_text(encoding="utf-8")
    start, end = source.find("["), source.rfind("]")
    if start < 0 or end < start:
        fail("channels.js does not contain the expected JSON array")
    try:
        value = json.loads(source[start:end + 1])
    except json.JSONDecodeError as exc:
        fail("channels.js JSON parse failed: " + str(exc))
    if not isinstance(value, list):
        fail("channels.js array is invalid")
    return value


def main():
    settings = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    channels = parse_channels()
    logo = settings.get("logo") or "/media/logo.png"
    favicon = settings.get("favicon") or "/media/fv/favicon-32x32.png"
    logo_path = urlsplit(logo).path.lstrip("/")
    if logo_path.startswith("matchpro/"):
        logo_path = logo_path[len("matchpro/"):]
    if not (ROOT / logo_path).is_file():
        fail("configured site logo does not exist: " + logo_path)

    html_files = [
        path for path in sorted(ROOT.glob("*.html"))
        if path.name.lower() not in PUBLIC_HTML_EXCLUDES
    ]
    if not html_files:
        fail("no public HTML pages were found")
    index = ROOT / "index.html"
    if not index.is_file():
        fail("homepage index.html is missing")

    for page in html_files:
        source = page.read_text(encoding="utf-8")
        if 'id="matchpro-navigation-transitions"' not in source:
            fail(page.name + " is missing navigation-transition CSS")
        if 'id="matchpro-logo-preload"' not in source:
            fail(page.name + " is missing the high-priority logo preload")
        headers = re.findall(r"<header\b[^>]*>.*?</header\s*>", source, re.I | re.S)
        if headers:
            images = re.findall(r"<img\b[^>]*>", headers[0], re.I | re.S)
            if images:
                src = attr(images[0], "src")
                expected_path = urlsplit(logo).path
                actual_path = urlsplit(src).path
                if actual_path.lstrip("/").startswith("matchpro/"):
                    actual_path = "/" + actual_path.lstrip("/")[len("matchpro/"):]
                if expected_path.lstrip("/").startswith("matchpro/"):
                    expected_path = "/" + expected_path.lstrip("/")[len("matchpro/"):]
                if actual_path != expected_path:
                    fail(page.name + " header still uses a different logo: " + src)
                if attr(images[0], "loading") != "eager":
                    fail(page.name + " header logo must use eager loading")
                if attr(images[0], "decoding") != "async":
                    fail(page.name + " header logo must use async decoding")
                if attr(images[0], "fetchpriority") != "high":
                    fail(page.name + " header logo must have high fetch priority")
                check_versioned_asset(src, page.name + " header logo")
        if page == index:
            if not re.search(r"<link\b(?=[^>]*\brel\s*=\s*(['\"])preload\1)(?=[^>]*\bas\s*=\s*(['\"])image\2)[^>]*>", source, re.I | re.S):
                fail("homepage does not preload its logo image")
            match = re.search(
                r"""<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bchannel-grid\b[^"']*["'])[^>]*>(.*?)</section\s*>""",
                source, re.I | re.S,
            )
            if not match:
                fail("homepage channel grid was not found")
            section = match.group(1)
            cards = re.findall(r"<a\b(?=[^>]*\bclass\s*=\s*(['\"])[^'\"]*\bchannel\b[^'\"]*\1)[^>]*>", section, re.I | re.S)
            images = re.findall(r"<img\b[^>]*>", section, re.I | re.S)
            expected = sum(1 for channel in channels if channel.get("published") is not False)
            if len(cards) != expected or len(images) != expected:
                fail(f"homepage channel grid expected {expected} cards/images; found {len(cards)}/{len(images)}")
            for position, image in enumerate(images, start=1):
                src = attr(image, "src")
                if not attr(image, "alt"):
                    fail(f"homepage channel image #{position} has no alt text")
                if attr(image, "decoding") != "async":
                    fail(f"homepage channel image #{position} is not async-decoded")
                if attr(image, "loading") not in {"eager", "lazy"}:
                    fail(f"homepage channel image #{position} has no valid loading strategy")
                check_versioned_asset(src, f"homepage channel image #{position}")
    check_versioned_asset(logo, "configured site logo", require_version=False)
    check_versioned_asset(favicon, "configured favicon", require_version=False)
    player_config = (ROOT / "main/js/player-config.js").read_text(encoding="utf-8")
    enhancer = (ROOT / "main/js/matchpro-enhance.js").read_text(encoding="utf-8")
    cms_runtime = (ROOT / "main/js/cms-runtime.js").read_text(encoding="utf-8")
    if "SITE_BASE_URL" not in player_config or "function sameAssetPath" not in player_config:
        fail("player config does not include project-site base-path and duplicate-load safeguards")
    if "SITE_BASE_URL" not in enhancer or "fetch(absoluteResource(current.file" not in enhancer:
        fail("channel loader does not resolve project-site page URLs")
    if "basePath" not in cms_runtime or "samePath" not in cms_runtime:
        fail("CMS runtime does not preserve project-site and cache-versioned image paths")
    print(
        "MatchPro performance validation passed: "
        f"{len(html_files)} public HTML pages, {expected} channel cards, "
        "versioned image URLs, logo preload, and navigation transitions."
    )


if __name__ == "__main__":
    main()
