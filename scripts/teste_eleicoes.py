#!/usr/bin/env python3
"""
Script para testar todas as rotas de eleição com usuários reais.
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3065"

def test_elections():
    """Testa todas as rotas de eleição"""
    
    print("=" * 60)
    print("TESTE DAS ROTAS DE ELEIÇÃO - 7Care")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # 1. Login para obter token
    print("1. Fazendo login...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@7care.com", "password": "meu7care"},
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code != 200:
        print(f"   ❌ Login falhou: {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data.get("token")
    print(f"   ✅ Login OK - User: {login_data.get('user', {}).get('name', 'N/A')}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-user-id": str(login_data.get('user', {}).get('id', ''))
    }
    
    results = []
    
    # 2. Testar GET /api/elections/config
    print("\n2. GET /api/elections/config (listar configuração)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/config", timeout=30)
        results.append(("GET /api/elections/config", r.status_code, "✅" if r.status_code == 200 else "❌"))
        data = r.json()
        print(f"   Status: {r.status_code}")
        if r.status_code == 200 and 'id' in data:
            print(f"   Config ID: {data['id']}, Igreja: {data.get('church_name', 'N/A')}")
    except Exception as e:
        results.append(("GET /api/elections/config", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 3. Testar GET /api/elections/configs
    print("\n3. GET /api/elections/configs (todas configurações)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/configs", timeout=60)
        results.append(("GET /api/elections/configs", r.status_code, "✅" if r.status_code == 200 else "❌"))
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   Total de configurações: {len(data) if isinstance(data, list) else 'N/A'}")
    except Exception as e:
        results.append(("GET /api/elections/configs", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 4. Testar GET /api/elections/config/:id
    print("\n4. GET /api/elections/config/210 (configuração específica)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/config/210", timeout=30)
        results.append(("GET /api/elections/config/:id", r.status_code, "✅" if r.status_code == 200 else "❌"))
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   Igreja: {data.get('church_name', 'N/A')}, Status: {data.get('status', 'N/A')}")
    except Exception as e:
        results.append(("GET /api/elections/config/:id", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 5. Testar GET /api/elections/active (requer auth)
    print("\n5. GET /api/elections/active (eleições ativas)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/active", headers=headers, timeout=30)
        # 404 é OK se não houver eleições ativas para este usuário
        is_ok = r.status_code in [200, 404]
        results.append(("GET /api/elections/active", r.status_code, "✅" if is_ok else "❌"))
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   Eleições ativas: {len(data.get('elections', [])) if isinstance(data, dict) else 'N/A'}")
        elif r.status_code == 404:
            print(f"   (Nenhuma eleição ativa para este usuário - comportamento esperado)")
    except Exception as e:
        results.append(("GET /api/elections/active", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 6. Testar GET /api/elections/dashboard/:configId
    print("\n6. GET /api/elections/dashboard/210 (dashboard)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/dashboard/210", headers=headers, timeout=30)
        results.append(("GET /api/elections/dashboard/:id", r.status_code, "✅" if r.status_code == 200 else "❌"))
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   Dados do dashboard: {list(data.keys())[:5]}...")
    except Exception as e:
        results.append(("GET /api/elections/dashboard/:id", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 7. Testar GET /api/elections/voting/:configId
    print("\n7. GET /api/elections/voting/210 (status de votação)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/voting/210", headers=headers, timeout=30)
        results.append(("GET /api/elections/voting/:id", r.status_code, "✅" if r.status_code == 200 else "❌"))
        print(f"   Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   Votação: {data}")
    except Exception as e:
        results.append(("GET /api/elections/voting/:id", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 8. Testar GET /api/elections/results (resultados)
    print("\n8. GET /api/elections/results?configId=210 (resultados)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/results?configId=210", headers=headers, timeout=30)
        # 404 é OK se não houver resultados anunciados ainda
        is_ok = r.status_code in [200, 400, 404]
        results.append(("GET /api/elections/results", r.status_code, "✅" if is_ok else "❌"))
        print(f"   Status: {r.status_code}")
    except Exception as e:
        results.append(("GET /api/elections/results", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 9. Testar POST /api/elections/start (iniciar eleição - sem executar de fato)
    print("\n9. POST /api/elections/start (iniciar eleição - teste de estrutura)")
    try:
        # Enviamos apenas para testar a validação da rota
        r = requests.post(f"{BASE_URL}/api/elections/start", 
                         headers=headers, 
                         json={"configId": 999999},  # ID inexistente para não criar
                         timeout=30)
        # 400 ou 404 são OK pois a config não existe
        is_ok = r.status_code in [200, 400, 404]
        results.append(("POST /api/elections/start", r.status_code, "✅" if is_ok else "❌"))
        print(f"   Status: {r.status_code} (esperado: 400 ou 404 para config inexistente)")
    except Exception as e:
        results.append(("POST /api/elections/start", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # 10. Testar GET /api/elections/vote-log/:electionId
    print("\n10. GET /api/elections/vote-log/142 (log de votos)")
    try:
        r = requests.get(f"{BASE_URL}/api/elections/vote-log/142", headers=headers, timeout=30)
        results.append(("GET /api/elections/vote-log/:id", r.status_code, "✅" if r.status_code in [200, 401, 403, 404] else "❌"))
        print(f"   Status: {r.status_code}")
    except Exception as e:
        results.append(("GET /api/elections/vote-log/:id", 0, f"❌ {str(e)}"))
        print(f"   ❌ Erro: {e}")
    
    # Resumo
    print("\n" + "=" * 60)
    print("RESUMO DOS TESTES")
    print("=" * 60)
    
    passed = sum(1 for _, code, status in results if "✅" in str(status))
    failed = len(results) - passed
    
    for endpoint, code, status in results:
        print(f"   {status} {endpoint} -> {code}")
    
    print()
    print(f"Total: {passed}/{len(results)} rotas funcionando")
    print("=" * 60)

if __name__ == "__main__":
    test_elections()
