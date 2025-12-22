# HTTP Streaming Response - Dokumentasi

## Overview
Implementasi HTTP streaming response untuk endpoint `/process` di `main_api.py` yang memungkinkan client menerima logs secara real-time dari proses crawler.

## Perubahan yang Dilakukan

### 1. File: `main_api.py`

#### Import yang Ditambahkan:
```python
from fastapi.responses import StreamingResponse
```

#### Endpoint `/process` - Sebelum:
- Menjalankan crawler di background
- Mengembalikan response JSON dengan PID dan status
- Logs disimpan ke file, tidak bisa dilihat real-time

#### Endpoint `/process` - Sesudah:
- Menjalankan crawler dengan subprocess.Popen
- Menggunakan `StreamingResponse` untuk streaming logs
- Client menerima logs line-by-line secara real-time
- Menggunakan flag `-u` (unbuffered) untuk Python subprocess

### 2. Cara Kerja Streaming

```python
def crawler_log_generator():
    """Generator function yang yield logs line by line"""
    
    # 1. Setup command dengan flag -u untuk unbuffered output
    cmd = ["python3", "-u", crawler_script, "-k", keywords, "-n", num_domains]
    
    # 2. Jalankan subprocess dengan PIPE
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,  # Gabungkan stderr ke stdout
        universal_newlines=True,
        bufsize=1  # Line buffered
    )
    
    # 3. Stream output line by line
    for line in iter(process.stdout.readline, ''):
        if line:
            yield line  # Kirim ke client
    
    # 4. Tunggu proses selesai
    process.wait()
```

### 3. Testing

#### Menggunakan curl:
```bash
curl -X POST http://localhost:3000/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tim6-secret-key-2025" \
  -d '{"data": "slot online", "num_domains": 3}'
```

#### Menggunakan Python:
```python
import requests

url = "http://localhost:3000/process"
headers = {
    "X-API-Key": "tim6-secret-key-2025",
    "Content-Type": "application/json"
}
data = {
    "data": "slot online",
    "num_domains": 3
}

# Stream response
response = requests.post(url, json=data, headers=headers, stream=True)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

#### Menggunakan JavaScript (Frontend):
```javascript
const response = await fetch('http://localhost:3000/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'tim6-secret-key-2025'
  },
  body: JSON.stringify({
    data: 'slot online',
    num_domains: 3
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  console.log(text); // Display logs real-time
}
```

## Keuntungan Streaming Response

1. **Real-time Feedback**: User dapat melihat progress crawler secara langsung
2. **Better UX**: User tahu bahwa proses sedang berjalan, tidak perlu menunggu tanpa feedback
3. **Debugging**: Lebih mudah untuk debug karena logs langsung terlihat
4. **No Timeout**: Untuk proses yang lama, streaming mencegah timeout di client

## File Terkait

- `/home/ubuntu/tim6_prd_workdir/main_api.py` - Main API dengan streaming endpoint
- `/home/ubuntu/tim6_prd_workdir/domain-generator/crawler.py` - Crawler script yang di-stream outputnya
- `/home/ubuntu/tim6_prd_workdir/try_log.py` - Contoh sederhana streaming response
- `/home/ubuntu/tim6_prd_workdir/inference_service.py` - Service terpisah untuk generator function

## Catatan Penting

1. **Unbuffered Output**: Flag `-u` pada Python command sangat penting untuk real-time streaming
2. **Line Buffering**: `bufsize=1` memastikan output di-flush per line
3. **Error Handling**: stderr digabungkan ke stdout agar error juga ter-stream
4. **Media Type**: Menggunakan `text/plain` untuk streaming logs
