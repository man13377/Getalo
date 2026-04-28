#!/usr/bin/env python3
"""
Upload local image assets referenced in site files to Yandex Object Storage
and optionally rewrite local paths to public URLs.

Usage example:
  YC_ACCESS_KEY_ID=... YC_SECRET_ACCESS_KEY=... \
  python3 tools/yandex_object_storage_sync.py \
    --bucket my-getalo-bucket \
    --prefix site-assets \
    --apply
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Set
from urllib.parse import quote

import boto3


IMAGE_EXTENSIONS = ("png", "jpg", "jpeg", "webp", "gif", "svg")


@dataclass(frozen=True)
class AssetRef:
    """Normalized local asset reference."""

    relative_path: str  # without leading "./"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload referenced local image assets to Yandex Object Storage."
    )
    parser.add_argument("--bucket", required=True, help="Yandex Object Storage bucket name.")
    parser.add_argument(
        "--prefix",
        default="",
        help="Prefix inside bucket, e.g. 'getalo-site'. Optional.",
    )
    parser.add_argument(
        "--endpoint",
        default="https://storage.yandexcloud.net",
        help="S3 endpoint for Yandex Object Storage.",
    )
    parser.add_argument(
        "--public-base-url",
        default="",
        help=(
            "Base URL for public files. If omitted, defaults to "
            "https://storage.yandexcloud.net/<bucket>."
        ),
    )
    parser.add_argument(
        "--project-root",
        default=".",
        help="Project root (contains index.html/script.js/styles.css).",
    )
    parser.add_argument(
        "--scan-files",
        nargs="+",
        default=["index.html", "script.js", "styles.css"],
        help="Files to scan for local image paths.",
    )
    parser.add_argument(
        "--manifest",
        default="yandex-upload-manifest.json",
        help="Where to write mapping manifest JSON.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Rewrite scanned files, replacing local paths with public URLs.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be uploaded/replaced without making changes.",
    )
    parser.add_argument(
        "--make-public",
        action="store_true",
        help="Set ACL=public-read on uploaded objects.",
    )
    parser.add_argument(
        "--access-key-id",
        default=os.getenv("YC_ACCESS_KEY_ID", ""),
        help="Static access key id (or use YC_ACCESS_KEY_ID env).",
    )
    parser.add_argument(
        "--secret-access-key",
        default=os.getenv("YC_SECRET_ACCESS_KEY", ""),
        help="Static secret key (or use YC_SECRET_ACCESS_KEY env).",
    )
    return parser.parse_args()


def normalize_local_path(value: str) -> str:
    path = value.strip()
    if path.startswith("./"):
        path = path[2:]
    return path


def is_local_image_candidate(value: str) -> bool:
    low = value.lower()
    if low.startswith(("http://", "https://", "data:", "//")):
        return False
    return low.endswith(tuple(f".{ext}" for ext in IMAGE_EXTENSIONS))


def collect_asset_refs(project_root: Path, scan_files: Iterable[Path]) -> Set[AssetRef]:
    refs: Set[AssetRef] = set()
    # Quoted strings: "path.ext" or 'path.ext'
    quoted_pattern = re.compile(
        r"""(?P<quote>["'])(?P<path>(?:\./)?[^"'\\\n\r]+?\.(?:png|jpg|jpeg|webp|gif|svg))(?P=quote)""",
        re.IGNORECASE,
    )
    # CSS url(path.ext), url("path.ext"), url('path.ext')
    css_url_pattern = re.compile(
        r"""url\(\s*(?P<quote>["']?)(?P<path>(?:\./)?[^)"'\n\r]+?\.(?:png|jpg|jpeg|webp|gif|svg))(?P=quote)\s*\)""",
        re.IGNORECASE,
    )

    for file_path in scan_files:
        text = file_path.read_text(encoding="utf-8")
        candidates = [m.group("path") for m in quoted_pattern.finditer(text)]
        candidates += [m.group("path") for m in css_url_pattern.finditer(text)]

        for candidate in candidates:
            if not is_local_image_candidate(candidate):
                continue
            rel = normalize_local_path(candidate)
            abs_path = project_root / rel
            if abs_path.exists() and abs_path.is_file():
                refs.add(AssetRef(relative_path=rel.replace("\\", "/")))

    return refs


def build_object_key(prefix: str, relative_path: str) -> str:
    clean_prefix = prefix.strip("/")
    rel = relative_path.lstrip("/")
    if clean_prefix:
        return f"{clean_prefix}/{rel}"
    return rel


def ensure_boto_client(endpoint: str, access_key_id: str, secret_access_key: str):
    if not access_key_id or not secret_access_key:
        raise ValueError(
            "Missing credentials. Set YC_ACCESS_KEY_ID and YC_SECRET_ACCESS_KEY (or pass args)."
        )
    session = boto3.session.Session()
    return session.client(
        service_name="s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
    )


def upload_assets(
    *,
    project_root: Path,
    refs: Iterable[AssetRef],
    bucket: str,
    prefix: str,
    endpoint: str,
    public_base_url: str,
    access_key_id: str,
    secret_access_key: str,
    dry_run: bool,
    make_public: bool,
) -> Dict[str, str]:
    if public_base_url:
        base_url = public_base_url.rstrip("/")
    else:
        base_url = f"{endpoint.rstrip('/')}/{bucket}"

    mapping: Dict[str, str] = {}
    sorted_refs = sorted(refs, key=lambda x: x.relative_path)
    if not sorted_refs:
        return mapping

    client = None if dry_run else ensure_boto_client(endpoint, access_key_id, secret_access_key)

    for ref in sorted_refs:
        local_abs = project_root / ref.relative_path
        key = build_object_key(prefix, ref.relative_path)
        url = f"{base_url}/{quote(key)}"
        mapping[ref.relative_path] = url
        print(f"[asset] {ref.relative_path} -> {url}")

        if dry_run:
            continue

        guessed_content_type, _ = mimetypes.guess_type(str(local_abs))
        extra_args = {}
        if guessed_content_type:
            extra_args["ContentType"] = guessed_content_type
        if make_public:
            extra_args["ACL"] = "public-read"

        if extra_args:
            client.upload_file(str(local_abs), bucket, key, ExtraArgs=extra_args)
        else:
            client.upload_file(str(local_abs), bucket, key)

    return mapping


def replace_in_text(text: str, mapping: Dict[str, str]) -> str:
    if not mapping:
        return text

    def replace_quoted(match: re.Match[str]) -> str:
        quote_char = match.group("quote")
        raw_path = match.group("path")
        norm = normalize_local_path(raw_path)
        if norm in mapping:
            return f"{quote_char}{mapping[norm]}{quote_char}"
        return match.group(0)

    def replace_css_url(match: re.Match[str]) -> str:
        quote_char = match.group("quote")
        raw_path = match.group("path")
        norm = normalize_local_path(raw_path)
        if norm not in mapping:
            return match.group(0)
        new_url = mapping[norm]
        return f"url({quote_char}{new_url}{quote_char})"

    quoted_pattern = re.compile(
        r"""(?P<quote>["'])(?P<path>(?:\./)?[^"'\\\n\r]+?\.(?:png|jpg|jpeg|webp|gif|svg))(?P=quote)""",
        re.IGNORECASE,
    )
    css_url_pattern = re.compile(
        r"""url\(\s*(?P<quote>["']?)(?P<path>(?:\./)?[^)"'\n\r]+?\.(?:png|jpg|jpeg|webp|gif|svg))(?P=quote)\s*\)""",
        re.IGNORECASE,
    )

    updated = quoted_pattern.sub(replace_quoted, text)
    updated = css_url_pattern.sub(replace_css_url, updated)
    return updated


def apply_rewrites(scan_files: Iterable[Path], mapping: Dict[str, str], dry_run: bool) -> None:
    for file_path in scan_files:
        original = file_path.read_text(encoding="utf-8")
        updated = replace_in_text(original, mapping)
        if original == updated:
            continue
        print(f"[rewrite] {file_path}")
        if not dry_run:
            file_path.write_text(updated, encoding="utf-8")


def main() -> int:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    scan_files = [project_root / path for path in args.scan_files]

    missing = [str(path) for path in scan_files if not path.exists()]
    if missing:
        print("Missing scan files:", *missing, sep="\n- ", file=sys.stderr)
        return 1

    refs = collect_asset_refs(project_root, scan_files)
    if not refs:
        print("No local image references found.")
        return 0

    mapping = upload_assets(
        project_root=project_root,
        refs=refs,
        bucket=args.bucket,
        prefix=args.prefix,
        endpoint=args.endpoint,
        public_base_url=args.public_base_url,
        access_key_id=args.access_key_id,
        secret_access_key=args.secret_access_key,
        dry_run=args.dry_run,
        make_public=args.make_public,
    )

    manifest_path = project_root / args.manifest
    manifest_payload = {
        "bucket": args.bucket,
        "prefix": args.prefix,
        "endpoint": args.endpoint,
        "public_base_url": args.public_base_url or f"{args.endpoint.rstrip('/')}/{args.bucket}",
        "assets_count": len(mapping),
        "assets": mapping,
    }
    print(f"[manifest] {manifest_path}")
    if not args.dry_run:
        manifest_path.write_text(
            json.dumps(manifest_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    if args.apply:
        apply_rewrites(scan_files, mapping, args.dry_run)

    print(f"Done. Processed {len(mapping)} assets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
