import requests
import sys

# Konfigurasi
BASE_URL = "http://localhost:3000"
API_KEY = "tim6-secret-key-2025"

def test_chat_full_payload():
    print(f"Testing POST {BASE_URL}/chat (Full Payload) ...", end=" ")
    try:
        headers = {"X-API-Key": API_KEY}
        # Payload sesuai contoh permintaan user
        payload = {
            "query": "Apa itu pasal perjudian?",
            "category": "hukum",
            "k": 5,
            "max_new_tokens": 128,
            "temperature": 0.7
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload, headers=headers)
        
        # Expect 502 karena upstream 8002 mungkin tidak ada, tapi request valid
        if response.status_code == 200:
            print("OK (Upstream responded)")
            print("  Response:", response.json())
        elif response.status_code == 502:
            print("OK (Proxy logic accepted payload, upstream unavailable)")
            # print("  Details:", response.json())
        else:
            print(f"FAILED (Status: {response.status_code})")
            print("  Response:", response.text)
    except Exception as e:
        print(f"ERROR: {e}")

def test_chat_invalid_category():
    print(f"Testing POST {BASE_URL}/chat (Invalid Category) ...", end=" ")
    try:
        headers = {"X-API-Key": API_KEY}
        payload = {
            "query": "test", 
            "category": "invalid",
            "k": 5
        }
        response = requests.post(f"{BASE_URL}/chat", json=payload, headers=headers)
        
        if response.status_code == 400:
            print("OK (Correctly rejected)")
        else:
            print(f"FAILED (Expected 400, got {response.status_code})")
            print("  Response:", response.text)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_chat_full_payload()
    test_chat_invalid_category()
