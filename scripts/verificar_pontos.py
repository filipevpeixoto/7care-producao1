#!/usr/bin/env python3
"""Verificar pontos dos usuários importados"""

import requests

BASE_URL = "https://7careadv.netlify.app"

# Login
r = requests.post(f'{BASE_URL}/api/auth/login', json={'email':'admin@7care.com','password':'meu7care'})
token = r.json()['token']

# Buscar TODOS os usuários
r = requests.get(f'{BASE_URL}/api/users', headers={'Authorization': f'Bearer {token}'})
data = r.json()
users = data if isinstance(data, list) else data.get('users', [])

print(f'Total usuários: {len(users)}')

# Agrupar por district_id
by_district = {}
for u in users:
    d = u.get('districtId')
    by_district[d] = by_district.get(d, 0) + 1

print('\nPor distrito:')
for d, count in sorted(by_district.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f'  Distrito {d}: {count} usuários')

# Verificar últimos importados (com email @importado.local)
imported = [u for u in users if '@importado.local' in (u.get('email') or '')]
print(f'\nImportados (@importado.local): {len(imported)}')

# Ver amostra dos últimos
latest = sorted(imported, key=lambda x: x.get('id', 0), reverse=True)[:10]
print('\nÚltimos 10 importados:')
for u in latest:
    name = u.get('name', '?')[:20]
    dist = u.get('districtId')
    pts = u.get('points')
    eng = u.get('engajamento', '')
    print(f'  ID {u.get("id"):5} | {name:20} | dist: {dist} | pts: {pts} | eng: {eng}')
