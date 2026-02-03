#!/usr/bin/env python3
"""
Script para fazer votação de teste com usuários reais do distrito de Santana do Livramento
"""

import requests
import random
import time

BASE_URL = 'http://localhost:3065'

# Pastor Filipe
PASTOR_ID = 10829

def log(emoji, msg):
    print(f"{emoji} {msg}")

def main():
    print("=" * 70)
    print("🗳️  VOTAÇÃO DE TESTE COM USUÁRIOS REAIS")
    print("=" * 70)
    
    headers = {
        'Content-Type': 'application/json',
        'x-user-id': str(PASTOR_ID)
    }
    
    # 1. Buscar membros do distrito do pastor
    log("📋", "Buscando membros do distrito do pastor Filipe...")
    
    r = requests.get(f'{BASE_URL}/api/users', headers=headers, timeout=30)
    if r.status_code != 200:
        log("❌", f"Erro ao buscar membros: {r.status_code}")
        return
    
    users_data = r.json()
    members = users_data if isinstance(users_data, list) else users_data.get('data', [])
    
    log("✅", f"Encontrados {len(members)} membros")
    
    if len(members) < 10:
        log("⚠️", "Poucos membros para teste significativo")
        return
    
    # Filtrar membros com dados válidos
    valid_members = [m for m in members if m.get('id') and m.get('name')]
    log("📊", f"Membros válidos: {len(valid_members)}")
    
    # Agrupar por igreja
    churches = {}
    for m in valid_members:
        church = m.get('church', 'Sem Igreja')
        if church not in churches:
            churches[church] = []
        churches[church].append(m)
    
    print("\n📍 Igrejas encontradas:")
    for church, mems in churches.items():
        print(f"   - {church}: {len(mems)} membros")
    
    # Escolher igreja com mais membros para votação
    target_church = max(churches.keys(), key=lambda k: len(churches[k]))
    church_members = churches[target_church]
    
    log("🎯", f"Igreja selecionada: {target_church} ({len(church_members)} membros)")
    
    # Limitar a 20 membros para teste
    if len(church_members) > 20:
        church_members = random.sample(church_members, 20)
        log("📉", f"Limitado a 20 membros para teste")
    
    # 2. Verificar se já existe eleição ativa para esta igreja
    log("\n📋", "Verificando eleições existentes...")
    
    r = requests.get(f'{BASE_URL}/api/elections/configs', headers=headers, timeout=30)
    configs = r.json() if r.status_code == 200 else []
    if isinstance(configs, dict):
        configs = configs.get('data', [])
    
    # Procurar config existente para a igreja
    existing_config = None
    for c in configs:
        if c.get('church_name') == target_church and c.get('status') == 'active':
            existing_config = c
            break
    
    if existing_config:
        config_id = existing_config['id']
        log("✅", f"Config existente encontrada: ID {config_id}")
    else:
        # 3. Criar nova configuração de eleição
        log("🆕", f"Criando nova configuração para {target_church}...")
        
        voter_ids = [m['id'] for m in church_members]
        
        config_data = {
            "churchId": 1,
            "churchName": target_church,
            "title": f"Eleição Teste - {target_church}",
            "voters": voter_ids,
            "positions": ["Primeiro Ancião(ã)", "Secretário(a)"],
            "criteria": {
                "minAttendance": 0,
                "minBaptismYears": 0
            },
            "status": "draft"
        }
        
        r = requests.post(f'{BASE_URL}/api/elections/config', headers=headers, json=config_data, timeout=30)
        if r.status_code != 200:
            log("❌", f"Erro ao criar config: {r.status_code} - {r.text[:200]}")
            return
        
        config_id = r.json().get('id')
        log("✅", f"Config criada: ID {config_id}")
        
        # 4. Iniciar eleição
        log("🚀", "Iniciando eleição...")
        
        r = requests.post(f'{BASE_URL}/api/elections/start', headers=headers, json={"configId": config_id}, timeout=30)
        if r.status_code != 200:
            log("❌", f"Erro ao iniciar: {r.status_code} - {r.text[:200]}")
            return
        
        log("✅", "Eleição iniciada!")
    
    # 5. Buscar dados da eleição
    log("\n📊", "Buscando dados da eleição...")
    
    r = requests.get(f'{BASE_URL}/api/elections/dashboard/{config_id}', headers=headers, timeout=30)
    if r.status_code != 200:
        log("❌", f"Erro ao buscar dashboard: {r.status_code}")
        return
    
    dash_data = r.json()
    election = dash_data.get('election', {})
    election_id = election.get('id')
    current_phase = election.get('current_phase', 'nomination')
    
    log("✅", f"Election ID: {election_id}, Fase: {current_phase}")
    
    # 6. Fazer indicações (fase nomination)
    if current_phase == 'nomination':
        log("\n🗳️", "FASE DE INDICAÇÕES")
        print("-" * 50)
        
        # Cada membro indica alguém
        nominations_made = 0
        for voter in church_members[:10]:  # Limitar a 10 votantes
            voter_id = voter['id']
            voter_name = voter.get('name', 'Votante')[:20]
            
            # Escolher um candidato aleatório (diferente do votante)
            candidates = [m for m in church_members if m['id'] != voter_id]
            if not candidates:
                continue
            
            candidate = random.choice(candidates)
            candidate_id = candidate['id']
            candidate_name = candidate.get('name', 'Candidato')[:20]
            
            # Fazer indicação
            vote_data = {
                "configId": config_id,
                "candidateId": candidate_id,
                "phase": "nomination"
            }
            
            vote_headers = {
                'Content-Type': 'application/json',
                'x-user-id': str(voter_id)
            }
            
            r = requests.post(f'{BASE_URL}/api/elections/vote', headers=vote_headers, json=vote_data, timeout=30)
            
            if r.status_code == 200:
                nominations_made += 1
                log("   ✓", f"{voter_name} indicou {candidate_name}")
            else:
                error = r.json().get('error', r.text[:50]) if r.text else 'Erro desconhecido'
                log("   ⚠️", f"{voter_name} - {error}")
            
            time.sleep(0.1)  # Pequena pausa entre requisições
        
        log("✅", f"Total de indicações: {nominations_made}")
    
    # 7. Verificar log de votos
    log("\n📋", "Verificando log de votos...")
    
    r = requests.get(f'{BASE_URL}/api/elections/vote-log/{election_id}', headers=headers, timeout=30)
    
    if r.status_code == 200:
        votes = r.json()
        log("✅", f"Log de votos: {len(votes)} registros")
        
        # Mostrar últimos 5 votos
        print("\n📝 Últimos votos registrados:")
        for v in votes[:5]:
            voter_name = v.get('voter_name') or f"User {v.get('voter_id')}"
            candidate_name = v.get('candidate_name') or f"User {v.get('candidate_id')}"
            vote_type = v.get('vote_type', 'vote')
            position = v.get('position_id', 'N/A')
            print(f"   - {voter_name} -> {candidate_name} ({vote_type}) para {position}")
    else:
        log("❌", f"Erro ao buscar log: {r.status_code}")
    
    # 8. Mostrar resumo
    print("\n" + "=" * 70)
    print("📊 RESUMO DA VOTAÇÃO")
    print("=" * 70)
    print(f"   Config ID: {config_id}")
    print(f"   Election ID: {election_id}")
    print(f"   Igreja: {target_church}")
    print(f"   Votantes: {len(church_members)}")
    print(f"   Fase atual: {current_phase}")
    
    # Links úteis
    print("\n🔗 Links úteis:")
    print(f"   Dashboard: http://localhost:5173/election-dashboard/{config_id}")
    print(f"   Votação: http://localhost:5173/vote?config={config_id}")
    
    print("\n✅ Teste de votação concluído!")

if __name__ == '__main__':
    main()
