import os
import pickle
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import tempfile
from ingest_documents import index_single_file

# If modifying these scopes, delete the file token.pickle.
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
]

CREDENTIALS_FILE = 'credentials.json'  # Download this from Google Cloud Console
TOKEN_FILE = 'token.pickle'
DOWNLOAD_DIR = tempfile.gettempdir()


def authenticate():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
    return creds


def list_drive_files(service):
    # List all files (could be improved with pagination and filtering)
    results = service.files().list(q="mimeType!='application/vnd.google-apps.folder'",
                                   pageSize=1000,
                                   fields="nextPageToken, files(id, name, mimeType)").execute()
    files = results.get('files', [])
    return files


def download_file(service, file_id, file_name, mime_type):
    # Choose export format for Google Docs
    export_mimes = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/pdf',
    }
    if mime_type in export_mimes:
        request = service.files().export_media(fileId=file_id, mimeType=export_mimes[mime_type])
        ext = '.pdf' if 'pdf' in export_mimes[mime_type] else '.xlsx'
        local_filename = file_name + ext
    else:
        request = service.files().get_media(fileId=file_id)
        local_filename = file_name
    file_path = os.path.join(DOWNLOAD_DIR, local_filename)
    fh = io.FileIO(file_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    return file_path


def main():
    print("Authenticating with Google...")
    creds = authenticate()
    drive_service = build('drive', 'v3', credentials=creds)
    print("Listing files in Google Drive...")
    files = list_drive_files(drive_service)
    print(f"Found {len(files)} files. Downloading and ingesting...")
    for f in files:
        print(f"Downloading {f['name']} ({f['mimeType']})...")
        try:
            file_path = download_file(drive_service, f['id'], f['name'], f['mimeType'])
            print(f"Indexing {file_path}...")
            index_single_file(file_path)
            os.remove(file_path)  # Clean up
        except Exception as e:
            print(f"Failed to process {f['name']}: {e}")
    print("Done.")

if __name__ == "__main__":
    main()
