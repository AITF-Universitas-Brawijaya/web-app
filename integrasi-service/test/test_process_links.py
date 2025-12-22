#!/usr/bin/env python3
"""
Test script untuk endpoint /process-links
"""

import requests
import sys

# Configuration
API_URL = "http://localhost:3000/process-links"
API_KEY = "tim6-secret-key-2025"

# Sample URLs to test
test_links = [
    "https://www.google.com",
    "https://www.facebook.com",
    "https://www.twitter.com"
]

def test_process_links(links):
    """
    Test the /process-links endpoint with given links
    """
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "links": links
    }
    
    print(f"Testing /process-links endpoint...")
    print(f"API URL: {API_URL}")
    print(f"Number of links: {len(links)}")
    print(f"Links:")
    for i, link in enumerate(links, 1):
        print(f"  {i}. {link}")
    print("\n" + "="*60)
    print("Starting request...\n")
    
    try:
        response = requests.post(
            API_URL, 
            json=data, 
            headers=headers, 
            stream=True,
            timeout=600  # 10 minutes timeout
        )
        
        if response.status_code == 200:
            print("✅ Request successful! Streaming logs:\n")
            # Stream the response
            for line in response.iter_lines():
                if line:
                    print(line.decode('utf-8'))
        else:
            print(f"❌ Request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # You can customize the links here or pass them as command line arguments
    if len(sys.argv) > 1:
        # Use command line arguments as links
        custom_links = sys.argv[1:]
        test_process_links(custom_links)
    else:
        # Use default test links
        test_process_links(test_links)
