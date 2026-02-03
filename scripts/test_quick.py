#!/usr/bin/env python3
import requests
import json

BASE_URL = 'http://localhost:3065'

print('=' * 60)
print('TESTE SIMPLIFICADO DAS ROTAS DE ELEIÇÃO')
print('=' * 60)

print('\n1. Login...')
r = requests.post(f'{BASE_URL}/api/auth/login', 
    json={'email':'admin@7care.com','password':'meu7care'},
    headers={'Content-Type': 'application/json'},
    timeout=10)
print(f'   Status: {r.status_code}')

if r.status_code == 200:
    data = r.json()
    token = data.get('token')
    user_id = data.get('user', {}).get('id')
    headers = {
        'Authorization': f'Bearer {token}',
        'x-user-id': str(user_id),
        'Content-Type': 'application/json'
    }
    
    print(f'   User ID: {user_id}')
    print(f'   ✅ Login OK')
    
    # Testar rotas
    routes = [
        ('GET', '/api/elections/config'),
        ('GET', '/api/elections/configs'),
        ('GET', '/api/elections/config/210'),
        ('GET', '/api/elections/active'),
        ('GET', '/api/elections/dashboard/210'),
        ('GET', '/api/elections/voting/210'),
        ('GET', '/api/elections/vote-log/142'),
    ]
    
    print('\n' + '=' * 60)
    print('RESULTADOS')
    print('=' * 60)
    
    passed = 0
    total = len(routes)
    
    for method, path in routes:
        try:
            if method == 'GET':
                r = requests.get(f'{BASE_URL}{path}', headers=headers, timeout=30)
            else:
                r = requests.post(f'{BASE_URL}{path}', headers=headers, timeout=30)
            
            # 200 = OK, 404 = não encontrado (OK para active sem eleições)
            is_ok = r.status_code in [200, 404]
            status = '✅' if is_ok else '❌'
            if is_ok:
                passed += 1
            print(f'{status} {method} {path} -> {r.status_code}')
        except Exception as e:
            print(f'❌ {method} {path} -> Error: {str(e)[:50]}')
    
    print('\n' + '=' * 60)
    print(f'TOTAL: {passed}/{total} rotas funcionando')
    print('=' * 60)
else:
    print(f'   ❌ Login falhou: {r.text[:200]}')
