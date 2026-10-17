#!/usr/bin/env python3
"""Deterministic checks for the two LinkedIn service pages (stdlib only)."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any

ROUTES = (
    "/linkedin-outreach-services/",
    "/linkedin-inbound-lead-generation/",
)
BRAND = "InboundOnSteroids"
SITEMAP_ALLOWED = {
    "https://inboundonsteroids.com/",
    "https://inboundonsteroids.com/case-studies/",
    "https://inboundonsteroids.com/case/kyle-hunt/",
    "https://inboundonsteroids.com/case/rise-dtc/",
    "https://inboundonsteroids.com/case/lemonade/",
    *("https://inboundonsteroids.com" + route for route in ROUTES),
}
PRIVATE_PATHS = (
    "/client/", "/scan/", "/proposal/", "/compare/", "/audit/",
    "/shared/", "/d/", "/outbound-hub-com/", "/merci/",
)
PLACEHOLDERS = re.compile(
    r"\b(?:lorem ipsum|TODO|TBD|placeholder|coming soon|insert (?:copy|text|image)|sample text)\b",
    re.I,
)
# Vocabulary tripwires taken from the current service-page voice contract.
FORBIDDEN_TERMS = (
    "delve", "leverage", "landscape", "harness", "seamless", "robust",
    "tapestry", "multifaceted", "pivotal", "holistic", "synergy", "paradigm",
    "empower", "elevate", "foster", "utilize", "curate", "endeavour", "realm",
    "catalyst", "testament", "intricate", "nuance", "supercharge", "unlock",
    "unpack", "streamline", "cutting-edge", "game-changer", "revolutionary",
    "transformative", "boasts", "underscore", "showcase", "emphasize",
    "meticulous", "vibrant", "garner", "bolster", "interplay", "resonate with",
    "kaleidoscope", "genuinely", "AI-powered", "disrupting", "rockstar",
    "crushing it", "deep dive", "purpose-driven", "transformational", "unleash",
    "skyrocket", "navigate the", "crucial", "truly", "in your voice",
    "you just take the calls", "all you do is take the calls", "just show up to the calls",
)
FORBIDDEN_PATTERNS = tuple(re.compile(r"\b" + re.escape(term) + r"\b", re.I) for term in FORBIDDEN_TERMS)
CORRECTIVE_PATTERNS = (
    re.compile(r"\bnot just\b", re.I),
    re.compile(r",\s*not\s+[^.;!?]{1,100}[.;!?]", re.I),
    re.compile(r"\bnot\b[^.;!?]{1,80}\bbut\b", re.I),
    re.compile(r"\b(?:isn't|is not|aren't|are not)\b[^.;!?]{1,80}\b(?:it's|it is|they are|they're)\b", re.I),
    re.compile(r"\bwe don't\b[^.;!?]{1,80},\s*we\b", re.I),
    re.compile(r"\b(?:stop|don't)\s+[^.;!?]{1,60}\b(?:start|instead)\b", re.I),
)
MONEY_PATTERN = re.compile(r"(?<![\w/])\$\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:k|m|million|thousand))?", re.I)
OUTCOME_NUMBER_PATTERN = re.compile(
    r"\b\d[\d,]*(?:\.\d+)?\s*(?:%|percent|calls?|leads?|appointments?|meetings?|replies|responses|clients?|bookings?|conversations?|pipeline|revenue)\b",
    re.I,
)
TIME_OUTCOME_PATTERN = re.compile(r"\b(?:in|within|over|across)\s+\d+\s*(?:days?|weeks?|months?)\b", re.I)


@dataclass
class Check:
    gate: str
    name: str
    passed: bool
    detail: str


@dataclass
class Page:
    route: str
    status: int = 0
    body: str = ""
    title: str = ""
    description: str = ""
    canonical: str = ""
    h1s: list[str] = field(default_factory=list)
    h2s: list[str] = field(default_factory=list)
    visible: str = ""
    body_text: str = ""
    metas: dict[str, list[str]] = field(default_factory=dict)
    links: list[tuple[str, str]] = field(default_factory=list)
    scripts: list[str] = field(default_factory=list)
    ids: set[str] = field(default_factory=set)
    jsonld: list[Any] = field(default_factory=list)


class Document(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_parts: list[str] = []
        self.heading: str | None = None
        self.heading_parts: list[str] = []
        self.h1s: list[str] = []
        self.h2s: list[str] = []
        self.visible_parts: list[str] = []
        self.body_parts: list[str] = []
        self.suppress: list[str] = []
        self.metas: dict[str, list[str]] = {}
        self.links: list[tuple[str, str]] = []
        self.scripts: list[str] = []
        self.script_type = ""
        self.script_parts: list[str] = []
        self.jsonld: list[Any] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k.lower(): v or "" for k, v in attrs}
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "meta":
            key = a.get("name", "").lower() or a.get("property", "").lower()
            if key and a.get("content"):
                self.metas.setdefault(key, []).append(a["content"].strip())
        if tag == "link" and a.get("href"):
            kind = "canonical" if a.get("rel", "").lower() == "canonical" else "link"
            self.links.append((kind, a.get("href", "")))
        if tag == "a" and a.get("href"):
            self.links.append(("a", a["href"]))
        for attr in ("src", "poster"):
            if a.get(attr):
                self.links.append((attr, a[attr]))
        if tag == "script":
            self.script_type = a.get("type", "").lower()
            if a.get("src"):
                self.scripts.append(a["src"])
            self.script_parts = []
        if tag == "title":
            self.in_title = True
        if tag in ("h1", "h2"):
            self.heading = tag
            self.heading_parts = []
        if tag in ("header", "nav", "footer", "script", "style", "noscript", "template", "title"):
            self.suppress.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if self.heading == tag and tag in ("h1", "h2"):
            text = compact(" ".join(self.heading_parts))
            if tag == "h1":
                self.h1s.append(text)
            else:
                self.h2s.append(text)
            self.heading = None
            self.heading_parts = []
        if tag == "script":
            if self.script_type == "application/ld+json":
                raw = "".join(self.script_parts).strip()
                try:
                    self.jsonld.append(json.loads(raw))
                except (json.JSONDecodeError, TypeError):
                    self.jsonld.append({"__invalid_json__": raw[:200]})
            self.script_type = ""
            self.script_parts = []
        if tag in self.suppress:
            # Pop the most recent matching suppression, tolerating void/malformed markup.
            index = len(self.suppress) - 1 - self.suppress[::-1].index(tag)
            del self.suppress[index]

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.heading:
            self.heading_parts.append(data)
        if self.script_type == "application/ld+json":
            self.script_parts.append(data)
        if not self.suppress:
            self.visible_parts.append(data)
            self.body_parts.append(data)


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalized_text(value: str) -> str:
    return compact(value).casefold()


def fetch(url: str, timeout: float = 8.0) -> tuple[int, bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "ios-service-page-check/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read(), response.headers.get_content_type()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), exc.headers.get_content_type() if exc.headers else ""
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return 0, str(exc).encode(), ""


def parse_document(route: str, status: int, raw: bytes) -> Page:
    text = raw.decode("utf-8", "replace")
    parser = Document()
    try:
        parser.feed(text)
    except Exception:
        pass
    page = Page(route=route, status=status, body=text)
    page.title = compact(" ".join(parser.title_parts))
    page.h1s = parser.h1s
    page.h2s = parser.h2s
    page.visible = compact(" ".join(parser.visible_parts))
    page.body_text = compact(" ".join(parser.body_parts))
    page.metas = parser.metas
    page.links = parser.links
    page.scripts = parser.scripts
    page.ids = parser.ids
    page.jsonld = parser.jsonld
    desc = parser.metas.get("description", [])
    page.description = desc[0] if desc else ""
    canonicals = [v for kind, v in parser.links if kind == "canonical"]
    page.canonical = canonicals[0] if canonicals else ""
    return page


def add(checks: list[Check], gate: str, name: str, passed: bool, detail: str) -> None:
    checks.append(Check(gate, name, passed, detail))


def walk_jsonld(value: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(value, dict):
        found.append(value)
        for child in value.values():
            found.extend(walk_jsonld(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(walk_jsonld(child))
    return found


def types(obj: dict[str, Any]) -> set[str]:
    val = obj.get("@type", [])
    if isinstance(val, str):
        return {val}
    if isinstance(val, list):
        return {str(item) for item in val}
    return set()


def page_service(page: Page) -> tuple[dict[str, Any] | None, dict[str, Any] | None, list[dict[str, Any]]]:
    all_objects = [obj for payload in page.jsonld for obj in walk_jsonld(payload)]
    service = next((obj for obj in all_objects if "Service" in types(obj)), None)
    crumb = next((obj for obj in all_objects if "BreadcrumbList" in types(obj)), None)
    return service, crumb, all_objects


def bigrams(value: str) -> set[tuple[str, str]]:
    tokens = re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)?", normalized_text(value))
    return set(zip(tokens, tokens[1:]))


def similarity(a: str, b: str) -> float:
    aa, bb = bigrams(a), bigrams(b)
    return len(aa & bb) / len(aa | bb) if aa or bb else 1.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True, help="Root of a local preview server")
    args = ap.parse_args()
    base = args.base_url.rstrip("/")
    parsed_base = urllib.parse.urlsplit(base)
    if not parsed_base.scheme or not parsed_base.netloc:
        ap.error("--base-url must be an absolute URL")

    checks: list[Check] = []
    cache: dict[str, tuple[int, bytes, str]] = {}

    def get(url: str) -> tuple[int, bytes, str]:
        absolute = urllib.parse.urljoin(base + "/", url.lstrip("/")) if url.startswith("/") else urllib.parse.urljoin(base + "/", url)
        target = urllib.parse.urlsplit(absolute)
        if target.hostname in ("inboundonsteroids.com", "www.inboundonsteroids.com") and target.netloc != parsed_base.netloc:
            absolute = urllib.parse.urlunsplit((parsed_base.scheme, parsed_base.netloc, target.path, target.query, ""))
        if absolute not in cache:
            cache[absolute] = fetch(absolute)
        return cache[absolute]

    pages: list[Page] = []
    for route in ROUTES:
        status, raw, _ = get(route)
        page = parse_document(route, status, raw)
        pages.append(page)
        add(checks, "G1", f"{route} HTTP 200", status == 200, f"status={status}")

    # G1: route content, structure, and distinct page bodies.
    for page in pages:
        route = page.route
        add(checks, "G1", f"{route} has exactly one visible H1", len(page.h1s) == 1 and bool(page.h1s[0]), f"count={len(page.h1s)}; h1={page.h1s[:1]}")
        useful_h2 = [h for h in page.h2s if len(h) >= 6]
        add(checks, "G1", f"{route} has at least five useful H2 sections", len(useful_h2) >= 5, f"useful={len(useful_h2)}; h2={page.h2s}")
        placeholders = PLACEHOLDERS.findall(page.visible)
        add(checks, "G1", f"{route} has no placeholder copy", not placeholders, f"matches={placeholders}")
        text_visible = bool(page.h1s and len(page.visible) > 450)
        add(checks, "G1", f"{route} has crawlable primary copy", text_visible, f"visible_chars={len(page.visible)}")
    if len(pages) == 2:
        score = similarity(pages[0].body_text, pages[1].body_text)
        add(checks, "G1", "service body bigram similarity below 0.65", score < 0.65, f"jaccard={score:.4f}")

    home_status, home_raw, _ = get("/")
    home = parse_document("/", home_status, home_raw)
    add(checks, "G1", "homepage returns 200", home_status == 200, f"status={home_status}")
    for route in ROUTES:
        contains = any(
            urllib.parse.urlsplit(urllib.parse.urljoin(base + "/", href)).path.rstrip("/") == route.rstrip("/")
            for kind, href in home.links if kind == "a"
        )
        add(checks, "G2", f"homepage links to {route}", contains, "matching internal anchor found" if contains else "no matching internal anchor")
    for index, page in enumerate(pages):
        other = pages[1 - index].route
        links = [href for kind, href in page.links if kind == "a"]
        links_other = any(urllib.parse.urlsplit(urllib.parse.urljoin(base + "/", h)).path.rstrip("/") == other.rstrip("/") for h in links)
        links_home = any(urllib.parse.urlsplit(urllib.parse.urljoin(base + "/", h)).path in ("", "/") for h in links)
        add(checks, "G2", f"{page.route} cross-links to other service", links_other, f"other={other}; found={links_other}")
        add(checks, "G2", f"{page.route} links home", links_home, f"found={links_home}")

    # G2: unique metadata, canonical, social fields, and truthful schema.
    for page in pages:
        route = page.route
        expected = "https://inboundonsteroids.com" + route
        add(checks, "G2", f"{route} has unique title", bool(page.title) and len(page.title) <= 70, f"title={page.title!r}")
        add(checks, "G2", f"{route} has unique description", bool(page.description) and len(page.description) <= 180, f"description={page.description!r}")
        add(checks, "G2", f"{route} has exact absolute self-canonical", page.canonical == expected, f"canonical={page.canonical!r}; expected={expected!r}")
        robots = " ".join(page.metas.get("robots", [])).casefold()
        add(checks, "G2", f"{route} is not noindex", "noindex" not in robots and "nofollow" not in robots, f"robots={robots or '(unset)'}")
        for key in ("og:title", "og:description", "og:url", "og:image", "twitter:title", "twitter:description", "twitter:image", "twitter:card"):
            exists = bool(page.metas.get(key))
            add(checks, "G2", f"{route} has {key}", exists, f"value={page.metas.get(key, [])[:1]}")
        og_url = page.metas.get("og:url", [""])[0]
        add(checks, "G2", f"{route} og:url matches canonical", og_url == expected, f"og:url={og_url!r}")
        image = page.metas.get("og:image", [""])[0]
        image_url = urllib.parse.urljoin(base + "/", image)
        image_path = urllib.parse.urlsplit(image_url).path
        image_status, _, _ = get(image_url)
        image_good = image_path.startswith("/assets/services/") and image_path.lower().endswith(".png") and image_status == 200
        add(checks, "G2", f"{route} uses its new service OG PNG", image_good, f"image={image!r}; resolved_status={image_status}")
        service, breadcrumb, all_objects = page_service(page)
        context_ok = bool(page.jsonld) and all(
            isinstance(payload, dict) and payload.get("@context") in ("https://schema.org", "http://schema.org")
            for payload in page.jsonld
        )
        valid_jsonld = context_ok and not any("__invalid_json__" in obj for obj in all_objects)
        service_ok = bool(service) and valid_jsonld
        if service:
            schema_name = compact(str(service.get("name", "")))
            schema_desc = compact(str(service.get("description", "")))
            schema_url = str(service.get("url", ""))
            provider = service.get("provider", {})
            if isinstance(provider, list):
                provider_names = [str(item.get("name", "")) for item in provider if isinstance(item, dict)]
            else:
                provider_names = [str(provider.get("name", ""))] if isinstance(provider, dict) else []
            name_tokens = re.findall(r"[a-z0-9]+", normalized_text(schema_name))
            h1_tokens = re.findall(r"[a-z0-9]+", normalized_text(page.h1s[0])) if page.h1s else []
            name_matches_h1 = bool(name_tokens) and name_tokens == h1_tokens[:len(name_tokens)]
            meaningful = {token for token in re.findall(r"[a-z0-9]+", normalized_text(schema_desc)) if len(token) > 3 and token not in {"your", "with", "from", "that", "where", "when", "this", "into", "agency", "founders"}}
            visible_tokens = set(re.findall(r"[a-z0-9]+", normalized_text(page.visible)))
            description_overlap = len(meaningful & visible_tokens) / max(1, len(meaningful))
            service_ok = service_ok and schema_url == expected and bool(schema_name) and name_matches_h1
            service_ok = service_ok and bool(schema_desc) and description_overlap >= 0.55
            service_ok = service_ok and any(normalized_text(name) == normalized_text(BRAND) for name in provider_names)
        add(checks, "G2", f"{route} has truthful Service JSON-LD", service_ok, f"service={service or 'missing'}; description_overlap={description_overlap if service else 0:.2f}; valid_jsonld={valid_jsonld}")
        crumb_ok = False
        if breadcrumb:
            items = breadcrumb.get("itemListElement", [])
            if isinstance(items, list) and len(items) >= 2:
                first = items[0] if isinstance(items[0], dict) else {}
                last = items[-1] if isinstance(items[-1], dict) else {}
                first_item = first.get("item", {})
                last_item = last.get("item", {})
                first_url = first_item.get("@id", first_item) if isinstance(first_item, dict) else first_item
                last_url = last_item.get("@id", last_item) if isinstance(last_item, dict) else last_item
                last_name = str(last.get("name", ""))
                positions = [item.get("position") for item in items if isinstance(item, dict)]
                item_types_ok = all("ListItem" in types(item) for item in items if isinstance(item, dict))
                positions_ok = len(positions) == len(items) and all(isinstance(pos, int) for pos in positions) and positions == sorted(positions) and positions[0] == 1
                crumb_ok = item_types_ok and positions_ok
                crumb_ok = crumb_ok and str(first_url) in ("https://inboundonsteroids.com/", "https://inboundonsteroids.com") and str(last_url) == expected
                crumb_ok = crumb_ok and bool(last_name) and normalized_text(last_name) in normalized_text(page.visible)
        no_fake_ratings = not any(types(obj) & {"Review", "AggregateRating"} for obj in all_objects)
        add(checks, "G2", f"{route} has truthful BreadcrumbList JSON-LD", crumb_ok and no_fake_ratings and valid_jsonld, f"breadcrumb={breadcrumb or 'missing'}; no_review_schema={no_fake_ratings}; valid_jsonld={valid_jsonld}")
    unique_titles = len({normalized_text(p.title) for p in pages}) == len(pages) and all(normalized_text(p.title) != normalized_text(home.title) for p in pages)
    unique_descriptions = len({normalized_text(p.description) for p in pages}) == len(pages) and all(normalized_text(p.description) != normalized_text(home.description) for p in pages)
    unique_h1 = len({normalized_text(p.h1s[0]) for p in pages if p.h1s}) == len(pages)
    add(checks, "G2", "titles are unique across pages and homepage", unique_titles, f"service_titles={[p.title for p in pages]}; homepage={home.title!r}")
    add(checks, "G2", "descriptions are unique across pages and homepage", unique_descriptions, f"service_descriptions={[p.description for p in pages]}; homepage={home.description!r}")
    add(checks, "G2", "H1s are distinct", unique_h1, f"h1s={[p.h1s[:1] for p in pages]}")
    for key in ("og:title", "og:description", "og:image", "twitter:title", "twitter:description", "twitter:image"):
        values = [page.metas.get(key, [""])[0] for page in pages]
        add(checks, "G2", f"{key} is unique across service pages", all(values) and len({normalized_text(value) for value in values}) == len(values), f"values={values}")

    # Sitemap and robots policy.
    sitemap_status, sitemap_raw, _ = get("/sitemap.xml")
    sitemap_locs: set[str] = set()
    sitemap_locs: set[str] = set()
    xml_ok = False
    sitemap_text = sitemap_raw.decode("utf-8", "replace")
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(sitemap_raw)
        xml_ok = root.tag.split("}")[-1] == "urlset"
        sitemap_locs = {
            node.text.strip() for node in root.iter()
            if node.tag.split("}")[-1] == "loc" and node.text and node.text.strip()
        }
    except ImportError:
        # Homebrew Python can have a broken pyexpat/system lib pairing. Fall back
        # to the macOS system Python's stdlib ElementTree when it is available.
        system_python = "/usr/bin/python3"
        if shutil.which(system_python):
            parse_xml = (
                "import json,sys,xml.etree.ElementTree as E; "
                "r=E.fromstring(sys.stdin.buffer.read()); "
                "print(json.dumps({'root':r.tag.split('}')[-1], 'locs':[n.text.strip() for n in r.iter() if n.tag.split('}')[-1]=='loc' and n.text and n.text.strip()]}))"
            )
            parsed = subprocess.run([system_python, "-c", parse_xml], input=sitemap_raw, capture_output=True)
            if parsed.returncode == 0:
                result = json.loads(parsed.stdout.decode("utf-8", "replace"))
                xml_ok = result.get("root") == "urlset"
                sitemap_locs = set(result.get("locs", []))
    except Exception:
        xml_ok = False
    add(checks, "G2", "root sitemap returns a valid XML urlset", sitemap_status == 200 and xml_ok, f"status={sitemap_status}; loc_count={len(sitemap_locs)}")
    for page in pages:
        expected = "https://inboundonsteroids.com" + page.route
        add(checks, "G2", f"sitemap includes {expected}", expected in sitemap_locs, f"present={expected in sitemap_locs}")
    private_found = sorted(url for url in sitemap_locs if any(path in urllib.parse.urlsplit(url).path for path in PRIVATE_PATHS))
    unexpected = sorted(sitemap_locs - SITEMAP_ALLOWED)
    add(checks, "G2", "sitemap contains only selected public marketing URLs", not private_found and not unexpected and SITEMAP_ALLOWED <= sitemap_locs, f"private={private_found}; unexpected={unexpected}; missing={sorted(SITEMAP_ALLOWED - sitemap_locs)}")
    robots_status, robots_raw, _ = get("/robots.txt")
    robots = robots_raw.decode("utf-8", "replace")
    robots_ok = robots_status == 200 and re.search(r"(?im)^\s*user-agent:\s*\*\s*$", robots) is not None
    robots_ok = robots_ok and "https://inboundonsteroids.com/sitemap.xml" in robots
    disallowed_services = [route for route in ROUTES if re.search(r"(?im)^\s*disallow:\s*" + re.escape(route) + r"\s*$", robots)]
    robots_ok = robots_ok and re.search(r"(?im)^\s*disallow:\s*/\s*$", robots) is None and not disallowed_services
    add(checks, "G2", "robots.txt allows public crawling and points at sitemap", robots_ok, f"status={robots_status}; disallowed_services={disallowed_services}; body={compact(robots)[:300]!r}")

    # Resolve same-site links, images, stylesheets and scripts from new pages.
    root_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
    resolved_docs: dict[str, Page] = {"/": home}
    for page in pages:
        resolved_docs[page.route] = page
    references: list[tuple[Page, str, str]] = []
    for page in pages:
        for kind, ref in page.links:
            references.append((page, kind, ref))
        for ref in page.scripts:
            references.append((page, "script", ref))
    local_failures: list[str] = []
    for page, kind, ref in references:
        if not ref or ref.startswith(("data:", "mailto:", "tel:", "javascript:")):
            continue
        resolved = urllib.parse.urljoin(base + page.route, ref)
        parts = urllib.parse.urlsplit(resolved)
        if parts.scheme not in ("http", "https") or f"{parts.scheme}://{parts.netloc}" != root_origin:
            continue
        url_no_fragment = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
        status, raw, content_type = get(url_no_fragment)
        if status != 200:
            local_failures.append(f"{kind} {ref} -> {status}")
            continue
        if parts.fragment:
            path = parts.path or "/"
            if path not in resolved_docs:
                resolved_docs[path] = parse_document(path, status, raw)
            if parts.fragment not in resolved_docs[path].ids:
                local_failures.append(f"fragment {ref} -> missing #{parts.fragment}")
    add(checks, "G2", "local assets, links, and fragments resolve", not local_failures, f"checked={len(references)}; failures={local_failures[:20]}")

    # G3: deterministic voice and public-claim tripwires. Ordinals such as 01 / are allowed.
    for page in pages:
        text = page.visible
        route = page.route
        emdash = "—" in text
        add(checks, "G3", f"{route} contains no em dash", not emdash, "found" if emdash else "none")
        corrective = [pattern.pattern for pattern in CORRECTIVE_PATTERNS if pattern.search(text)]
        add(checks, "G3", f"{route} has no corrective-contrast structure", not corrective, f"patterns={corrective}")
        forbidden = sorted({term for term, pattern in zip(FORBIDDEN_TERMS, FORBIDDEN_PATTERNS) if pattern.search(text)})
        add(checks, "G3", f"{route} avoids forbidden vocabulary", not forbidden, f"matches={forbidden}")
        money = MONEY_PATTERN.findall(text)
        add(checks, "G3", f"{route} has no unapproved dollar amounts", not money, f"matches={money}")
        outcomes = OUTCOME_NUMBER_PATTERN.findall(text)
        add(checks, "G3", f"{route} has no quantified result claims", not outcomes, f"matches={outcomes}")
        timeline = TIME_OUTCOME_PATTERN.findall(text)
        add(checks, "G3", f"{route} has no promised numeric outcomes/timeline", not timeline, f"matches={timeline}")
        guarantee = re.findall(r"\b(?:guarantee[ds]?|promise[ds]?)\b[^.!?]{0,100}\b(?:lead|call|appointment|meeting|pipeline|revenue|result)s?\b", text, re.I)
        add(checks, "G3", f"{route} has no performance guarantee", not guarantee, f"matches={guarantee}")

    gate_summary: dict[str, dict[str, Any]] = {}
    all_pass = True
    for gate in ("G1", "G2", "G3"):
        gate_checks = [item for item in checks if item.gate == gate]
        failed = [item for item in gate_checks if not item.passed]
        gate_pass = not failed
        gate_summary[gate] = {
            "status": "PASS" if gate_pass else "FAIL",
            "passed": len(gate_checks) - len(failed),
            "failed": len(failed),
        }
        all_pass = all_pass and gate_pass
    payload = {
        "status": "PASS" if all_pass else "FAIL",
        "base_url": base,
        "gates": gate_summary,
        "checks": [
            {"gate": item.gate, "name": item.name, "status": "PASS" if item.passed else "FAIL", "detail": item.detail}
            for item in checks
        ],
    }
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
