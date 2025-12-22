# Process Links Endpoint

## Deskripsi
Endpoint `/process-links` memungkinkan Anda untuk memproses kumpulan URL secara langsung tanpa melakukan pencarian keyword terlebih dahulu. Endpoint ini akan melewati fase pencarian dan langsung memproses URL yang diberikan.

## Endpoint
```
POST /process-links
```

## Headers
```
X-API-Key: tim6-secret-key-2025
Content-Type: application/json
```

## Request Body
```json
{
  "links": [
    "https://example1.com",
    "https://example2.com",
    "https://example3.com"
  ]
}
```

### Parameter
- `links` (array of strings, required): Daftar URL yang akan diproses langsung oleh crawler

## Response
Response berupa streaming text yang menampilkan log real-time dari proses crawling.

## Contoh Penggunaan

### cURL
```bash
curl -X POST "http://localhost:3000/process-links" \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "links": [
      "https://example1.com",
      "https://example2.com"
    ]
  }'
```

### Python
```python
import requests

url = "http://localhost:3000/process-links"
headers = {
    "X-API-Key": "tim6-secret-key-2025",
    "Content-Type": "application/json"
}
data = {
    "links": [
        "https://example1.com",
        "https://example2.com",
        "https://example3.com"
    ]
}

response = requests.post(url, json=data, headers=headers, stream=True)

# Stream the logs
for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3000/process-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'tim6-secret-key-2025',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    links: [
      'https://example1.com',
      'https://example2.com',
      'https://example3.com'
    ]
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

## Perbedaan dengan `/process`

| Feature | `/process` | `/process-links` |
|---------|-----------|------------------|
| Input | Keywords (string) | URLs (array) |
| Pencarian | Ya, mencari domain berdasarkan keyword | Tidak, langsung memproses URL |
| Jumlah domain | Ditentukan oleh `num_domains` | Ditentukan oleh jumlah URL dalam array |
| Use case | Mencari domain baru berdasarkan keyword | Memproses domain yang sudah diketahui |

## Catatan
- Endpoint ini memanggil `crawler.py` dengan flag `-d` (domains) untuk mode manual entry
- Proses pencarian keyword akan di-skip sepenuhnya
- Semua URL dalam list akan diproses oleh crawler
- Response menggunakan streaming untuk menampilkan log real-time
