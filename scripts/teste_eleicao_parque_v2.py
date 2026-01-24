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

def submit_nomination(config_id, voter_id, candidate_id):
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
    return response.status_code == 200, response.json() if response.status_code != 200 else None

def submit_vote(config_id, voter_id, candidate_id):
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
    return response.status_code == 200, response.json() if response.status_code != 200 else None

def advance_phase(config_id, new_phase):
    """Avança para uma fase específica"""
    response = requests.post(
        f"{BASE_URL}/api/elections/advance-phase",
        headers=get_headers(),
        json={"configId": config_id, "phase": new_phase}
    )
    return response.status_code == 200, response.json() if response.status_code == 200 else None

def advance_position(config_id, new_position):
    """Avança para uma posição específica"""
    response = requests.post(
        f"{BASE_URL}/api/elections/advance-position",
        headers=get_headers(),
        json={"configId": config_id, "position": new_position}
    )
    return response.status_code == 200, response.json() if response.status_code == 200 else None

def process_position(config_id, voters, members, position_index, position_name):
    """Processa indicação e votação para um cargo específico"""
    print(f"\n{'='*60}")
    print(f"🏷️  CARGO {position_index + 1}: {position_name}")
    print(f"{'='*60}")
    
    # Fase de indicação
    print("\n📝 FASE DE INDICAÇÃO:")
    nominations = {}
    for voter in voters:
        candidates = [m for m in members if m['id'] != voter['id']]
        candidate = random.choice(candidates)
        success, error = submit_nomination(config_id, voter['id'], candidate['id'])
        
        if success:
            print(f"   ✓ {voter['name']} indicou {candidate['name']}")
            nominations[candidate['name']] = nominations.get(candidate['name'], 0) + 1
        else:
            print(f"   ✗ Falha: {voter['name']} - {error.get('error', 'Erro desconhecido') if error else 'Erro'}")
    
    print(f"\n   📊 Indicações recebidas: {sum(nominations.values())}")
    for name, count in sorted(nominations.items(), key=lambda x: -x[1])[:5]:
        print(f"      - {name}: {count}")
    
    # Avançar para votação
    print("\n⏭️  Avançando para VOTAÇÃO...")
    success, result = advance_phase(config_id, "voting")
    if success:
        print(f"   ✓ Fase avançada para votação")
    else:
        print(f"   ✗ Erro ao avançar fase")
        return
    
    time.sleep(0.5)
    
    # Fase de votação
    print("\n🗳️  FASE DE VOTAÇÃO:")
    
    # Buscar candidatos indicados
    status = get_election_status(config_id, voters[0]['id'])
    if not status:
        print("   ❌ Não foi possível obter status")
        return
    
    candidates = status.get('candidates', [])
    if not candidates:
        print("   ⚠️ Nenhum candidato disponível")
        return
    
    print(f"   Candidatos disponíveis: {len(candidates)}")
    
    votes = {}
    for voter in voters:
        candidate = random.choice(candidates[:10])  # Escolher entre os primeiros 10
        success, error = submit_vote(config_id, voter['id'], candidate['id'])
        
        if success:
            print(f"   ✓ {voter['name']} votou em {candidate.get('name', 'N/A')}")
            name = candidate.get('name', 'N/A')
            votes[name] = votes.get(name, 0) + 1
        else:
            print(f"   ✗ Falha: {voter['name']} - {error.get('error', 'Erro') if error else 'Erro'}")
    
    print(f"\n   📊 Resultado parcial:")
    for name, count in sorted(votes.items(), key=lambda x: -x[1])[:5]:
        print(f"      - {name}: {count} votos")
    
    # Avançar para próximo cargo (se não for o último)
    if position_index < len(POSITIONS) - 1:
        print(f"\n⏭️  Avançando para próximo cargo...")
        success, result = advance_position(config_id, position_index + 1)
        if success:
            print(f"   ✓ Avançou para cargo {position_index + 2}")
        else:
            print(f"   ✗ Erro ao avançar cargo")
    else:
        # Finalizar eleição
        print(f"\n🏁 Finalizando eleição...")
        success, result = advance_phase(config_id, "completed")
        if success:
            print(f"   ✓ Eleição finalizada!")

def show_results(config_id):
    """Mostra resultados da eleição"""
    print(f"\n{'='*60}")
    print("📊 RESULTADOS FINAIS DA ELEIÇÃO")
    print(f"{'='*60}")
    
    # Buscar resultados usando a rota de manage
    response = requests.get(
        f"{BASE_URL}/api/elections/manage/{config_id}",
        headers=get_headers()
    )
    
    if response.status_code != 200:
        print(f"❌ Erro ao buscar resultados: {response.status_code}")
        return
    
    data = response.json()
    
    if 'election' in data:
        election = data['election']
        print(f"\n📋 Eleição: {election.get('title', 'N/A')}")
        print(f"   Igreja: {election.get('church_name', 'N/A')}")
        print(f"   Status: {election.get('status', 'N/A')}")
        print(f"   Fase atual: {election.get('current_phase', 'N/A')}")

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
    
    # 4. Processar cada cargo
    for i, position in enumerate(POSITIONS):
        process_position(config_id, voters, members, i, position)
        time.sleep(1)
    
    # 5. Mostrar resultados
    show_results(config_id)
    
    print("\n" + "=" * 60)
    print("✅ TESTE CONCLUÍDO COM SUCESSO!")
    print(f"🔗 Acesse: http://localhost:3065/elections/manage/{config_id}")
    print("=" * 60)

if __name__ == "__main__":
    main()
