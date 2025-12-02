import os
import sys
import time
import json
import argparse
from typing import Any, Dict, Optional, List

import requests

# =====================================================
# Default settings so the script can be run without flags
# =====================================================
DEFAULT_ARGS = {
    "base_url": "http://localhost:8000",
    "api_prefix": "/api",
    "api_key": "W1eqZEROOsKw9gphfEYPvPYlHqS0lSAELjbYJCWqCxFl831wqSmwlXTht6t4ABO0",
    "query": "Retourne moi le loyer de madame moreau ",
    "top_k": 100,
    "split_prompt": "false",
    "rerank": "false",
    "use_hyde": "false",
    "collection": "TEST_BAUX_Vincent",#"edoardo",
}
# =====================================================


def build_url(base_url: str, api_prefix: str, path: str) -> str:
    base = base_url.rstrip("/")
    prefix = api_prefix.rstrip("/")
    p = path.lstrip("/")
    return f"{base}{prefix}/{p}"


def call_health(base_url: str, api_prefix: str) -> Dict[str, Any]:
    url = build_url(base_url, api_prefix, "rag/health")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return resp.json()


def call_search(
    base_url: str,
    api_prefix: str,
    api_key: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    url = build_url(base_url, api_prefix, "rag/search")
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }
    start = time.perf_counter()
    resp = requests.post(url, headers=headers, json=payload, timeout=300)
    elapsed = time.perf_counter() - start
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    return {
        "http_status": resp.status_code,
        "client_time_sec": round(elapsed, 3),
        "data": data,
    }


def to_bool(s: str) -> bool:
    return str(s).lower() in ("true", "1", "yes", "y", "on")


def main() -> None:
    total_start = time.perf_counter()

    parser = argparse.ArgumentParser(description="Test RAG search API (flags optional)")
    parser.add_argument("--base-url", default=DEFAULT_ARGS["base_url"])
    parser.add_argument("--api-prefix", default=DEFAULT_ARGS["api_prefix"])
    parser.add_argument("--api-key", default=DEFAULT_ARGS["api_key"])
    parser.add_argument("--query", default=DEFAULT_ARGS["query"])
    parser.add_argument("--top-k", type=int, default=DEFAULT_ARGS["top_k"])
    parser.add_argument("--split-prompt", default=DEFAULT_ARGS["split_prompt"])
    parser.add_argument("--rerank", default=DEFAULT_ARGS["rerank"])
    parser.add_argument("--use-hyde", default=DEFAULT_ARGS["use_hyde"])
    parser.add_argument("--collection", default=DEFAULT_ARGS["collection"])
    parser.add_argument("--metadata-filter", default="")

    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: Provide API key via --api-key or DEFAULT_ARGS", file=sys.stderr)
        sys.exit(1)

    # --------------------------------------------------
    # HEALTH CHECK
    # --------------------------------------------------
    print("== Health ==")
    try:
        health = call_health(args.base_url, args.api_prefix)
        print(json.dumps(health, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Health check failed: {e}", file=sys.stderr)

    # --------------------------------------------------
    # BUILD PAYLOAD
    # --------------------------------------------------
    payload: Dict[str, Any] = {
        "query": args.query,
        "top_k": args.top_k,
        "split_prompt": to_bool(args.split_prompt),
        "rerank": to_bool(args.rerank),
        "use_hyde": to_bool(args.use_hyde),
        "collection": args.collection or None,
    }

    try:
        payload["metadata_filter"] = json.loads(args.metadata_filter) if args.metadata_filter else None
    except json.JSONDecodeError:
        print("ERROR: --metadata-filter must be valid JSON", file=sys.stderr)
        sys.exit(2)

    print("\n== Request Payload ==")
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    # --------------------------------------------------
    # SEARCH
    # --------------------------------------------------
    print("\n== Search Response ==")
    try:
        result = call_search(args.base_url, args.api_prefix, args.api_key, payload)

        print(f"HTTP Status: {result['http_status']}")
        print(f"Client Time: {result['client_time_sec']}s")

        data = result.get("data", {})
        duration_ms = data.get("duration_ms")
        if duration_ms is not None:
            print(f"Server duration_ms: {duration_ms}ms")

        # Document paths
        docs: List[Dict[str, Any]] = data.get("documents", []) or []
        if docs:
            print(f"\nDocuments returned: {len(docs)}")
            for d in docs:
                if "path" in d:
                    print(f" - {d['path']}")

        print("\nFull JSON response:")
        print(json.dumps(data, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"Search failed: {e}", file=sys.stderr)
        sys.exit(3)

    # --------------------------------------------------
    # SUMMARY
    # --------------------------------------------------
    total_elapsed = round(time.perf_counter() - total_start, 3)

    print("\n==================== SUMMARY ====================")
    print(f"Query:            {args.query}")
    print(f"Collection:       {args.collection}")
    print(f"Top-K:            {args.top_k}")
    print(f"Documents found:  {len(data.get('documents', []) or [])}")
    print(f"Client latency:   {result['client_time_sec']}s")
    print(f"Server latency:   {duration_ms}ms" if duration_ms else "Server latency:   N/A")
    print(f"Total run time:   {total_elapsed}s")
    print("==================================================")


if __name__ == "__main__":
    main()