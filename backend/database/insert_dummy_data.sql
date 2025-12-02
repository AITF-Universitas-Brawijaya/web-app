-- Insert 3 dummy data untuk testing
-- Data 1: Verified - Judi
INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy) 
VALUES (
    'https://situs-judi-online.com',
    'Situs Judi Online Terpercaya',
    'situs-judi-online.com',
    '/screenshots/dummy1.png',
    'verified',
    TRUE
) RETURNING id_domain;

-- Simpan id_domain dari query di atas, misalnya id_domain = 1
INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version)
VALUES (
    currval('generated_domains_id_domain_seq'),
    true,
    'Website ini menampilkan konten perjudian online dengan berbagai permainan kasino dan taruhan olahraga. Terdapat promosi bonus deposit dan sistem pembayaran untuk transaksi judi.',
    98.5,
    'gpt-4-turbo'
);

INSERT INTO object_detection (id_detection, id_domain, label, confidence_score, image_detected_path, bounding_box, ocr, model_version)
VALUES (
    'det_' || currval('generated_domains_id_domain_seq'),
    currval('generated_domains_id_domain_seq'),
    true,
    95.5,
    '/detections/dummy1_detected.png',
    '{"boxes": [{"x": 100, "y": 150, "width": 200, "height": 100, "class": "casino_slot"}]}',
    '{"text": ["BONUS 100%", "DEPOSIT SEKARANG", "SLOT GACOR"]}',
    'yolov8-gambling-v1'
);

INSERT INTO results (id_domain, id_reasoning, id_detection, url, keywords, reasoning_text, image_final_path, label_final, final_confidence)
VALUES (
    currval('generated_domains_id_domain_seq'),
    currval('reasoning_id_reasoning_seq'),
    'det_' || currval('generated_domains_id_domain_seq'),
    'https://situs-judi-online.com',
    'judi, casino, slot, taruhan, betting',
    'Website ini teridentifikasi sebagai situs judi online berdasarkan konten visual dan tekstual yang menampilkan permainan kasino.',
    '/results/dummy1_final.png',
    true,
    97.3
);

-- Data 2: Unverified - Pornografi
INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy) 
VALUES (
    'https://adult-content-site.xxx',
    'Adult Entertainment Portal',
    'adult-content-site.xxx',
    '/screenshots/dummy2.png',
    'unverified',
    TRUE
) RETURNING id_domain;

INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version)
VALUES (
    currval('generated_domains_id_domain_seq'),
    true,
    'Situs ini mengandung konten dewasa eksplisit dengan gambar dan video pornografi. Terdapat kategori konten dewasa dan sistem membership.',
    96.5,
    'gpt-4-turbo'
);

INSERT INTO object_detection (id_detection, id_domain, label, confidence_score, image_detected_path, bounding_box, ocr, model_version)
VALUES (
    'det_' || currval('generated_domains_id_domain_seq'),
    currval('generated_domains_id_domain_seq'),
    true,
    92.3,
    '/detections/dummy2_detected.png',
    '{"boxes": [{"x": 50, "y": 80, "width": 300, "height": 250, "class": "explicit_content"}]}',
    '{"text": ["18+", "ADULT ONLY", "PREMIUM MEMBERSHIP"]}',
    'yolov8-nsfw-v1'
);

INSERT INTO results (id_domain, id_reasoning, id_detection, url, keywords, reasoning_text, image_final_path, label_final, final_confidence)
VALUES (
    currval('generated_domains_id_domain_seq'),
    currval('reasoning_id_reasoning_seq'),
    'det_' || currval('generated_domains_id_domain_seq'),
    'https://adult-content-site.xxx',
    'pornografi, dewasa, adult, nsfw, explicit',
    'Website ini teridentifikasi sebagai situs pornografi berdasarkan konten visual eksplisit dan indikator 18+.',
    '/results/dummy2_final.png',
    true,
    94.4
);

-- Data 3: False Positive - Penipuan (ternyata bukan penipuan)
INSERT INTO generated_domains (url, title, domain, image_path, status, is_dummy) 
VALUES (
    'https://legitimate-ecommerce.com',
    'Toko Online Resmi',
    'legitimate-ecommerce.com',
    '/screenshots/dummy3.png',
    'false-positive',
    TRUE
) RETURNING id_domain;

INSERT INTO reasoning (id_domain, label, context, confidence_score, model_version)
VALUES (
    currval('generated_domains_id_domain_seq'),
    false,
    'Website e-commerce yang legitimate dengan sistem pembayaran resmi dan verifikasi merchant. Tidak ditemukan indikator penipuan.',
    12.5,
    'gpt-4-turbo'
);

INSERT INTO object_detection (id_detection, id_domain, label, confidence_score, image_detected_path, bounding_box, ocr, model_version)
VALUES (
    'det_' || currval('generated_domains_id_domain_seq'),
    currval('generated_domains_id_domain_seq'),
    false,
    15.8,
    '/detections/dummy3_detected.png',
    '{"boxes": [{"x": 120, "y": 200, "width": 180, "height": 90, "class": "payment_gateway"}]}',
    '{"text": ["SECURE PAYMENT", "VERIFIED SELLER", "OFFICIAL STORE"]}',
    'yolov8-scam-v1'
);

INSERT INTO results (id_domain, id_reasoning, id_detection, url, keywords, reasoning_text, image_final_path, label_final, final_confidence)
VALUES (
    currval('generated_domains_id_domain_seq'),
    currval('reasoning_id_reasoning_seq'),
    'det_' || currval('generated_domains_id_domain_seq'),
    'https://legitimate-ecommerce.com',
    'ecommerce, toko online, belanja, official',
    'Website ini adalah toko online yang legitimate dan bukan merupakan situs penipuan.',
    '/results/dummy3_final.png',
    false,
    13.8
);
