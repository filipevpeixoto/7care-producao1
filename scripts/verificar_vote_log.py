#!/usr/bin/env python3
"""
Script para verificar se o pastor consegue ver o log de votos
"""

import requests
import sys

# Tentar várias URLs
URLS = [
    'https://7care-producao1.netlify.app',
    'https://7care.app.br',
    'http://localhost:3065',
    'http://localhost:5000'
]

# Testar com o pastor Filipe (ID 10829)
headers = {
    'Content-Type': 'application/json',
    'x-user-id': '10829'
}

print("=" * 60)
print("Verificando acesso do Pastor Filipe ao Vote-Log")
print("=" * 60)

BASE_URL = None

# Encontrar URL que funciona
for url in URLS:
    try:
        r = requests.get(f'{url}/api/elections/configs', headers=headers, timeout=10)
        if r.status_code in [200, 401, 403]:
            BASE_URL = url
            print(f"\n✅ URL funcionando: {url}")
            break
    except Exception as e:
        print(f"❌ {url}: {e}")

if not BASE_URL:
    print("\n❌ Nenhuma URL está acessível!")
    sys.exit(1)

# Buscar eleições ativas primeiro
print('\n1. Buscando configurações de eleição...')
try:
    r = requests.get(f'{BASE_URL}/api/elections/configs', headers=headers, timeout=30)
    print(f'   Status: {r.status_code}')

    if r.status_code == 200:
        configs = r.json()
        if isinstance(configs, dict):
            configs = configs.get('data', [])
        print(f'   Encontradas: {len(configs)} configurações')
        
        # Buscar uma eleição ativa do distrito do pastor
        for config in configs[:5]:
            config_id = config.get('id')
            church = config.get('church_name')
            status = config.get('status')
            print(f'\n   Config {config_id}: {church} ({status})')
            
            # Buscar dashboard para obter election_id
            dash_r = requests.get(f'{BASE_URL}/api/elections/dashboard/{config_id}', headers=headers, timeout=30)
            
            if dash_r.status_code == 200:
                dash_data = dash_r.json()
                election = dash_data.get('election', {})
                election_id = election.get('id')
                
                if election_id:
                    print(f'   -> Election ID: {election_id}')
                    
                    # Testar vote-log
                    log_r = requests.get(f'{BASE_URL}/api/elections/vote-log/{election_id}', headers=headers, timeout=30)
                    print(f'   -> Vote-log status: {log_r.status_code}')
                    
                    if log_r.status_code == 200:
                        votes = log_r.json()
                        print(f'   -> ✅ Votos encontrados: {len(votes)}')
                        
                        if len(votes) > 0:
                            v = votes[0]
                            voter_name = v.get('voter_name', 'N/A')
                            candidate_name = v.get('candidate_name', 'N/A')
                            print(f'   -> Exemplo: {voter_name} votou em {candidate_name}')
                        
                        print("\n" + "=" * 60)
                        print("✅ SUCESSO! Pastor consegue ver os nomes dos votantes!")
                        print("=" * 60)
                        break
                        
                    elif log_r.status_code == 403:
                        error = log_r.json().get('error', 'Sem detalhes')
                        print(f'   -> ❌ Acesso negado: {error}')
                    elif log_r.status_code == 401:
                        error = log_r.json().get('error', 'Sem detalhes')
                        print(f'   -> ⚠️ Não autenticado: {error}')
                    else:
                        print(f'   -> ⚠️ Resposta ({log_r.status_code}): {log_r.text[:200]}')
                else:
                    print(f'   -> Sem eleição ativa')
            else:
                print(f'   -> Dashboard status: {dash_r.status_code}')
    else:
        print(f'   Erro ({r.status_code}): {r.text[:200]}')
        
except Exception as e:
    print(f'   Erro: {e}')

print("\n")
