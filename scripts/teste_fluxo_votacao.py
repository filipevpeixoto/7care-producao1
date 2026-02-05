#!/usr/bin/env python3
"""
Script de Teste de Fluxo Completo de Votação
=============================================
Este script testa todo o ciclo de uma eleição:
1. Login como pastor
2. Criar configuração de eleição
3. Iniciar eleição
4. Simular votações de múltiplos membros
5. Verificar resultados
6. Avançar para próximo cargo
7. Anunciar vencedor

Uso: 
  python3 scripts/teste_fluxo_votacao.py
  python3 scripts/teste_fluxo_votacao.py --email admin@teste.com --senha teste123
  python3 scripts/teste_fluxo_votacao.py --url https://7careadv.netlify.app
"""

import requests
import json
import time
import random
import argparse
from datetime import datetime

# Configuração padrão
DEFAULT_URL = "http://localhost:3065"
# DEFAULT_URL = "https://7careadv.netlify.app"  # Para produção

# Credenciais padrão - usar admin para garantir acesso
DEFAULT_EMAIL = "admin@7care.com"
DEFAULT_PASSWORD = "meu7care"

# Configuração da eleição de teste
IGREJA_TESTE = "Parque São José (g)"
CARGOS_TESTE = ["Primeiro Ancião(ã)", "Secretário(a)"]

# Variáveis globais que serão atualizadas por argumentos
BASE_URL = DEFAULT_URL
PASTOR_EMAIL = DEFAULT_EMAIL
PASTOR_PASSWORD = DEFAULT_PASSWORD

def log(emoji, msg):
    """Log com timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {emoji} {msg}")

def fazer_login(email, password):
    """Faz login e retorna token e user_id"""
    log("🔐", f"Fazendo login como {email}...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
    except Exception as e:
        log("❌", f"Erro de conexão: {e}")
        return None, None
    
    if response.status_code != 200:
        log("❌", f"Erro no login: {response.status_code} - {response.text[:200]}")
        return None, None
    
    data = response.json()
    token = data.get("token")
    user = data.get("user", {})
    user_id = user.get("id")
    
    log("✅", f"Login OK - User ID: {user_id}, Role: {user.get('role')}, Igreja: {user.get('church')}")
    return token, user_id

def get_headers(token, user_id):
    """Retorna headers padrão com autenticação"""
    return {
        "Authorization": f"Bearer {token}",
        "x-user-id": str(user_id),
        "Content-Type": "application/json"
    }

def buscar_membros_igreja(headers, igreja_nome):
    """Busca membros disponíveis para o pastor"""
    log("👥", f"Buscando membros...")
    
    response = requests.get(
        f"{BASE_URL}/api/users?limit=500",
        headers=headers,
        timeout=60
    )
    
    if response.status_code != 200:
        log("❌", f"Erro ao buscar membros: {response.status_code}")
        return []
    
    data = response.json()
    users = data.get("data", data) if isinstance(data, dict) else data
    
    # Filtrar membros elegíveis (qualquer status aprovado/ativo)
    membros = [
        u for u in users 
        if u.get("status") in ["active", "approved", "pending"]
    ]
    
    log("✅", f"Encontrados {len(membros)} membros elegíveis")
    
    # Mostrar igrejas disponíveis
    igrejas = set(u.get("church", "N/A") for u in membros if u.get("church"))
    if igrejas:
        log("🏛️", f"Igrejas: {', '.join(sorted(igrejas)[:5])}...")
    
    return membros

def criar_config_eleicao(headers, igreja_id, igreja_nome, voters, positions):
    """Cria uma configuração de eleição"""
    log("📋", f"Criando configuração de eleição para {igreja_nome}...")
    log("📋", f"   Voters: {len(voters)} | Positions: {positions}")
    
    config = {
        "churchId": igreja_id,
        "churchName": igreja_nome,
        "title": f"Eleição Teste - {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "voters": voters,
        "positions": positions,
        "criteria": {
            "faithfulness": {"enabled": False, "punctual": False, "seasonal": False, "recurring": False},
            "attendance": {"enabled": False, "punctual": False, "seasonal": False, "recurring": False},
            "churchTime": {"enabled": False, "minimumMonths": 0},
            "positionLimit": {"enabled": False, "maxPositions": 5},
            "eldersCount": {"enabled": False, "count": 1},
            "classification": {"enabled": False, "frequente": True, "naoFrequente": True, "aResgatar": True}
        },
        "status": "draft"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/elections/config",
        headers=headers,
        json=config,
        timeout=30
    )
    
    if response.status_code not in [200, 201]:
        log("❌", f"Erro ao criar config: {response.status_code} - {response.text[:300]}")
        return None
    
    data = response.json()
    config_id = data.get("id") or data.get("config", {}).get("id")
    log("✅", f"Configuração criada - ID: {config_id}")
    return config_id

def iniciar_eleicao(headers, config_id):
    """Inicia uma eleição"""
    log("🚀", f"Iniciando eleição com config ID: {config_id}...")
    
    response = requests.post(
        f"{BASE_URL}/api/elections/start",
        headers=headers,
        json={"configId": config_id},
        timeout=30
    )
    
    if response.status_code not in [200, 201]:
        log("❌", f"Erro ao iniciar eleição: {response.status_code} - {response.text[:300]}")
        return None
    
    data = response.json()
    election_id = data.get("election", {}).get("id") or data.get("electionId")
    log("✅", f"Eleição iniciada - ID: {election_id}")
    return election_id

def obter_candidatos(headers, config_id):
    """Obtém lista de candidatos para votação"""
    log("📊", f"Buscando candidatos para votação...")
    
    response = requests.get(
        f"{BASE_URL}/api/elections/voting/{config_id}",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        log("❌", f"Erro ao buscar candidatos: {response.status_code}")
        return [], None, None
    
    data = response.json()
    candidates = data.get("candidates", [])
    position = data.get("currentPositionName", "Desconhecido")
    phase = data.get("phase", "unknown")
    
    log("✅", f"Cargo atual: {position} | Fase: {phase} | {len(candidates)} candidatos")
    return candidates, position, phase

def fazer_indicacao(headers, voter_id, candidate_id, config_id, position):
    """Faz uma indicação de candidato - usa endpoint /api/elections/vote com phase=nomination"""
    response = requests.post(
        f"{BASE_URL}/api/elections/vote",
        headers={**headers, "x-user-id": str(voter_id)},
        json={
            "configId": config_id,
            "candidateId": candidate_id,
            "phase": "nomination"
        },
        timeout=30
    )
    
    success = response.status_code in [200, 201]
    if not success and response.status_code != 400:  # 400 = já indicou
        log("⚠️", f"Indicação falhou para votante {voter_id}: {response.status_code}")
    return success

def fazer_voto(headers, voter_id, candidate_id, config_id, position):
    """Registra um voto - usa endpoint /api/elections/vote com phase=voting"""
    response = requests.post(
        f"{BASE_URL}/api/elections/vote",
        headers={**headers, "x-user-id": str(voter_id)},
        json={
            "configId": config_id,
            "candidateId": candidate_id,
            "phase": "voting"
        },
        timeout=30
    )
    
    success = response.status_code in [200, 201]
    if not success and response.status_code != 400:  # 400 = já votou
        log("⚠️", f"Voto falhou para votante {voter_id}: {response.status_code}")
    return success

def obter_dashboard(headers, config_id):
    """Obtém dados do dashboard da eleição"""
    response = requests.get(
        f"{BASE_URL}/api/elections/dashboard/{config_id}",
        headers=headers,
        timeout=30
    )
    
    if response.status_code != 200:
        return None
    
    return response.json()

def anunciar_resultado(headers, config_id, position, winner_id):
    """Anuncia o resultado de um cargo"""
    log("📢", f"Anunciando resultado para {position}...")
    
    response = requests.post(
        f"{BASE_URL}/api/elections/announce-result",
        headers=headers,
        json={
            "configId": config_id,
            "position": position,
            "winnerId": winner_id
        },
        timeout=30
    )
    
    if response.status_code in [200, 201]:
        log("✅", f"Resultado anunciado!")
        return True
    else:
        log("❌", f"Erro ao anunciar: {response.status_code} - {response.text[:200]}")
        return False

def simular_votacao_completa():
    """Executa o fluxo completo de votação"""
    
    print("\n" + "=" * 70)
    print("🗳️  TESTE DE FLUXO COMPLETO DE VOTAÇÃO - 7Care")
    print("=" * 70 + "\n")
    
    # 1. Login como pastor
    token, pastor_id = fazer_login(PASTOR_EMAIL, PASTOR_PASSWORD)
    if not token:
        log("❌", "Falha no login. Abortando teste.")
        return False
    
    headers = get_headers(token, pastor_id)
    
    # 2. Buscar membros disponíveis
    membros = buscar_membros_igreja(headers, IGREJA_TESTE)
    
    if len(membros) < 3:
        log("❌", "Membros insuficientes para teste. Mínimo 3 necessários.")
        return False
    
    # Identificar a igreja mais comum
    igrejas_count = {}
    for m in membros:
        igreja = m.get("church", "N/A")
        if igreja:
            igrejas_count[igreja] = igrejas_count.get(igreja, 0) + 1
    
    if igrejas_count:
        igreja_principal = max(igrejas_count.items(), key=lambda x: x[1])
        log("🏛️", f"Igreja principal: {igreja_principal[0]} ({igreja_principal[1]} membros)")
        IGREJA_REAL = igreja_principal[0]
    else:
        IGREJA_REAL = IGREJA_TESTE
    
    # Filtrar membros da igreja principal
    membros_igreja = [m for m in membros if m.get("church") == IGREJA_REAL]
    if len(membros_igreja) < 3:
        membros_igreja = membros[:20]  # Usar primeiros 20 se não tiver membros suficientes
    
    log("📋", f"Usando {len(membros_igreja)} membros da igreja {IGREJA_REAL}")
    
    # Selecionar votantes (até 10)
    votantes = membros_igreja[:min(10, len(membros_igreja))]
    voter_ids = [m["id"] for m in votantes]
    
    log("👥", f"Votantes selecionados: {len(voter_ids)} IDs")
    for v in votantes[:5]:
        log("   ", f"- {v.get('name', 'N/A')[:30]} (ID: {v['id']})")
    if len(votantes) > 5:
        log("   ", f"... e mais {len(votantes) - 5}")
    
    # 3. Buscar church_id (usar um ID genérico ou da primeira igreja)
    church_id = membros_igreja[0].get("church_id") or 1
    
    # 4. Criar configuração de eleição
    config_id = criar_config_eleicao(
        headers, 
        church_id, 
        IGREJA_REAL, 
        voter_ids, 
        CARGOS_TESTE
    )
    
    if not config_id:
        log("❌", "Falha ao criar configuração. Abortando.")
        return False
    
    # 5. Iniciar eleição
    election_id = iniciar_eleicao(headers, config_id)
    if not election_id:
        log("❌", "Falha ao iniciar eleição. Abortando.")
        return False
    
    time.sleep(1)
    
    # 6. Loop de votação por cargo
    for cargo_idx, cargo in enumerate(CARGOS_TESTE):
        print(f"\n{'─' * 50}")
        log("📋", f"CARGO {cargo_idx + 1}/{len(CARGOS_TESTE)}: {cargo}")
        print("─" * 50)
        
        # Obter candidatos
        candidates, position, phase = obter_candidatos(headers, config_id)
        
        if not candidates:
            log("⚠️", f"Nenhum candidato encontrado. Usando votantes como candidatos.")
            candidates = [{"id": v["id"], "name": v.get("name", "Candidato")} for v in votantes]
        
        log("👤", f"Candidatos disponíveis: {len(candidates)}")
        
        # Fase de Indicação
        if phase == "nomination":
            log("📝", "Fase de INDICAÇÃO")
            
            indicacoes_ok = 0
            for voter in votantes[:5]:  # Primeiros 5 indicam
                # Escolher candidato aleatório
                candidato = random.choice(candidates)
                if fazer_indicacao(headers, voter["id"], candidato["id"], config_id, cargo):
                    indicacoes_ok += 1
                    log("   ", f"✓ {voter.get('name', 'Voter')[:20]} indicou {candidato.get('name', 'Cand')[:20]}")
                time.sleep(0.3)
            
            log("✅", f"{indicacoes_ok} indicações realizadas")
            
            # Verificar se avançou para votação
            time.sleep(1)
            candidates, position, phase = obter_candidatos(headers, config_id)
        
        # Fase de Votação
        if phase == "voting":
            log("🗳️", "Fase de VOTAÇÃO")
            
            # Selecionar top 3 candidatos mais indicados
            candidates_sorted = sorted(candidates, key=lambda c: c.get("nominations", 0), reverse=True)
            top_candidates = candidates_sorted[:3] if len(candidates_sorted) >= 3 else candidates_sorted
            
            votos_ok = 0
            for voter in votantes:
                # Votar em candidato aleatório do top 3
                candidato = random.choice(top_candidates)
                if fazer_voto(headers, voter["id"], candidato["id"], config_id, cargo):
                    votos_ok += 1
                    log("   ", f"✓ {voter.get('name', 'Voter')[:20]} votou em {candidato.get('name', 'Cand')[:20]}")
                time.sleep(0.3)
            
            log("✅", f"{votos_ok}/{len(votantes)} votos registrados")
        
        # Verificar resultado
        time.sleep(1)
        dashboard = obter_dashboard(headers, config_id)
        
        if dashboard:
            results = dashboard.get("results", [])
            position_results = [r for r in results if r.get("position") == cargo]
            
            if position_results:
                top_candidate = position_results[0]
                winner_id = top_candidate.get("candidate_id")
                winner_name = top_candidate.get("candidate_name", "Desconhecido")
                votes = top_candidate.get("votes", 0)
                
                log("🏆", f"Vencedor: {winner_name} com {votes} votos")
                
                # Anunciar resultado
                anunciar_resultado(headers, config_id, cargo, winner_id)
        
        time.sleep(1)
    
    # 7. Resumo final
    print(f"\n{'=' * 70}")
    log("🎉", "TESTE DE VOTAÇÃO CONCLUÍDO!")
    print("=" * 70)
    
    # Obter dashboard final
    dashboard = obter_dashboard(headers, config_id)
    if dashboard:
        print(f"\n📊 Resumo da Eleição (Config ID: {config_id}):")
        print(f"   - Eleição ID: {dashboard.get('election', {}).get('id', 'N/A')}")
        print(f"   - Total de votantes: {dashboard.get('totalVoters', 'N/A')}")
        print(f"   - Votantes que votaram: {dashboard.get('votedVoters', 'N/A')}")
        print(f"   - Cargos: {dashboard.get('totalPositions', len(CARGOS_TESTE))}")
        
        results = dashboard.get("results", [])
        if results:
            print(f"\n🏆 Resultados:")
            for r in results[:10]:
                print(f"   - {r.get('position', '?')}: {r.get('candidate_name', '?')} ({r.get('votes', 0)} votos)")
    
    print(f"\n💡 Acesse o dashboard em: {BASE_URL.replace('localhost:3065', '7careadv.netlify.app')}/election-dashboard?config={config_id}")
    
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste de fluxo completo de votação 7Care")
    parser.add_argument("--email", "-e", help="Email do usuário", default=DEFAULT_EMAIL)
    parser.add_argument("--senha", "-s", help="Senha do usuário", default=DEFAULT_PASSWORD)
    parser.add_argument("--url", "-u", help="URL base da API", default=DEFAULT_URL)
    args = parser.parse_args()
    
    # Atualizar variáveis globais
    globals()['BASE_URL'] = args.url
    globals()['PASTOR_EMAIL'] = args.email
    globals()['PASTOR_PASSWORD'] = args.senha
    
    print(f"\n🌐 API URL: {BASE_URL}")
    print(f"📧 Email: {PASTOR_EMAIL}\n")
    
    try:
        success = simular_votacao_completa()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste interrompido pelo usuário.")
        exit(130)
    except Exception as e:
        print(f"\n\n❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
