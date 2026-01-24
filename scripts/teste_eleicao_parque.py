#!/usr/bin/env python3
"""
Script para testar votação na igreja Parque São José (g)
Cria uma eleição com 3 cargos e executa votação simulada
"""

import requests
import json
import random
import time

BASE_URL = "http://localhost:3065"
ADMIN_USER_ID = "1"  # Super Admin

# Igreja Parque São José
CHURCH_ID = 119
CHURCH_NAME = "Parque São José (g)"

# 3 Cargos para votação
POSITIONS = [
    "Primeiro Ancião(ã)",
    "Secretário(a)",
    "Tesoureiro(a)"
]

def get_headers(user_id=ADMIN_USER_ID):
    return {
        "Content-Type": "application/json",
        "x-user-id": str(user_id),
        "Cache-Control": "no-cache"
    }

def get_members():
    """Busca membros da igreja Parque São José"""
    print("\n📋 Buscando membros da igreja Parque São José...")
    response = requests.get(f"{BASE_URL}/api/users", headers=get_headers())
    
    if response.status_code != 200:
        print(f"❌ Erro ao buscar membros: {response.status_code}")
        return []
    
    all_users = response.json()
    members = [
        u for u in all_users 
        if u.get('church') == CHURCH_NAME 
        and 'member' in (u.get('role') or '')
        and u.get('status') in ['approved', 'pending']
    ]
    
    print(f"✅ Encontrados {len(members)} membros na igreja {CHURCH_NAME}")
    return members

def create_election_config(members):
    """Cria configuração da eleição"""
    print("\n🗳️ Criando configuração de eleição...")
    
    # Selecionar 10 votantes aleatórios (ou todos se < 10)
    num_voters = min(10, len(members))
    voters = random.sample(members, num_voters)
    voter_ids = [v['id'] for v in voters]
    
    print(f"📝 Votantes selecionados ({num_voters}):")
    for v in voters:
        print(f"   - {v['name']} (ID: {v['id']})")
    
    config_data = {
        "churchId": CHURCH_ID,
        "churchName": CHURCH_NAME,
        "title": f"Eleição Teste - {CHURCH_NAME} - {time.strftime('%d/%m/%Y %H:%M')}",
        "voters": voter_ids,
        "criteria": {
            "faithfulness": {"enabled": False, "punctual": False, "seasonal": False, "recurring": False},
            "attendance": {"enabled": False, "punctual": False, "seasonal": False, "recurring": False},
            "churchTime": {"enabled": False, "minimumMonths": 0},
            "positionLimit": {"enabled": False, "maxPositions": 5},
            "eldersCount": {"enabled": False, "count": 1},
            "classification": {"enabled": False, "frequente": True, "naoFrequente": True, "aResgatar": True}
        },
        "positions": POSITIONS,
        "position_descriptions": {
            "Primeiro Ancião(ã)": "Líder espiritual da congregação",
            "Secretário(a)": "Responsável pela documentação da igreja",
            "Tesoureiro(a)": "Responsável pelas finanças da igreja"
        },
        "status": "draft"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/elections/config",
        headers=get_headers(),
        json=config_data
    )
    
    if response.status_code != 200:
        print(f"❌ Erro ao criar configuração: {response.status_code}")
        print(response.text)
        return None, []
    
    result = response.json()
    config_id = result.get('id')
    print(f"✅ Configuração criada com ID: {config_id}")
    
    return config_id, voters

def start_election(config_id):
    """Inicia a eleição"""
    print(f"\n🚀 Iniciando eleição (config_id: {config_id})...")
    
    response = requests.post(
        f"{BASE_URL}/api/elections/start",
        headers=get_headers(),
        json={"configId": config_id}
    )
    
    if response.status_code != 200:
        print(f"❌ Erro ao iniciar eleição: {response.status_code}")
        print(response.text)
        return None
    
    result = response.json()
    election_id = result.get('electionId') or result.get('election', {}).get('id')
    print(f"✅ Eleição iniciada! ID: {election_id}")
    
    return election_id

def get_election_status(config_id, voter_id):
    """Busca status da eleição para um votante"""
    response = requests.get(
        f"{BASE_URL}/api/elections/voting/{config_id}",
        headers=get_headers(voter_id)
    )
    
    if response.status_code != 200:
        return None
    
    return response.json()

def submit_nomination(config_id, voter_id, candidate_id, position):
    """Submete uma indicação"""
    response = requests.post(
        f"{BASE_URL}/api/elections/vote",
        headers=get_headers(voter_id),
        json={
            "configId": config_id,
            "candidateId": candidate_id,
            "phase": "nomination"
        }
    )
    if response.status_code != 200:
        print(f"      Debug: {response.text[:100]}")
    return response.status_code == 200

def submit_vote(config_id, voter_id, candidate_id, position):
    """Submete um voto"""
    response = requests.post(
        f"{BASE_URL}/api/elections/vote",
        headers=get_headers(voter_id),
        json={
            "configId": config_id,
            "candidateId": candidate_id,
            "phase": "voting"
        }
    )
    if response.status_code != 200:
        print(f"      Debug: {response.text[:100]}")
    return response.status_code == 200

def advance_phase(config_id):
    """Avança para próxima fase"""
    response = requests.post(
        f"{BASE_URL}/api/elections/advance-phase",
        headers=get_headers(),
        json={"configId": config_id}
    )
    return response.status_code == 200, response.json() if response.status_code == 200 else None

def simulate_nominations(config_id, voters, members):
    """Simula fase de indicação"""
    print("\n📝 FASE DE INDICAÇÃO")
    print("=" * 50)
    
    for position in POSITIONS:
        print(f"\n🏷️ Cargo: {position}")
        
        # Cada votante indica um candidato aleatório
        for voter in voters:
            # Escolher candidato aleatório (não pode ser o próprio votante)
            candidates = [m for m in members if m['id'] != voter['id']]
            if not candidates:
                continue
            
            candidate = random.choice(candidates)
            success = submit_nomination(config_id, voter['id'], candidate['id'], position)
            
            if success:
                print(f"   ✓ {voter['name']} indicou {candidate['name']}")
            else:
                print(f"   ✗ Falha na indicação de {voter['name']}")
        
        # Avançar para votação
        print(f"\n⏭️ Avançando para votação do cargo {position}...")
        success, result = advance_phase(config_id)
        if success:
            print(f"   ✓ Fase avançada: {result.get('phase', 'voting')}")
        else:
            print(f"   ✗ Erro ao avançar fase")
        
        time.sleep(0.5)

def simulate_voting(config_id, voters, members):
    """Simula fase de votação"""
    print("\n🗳️ FASE DE VOTAÇÃO")
    print("=" * 50)
    
    for position in POSITIONS:
        print(f"\n🏷️ Cargo: {position}")
        
        # Buscar candidatos indicados
        status = get_election_status(config_id, voters[0]['id'])
        if not status:
            print("   ❌ Não foi possível obter status da eleição")
            continue
        
        candidates = status.get('candidates', [])
        if not candidates:
            print("   ⚠️ Nenhum candidato indicado para este cargo")
            continue
        
        print(f"   Candidatos: {[c.get('name', 'N/A') for c in candidates]}")
        
        # Cada votante vota em um candidato aleatório
        for voter in voters:
            candidate = random.choice(candidates)
            success = submit_vote(config_id, voter['id'], candidate['id'], position)
            
            if success:
                print(f"   ✓ {voter['name']} votou em {candidate.get('name', 'N/A')}")
            else:
                print(f"   ✗ Falha no voto de {voter['name']}")
        
        # Avançar para próximo cargo
        print(f"\n⏭️ Avançando para próximo cargo...")
        success, result = advance_phase(config_id)
        if success:
            new_phase = result.get('phase', 'unknown')
            new_position = result.get('currentPosition', 0)
            print(f"   ✓ Posição: {new_position}, Fase: {new_phase}")
        
        time.sleep(0.5)

def show_results(config_id):
    """Mostra resultados da eleição"""
    print("\n📊 RESULTADOS DA ELEIÇÃO")
    print("=" * 50)
    
    response = requests.get(
        f"{BASE_URL}/api/elections/results/{config_id}",
        headers=get_headers()
    )
    
    if response.status_code != 200:
        print(f"❌ Erro ao buscar resultados: {response.status_code}")
        return
    
    results = response.json()
    
    for position, data in results.get('results', {}).items():
        print(f"\n🏷️ {position}:")
        candidates = data if isinstance(data, list) else data.get('candidates', [])
        for i, c in enumerate(candidates[:3], 1):
            name = c.get('name', c.get('candidate_name', 'N/A'))
            votes = c.get('votes', c.get('nominations', 0))
            print(f"   {i}. {name} - {votes} votos")

def main():
    print("=" * 60)
    print("🗳️  TESTE DE ELEIÇÃO - IGREJA PARQUE SÃO JOSÉ (g)")
    print("=" * 60)
    
    # 1. Buscar membros
    members = get_members()
    if len(members) < 5:
        print("❌ Não há membros suficientes para a eleição")
        return
    
    # 2. Criar configuração
    config_id, voters = create_election_config(members)
    if not config_id:
        print("❌ Não foi possível criar a configuração")
        return
    
    # 3. Iniciar eleição
    election_id = start_election(config_id)
    if not election_id:
        print("❌ Não foi possível iniciar a eleição")
        return
    
    # 4. Simular indicações
    simulate_nominations(config_id, voters, members)
    
    # 5. Simular votações
    simulate_voting(config_id, voters, members)
    
    # 6. Mostrar resultados
    show_results(config_id)
    
    print("\n" + "=" * 60)
    print("✅ TESTE CONCLUÍDO!")
    print(f"🔗 Acesse: http://localhost:3065/elections/manage/{config_id}")
    print("=" * 60)

if __name__ == "__main__":
    main()
