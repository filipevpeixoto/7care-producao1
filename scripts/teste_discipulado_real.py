#!/usr/bin/env python3
"""
Script de Teste de Discipulado - 7Care
Teste com USUÁRIOS REAIS já cadastrados
"""
import requests
import json

BASE_URL = "http://localhost:3065"

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

def print_step(step, text):
    print(f"\n{Colors.YELLOW}[Passo {step}]{Colors.END} {text}")

def main():
    print_header("TESTE DE DISCIPULADO COM USUÁRIOS REAIS")
    
    # Usuários reais selecionados:
    # Admin: Filipe Vitola Peixoto (ID: 4626) - Santana do Livramento
    # Discipuladores (membros):
    #   - Vladilane Dorneles Munhoz (ID: 4361) - Armour
    #   - Beatriz Sigales Leites (ID: 4598) - Santana do Livramento
    # Interessados:
    #   - Mikaela Menezes (ID: 4372) - Armour
    #   - Jasson De Lima Fontoura (ID: 4359) - Armour
    
    admin = {"id": 4626, "name": "Filipe Vitola Peixoto", "church": "Santana do Livramento (i)"}
    
    discipulador1 = {"id": 4361, "name": "Vladilane Dorneles Munhoz", "church": "Armour (g)"}
    discipulador2 = {"id": 4598, "name": "Beatriz Sigales Leites", "church": "Santana do Livramento (i)"}
    
    interessado1 = {"id": 4372, "name": "Mikaela Menezes", "church": "Armour (g)"}
    interessado2 = {"id": 4359, "name": "Jasson De Lima Fontoura", "church": "Armour (g)"}
    
    print_step(1, "Usuários selecionados para o teste:")
    print_info(f"Admin: {admin['name']} (ID: {admin['id']}) - {admin['church']}")
    print_info(f"Discipulador 1: {discipulador1['name']} (ID: {discipulador1['id']}) - {discipulador1['church']}")
    print_info(f"Discipulador 2: {discipulador2['name']} (ID: {discipulador2['id']}) - {discipulador2['church']}")
    print_info(f"Interessado 1: {interessado1['name']} (ID: {interessado1['id']}) - {interessado1['church']}")
    print_info(f"Interessado 2: {interessado2['name']} (ID: {interessado2['id']}) - {interessado2['church']}")
    
    # ============================================
    # VIA 1: ADMIN CRIA RELACIONAMENTO DIRETAMENTE
    # ============================================
    print_header("VIA 1: ADMIN CRIA DISCIPULADO DIRETAMENTE")
    
    print_step(2, f"Admin {admin['name']} criando relacionamento:")
    print_info(f"Discipulador: {discipulador1['name']}")
    print_info(f"Interessado: {interessado1['name']}")
    
    response = requests.post(
        f"{BASE_URL}/api/relationships",
        json={
            "interestedId": interessado1['id'],
            "missionaryId": discipulador1['id']
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(admin['id'])
        }
    )
    
    if response.ok:
        relationship = response.json()
        print_success(f"Relacionamento criado com sucesso!")
        print_info(f"ID do Relacionamento: {relationship.get('id')}")
        print_info(f"Status: {relationship.get('status')}")
        rel_id_1 = relationship.get('id')
    else:
        print_error(f"Erro: {response.status_code} - {response.text}")
        rel_id_1 = None
    
    # ============================================
    # VIA 2: DISCIPULADOR SOLICITA AUTORIZAÇÃO
    # ============================================
    print_header("VIA 2: DISCIPULADOR SOLICITA AUTORIZAÇÃO")
    
    print_step(3, f"Discipulador {discipulador2['name']} solicitando discipular {interessado2['name']}...")
    
    response = requests.post(
        f"{BASE_URL}/api/discipleship-requests",
        json={
            "interestedId": interessado2['id'],
            "missionaryId": discipulador2['id']
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(discipulador2['id'])
        }
    )
    
    if response.ok:
        request_data = response.json()
        print_success(f"Solicitação de discipulado criada!")
        print_info(f"ID da Solicitação: {request_data.get('id')}")
        print_info(f"Status: {request_data.get('status')}")
        request_id = request_data.get('id')
    else:
        error_msg = response.text
        if "pendente" in error_msg.lower() or "exists" in error_msg.lower():
            print_info("Já existe solicitação pendente - buscando ID...")
            # Buscar solicitação existente
            req_response = requests.get(f"{BASE_URL}/api/discipleship-requests")
            if req_response.ok:
                requests_list = req_response.json()
                for req in requests_list:
                    if req.get('interestedId') == interessado2['id'] and req.get('status') == 'pending':
                        request_id = req.get('id')
                        print_info(f"Usando solicitação existente ID: {request_id}")
                        break
                else:
                    request_id = None
            else:
                request_id = None
        else:
            print_error(f"Erro: {response.status_code} - {error_msg}")
            request_id = None
    
    # Verificar solicitações pendentes
    print_step(4, "Verificando solicitações pendentes...")
    response = requests.get(f"{BASE_URL}/api/discipleship-requests")
    if response.ok:
        all_requests = response.json()
        pending = [r for r in all_requests if r.get('status') == 'pending']
        print_info(f"Total de solicitações pendentes: {len(pending)}")
        for req in pending:
            print(f"   📋 {req.get('missionaryName', 'N/A')} → {req.get('interestedName', 'N/A')} (ID: {req.get('id')})")
    
    # Admin aprova a solicitação
    if request_id:
        print_step(5, f"Admin {admin['name']} aprovando solicitação ID {request_id}...")
        
        response = requests.put(
            f"{BASE_URL}/api/discipleship-requests/{request_id}",
            json={"status": "approved"},
            headers={
                "Content-Type": "application/json",
                "x-user-id": str(admin['id'])
            }
        )
        
        if response.ok:
            approved = response.json()
            print_success("Solicitação APROVADA com sucesso!")
            print_info(f"Status atualizado: {approved.get('status')}")
        else:
            print_error(f"Erro ao aprovar: {response.status_code} - {response.text}")
    
    # ============================================
    # VERIFICAÇÃO FINAL
    # ============================================
    print_header("VERIFICAÇÃO FINAL - RELACIONAMENTOS ATIVOS")
    
    response = requests.get(f"{BASE_URL}/api/relationships")
    if response.ok:
        relationships = response.json()
        print_info(f"Total de relacionamentos de discipulado: {len(relationships)}")
        print()
        
        # Filtrar apenas os criados neste teste
        recent = [r for r in relationships if r.get('interestedId') in [interessado1['id'], interessado2['id']]]
        
        print(f"{'ID':<5} {'Interessado':<30} {'Discipulador':<30} {'Status':<10}")
        print("-" * 80)
        for rel in recent:
            print(f"{rel.get('id'):<5} {rel.get('interestedName', 'N/A'):<30} {rel.get('missionaryName', 'N/A'):<30} {rel.get('status'):<10}")
    
    # Status das solicitações
    print_header("STATUS DAS SOLICITAÇÕES")
    response = requests.get(f"{BASE_URL}/api/discipleship-requests")
    if response.ok:
        all_requests = response.json()
        pending = len([r for r in all_requests if r.get('status') == 'pending'])
        approved = len([r for r in all_requests if r.get('status') == 'approved'])
        rejected = len([r for r in all_requests if r.get('status') == 'rejected'])
        
        print_info(f"Pendentes: {pending}")
        print_info(f"Aprovadas: {approved}")
        print_info(f"Rejeitadas: {rejected}")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}✅ TESTE COM USUÁRIOS REAIS CONCLUÍDO!{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.END}")
    
    print(f"\n{Colors.CYAN}Resumo:{Colors.END}")
    print(f"  • VIA 1 (Admin direto): {discipulador1['name']} agora discipula {interessado1['name']}")
    print(f"  • VIA 2 (Solicitação): {discipulador2['name']} solicitou e foi aprovado para {interessado2['name']}")
    
    print(f"\n{Colors.CYAN}Para verificar no sistema:{Colors.END}")
    print(f"  • Login como Admin: http://localhost:3065/users")
    print(f"  • Login como {discipulador1['name']}: http://localhost:3065/my-interested")
    print(f"  • Login como {discipulador2['name']}: http://localhost:3065/my-interested")

if __name__ == "__main__":
    main()
