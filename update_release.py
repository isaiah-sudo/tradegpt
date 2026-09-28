#!/usr/bin/env python3
"""
TradeGPT - Release & Download Link Sync Script
Queries GitHub API for the latest release of isaiah-sudo/tradeism
and updates the website download links, filenames, file sizes,
and version badges automatically before a deployment.

Usage:
    python update_release.py
"""

import os
import sys
import json
import re
import argparse
import urllib.request
import urllib.error

GITHUB_REPO = "isaiah-sudo/tradegpt"


def get_release_data(repo: str = GITHUB_REPO, tag: str = None) -> dict:
    """Fetch the release information from GitHub API."""
    if tag:
        url = f"https://api.github.com/repos/{repo}/releases/tags/{tag}"
    else:
        url = f"https://api.github.com/repos/{repo}/releases/latest"
    headers = {
        "User-Agent": "TradeGPT-Release-Updater",
        "Accept": "application/vnd.github.v3+json",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                raise RuntimeError(f"GitHub API returned HTTP {resp.status}")
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"GitHub API HTTP Error: {e.code} - {e.reason}")
    except Exception as e:
        raise RuntimeError(f"Failed to fetch GitHub release: {e}")


def locate_web_dir() -> str:
    """Find the daytradesim-web directory containing public/download.html."""
    candidates = [
        os.path.abspath("."),
        os.path.abspath("daytradesim-web"),
        os.path.abspath("../daytradesim-web"),
        os.path.abspath(r"C:\Users\timme\Documents\GitHub\daytradesim-web"),
    ]
    for c in candidates:
        if os.path.isdir(c) and os.path.exists(os.path.join(c, "public", "download.html")):
            return c
    raise FileNotFoundError("Could not find daytradesim-web directory containing public/download.html")


def update_download_html(file_path: str, version: str, setup_name: str, setup_url: str, setup_size: str, portable_name: str, portable_url: str) -> bool:
    """Update public/download.html with newest release links and metadata."""
    if not os.path.exists(file_path):
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Update <title>
    content = re.sub(
        r"(<title>Download (?:TradeGPT|Day Trade Simulator) for Windows [•\-–] v)[^<]+(</title>)",
        rf"\g<1>{version}\g<2>",
        content
    )

    # 2. Update brand badge
    content = re.sub(
        r'(<span class="badge-tag">)v[^<]+(</span>)',
        rf"\g<1>v{version}\g<2>",
        content
    )

    # 3. Update version pill
    content = re.sub(
        r'(<span>⚡ Version )[^<]+(</span>)',
        rf"\g<1>{version}\g<2>",
        content
    )

    # 4. Update Windows installer button href
    content = re.sub(
        r'(<a\s+(?:id="download-installer-btn"\s+)?href=")[^"]*(?:TradeGPT|DayTradeSim)-Setup-[^"]*\.exe(")',
        rf'\g<1>{setup_url}\g<2>',
        content
    )
    # Ensure id="download-installer-btn" is present on the installer link
    content = re.sub(
        r'<a href="([^"]*(?:TradeGPT|DayTradeSim)-Setup-[^"]*\.exe)" class="btn btn-primary btn-lg"',
        r'<a id="download-installer-btn" href="\1" class="btn btn-primary btn-lg"',
        content
    )

    # 5. Update portable standalone button href
    content = re.sub(
        r'(<a\s+(?:id="download-portable-btn"\s+)?href=")[^"]*(?:TradeGPT|DayTradeSim)\.exe(")',
        rf'\g<1>{portable_url}\g<2>',
        content
    )
    # Ensure id="download-portable-btn" is present
    content = re.sub(
        r'<a href="([^"]*(?:TradeGPT|DayTradeSim)\.exe)" class="btn btn-secondary btn-lg"',
        r'<a id="download-portable-btn" href="\1" class="btn btn-secondary btn-lg"',
        content
    )

    # 6. Update File: Setup-*.exe info text
    content = re.sub(
        r'(<span>File:\s*)(?:TradeGPT|DayTradeSim)-Setup-[^<]+\.exe(</span>)',
        rf'\g<1>{setup_name}\g<2>',
        content
    )

    # 7. Update Size: ~... MB info text
    content = re.sub(
        r'(<span>Size:\s*)~?[^<]+MB(</span>)',
        rf'\g<1>~{setup_size} MB\g<2>',
        content
    )

    # 8. Update Step 2 filename
    content = re.sub(
        r'(<code>)(?:TradeGPT|DayTradeSim)-Setup-[^<]+\.exe(</code>)',
        rf'\g<1>{setup_name}\g<2>',
        content
    )

    # 9. Update Changelog section header
    content = re.sub(
        r'(WHAT\'S NEW IN V)[A-Z0-9.\-]+',
        rf'\g<1>{version.upper()}',
        content
    )
    content = re.sub(
        r'(<h2 class="section-title">What\'s New in Version )[^<]+(</h2>)',
        rf'\g<1>{version}\g<2>',
        content
    )

    # 10. Update footer release links & edition
    content = re.sub(
        r'(Latest Release \(v)[^)]+(\)</a>)',
        rf'\g<1>{version}\g<2>',
        content
    )
    content = re.sub(
        r'(Windows 64-bit Edition v)[^\s<]+',
        rf'\g<1>{version}',
        content
    )

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def update_index_html(file_path: str, version: str) -> bool:
    """Update public/index.html with current stable release tags."""
    if not os.path.exists(file_path):
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Update brand badge
    content = re.sub(
        r'(<span class="badge-tag">)v[^<]+(</span>)',
        rf"\g<1>v{version}\g<2>",
        content
    )

    # 2. Update terminal title
    content = re.sub(
        r'((?:TRADEGPT|DAY TRADE SIMULATOR)\s*[•\-–]\s*PRO TRADER WEB TERMINAL\s+v)[^\s<]+',
        rf"\g<1>{version}",
        content
    )

    # 3. Update footer version
    content = re.sub(
        r'(Version\s+)[^\s<]+(\s+Stable)',
        rf"\g<1>{version}\g<2>",
        content
    )

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def update_play_html(file_path: str, version: str) -> bool:
    """Update public/play.html title and modal badges."""
    if not os.path.exists(file_path):
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Update title
    content = re.sub(
        r'(<title>(?:TradeGPT|Day Trading Simulator)\s*[•\-–]\s*Pro Trader Web Terminal\s+v)[^<]+(</title>)',
        rf"\g<1>{version}\g<2>",
        content
    )

    # 2. Update modal title
    content = re.sub(
        r'(<h2 class="modal-title">(?:TRADEGPT|DAY TRADE SIMULATOR)\s+<span[^>]*>v)[^<]+(</span></h2>)',
        rf"\g<1>{version}\g<2>",
        content
    )

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def update_version_py(file_path: str, version: str) -> bool:
    """Update version.py __version__ constant."""
    if not os.path.exists(file_path):
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    content = re.sub(
        r'(__version__\s*=\s*")[^"]+(")',
        rf'\g<1>{version}\g<2>',
        content
    )
    content = re.sub(
        r'(GITHUB_REPO\s*=\s*")[^"]+(")',
        r'\g<1>isaiah-sudo/tradegpt\g<2>',
        content
    )

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    parser = argparse.ArgumentParser(
        description="TradeGPT - Synchronize website download links with GitHub release assets"
    )
    parser.add_argument("--repo", default=GITHUB_REPO, help=f"GitHub repository (default: {GITHUB_REPO})")
    parser.add_argument("--tag", default=None, help="Explicit release tag to target (e.g. v2.0.3). Defaults to latest.")
    parser.add_argument("--dry-run", action="store_true", help="Preview updates without writing to disk.")
    args = parser.parse_args()

    print("=" * 60)
    print(" TradeGPT - Website Release Sync Tool")
    print("=" * 60)

    try:
        web_dir = locate_web_dir()
        print(f"[*] Target web root: {web_dir}")
    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        sys.exit(1)

    v_file_ver = None
    try:
        import version as _v_mod
        v_file_ver = getattr(_v_mod, "__version__", None)
    except Exception:
        pass
    if not v_file_ver:
        try:
            with open(os.path.join(web_dir, "version.py"), "r", encoding="utf-8") as f:
                m = re.search(r'__version__\s*=\s*"([^"]+)"', f.read())
                if m:
                    v_file_ver = m.group(1)
        except Exception:
            pass

    target_tag = args.tag
    target_label = target_tag if target_tag else "latest release"
    print(f"[*] Fetching {target_label} from GitHub API (repo: {args.repo})...")
    try:
        release = get_release_data(args.repo, target_tag)
    except Exception as e:
        fallback_tag = target_tag or (f"v{v_file_ver}" if v_file_ver else "v2.0.5")
        print(f"[!] Warning: Could not fetch from GitHub ({e}). Using synthetic metadata for {fallback_tag}...")
        release = {"tag_name": fallback_tag, "name": f"TradeGPT {fallback_tag}", "assets": []}

    tag = release.get("tag_name", "")
    version = tag.lstrip("vV")
    release_name = release.get("name", tag)
    assets = release.get("assets", [])

    print(f"[+] Release Target: {tag} ({release_name})")
    print(f"[+] Total Assets Found: {len(assets)}")

    # Detect installer asset
    setup_asset = next(
        (a for a in assets if "setup" in a.get("name", "").lower() and a.get("name", "").endswith(".exe")),
        None
    )
    if setup_asset:
        setup_name = setup_asset["name"]
        setup_url = f"https://github.com/{args.repo}/releases/latest/download/{setup_name}"
        setup_size_mb = f"{setup_asset.get('size', 0) / (1024 * 1024):.1f}"
    else:
        setup_name = f"TradeGPT-Setup-v{version}.exe"
        setup_url = f"https://github.com/{args.repo}/releases/latest/download/{setup_name}"
        setup_size_mb = "13.3"

    # Detect standalone portable asset
    portable_asset = next(
        (a for a in assets if "setup" not in a.get("name", "").lower() and a.get("name", "").endswith(".exe")),
        None
    )
    if portable_asset:
        portable_name = portable_asset["name"]
        portable_url = f"https://github.com/{args.repo}/releases/latest/download/{portable_name}"
        portable_size_mb = f"{portable_asset.get('size', 0) / (1024 * 1024):.1f}"
    else:
        portable_name = "TradeGPT.exe"
        portable_url = f"https://github.com/{args.repo}/releases/latest/download/TradeGPT.exe"
        portable_size_mb = "11.7"

    print(f"[+] Setup Installer: {setup_name} (~{setup_size_mb} MB)")
    print(f"    URL: {setup_url}")
    print(f"[+] Portable Standalone: {portable_name} (~{portable_size_mb} MB)")
    print(f"    URL: {portable_url}")

    if args.dry_run:
        print("\n[!] Dry run enabled: No files will be modified.")
        sys.exit(0)

    public_dir = os.path.join(web_dir, "public")
    download_html = os.path.join(public_dir, "download.html")
    index_html = os.path.join(public_dir, "index.html")
    play_html = os.path.join(public_dir, "play.html")
    web_version_py = os.path.join(web_dir, "version.py")

    print("\n[*] Updating website files...")
    updated_count = 0

    if update_download_html(download_html, version, setup_name, setup_url, setup_size_mb, portable_name, portable_url):
        print(f"  [UPDATED] {download_html}")
        updated_count += 1
    else:
        print(f"  [CURRENT] {download_html}")

    if update_index_html(index_html, version):
        print(f"  [UPDATED] {index_html}")
        updated_count += 1
    else:
        print(f"  [CURRENT] {index_html}")

    if update_play_html(play_html, version):
        print(f"  [UPDATED] {play_html}")
        updated_count += 1
    else:
        print(f"  [CURRENT] {play_html}")

    if update_version_py(web_version_py, version):
        print(f"  [UPDATED] {web_version_py}")
        updated_count += 1
    else:
        print(f"  [CURRENT] {web_version_py}")

    # Also update main repo version.py if nearby
    main_version_py = os.path.abspath(os.path.join(web_dir, "..", "daytradesim", "version.py"))
    if os.path.exists(main_version_py):
        if update_version_py(main_version_py, version):
            print(f"  [UPDATED] {main_version_py}")
            updated_count += 1

    print("-" * 60)
    print(f"[SUCCESS] Website release synchronization complete for v{version}!")
    print("=" * 60)


if __name__ == "__main__":
    main()
