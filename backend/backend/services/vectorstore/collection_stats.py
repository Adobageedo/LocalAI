#!/usr/bin/env python
"""
Script to analyze a Qdrant collection and return statistics.
Shows total vector count and unique source paths in the collection.
"""
import sys
import os
import argparse
from collections import Counter

# Add the project root to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.services.vectorstore.qdrant_manager import VectorStoreManager
from backend.core.logger import log

def get_collection_stats(collection_name: str, user_id: str = None):
    """
    Get statistics about a Qdrant collection:
    - Total number of vectors
    - Unique source paths
    - Count of documents per source path prefix
    
    Args:
        collection_name: Name of the collection to analyze
        user_id: Optional user ID to filter by
        
    Returns:
        dict: Collection statistics
    """
    # Initialize the vector store manager
    manager = VectorStoreManager(collection_name=collection_name)
    
    # Make sure collection exists
    manager.ensure_collection_exists()
    
    # Get collection info (includes vector count)
    collection_info = manager.client.get_collection(collection_name=collection_name)
    vector_count = collection_info.points_count
    
    log.info(f"Collection '{collection_name}' contains {vector_count} vectors")
    
    # Prepare query filter (optionally filtered by user_id)
    search_filter = None
    if user_id:
        search_filter = {"must": [{"key": "user_id", "match": {"value": user_id}}]}
    
    # Scroll through all vectors to extract unique source paths
    # We'll use limit=100 and scroll through all results
    limit = 100
    offset = 0
    source_paths = []
    source_path_prefixes = Counter()
    
    log.info(f"Retrieving metadata for all vectors (this may take a while)...")
    
    # Paginate through results
    while True:
        # Get a batch of points with their payloads (metadata)
        points, next_offset = manager.client.scroll(
            collection_name=collection_name,
            scroll_filter=search_filter,
            limit=limit,
            offset=offset,
            with_payload=True
        )
        
        # If no results, we've reached the end
        if not points:
            break
            
        # Extract source paths from metadata
        for point in points:
            payload = point.payload or {}
            # Handle both direct payload and nested metadata
            meta = payload.get('metadata', payload)
            
            # Try to get source_path from metadata or payload
            if 'source_path' in meta:
                path = meta['source_path']
                source_paths.append(path)
                
                # Count prefixes (first part of the path)
                # This helps identify different sources (gmail/, outlook/, nextcloud/, etc.)
                prefix = path.split('/')[0] if '/' in path else path
                source_path_prefixes[prefix] += 1
        
        # Update offset for next iteration
        if next_offset is None:
            break
        offset = next_offset
        
        # Log progress
        log.info(f"Processed {offset}/{vector_count} vectors...")
        
        # If we got fewer results than the limit, we've reached the end
        if len(points) < limit:
            break
    
    # Calculate statistics
    unique_paths = len(set(source_paths))
    
    # Prepare results
    stats = {
        "collection_name": collection_name,
        "vector_count": vector_count,
        "unique_source_paths": unique_paths,
        "source_distribution": dict(source_path_prefixes),
    }
    
    # Additional user-specific info
    if user_id:
        stats["user_id"] = user_id
        stats["user_vector_count"] = len(source_paths)
    
    return stats

def main():
    parser = argparse.ArgumentParser(description='Analyze a Qdrant collection and show statistics.')
    parser.add_argument('--collection', required=True, help='Name of the collection to analyze')
    parser.add_argument('--user_id', help='Optional user ID to filter by')
    
    args = parser.parse_args()
    
    try:
        stats = get_collection_stats(args.collection, args.user_id)
        
        # Print results
        print("\n===== Collection Statistics =====")
        print(f"Collection: {stats['collection_name']}")
        print(f"Total vectors: {stats['vector_count']}")
        print(f"Unique source paths: {stats['unique_source_paths']}")
        
        if args.user_id:
            print(f"\nUser: {stats['user_id']}")
            print(f"User vectors: {stats['user_vector_count']}")
        
        print("\nSource distribution:")
        for source, count in stats['source_distribution'].items():
            print(f"  {source}: {count} vectors")
            
        print("===============================\n")
        
    except Exception as e:
        log.error(f"Error analyzing collection: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
