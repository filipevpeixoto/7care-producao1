#!/usr/bin/env python3
"""
Script de teste do fluxo completo de onboarding de pastor.
Testa: criação de convite, onboarding, aprovação automática e cálculo de pontos.
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://7careadv.netlify.app"
# BASE_URL = "http://localhost:5000"

# Credenciais do superadmin (necessário para criar convite)
SUPERADMIN_EMAIL = "admin@7care.com"
SUPERADMIN_PASSWORD = "meu7care"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")

def login_superadmin():
    """Faz login como superadmin e retorna o token"""
    print_section("1. LOGIN SUPERADMIN")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Login realizado: {data.get('user', {}).get('email')}")
        return data.get('token')
    else:
        print_error(f"Falha no login: {response.status_code} - {response.text}")
        return None

def create_invite(token, email):
    """Cria um convite para pastor"""
    print_section("2. CRIAR CONVITE")
    
    response = requests.post(
        f"{BASE_URL}/api/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": email, "expiresInDays": 7}
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Convite criado!")
        print_info(f"  Token: {data.get('token')[:20]}...")
        print_info(f"  Link: {data.get('link')}")
        print_info(f"  Expira: {data.get('expiresAt')}")
        return data.get('token')
    else:
        print_error(f"Falha ao criar convite: {response.status_code} - {response.text}")
        return None

def validate_token(invite_token):
    """Valida o token do convite"""
    print_section("3. VALIDAR TOKEN")
    
    response = requests.get(f"{BASE_URL}/api/invites/validate/{invite_token}")
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Token válido!")
        print_info(f"  Email: {data.get('email')}")
        print_info(f"  Expira: {data.get('expiresAt')}")
        return True
    else:
        print_error(f"Token inválido: {response.status_code} - {response.text}")
        return False

def submit_onboarding(invite_token, test_data):
    """Submete o onboarding completo"""
    print_section("4. SUBMETER ONBOARDING")
    
    payload = {
        "name": test_data["pastor_name"],
        "phone": test_data["pastor_phone"],
        "password": test_data["password"],
        "district": {
            "name": test_data["district_name"],
            "description": test_data["district_description"]
        },
        "churches": test_data["churches"],
        "excelData": test_data.get("excelData"),
        "churchValidation": test_data.get("churchValidation"),
        "dracmaConfig": test_data.get("dracmaConfig"),
        "gamificationConfig": test_data.get("gamificationConfig")
    }
    
    print_info(f"Enviando dados para: /api/invites/onboarding/{invite_token[:20]}...")
    
    response = requests.post(
        f"{BASE_URL}/api/invites/onboarding/{invite_token}",
        json=payload,
        timeout=60  # Timeout maior pois pode demorar
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Onboarding concluído!")
        print_info(f"  Resposta completa: {json.dumps(data, indent=2)}")
        print_info(f"  User ID: {data.get('userId')}")
        print_info(f"  District ID: {data.get('districtId')}")
        print_info(f"  Igrejas criadas: {data.get('churchesCreated')}")
        print_info(f"  Membros importados: {data.get('membersImported')}")
        return data
    else:
        print_error(f"Falha no onboarding: {response.status_code}")
        try:
            error_data = response.json()
            print_error(f"  Erro: {error_data.get('error', response.text)}")
        except:
            print_error(f"  Resposta: {response.text[:500]}")
        return None

def login_pastor(email, password):
    """Tenta fazer login como o pastor recém-criado"""
    print_section("5. LOGIN COMO PASTOR")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        user = data.get('user', {})
        print_success(f"Login realizado!")
        print_info(f"  ID: {user.get('id')}")
        print_info(f"  Nome: {user.get('name')}")
        print_info(f"  Email: {user.get('email')}")
        print_info(f"  Role: {user.get('role')}")
        print_info(f"  Status: {user.get('status')}")
        print_info(f"  District ID: {user.get('districtId')}")
        return data.get('token'), user
    else:
        print_error(f"Falha no login: {response.status_code} - {response.text}")
        return None, None

def check_district_members(token, district_id):
    """Verifica membros do distrito"""
    print_section("6. VERIFICAR MEMBROS DO DISTRITO")
    
    response = requests.get(
        f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"districtId": district_id}
    )
    
    if response.status_code == 200:
        data = response.json()
        users = data if isinstance(data, list) else data.get('users', [])
        print_success(f"Total de usuários no distrito: {len(users)}")
        
        # Contar por role
        roles = {}
        for user in users:
            role = user.get('role', 'unknown')
            roles[role] = roles.get(role, 0) + 1
        
        print_info(f"  Por role: {roles}")
        
        # Verificar campos de gamificação
        members = [u for u in users if u.get('role') == 'member']
        if members:
            print_info(f"\n  Amostra de campos de gamificação (primeiros 3 membros):")
            for i, member in enumerate(members[:3]):
                print_info(f"\n  Membro {i+1}: {member.get('name', 'N/A')}")
                print_info(f"    - engajamento: {member.get('engajamento')}")
                print_info(f"    - classificacao: {member.get('classificacao')}")
                print_info(f"    - dizimista: {member.get('dizimistaType')}")
                print_info(f"    - ofertante: {member.get('ofertanteType')}")
                print_info(f"    - tempoBatismoAnos: {member.get('tempoBatismoAnos')}")
                print_info(f"    - camposVazios: {member.get('camposVazios')}")
                print_info(f"    - nomeUnidade: {member.get('nomeUnidade')}")
                print_info(f"    - temLicao: {member.get('temLicao')}")
                print_info(f"    - totalPresenca: {member.get('totalPresenca')}")
                print_info(f"    - comunhao: {member.get('comunhao')}")
                print_info(f"    - missao: {member.get('missao')}")
                print_info(f"    - estudoBiblico: {member.get('estudoBiblico')}")
                print_info(f"    - batizouAlguem: {member.get('batizouAlguem')}")
                print_info(f"    - cpfValido: {member.get('cpfValido')}")
        
        return users
    else:
        print_error(f"Falha ao buscar membros: {response.status_code} - {response.text}")
        return None

def check_gamification_points(token, user_id):
    """Verifica pontos de gamificação de um usuário"""
    print_section("7. VERIFICAR PONTOS DE GAMIFICAÇÃO")
    
    response = requests.get(
        f"{BASE_URL}/api/gamification/user/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Pontos recuperados!")
        print_info(f"  Total de pontos: {data.get('totalPoints', data.get('points', 'N/A'))}")
        
        # Mostrar breakdown se disponível
        criteria = data.get('criteria', data.get('breakdown', []))
        if criteria:
            print_info(f"\n  Breakdown de pontos:")
            for c in criteria[:10]:
                print_info(f"    - {c.get('name', c.get('criteria', 'N/A'))}: {c.get('points', c.get('value', 'N/A'))}")
        
        return data
    else:
        print_error(f"Falha ao buscar pontos: {response.status_code}")
        return None

def run_test():
    """Executa o teste completo"""
    print("\n" + "="*60)
    print("  TESTE DE FLUXO DE ONBOARDING DE PASTOR")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)
    
    # Dados de teste
    timestamp = int(time.time())
    test_email = f"pastor.teste.{timestamp}@7care.com"
    
    test_data = {
        "pastor_name": f"Pastor Teste {timestamp}",
        "pastor_phone": "(11) 99999-9999",
        "password": "senha123456",
        "district_name": f"Distrito Teste {timestamp}",
        "district_description": "Distrito criado via teste automatizado",
        "churches": [
            {"name": f"Igreja Central Teste {timestamp}", "address": "Rua Principal, 100"},
            {"name": f"Igreja Filial Teste {timestamp}", "address": "Av. Secundária, 200"}
        ],
        # Dados do Excel simulados
        "excelData": {
            "data": [
                {
                    "nome": "Maria Silva Teste",
                    "email": f"maria.silva.{timestamp}@teste.com",
                    "telefone": "(11) 98888-8888",
                    "cpf": "123.456.789-00",
                    "igreja": f"Igreja Central Teste {timestamp}",
                    "dataBatismo": "2020-01-15",
                    "dataNascimento": "1990-05-20",
                    "endereco": "Rua das Flores, 50",
                    "engajamento": "Ativo",
                    "classificacao": "Fiel",
                    "dizimista": "Sim",
                    "ofertante": "Sim",
                    "nomeUnidade": "Unidade Centro",
                    "temLicao": True,
                    "totalPresenca": 45,
                    "comunhao": 10,
                    "missao": 8,
                    "estudoBiblico": 5,
                    "batizouAlguem": True,
                    "valid": True,
                    "departamentosCargos": "Música, Desbravadores"
                },
                {
                    "nome": "João Santos Teste",
                    "email": f"joao.santos.{timestamp}@teste.com",
                    "telefone": "(11) 97777-7777",
                    "cpf": "987.654.321-00",
                    "igreja": f"Igreja Central Teste {timestamp}",
                    "dataBatismo": "2023-06-10",
                    "dataNascimento": "1985-10-15",
                    "endereco": "Av. Brasil, 100",
                    "engajamento": "Regular",
                    "classificacao": "Novo Convertido",
                    "dizimista": "Não",
                    "ofertante": "Sim",
                    "nomeUnidade": "Unidade Norte",
                    "temLicao": False,
                    "totalPresenca": 20,
                    "comunhao": 5,
                    "missao": 3,
                    "estudoBiblico": 2,
                    "batizouAlguem": False,
                    "valid": True,
                    "departamentosCargos": ""
                },
                {
                    "nome": "Ana Costa Teste",
                    "email": f"ana.costa.{timestamp}@teste.com",
                    "telefone": "",  # Campo vazio para testar camposVazios
                    "cpf": "",  # Campo vazio para testar camposVazios
                    "igreja": f"Igreja Filial Teste {timestamp}",
                    "dataBatismo": "2015-03-22",
                    "dataNascimento": "",  # Campo vazio
                    "endereco": "",  # Campo vazio
                    "engajamento": "Inativo",
                    "classificacao": "Desviado",
                    "dizimista": "Não",
                    "ofertante": "Não",
                    "nomeUnidade": "",
                    "temLicao": False,
                    "totalPresenca": 5,
                    "comunhao": 1,
                    "missao": 0,
                    "estudoBiblico": 0,
                    "batizouAlguem": False,
                    "valid": False,
                    "departamentosCargos": ""
                }
            ]
        },
        "churchValidation": [
            {
                "excelChurchName": f"Igreja Central Teste {timestamp}",
                "action": "use_new",
                "matchedChurchId": None
            },
            {
                "excelChurchName": f"Igreja Filial Teste {timestamp}",
                "action": "use_new",
                "matchedChurchId": None
            }
        ],
        "dracmaConfig": {
            "enableAutomation": False
        },
        "gamificationConfig": {
            "enabled": True
        }
    }
    
    print_info(f"Email de teste: {test_email}")
    
    # Passo 1: Login como superadmin
    superadmin_token = login_superadmin()
    if not superadmin_token:
        print_error("Não foi possível continuar sem login do superadmin")
        return False
    
    # Passo 2: Criar convite
    invite_token = create_invite(superadmin_token, test_email)
    if not invite_token:
        print_error("Não foi possível criar convite")
        return False
    
    # Passo 3: Validar token
    if not validate_token(invite_token):
        print_error("Token inválido")
        return False
    
    # Passo 4: Submeter onboarding (aprovação automática)
    result = submit_onboarding(invite_token, test_data)
    if not result:
        print_error("Falha no onboarding")
        return False
    
    # Passo 5: Login como pastor
    pastor_token, pastor_user = login_pastor(test_email, test_data["password"])
    if not pastor_token:
        print_error("Pastor não conseguiu fazer login - aprovação automática pode ter falhado!")
        return False
    
    # Passo 6: Verificar membros do distrito
    district_id = pastor_user.get('districtId')
    if district_id:
        members = check_district_members(pastor_token, district_id)
        
        # Passo 7: Verificar pontos de um membro
        if members:
            member = next((m for m in members if m.get('role') == 'member'), None)
            if member:
                check_gamification_points(pastor_token, member.get('id'))
    
    # Resumo final
    print_section("RESULTADO FINAL")
    print_success("Teste concluído com sucesso!")
    print_info(f"  Pastor criado: {test_data['pastor_name']}")
    print_info(f"  Email: {test_email}")
    print_info(f"  Distrito: {test_data['district_name']}")
    print_info(f"  Igrejas: {len(test_data['churches'])}")
    print_info(f"  Membros importados: {result.get('membersImported', 'N/A')}")
    
    return True

if __name__ == "__main__":
    try:
        success = run_test()
        exit(0 if success else 1)
    except Exception as e:
        print_error(f"Erro durante teste: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
