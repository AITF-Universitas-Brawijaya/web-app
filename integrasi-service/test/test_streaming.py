#!/usr/bin/env python3
"""
Test script untuk HTTP streaming response dari endpoint /process
"""

import requests
import sys

def test_streaming_process():
    """Test streaming response dari endpoint /process"""
    
    url = "http://localhost:3000/process"
    headers = {
        "X-API-Key": "tim6-secret-key-2025",
        "Content-Type": "application/json"
    }
    
    # Data untuk testing - gunakan num_domains kecil untuk testing cepat
    data = {
        "data": "slot online",
        "num_domains": 2
    }
    
    print("=" * 60)
    print("Testing Streaming Response - /process endpoint")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"Keywords: {data['data']}")
    print(f"Number of domains: {data['num_domains']}")
    print("=" * 60)
    print("\nStreaming logs:\n")
    
    try:
        # Kirim request dengan stream=True
        response = requests.post(
            url, 
            json=data, 
            headers=headers, 
            stream=True,
            timeout=300  # 5 menit timeout
        )
        
        # Check status code
        if response.status_code != 200:
            print(f"❌ Error: HTTP {response.status_code}")
            print(response.text)
            return False
        
        # Stream response line by line
        for line in response.iter_lines():
            if line:
                # Decode bytes to string
                log_line = line.decode('utf-8')
                print(log_line)
                sys.stdout.flush()  # Force flush untuk real-time display
        
        print("\n" + "=" * 60)
        print("✅ Streaming completed successfully!")
        print("=" * 60)
        return True
        
    except requests.exceptions.Timeout:
        print("\n❌ Request timeout after 5 minutes")
        return False
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection error - is the server running?")
        return False
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_streaming_process()
    sys.exit(0 if success else 1)
