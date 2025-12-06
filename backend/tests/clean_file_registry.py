import json

def clean_items(input_file, output_file):
    # Load JSON
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    cleaned = {}

    for key, item in data.items():
        metadata = item.get("metadata", {})

        num_chunks = metadata.get("num_chunks")

        # Keep only if num_chunks exists AND is > 0
        if isinstance(num_chunks, int) and num_chunks > 0:
            cleaned[key] = item

    # Save cleaned file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print(f"✔ Cleaning done. {len(cleaned)} items kept.")


if __name__ == "__main__":
    clean_items("input.json", "file_registry_TEST_BAUX_Vincent.json")