#!/usr/bin/env python3
"""Script para realizar votação na eleição"""

import requests
import json

BASE_URL = "http://localhost:3066/api"
CONFIG_ID = 207

# Votantes e candidatos
votantes = [4425, 4411, 4533, 4399, 4455, 4513, 4488, 4417, 4629, 4461]
candidatos = [4628, 4486, 4674, 4547, 4537, 4576, 4500, 4447, 4524, 4582]

print("REALIZANDO VOTACAO - Eleicao Config 207")
print("=" * 50)

votos_ok = 0
votos_erro = 0

for i, (votante, candidato) in enumerate(zip(votantes, candidatos)):
    headers = {
        "Content-Type": "application/json",
        "x-user-id": str(votante)
    }
    
    payload = {
        "configId": CONFIG_ID,
        "candidateId": candidato,
        "phase": "nomination"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/elections/vote", json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            print(f"  OK: Votante {votante} indicou candidato {candidato}")
            votos_ok += 1
        else:
            print(f"  ERRO: Votante {votante}: {resp.status_code} - {resp.text[:100]}")
            votos_erro += 1
    except Exception as e:
        print(f"  ERRO: Votante {votante}: {e}")
        votos_erro += 1

print(f"\nRESULTADO: {votos_ok} votos OK, {votos_erro} erros")
