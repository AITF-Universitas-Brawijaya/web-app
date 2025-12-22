import requests
import sys

# Konfigurasi
BASE_URL = "http://localhost:3000"
# Jika ingin test URL publik:
# BASE_URL = "https://l7i1ghaqgdha36-3000.proxy.runpod.net"

API_KEY = "tim6-secret-key-2025"

def test_root():
    print(f"Testing GET {BASE_URL}/ ...", end=" ")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("OK")
        else:
            print(f"FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"ERROR: {e}")

def test_process_no_auth():
    print(f"Testing POST {BASE_URL}/process (No Auth) ...", end=" ")
    try:
        response = requests.post(f"{BASE_URL}/process", json={"data": "test"})
        if response.status_code == 403:
            print("OK (Correctly rejected)")
        else:
            print(f"FAILED (Expected 403, got {response.status_code})")
    except Exception as e:
        print(f"ERROR: {e}")

def test_process_wrong_auth():
    print(f"Testing POST {BASE_URL}/process (Wrong Auth) ...", end=" ")
    try:
        headers = {"X-API-Key": "wrong-key"}
        response = requests.post(f"{BASE_URL}/process", json={"data": "test"}, headers=headers)
        if response.status_code == 403:
            print("OK (Correctly rejected)")
        else:
            print(f"FAILED (Expected 403, got {response.status_code})")
    except Exception as e:
        print(f"ERROR: {e}")

def test_process_success():
    print(f"Testing POST {BASE_URL}/process (Correct Auth) ...", end=" ")
    try:
        headers = {"X-API-Key": API_KEY}
        test_string = "Hello World"
        response = requests.post(f"{BASE_URL}/process", json={"data": test_string}, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("received_string") == test_string:
                print("OK")
                print("  Response:", data)
            else:
                print("FAILED (Data mismatch)")
                print("  Response:", data)
        else:
            print(f"FAILED (Status: {response.status_code})")
            print("  Response:", response.text)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    print(f"Running tests against {BASE_URL}\n")
    
    test_root()
    test_process_no_auth()
    test_process_wrong_auth()
    test_process_success()
    
    print("\nDone.")
