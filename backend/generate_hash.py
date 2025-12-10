#!/usr/bin/env python3
import bcrypt

# Generate hash for password123
password = "password123".encode('utf-8')
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)
print(hashed.decode('utf-8'))
