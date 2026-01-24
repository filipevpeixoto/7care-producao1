#!/usr/bin/env python3
"""
Script para criar uma eleição de teste com 10 cargos e 10 votantes
Igreja: Santana do Livramento
"""

import requests
import json
import random
import time

BASE_URL = "http://localhost:3066/api"

# 10 Cargos da igreja para a eleição
CARGOS = [
    "Ancião",
    "Diácono", 
    "Diaconisa",
    "Diretor de Escola Sabatina",
    "Diretor de Jovens",
    "Diretor de Comunicação",
    "Diretor de Música",
    "Diretor de Mordomia",
    "Secretário da Igreja",
    "Tesoureiro"
]

def criar_igreja():
    """Criar igreja de Santana do Livramento"""
    print("\n🏛️  Criando igreja de Santana do Livramento...")
    
    try:
        response = requests.post(f"{BASE_URL}/churches", json={
            "name": "IASD Santana do Livramento",
            "code": "SNTLVR",
            "city": "Santana do Livramento",
            "state": "RS"
        }, timeout=10)
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            print(f"   ✅ Igreja criada com ID: {data.get('id', 'N/A')}")
            return data
        else:
            print(f"   ⚠️  Status: {response.status_code} - {response.text[:100]}")
            return None
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return None

def buscar_usuarios():
    """Buscar usuários para serem votantes"""
    print("\n👥 Buscando usuários...")
    
    try:
        response = requests.get(f"{BASE_URL}/users", timeout=30)
        users = response.json()
        print(f"   ✅ {len(users)} usuários encontrados")
        return users
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return []

def criar_configuracao_eleicao(church_id, votantes_ids):
    """Criar configuração da eleição"""
    print("\n📋 Criando configuração da eleição...")
    
    config = {
        "churchId": church_id,
        "churchName": "IASD Santana do Livramento",
        "title": f"Nomeação IASD Santana do Livramento - {time.strftime('%d/%m/%Y')}",
        "voters": votantes_ids,
        "positions": CARGOS,
        "position_descriptions": {cargo: f"Cargo de {cargo} da igreja" for cargo in CARGOS},
        "criteria": {
            "minMonthsInChurch": 6,
            "minAttendance": 50,
            "requiresTithingFaithfulness": True
        },
        "status": "draft"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/elections/config", json=config, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Configuração criada com ID: {data.get('id', 'N/A')}")
            return data
        else:
            print(f"   ⚠️  Status: {response.status_code} - {response.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return None

def iniciar_eleicao(config_id):
    """Iniciar a eleição"""
    print("\n🗳️  Iniciando eleição...")
    
    try:
        response = requests.post(f"{BASE_URL}/elections/start", json={
            "configId": config_id
        }, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            election_id = data.get('election', {}).get('id') or data.get('id')
            print(f"   ✅ Eleição iniciada com ID: {election_id}")
            return data
        else:
            print(f"   ⚠️  Status: {response.status_code} - {response.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return None

def registrar_voto(election_id, voter_id, position, candidate_id):
    """Registrar um voto"""
    try:
        response = requests.post(f"{BASE_URL}/elections/{election_id}/vote", json={
            "voterId": voter_id,
            "positionId": position,
            "candidateId": candidate_id,
            "voteType": "nomination"
        }, timeout=5)
        return response.status_code == 200
    except:
        return False

def realizar_votacao(election_id, votantes, candidatos):
    """Simular votação de 10 membros em 10 cargos"""
    print("\n🗳️  Realizando votação...")
    print(f"   Votantes: {len(votantes)}")
    print(f"   Candidatos disponíveis: {len(candidatos)}")
    print(f"   Cargos: {len(CARGOS)}")
    
    votos_registrados = 0
    
    for i, cargo in enumerate(CARGOS):
        print(f"\n   📌 Cargo {i+1}/{len(CARGOS)}: {cargo}")
        
        # Cada votante vota em um candidato diferente para este cargo
        for j, votante_id in enumerate(votantes):
            # Selecionar candidato aleatório (que não seja o próprio votante)
            candidatos_disponiveis = [c for c in candidatos if c['id'] != votante_id]
            if not candidatos_disponiveis:
                continue
                
            candidato = random.choice(candidatos_disponiveis)
            
            sucesso = registrar_voto(election_id, votante_id, cargo, candidato['id'])
            if sucesso:
                votos_registrados += 1
                print(f"      ✓ {candidato['name'][:20]} recebeu voto de votante #{j+1}")
            else:
                print(f"      ✗ Falha ao registrar voto")
    
    print(f"\n   ✅ Total de votos registrados: {votos_registrados}")
    return votos_registrados

def buscar_resultados(election_id):
    """Buscar resultados da eleição"""
    print("\n📊 Buscando resultados...")
    
    try:
        response = requests.get(f"{BASE_URL}/elections/{election_id}/results", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Resultados obtidos!")
            return data
        else:
            print(f"   ⚠️  Status: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return None

def main():
    print("=" * 60)
    print("🗳️  SISTEMA DE ELEIÇÃO - IASD SANTANA DO LIVRAMENTO")
    print("=" * 60)
    
    # 1. Criar igreja
    igreja = criar_igreja()
    church_id = igreja.get('id', 1) if igreja else 1
    
    # 2. Buscar usuários
    usuarios = buscar_usuarios()
    
    if len(usuarios) < 10:
        print(f"   ⚠️  Poucos usuários ({len(usuarios)}). Precisamos de pelo menos 10.")
        return
    
    # Selecionar 10 votantes aleatórios
    votantes = random.sample(usuarios, 10)
    votantes_ids = [u['id'] for u in votantes]
    
    print("\n👥 Votantes selecionados:")
    for i, v in enumerate(votantes, 1):
        print(f"   {i}. {v['name'][:30]} (ID: {v['id']})")
    
    # 3. Criar configuração da eleição
    config = criar_configuracao_eleicao(church_id, votantes_ids)
    
    if not config:
        print("❌ Falha ao criar configuração da eleição")
        return
    
    config_id = config.get('id')
    
    # 4. Iniciar eleição
    eleicao = iniciar_eleicao(config_id)
    
    if not eleicao:
        print("❌ Falha ao iniciar eleição")
        return
    
    election_id = eleicao.get('election', {}).get('id') or eleicao.get('id')
    
    # 5. Selecionar candidatos (outros 10 usuários)
    candidatos_pool = [u for u in usuarios if u['id'] not in votantes_ids]
    candidatos = random.sample(candidatos_pool, min(20, len(candidatos_pool)))
    
    print("\n🎯 Candidatos disponíveis:")
    for i, c in enumerate(candidatos[:10], 1):
        print(f"   {i}. {c['name'][:30]} (ID: {c['id']})")
    
    # 6. Realizar votação
    if election_id:
        votos = realizar_votacao(election_id, votantes_ids, candidatos)
        
        # 7. Buscar resultados
        if votos > 0:
            time.sleep(1)
            resultados = buscar_resultados(election_id)
            
            if resultados:
                print("\n" + "=" * 60)
                print("📊 RESULTADOS DA ELEIÇÃO")
                print("=" * 60)
                print(json.dumps(resultados, indent=2, ensure_ascii=False)[:2000])
    
    print("\n" + "=" * 60)
    print("✅ PROCESSO DE ELEIÇÃO CONCLUÍDO!")
    print("=" * 60)
    print(f"\n📍 Acesse: http://localhost:3066/elections para ver os detalhes")
    print(f"   Config ID: {config_id}")
    print(f"   Election ID: {election_id}")

if __name__ == "__main__":
    main()
