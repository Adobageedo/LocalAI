#!/usr/bin/env python3
"""
Test script for GoogleDriveService and PersonalDriveService
This script tests the core functionality of both services with a specific user ID
"""

import os
import sys
import logging
import io
from datetime import datetime
from pprint import pprint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("drive_services_test")

# Import the services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.services.google_drive_service import GoogleDriveService
from api.services.personal_drive_service import PersonalDriveService

# Set test parameters
TEST_USER_ID = "7EShftbbQ4PPTS4hATplexbrVHh2"
TEST_TEXT_CONTENT = "This is a test file created by the drive services test script."
TEST_FOLDER_NAME = f"test_folder_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
TEST_FILE_NAME = f"test_file_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
TEST_COPY_NAME = f"test_file_copy_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
TEST_LOCAL_FOLDER = "/tmp/test_upload_folder"


def separator(title):
    """Print a separator with a title"""
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80 + "\n")


def test_personal_drive_service():
    """Test PersonalDriveService functionality"""
    separator("PERSONAL DRIVE SERVICE TESTS")
    
    # Initialize the service
    print("Initializing PersonalDriveService...")
    personal_drive = PersonalDriveService()
    
    # Test listing files at root
    print("\n1. Testing list_files at root path")
    try:
        result = personal_drive.list_files(TEST_USER_ID, "/")
        files = result.get('items', [])
        print(f"Success! Found {len(files)} items at path '{result.get('path', '/')}':")
        for idx, file in enumerate(files[:5], 1):
            print(f"  {idx}. {file['name']} ({'directory' if file['is_directory'] else 'file'})")
        if len(files) > 5:
            print(f"  ... and {len(files) - 5} more items")
    except Exception as e:
        print(f"Error listing files: {e}")
    
    # Test folder creation
    print("\n2. Testing create_directory")
    try:
        folder_path = f"/{TEST_FOLDER_NAME}"
        result = personal_drive.create_directory(TEST_USER_ID, folder_path)
        print(f"Success! Folder created at {result['path']}")
    except Exception as e:
        print(f"Error creating folder: {e}")
    
    # Test file upload
    print("\n3. Testing upload_file")
    try:
        file_content = io.BytesIO(TEST_TEXT_CONTENT.encode('utf-8'))
        result = personal_drive.upload_file(
            TEST_USER_ID, 
            f"/{TEST_FOLDER_NAME}", 
            file_content, 
            TEST_FILE_NAME
        )
        print(f"Success! File uploaded to {result['path']}")
    except Exception as e:
        print(f"Error uploading file: {e}")
    
    # Test file reading
    print("\n4. Testing get_file_contents")
    try:
        content, content_type, file_size = personal_drive.get_file_contents(TEST_USER_ID, f"/{TEST_FOLDER_NAME}/{TEST_FILE_NAME}")
        content_text = content.read().decode('utf-8')
        print(f"Success! File content: '{content_text}', type: {content_type}, size: {file_size}")
    except Exception as e:
        print(f"Error reading file: {e}")
    
    # Test file copying
    print("\n5. Testing copy_item")
    try:
        source_path = f"/{TEST_FOLDER_NAME}/{TEST_FILE_NAME}"
        dest_path = f"/{TEST_FOLDER_NAME}/{TEST_COPY_NAME}"
        result = personal_drive.copy_item(
            TEST_USER_ID,
            source_path,
            dest_path
        )
        print(f"Success! File copied to {result['destination_path']}")
    except Exception as e:
        print(f"Error copying file: {e}")
    
    # Test building directory tree
    print("\n6. Testing build_directory_tree")
    try:
        tree = personal_drive.build_directory_tree(TEST_USER_ID, "/")
        print("Success! Directory tree structure (first level only):")
        if tree and "children" in tree:
            for item in tree["children"][:5]:
                print(f"  - {item['name']} ({'file' if item.get('is_file', False) else 'directory'})")
            if len(tree["children"]) > 5:
                print(f"  ... and {len(tree['children']) - 5} more items")
        else:
            print("  No items in root directory or empty tree structure")
    except Exception as e:
        print(f"Error building directory tree: {e}")
    
    # Cleanup - delete test folder
    print("\n7. Testing delete_item")
    try:
        result = personal_drive.delete_item(TEST_USER_ID, f"/{TEST_FOLDER_NAME}", recursive=True)
        print(f"Success! Deleted folder and all contents")
    except Exception as e:
        print(f"Error deleting folder: {e}")


def test_google_drive_service():
    """Test GoogleDriveService functionality"""
    separator("GOOGLE DRIVE SERVICE TESTS")
    
    # Initialize the service
    print("Initializing GoogleDriveService...")
    google_drive = GoogleDriveService()
    
    # Test authentication status
    print("\n1. Testing check_auth_status")
    try:
        auth_status = google_drive.check_auth_status(TEST_USER_ID)
        print(f"Authentication status: {'Authenticated' if auth_status.get('authenticated', False) else 'Not authenticated'}")
        if not auth_status.get('authenticated', False):
            print("Note: You need to authenticate with Google Drive to run further tests.")
            print(f"Auth URL: {google_drive.get_auth_url(TEST_USER_ID)}")
            return
    except Exception as e:
        print(f"Error checking auth status: {e}")
        return
    
    # Test listing files at root
    print("\n2. Testing list_files at root path")
    try:
        result = google_drive.list_files(TEST_USER_ID, "/")
        files = result.get('items', [])
        print(f"Success! Found {len(files)} items at path '{result.get('path', '/')}':")
        for idx, file in enumerate(files[:5], 1):
            print(f"  {idx}. {file['name']} ({'directory' if file['is_directory'] else 'file'})")
        if len(files) > 5:
            print(f"  ... and {len(files) - 5} more items")
    except Exception as e:
        print(f"Error listing files: {e}")
    
    # Test folder creation
    print("\n3. Testing create_folder")
    try:
        result = google_drive.create_folder(TEST_USER_ID, "/", TEST_FOLDER_NAME)
        print(f"Success! Folder created at {result['path']}")
        test_folder_path = result['path']
    except Exception as e:
        print(f"Error creating folder: {e}")
        test_folder_path = f"/{TEST_FOLDER_NAME}"
    
    # Test file upload
    print("\n4. Testing upload_file")
    try:
        file_content = io.BytesIO(TEST_TEXT_CONTENT.encode('utf-8'))
        result = google_drive.upload_file(
            TEST_USER_ID, 
            test_folder_path, 
            file_content, 
            TEST_FILE_NAME
        )
        print(f"Success! File uploaded to {result['path']}")
        test_file_path = result['path']
    except Exception as e:
        print(f"Error uploading file: {e}")
        test_file_path = f"{test_folder_path}/{TEST_FILE_NAME}"
    
    # Test file download
    print("\n5. Testing download_file")
    try:
        content, filename, file_size, mime_type = google_drive.download_file(TEST_USER_ID, test_file_path)
        content_text = content.read().decode('utf-8')
        print(f"Success! File content: '{content_text}', filename: '{filename}', size: {file_size} bytes, MIME type: {mime_type}")
    except Exception as e:
        print(f"Error downloading file: {e}")
    
    # Test folder upload (prepare local folder structure first)
    print("\n6. Testing folder upload preparation")
    try:
        # Create test folder structure
        if not os.path.exists(TEST_LOCAL_FOLDER):
            os.makedirs(TEST_LOCAL_FOLDER)
        
        # Create some files in the test folder
        with open(f"{TEST_LOCAL_FOLDER}/test1.txt", "w") as f:
            f.write("Test file 1 content")
        
        # Create a subfolder
        os.makedirs(f"{TEST_LOCAL_FOLDER}/subfolder", exist_ok=True)
        with open(f"{TEST_LOCAL_FOLDER}/subfolder/test2.txt", "w") as f:
            f.write("Test file 2 content in subfolder")
        
        print(f"Created local folder structure at {TEST_LOCAL_FOLDER}")
    except Exception as e:
        print(f"Error preparing local folder: {e}")
    
    # Test folder upload if implemented
    print("\n7. Testing upload_folder")
    try:
        result = google_drive.upload_folder(
            TEST_USER_ID,
            test_folder_path,
            TEST_LOCAL_FOLDER
        )
        print(f"Success! Folder uploaded to {result['path']}")
        print(f"  Files uploaded: {result['uploaded_items']['files_uploaded']}")
        print(f"  Folders created: {result['uploaded_items']['folders_created']}")
        if result['uploaded_items']['errors']:
            print(f"  Errors: {len(result['uploaded_items']['errors'])}")
    except Exception as e:
        print(f"Error uploading folder: {e}")
    
    # Cleanup - delete test folder on Google Drive
    print("\n8. Testing delete_item")
    try:
        result = google_drive.delete_item(
            TEST_USER_ID, 
            test_folder_path
        )
        print(f"Success! Deleted folder: {result}")
    except Exception as e:
        print(f"Error deleting folder: {e}")
        
    # Clean up local test folder
    print("\n9. Cleaning up local test folder")
    try:
        if os.path.exists(TEST_LOCAL_FOLDER):
            import shutil
            shutil.rmtree(TEST_LOCAL_FOLDER)
            print(f"Removed local test folder: {TEST_LOCAL_FOLDER}")
    except Exception as e:
        print(f"Error cleaning up local folder: {e}")


def main():
    """Main function to run the tests"""
    print("Starting Drive Services Test")
    print(f"Testing with user ID: {TEST_USER_ID}")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Test PersonalDriveService
        test_personal_drive_service()
        
        # Test GoogleDriveService
        test_google_drive_service()
        
    except Exception as e:
        logger.error(f"Unexpected error during tests: {e}", exc_info=True)
    
    print("\nTest script execution completed")


if __name__ == "__main__":
    main()
