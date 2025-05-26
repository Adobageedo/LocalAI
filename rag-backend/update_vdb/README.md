# update_vdb Ingestion Package

## Structure

- `core/` – Shared ingestion logic, chunking, and utilities
- `sources/` – Source-specific ingestion scripts (email, local docs, Google Drive, ...)
- `qdrant/` – Qdrant helper utilities
- `tests/` – Unit tests for ingestion logic
- `__main__.py` – CLI entry point (to be implemented)

## Usage

- Use the scripts in `sources/` for source-specific ingestion.
- All ingestion logic passes through `core/ingest_core.py` for consistency.
- Deduplication is handled via doc_id logic in `core/utils.py`.

## Adding New Sources

1. Implement a new script in `sources/` following the existing patterns.
2. Use `ingest_document` from `core/ingest_core.py`.
3. Add CLI entry point in `__main__.py` if desired.

## Requirements

- Python 3.8+
- Qdrant running and configured
- Environment variables as per `.env` and `config.yaml`

## Testing

Run unit tests from the `tests/` folder, e.g.:

```bash
python tests/test_ingest.py
```

## TODO
- Implement `__main__.py` CLI
- Add more tests
- Extend Google Drive/SharePoint support
