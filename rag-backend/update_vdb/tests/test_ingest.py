# Basic test for ingestion logic

def test_compute_doc_id():
    from update_vdb.core.utils import compute_doc_id
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(b"test content")
        tmp_path = tmp.name
    doc_id = compute_doc_id(tmp_path)
    assert isinstance(doc_id, str) and len(doc_id) == 64
    os.remove(tmp_path)
    print("test_compute_doc_id passed")

if __name__ == "__main__":
    test_compute_doc_id()
