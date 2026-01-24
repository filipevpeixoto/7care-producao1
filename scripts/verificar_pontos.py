#!/usr/bin/env python3
"""
Script para verificar pontuação de usuários por igreja
"""
import requests
import json

BASE_URL = "http://localhost:3065"

def main():
    print("=" * 60)
    print("VERIFICAÇÃO DE PONTUAÇÃO POR IGREJA")
    print("=" * 60)

    # Pegar lista de usuários
    try:
        users_response = requests.get(f"{BASE_URL}/api/users")
        if not users_response.ok:
            print("❌ Erro ao buscar usuários")
            return
            
        users = users_response.json()
        
        # Agrupar por igreja (máximo 3 usuários por igreja, até 5 igrejas)
        by_church = {}
        for u in users:
            church = u.get('church', 'Sem Igreja')
            if church not in by_church:
                by_church[church] = []
            if len(by_church[church]) < 3:
                by_church[church].append(u)
        
        # Selecionar até 5 igrejas
        churches_to_check = list(by_church.keys())[:5]
        
        for church in churches_to_check:
            print(f"\n🏛️ Igreja: {church}")
            print("-" * 40)
            
            for user in by_church[church]:
                user_id = user['id']
                name = user['name'][:30]
                
                # Buscar pontos detalhados
                try:
                    points_response = requests.get(f"{BASE_URL}/api/users/{user_id}/points-details")
                    if points_response.ok:
                        points_data = points_response.json()
                        calculated_points = points_data.get('calculatedPoints', 0)
                        level = points_data.get('level', 'N/A')
                        print(f"  👤 {name}: {calculated_points} pts ({level})")
                    else:
                        print(f"  👤 {name}: Erro ao buscar pontos")
                except Exception as e:
                    print(f"  👤 {name}: Erro - {e}")
        
        print("\n" + "=" * 60)
        print("✅ Verificação concluída!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()
