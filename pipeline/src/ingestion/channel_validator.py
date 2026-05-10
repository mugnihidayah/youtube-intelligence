"""
Channel URL Validator & Discovery Script.
Searches YouTube for each channel name and finds the correct URL.
"""

import time
import json
import subprocess
import yaml


def validate_channel_url(url: str) -> dict | None:
    """Check if a YouTube channel URL is valid using yt-dlp."""
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--dump-json",
                "--playlist-items", "1",
                "--flat-playlist",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip().split("\n")[0])
            return {
                "channel": data.get("channel"),
                "channel_id": data.get("channel_id"),
                "channel_url": data.get("channel_url"),
                "uploader": data.get("uploader"),
            }
    except Exception as e:
        print(f"  Error validating {url}: {e}")
    return None


def search_channel(name: str, niche: str) -> dict | None:
    """Search YouTube for a channel by name."""
    query = f"{name} {niche} youtube channel"
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                f"ytsearch3:{query}",
                "--dump-json",
                "--flat-playlist",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            for line in result.stdout.strip().split("\n"):
                try:
                    data = json.loads(line)
                    channel_url = data.get("channel_url")
                    channel_name = data.get("channel") or data.get("uploader")
                    if channel_url:
                        return {
                            "channel": channel_name,
                            "channel_id": data.get("channel_id"),
                            "channel_url": channel_url,
                        }
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"  Error searching {name}: {e}")
    return None


def validate_channels_yaml(yaml_path: str, output_path: str):
    """Validate all channels in YAML and output corrected version."""
    with open(yaml_path, "r", encoding="utf-8") as f:
        channels = yaml.safe_load(f)

    results = {}

    for niche, channel_list in channels.items():
        print(f"NICHE: {niche.upper()} ({len(channel_list)} channels)")

        results[niche] = []

        for i, ch in enumerate(channel_list):
            name = ch["name"]
            url = ch["url"]
            region = ch["region"]

            print(f"\n[{i+1}/{len(channel_list)}] {name}")
            print(f"  Testing URL: {url}")

            # Step 1: Try the given URL
            info = validate_channel_url(url)

            if info:
                print(f"VALID → {info['channel']} ({info['channel_url']})")
                results[niche].append({
                    "name": info["channel"] or name,
                    "url": info["channel_url"] or url,
                    "channel_id": info.get("channel_id", ""),
                    "region": region,
                    "status": "valid",
                })
            else:
                # Step 2: Search YouTube
                print("Invalid URL. Searching YouTube...")
                info = search_channel(name, niche)

                if info:
                    print(f"FOUND → {info['channel']} ({info['channel_url']})")
                    results[niche].append({
                        "name": info["channel"] or name,
                        "url": info["channel_url"],
                        "channel_id": info.get("channel_id", ""),
                        "region": region,
                        "status": "found_via_search",
                    })
                else:
                    print("NOT FOUND — skipping")
                    results[niche].append({
                        "name": name,
                        "url": url,
                        "channel_id": "",
                        "region": region,
                        "status": "not_found",
                    })

            time.sleep(2)  # Rate limiting

    # Save results
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(results, f, default_flow_style=False, allow_unicode=True)

    # Print summary
    print("SUMMARY")
    for niche, chs in results.items():
        valid = sum(1 for c in chs if c["status"] == "valid")
        found = sum(1 for c in chs if c["status"] == "found_via_search")
        not_found = sum(1 for c in chs if c["status"] == "not_found")
        print(f"{niche}: {valid} valid | {found} found via search | {not_found} not found")

    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    yaml_path = "pipeline/src/config/channels.yaml"
    output_path = "pipeline/src/config/channels_validated.yaml"
    validate_channels_yaml(yaml_path, output_path)
