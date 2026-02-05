#!/usr/bin/env python3
import requests

BASE_URL = "https://7careadv.netlify.app"

# Login como superadmin
r = requests.post(f"{BASE_URL}/api/auth/login", 
                  json={"email": "admin@7care.com", "password": "meu7care"})
token = r.json().get('token')

# Buscar usuários do distrito 28 diretamente
r = requests.get(f"{BASE_URL}/api/users", 
                 headers={"Authorization": f"Bearer {token}"})

users = r.json() if isinstance(r.json(), list) else r.json().get('users', [])

# Filtrar por district_id = 28
district_28_users = [u for u in users if u.get('districtId') == 28]
print(f"Total de usuarios no distrito 28: {len(district_28_users)}")

# Mostrar por role
roles = {}
for u in district_28_users:
    role = u.get('role', 'unknown')
    roles[role] = roles.get(role, 0) + 1
print(f"Por role: {roles}")

# Mostrar membros com campos de gamificacao
members = [u for u in district_28_users if u.get('role') == 'member']
print(f"\nMembros importados: {len(members)}")

if members:
    print("\n=== DETALHES DOS 3 PRIMEIROS MEMBROS ===")
    for i, m in enumerate(members[:3]):
        print(f"\n{i+1}. {m.get('name')}")
        print(f"   igreja: {m.get('church')}")
        print(f"   engajamento: {m.get('engajamento')}")
        print(f"   classificacao: {m.get('classificacao')}")
        print(f"   dizimistaType: {m.get('dizimistaType')}")
        print(f"   ofertanteType: {m.get('ofertanteType')}")
        print(f"   nomeUnidade: {m.get('nomeUnidade')}")
        print(f"   temLicao: {m.get('temLicao')}")
        print(f"   totalPresenca: {m.get('totalPresenca')}")
        print(f"   comunhao: {m.get('comunhao')}")
        print(f"   missao: {m.get('missao')}")
        print(f"   estudoBiblico: {m.get('estudoBiblico')}")
        print(f"   batizouAlguem: {m.get('batizouAlguem')}")
        print(f"   cpfValido: {m.get('cpfValido')}")
        print(f"   tempoBatismoAnos: {m.get('tempoBatismoAnos')}")
        print(f"   camposVazios: {m.get('camposVazios')}")
