#!/usr/bin/env python3
"""
Teste de importação real usando o arquivo data (5).xlsx
"""

import requests
import json
import time
import pandas as pd
import math

BASE_URL = "https://7careadv.netlify.app"
SUPERADMIN_EMAIL = "admin@7care.com"
SUPERADMIN_PASSWORD = "meu7care"
EXCEL_FILE = "/Users/filipevpeixoto/Downloads/data (5).xlsx"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def clean_value(val):
    """Limpa valores NaN e converte para tipos apropriados"""
    if pd.isna(val):
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def format_date(val):
    """Formata datas para string ISO"""
    if pd.isna(val):
        return None
    try:
        return pd.Timestamp(val).isoformat()
    except:
        return None

def convert_excel_to_json(df, limit=None):
    """Converte DataFrame para o formato esperado pelo onboarding"""
    members = []
    
    data_to_process = df.head(limit) if limit else df
    for _, row in data_to_process.iterrows():
        # Pular linhas sem nome ou com dados de filtro
        nome = clean_value(row.get('Nome'))
        if not nome or 'Filtros aplicados' in str(nome):
            continue
            
        member = {
            'nome': nome,
            'igreja': clean_value(row.get('Igreja')),
            'cpf': str(int(row.get('CPF', 0))) if pd.notna(row.get('CPF')) else None,
            'telefone': clean_value(row.get('Celular')),
            'email': clean_value(row.get('Email')),
            'endereco': clean_value(row.get('Endereço')),
            'dataNascimento': format_date(row.get('Nascimento')),
            'dataBatismo': format_date(row.get('Batismo')),
            'estadoCivil': clean_value(row.get('Estado civil')),
            'profissao': clean_value(row.get('Ocupação')),
            'escolaridade': clean_value(row.get('Grau de educação')),
            'religiaoAnterior': clean_value(row.get('Religião anterior')),
            'departamentosCargos': clean_value(row.get('Departamentos e cargos')),
            
            # Campos de gamificação
            'engajamento': clean_value(row.get('Engajamento')),
            'classificacao': clean_value(row.get('Classificação')),
            'dizimista': clean_value(row.get('Dizimista')),
            'ofertante': clean_value(row.get('Ofertante')),
            'nomeUnidade': clean_value(row.get('Nome da unidade')),
            'temLicao': clean_value(row.get('Tem lição')) == 'Sim',
            'totalPresenca': int(row.get('Total de presença', 0)) if pd.notna(row.get('Total de presença')) else 0,
            'comunhao': int(row.get('Comunhão', 0)) if pd.notna(row.get('Comunhão')) else 0,
            'missao': int(row.get('Missão', 0)) if pd.notna(row.get('Missão')) else 0,
            'estudoBiblico': int(row.get('Estudo bíblico', 0)) if pd.notna(row.get('Estudo bíblico')) else 0,
            'batizouAlguem': int(row.get('Batizou alguém', 0)) if pd.notna(row.get('Batizou alguém')) else 0,
            'valid': clean_value(row.get('CPF válido')) == 'Sim',
        }
        members.append(member)
    
    return members

def main():
    timestamp = int(time.time())
    
    print_section("TESTE DE IMPORTAÇÃO COM DADOS REAIS")
    print(f"Arquivo: {EXCEL_FILE}")
    
    # Ler Excel
    print("\n📊 Lendo arquivo Excel...")
    df = pd.read_excel(EXCEL_FILE)
    
    # Filtrar linhas válidas
    df = df[df['Nome'].notna() & ~df['Nome'].str.contains('Filtros aplicados', na=False)]
    print(f"   Total de membros válidos: {len(df)}")
    
    # Obter igrejas únicas
    igrejas = df['Igreja'].dropna().unique().tolist()
    igrejas = [i for i in igrejas if 'Filtros' not in str(i)]
    print(f"   Igrejas encontradas: {len(igrejas)}")
    for i in igrejas[:5]:
        print(f"      - {i}")
    
    # Login
    print_section("1. LOGIN SUPERADMIN")
    r = requests.post(f"{BASE_URL}/api/auth/login", 
                      json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD})
    token = r.json().get('token')
    print(f"✅ Token obtido")
    
    # Criar convite
    print_section("2. CRIAR CONVITE")
    email = f"pastor.import.{timestamp}@7care.com"
    r = requests.post(f"{BASE_URL}/api/invites",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"email": email, "expiresInDays": 7})
    invite_token = r.json().get('token')
    print(f"✅ Convite criado: {invite_token[:30]}...")
    
    # Converter TODOS os dados do Excel
    print_section("3. PREPARAR DADOS")
    LIMIT = 315  # Testar com TODOS os membros
    members_data = convert_excel_to_json(df, limit=LIMIT)
    print(f"   Membros a importar: {len(members_data)}")
    
    # Criar validação de igrejas (todas como create_new)
    igrejas_no_excel = list(set([m['igreja'] for m in members_data if m['igreja']]))
    church_validation = []
    for igreja in igrejas_no_excel:
        church_validation.append({
            'excelChurchName': igreja,
            'action': 'create_new',
            'matchedChurchId': None
        })
    print(f"   Igrejas a criar: {len(church_validation)}")
    
    # Mostrar amostra dos dados
    print("\n   Amostra do primeiro membro:")
    sample = members_data[0] if members_data else {}
    for key, val in sample.items():
        print(f"      {key}: {val}")
    
    # Submeter onboarding
    print_section("4. SUBMETER ONBOARDING")
    # Configuração de gamificação para cálculo de pontos
    gamification_config = {
        "engajamento": {"alto": 100, "medio": 50, "baixo": 20},
        "classificacao": {"frequente": 80, "naoFrequente": 30},
        "dizimista": {"recorrente": 100, "sazonal": 60, "pontual": 30, "naoDizimista": 0},
        "ofertante": {"recorrente": 100, "sazonal": 60, "pontual": 30, "naoOfertante": 0},
        "tempoBatismo": {"maisVinte": 100, "vinteAnos": 80, "dezAnos": 60, "cincoAnos": 40, "doisAnos": 20},
        "nomeUnidade": {"comUnidade": 50, "semUnidade": 0},
        "temLicao": {"comLicao": 50, "semLicao": 0},
        "totalPresenca": {"oitoATreze": 100, "quatroASete": 60, "zeroATres": 20},
        "escolaSabatina": {"comunhao": 10, "missao": 10, "estudoBiblico": 10, "batizouAlguem": 50},
        "cpfValido": {"valido": 30, "invalido": 0},
        "camposVazios": {"completos": 50, "incompletos": 0}
    }

    payload = {
        "name": f"Pastor Import {timestamp}",
        "phone": "11999999999",
        "password": "teste123",
        "district": {"name": f"Distrito Import {timestamp}"},
        "churches": [{"name": i, "address": ""} for i in igrejas_no_excel],
        "excelData": {
            "data": members_data,
            "headers": list(members_data[0].keys()) if members_data else []
        },
        "churchValidation": church_validation,
        "gamificationConfig": gamification_config
    }
    
    print(f"   Enviando {len(members_data)} membros COM gamificação...")
    r = requests.post(f"{BASE_URL}/api/invites/onboarding/{invite_token}",
                      json=payload, timeout=300)  # 5 min timeout para importar todos
    
    print(f"   Status: {r.status_code}")
    result = r.json()
    print(f"   Resposta: {json.dumps(result, indent=2)}")
    
    if not result.get('success'):
        print(f"\n❌ Erro: {result.get('error')}")
        print(f"   Detalhes: {result.get('details')}")
        return
    
    user_id = result.get('userId')
    district_id = result.get('districtId')
    members_imported = result.get('membersImported', 0)
    
    print(f"\n✅ Importação concluída!")
    print(f"   User ID: {user_id}")
    print(f"   District ID: {district_id}")
    print(f"   Membros importados: {members_imported}")
    
    # Login como pastor
    print_section("5. LOGIN COMO PASTOR")
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": "teste123"})
    pastor_data = r.json()
    pastor_token = pastor_data.get('token')
    print(f"✅ Login OK - Status: {pastor_data.get('user', {}).get('status')}")
    
    # Buscar membros do distrito
    print_section("6. VERIFICAR MEMBROS IMPORTADOS")
    r = requests.get(f"{BASE_URL}/api/users",
                     headers={"Authorization": f"Bearer {pastor_token}"},
                     params={"role": "member"})
    
    users = r.json() if isinstance(r.json(), list) else r.json().get('users', [])
    members = [u for u in users if u.get('role') == 'member' and u.get('districtId') == district_id]
    
    print(f"   Total de membros no distrito: {len(members)}")
    
    if members:
        print("\n   📊 CAMPOS DE GAMIFICAÇÃO DOS MEMBROS:")
        for i, member in enumerate(members[:5]):
            print(f"\n   Membro {i+1}: {member.get('name', 'N/A')}")
            print(f"      igreja: {member.get('church')}")
            print(f"      engajamento: {member.get('engajamento')}")
            print(f"      classificacao: {member.get('classificacao')}")
            print(f"      dizimistaType: {member.get('dizimistaType')}")
            print(f"      ofertanteType: {member.get('ofertanteType')}")
            print(f"      nomeUnidade: {member.get('nomeUnidade')}")
            print(f"      temLicao: {member.get('temLicao')}")
            print(f"      totalPresenca: {member.get('totalPresenca')}")
            print(f"      comunhao: {member.get('comunhao')}")
            print(f"      missao: {member.get('missao')}")
            print(f"      estudoBiblico: {member.get('estudoBiblico')}")
            print(f"      batizouAlguem: {member.get('batizouAlguem')}")
            print(f"      cpfValido: {member.get('cpfValido')}")
            print(f"      tempoBatismoAnos: {member.get('tempoBatismoAnos')}")
            print(f"      camposVazios: {member.get('camposVazios')}")
    
    # Resultado final
    print_section("RESULTADO FINAL")
    if members_imported == len(members_data):
        print(f"✅ SUCESSO! Todos os {members_imported} membros foram importados corretamente!")
    elif members_imported > 0:
        print(f"⚠️  Parcial: {members_imported}/{len(members_data)} membros importados")
    else:
        print(f"❌ Nenhum membro foi importado")

if __name__ == "__main__":
    main()
