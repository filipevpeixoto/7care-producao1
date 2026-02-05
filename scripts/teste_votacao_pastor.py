#!/usr/bin/env python3
"""
Teste de Fluxo de Votação para Pastor de Santana do Livramento
================================================================
Simula o fluxo completo de votação usando o user_id do pastor diretamente.

Pastor: Filipe Vitola Peixoto (ID: 10829)
Distrito: Santana do Livramento (ID: 46)
"""

import requests
import json
import time
import random
from datetime import datetime

BASE_URL = "http://localhost:3065"

# Pastor Filipe - Distrito Santana do Livramento
PASTOR_ID = 10829
PASTOR_NAME = "Filipe Vitola Peixoto"
DISTRICT_ID = 46

# Cargos para teste
CARGOS_TESTE = ["Primeiro Ancião(ã)", "Secretário(a)"]

def log(emoji, msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {emoji} {msg}")

def get_headers(user_id=PASTOR_ID):
    return {
        "x-user-id": str(user_id),
        "Content-Type": "application/json"
    }

def testar_fluxo_pastor():
    """Testa o fluxo completo de votação como pastor Filipe"""
    
    print("\n" + "=" * 70)
    print("🗳️  TESTE DE VOTAÇÃO - PASTOR SANTANA DO LIVRAMENTO")
    print("=" * 70)
    print(f"👤 Pastor: {PASTOR_NAME} (ID: {PASTOR_ID})")
    print(f"🏛️ Distrito: Santana do Livramento (ID: {DISTRICT_ID})")
    print("=" * 70 + "\n")
    
    headers = get_headers()
    
    # 1. Verificar membros disponíveis para o pastor
    log("👥", "Buscando membros disponíveis para o pastor...")
    
    response = requests.get(
        f"{BASE_URL}/api/users?limit=500",
        headers=headers,
        timeout=60
    )
    
    if response.status_code != 200:
        log("❌", f"Erro ao buscar membros: {response.status_code}")
        return False
    
    data = response.json()
    users = data.get("data", data) if isinstance(data, dict) else data
    
    log("✅", f"Total de membros retornados: {len(users)}")
    
    # Verificar igrejas disponíveis
    igrejas = {}
    for u in users:
        igreja = u.get("church", "N/A")
        if igreja:
            igrejas[igreja] = igrejas.get(igreja, 0) + 1
    
    print("\n📊 Igrejas no distrito:")
    for igreja, count in sorted(igrejas.items(), key=lambda x: -x[1]):
        print(f"   - {igreja}: {count} membros")
    
    if not users:
        log("❌", "Nenhum membro encontrado!")
        return False
    
    # 2. Selecionar uma igreja para teste
    # Usar a maior igreja
    igreja_teste = max(igrejas.items(), key=lambda x: x[1])[0]
    membros_igreja = [u for u in users if u.get("church") == igreja_teste]
    
    log("🏛️", f"Igreja selecionada: {igreja_teste} ({len(membros_igreja)} membros)")
    
    # 3. Selecionar votantes (até 10)
    votantes = membros_igreja[:min(10, len(membros_igreja))]
    voter_ids = [m["id"] for m in votantes]
    
    print(f"\n👥 Votantes selecionados ({len(votantes)}):")
    for v in votantes[:5]:
        print(f"   - {v.get('name', 'N/A')[:35]} (ID: {v['id']})")
    if len(votantes) > 5:
        print(f"   ... e mais {len(votantes) - 5}")
    
    # 4. Criar configuração de eleição
    log("📋", "Criando configuração de eleição...")
    
    config_data = {
        "churchId": 1,
        "churchName": igreja_teste,
        "title": f"Eleição Teste Pastor - {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "voters": voter_ids,
        "positions": CARGOS_TESTE,
        "criteria": {
            "faithfulness": {"enabled": False},
            "attendance": {"enabled": False},
            "churchTime": {"enabled": False, "minimumMonths": 0},
            "positionLimit": {"enabled": False, "maxPositions": 5}
        },
        "status": "draft"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/elections/config",
        headers=headers,
        json=config_data,
        timeout=30
    )
    
    if response.status_code not in [200, 201]:
        log("❌", f"Erro ao criar config: {response.status_code} - {response.text[:200]}")
        return False
    
    config = response.json()
    config_id = config.get("id")
    log("✅", f"Configuração criada - ID: {config_id}")
    
    # 5. Iniciar eleição
    log("🚀", "Iniciando eleição...")
    
    response = requests.post(
        f"{BASE_URL}/api/elections/start",
        headers=headers,
        json={"configId": config_id},
        timeout=30
    )
    
    if response.status_code not in [200, 201]:
        log("❌", f"Erro ao iniciar: {response.status_code} - {response.text[:200]}")
        return False
    
    election_data = response.json()
    election_id = election_data.get("election", {}).get("id")
    log("✅", f"Eleição iniciada - ID: {election_id}")
    
    time.sleep(1)
    
    # 6. Obter candidatos disponíveis
    log("📊", "Obtendo candidatos para votação...")
    
    response = requests.get(
        f"{BASE_URL}/api/elections/voting/{config_id}",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        log("❌", f"Erro ao obter candidatos: {response.status_code}")
        return False
    
    voting_data = response.json()
    candidates = voting_data.get("candidates", [])
    position = voting_data.get("currentPositionName", "?")
    phase = voting_data.get("phase", "nomination")
    
    log("✅", f"Cargo atual: {position} | Fase: {phase} | Candidatos: {len(candidates)}")
    
    if candidates:
        print("\n🎯 Candidatos disponíveis:")
        for c in candidates[:5]:
            print(f"   - {c.get('name', 'N/A')[:35]} (ID: {c.get('id')})")
    
    # 7. Simular indicações
    if phase == "nomination" and candidates:
        print(f"\n{'─' * 50}")
        log("📝", f"FASE DE INDICAÇÃO - {position}")
        print("─" * 50)
        
        indicacoes_ok = 0
        for voter in votantes[:5]:
            candidato = random.choice(candidates)
            
            vote_data = {
                "configId": config_id,
                "candidateId": candidato["id"],
                "phase": "nomination"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/elections/vote",
                headers={**headers, "x-user-id": str(voter["id"])},
                json=vote_data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                indicacoes_ok += 1
                log("   ✓", f"{voter.get('name', '?')[:25]} indicou {candidato.get('name', '?')[:25]}")
            elif response.status_code == 400:
                log("   ⚠️", f"{voter.get('name', '?')[:25]} - já indicou")
            else:
                log("   ❌", f"Erro: {response.status_code}")
            
            time.sleep(0.3)
        
        log("✅", f"{indicacoes_ok} indicações realizadas")
    
    # 8. Verificar dashboard
    time.sleep(1)
    log("📊", "Obtendo dashboard da eleição...")
    
    response = requests.get(
        f"{BASE_URL}/api/elections/dashboard/{config_id}",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        dashboard = response.json()
        
        print(f"\n{'=' * 50}")
        print("📊 DASHBOARD DA ELEIÇÃO")
        print("=" * 50)
        print(f"   Config ID: {config_id}")
        print(f"   Election ID: {election_id}")
        print(f"   Total votantes: {dashboard.get('totalVoters', 'N/A')}")
        print(f"   Já votaram: {dashboard.get('votedVoters', 'N/A')}")
        
        results = dashboard.get("results", [])
        if results:
            print(f"\n🏆 Resultados parciais:")
            for r in results[:5]:
                print(f"   - {r.get('position', '?')}: {r.get('candidate_name', '?')} ({r.get('nominations', 0)} indicações, {r.get('votes', 0)} votos)")
    
    # 9. Resumo final
    print(f"\n{'=' * 70}")
    log("🎉", "TESTE CONCLUÍDO COM SUCESSO!")
    print("=" * 70)
    print(f"\n💡 Acesse o dashboard:")
    print(f"   Local: http://localhost:5173/election-dashboard?config={config_id}")
    print(f"   Prod:  https://7careadv.netlify.app/election-dashboard?config={config_id}")
    print(f"\n💡 Para votar:")
    print(f"   Local: http://localhost:5173/vote?config={config_id}")
    print(f"   Prod:  https://7careadv.netlify.app/vote?config={config_id}")
    
    return True

if __name__ == "__main__":
    try:
        success = testar_fluxo_pastor()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste interrompido.")
        exit(130)
    except Exception as e:
        print(f"\n\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
