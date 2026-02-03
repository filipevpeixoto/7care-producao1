#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "https://7careapp-2026.netlify.app"

print("=== LOGIN ===")
r = requests.post(f"{BASE_URL}/api/auth/login", json={"email":"admin@7care.com","password":"meu7care"})
token = r.json().get("token")
print(f"Token obtido: {token[:50]}...")

print("\n=== CRIAR CONVITE ===")
email = f"pastor.debug.{int(time.time())}@7care.com"
r = requests.post(f"{BASE_URL}/api/invites", headers={"Authorization": f"Bearer {token}"}, json={"email": email, "expiresInDays": 7})
print(f"Status: {r.status_code}")
invite_token = r.json().get("token")
print(f"Convite: {invite_token[:30]}...")

print("\n=== TESTAR ONBOARDING ===")
payload = {
    "name": "Pastor Debug",
    "phone": "11999999999",
    "password": "teste123",
    "district": {"name": "Distrito Debug", "description": "Teste"},
    "churches": [{"name": "Igreja Debug", "address": "Rua Teste 123"}]
}

print(f"URL: /api/invites/onboarding/{invite_token}")
print(f"Payload: {json.dumps(payload, indent=2)}")

r = requests.post(f"{BASE_URL}/api/invites/onboarding/{invite_token}", json=payload, timeout=120)
print(f"\nStatus: {r.status_code}")
print(f"Response: {r.text}")
