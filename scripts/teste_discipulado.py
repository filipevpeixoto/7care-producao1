#!/usr/bin/env python3
"""
Script de Teste de Discipulado - 7Care
Testa as duas vias:
1. Admin criando relacionamento de discipulado diretamente
2. Discipulador (member) solicitando autorização para discipular
"""
import requests
import json
import time

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

def get_users_by_role(role):
    """Busca usuários por role"""
    response = requests.get(f"{BASE_URL}/api/users")
    if response.ok:
        users = response.json()
        return [u for u in users if u.get('role') == role]
    return []

def get_relationships():
    """Busca todos os relacionamentos de discipulado"""
    response = requests.get(f"{BASE_URL}/api/relationships")
    if response.ok:
        return response.json()
    return []

def get_discipleship_requests():
    """Busca todas as solicitações de discipulado pendentes"""
    response = requests.get(f"{BASE_URL}/api/discipleship-requests")
    if response.ok:
        return response.json()
    return []

def create_relationship_admin(interested_id, missionary_id, admin_id):
    """Admin cria relacionamento de discipulado diretamente"""
    response = requests.post(
        f"{BASE_URL}/api/relationships",
        json={
            "interestedId": interested_id,
            "missionaryId": missionary_id
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(admin_id)
        }
    )
    return response

def create_discipleship_request(interested_id, missionary_id):
    """Membro/Discipulador solicita autorização para discipular"""
    response = requests.post(
        f"{BASE_URL}/api/discipleship-requests",
        json={
            "interestedId": interested_id,
            "missionaryId": missionary_id
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(missionary_id)
        }
    )
    return response

def approve_discipleship_request(request_id, admin_id):
    """Admin aprova solicitação de discipulado"""
    response = requests.put(
        f"{BASE_URL}/api/discipleship-requests/{request_id}",
        json={
            "status": "approved"
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(admin_id)
        }
    )
    return response

def reject_discipleship_request(request_id, admin_id, reason="Teste de rejeição"):
    """Admin rejeita solicitação de discipulado"""
    response = requests.put(
        f"{BASE_URL}/api/discipleship-requests/{request_id}",
        json={
            "status": "rejected",
            "adminNotes": reason
        },
        headers={
            "Content-Type": "application/json",
            "x-user-id": str(admin_id)
        }
    )
    return response

def delete_relationship(relationship_id, admin_id):
    """Remove um relacionamento de discipulado"""
    response = requests.delete(
        f"{BASE_URL}/api/relationships/{relationship_id}",
        headers={
            "x-user-id": str(admin_id)
        }
    )
    return response

def main():
    print_header("TESTE DE DISCIPULADO - 7Care")
    
    # Buscar usuários para teste
    print_step(1, "Buscando usuários para teste...")
    
    admins = get_users_by_role('superadmin') + get_users_by_role('pastor') + get_users_by_role('admin')
    members = get_users_by_role('member')
    interested = get_users_by_role('interested')
    
    if not admins:
        print_error("Nenhum admin encontrado!")
        return
    if not members:
        print_error("Nenhum membro encontrado!")
        return
    if len(interested) < 2:
        print_error("Precisa de pelo menos 2 interessados para o teste!")
        return
    
    admin = admins[0]
    discipulador = members[0]  # Membro que será discipulador
    interessado1 = interested[0]  # Para teste via admin
    interessado2 = interested[1] if len(interested) > 1 else interested[0]  # Para teste via solicitação
    
    print_info(f"Admin: {admin['name']} (ID: {admin['id']}, Role: {admin['role']})")
    print_info(f"Discipulador: {discipulador['name']} (ID: {discipulador['id']})")
    print_info(f"Interessado 1: {interessado1['name']} (ID: {interessado1['id']})")
    print_info(f"Interessado 2: {interessado2['name']} (ID: {interessado2['id']})")
    
    # ============================================
    # VIA 1: ADMIN CRIA RELACIONAMENTO DIRETAMENTE
    # ============================================
    print_header("VIA 1: ADMIN CRIA DISCIPULADO DIRETAMENTE")
    
    print_step(2, f"Admin criando relacionamento entre {discipulador['name']} e {interessado1['name']}...")
    
    response = create_relationship_admin(interessado1['id'], discipulador['id'], admin['id'])
    
    if response.ok:
        relationship = response.json()
        print_success(f"Relacionamento criado com sucesso!")
        print_info(f"ID: {relationship.get('id')}")
        print_info(f"Interessado: {interessado1['name']}")
        print_info(f"Discipulador: {discipulador['name']}")
        print_info(f"Status: {relationship.get('status')}")
        relationship_id_1 = relationship.get('id')
    else:
        print_error(f"Erro ao criar relacionamento: {response.status_code}")
        print_error(response.text)
        relationship_id_1 = None
    
    print_step(3, "Verificando relacionamentos ativos...")
    relationships = get_relationships()
    print_info(f"Total de relacionamentos: {len(relationships)}")
    for rel in relationships[-3:]:
        print(f"   - {rel.get('interestedName')} ← {rel.get('missionaryName')} (Status: {rel.get('status')})")
    
    # ============================================
    # VIA 2: DISCIPULADOR SOLICITA AUTORIZAÇÃO
    # ============================================
    print_header("VIA 2: DISCIPULADOR SOLICITA AUTORIZAÇÃO")
    
    print_step(4, f"Discipulador {discipulador['name']} solicitando discipular {interessado2['name']}...")
    
    response = create_discipleship_request(interessado2['id'], discipulador['id'])
    
    if response.ok:
        request_data = response.json()
        print_success(f"Solicitação de discipulado criada!")
        print_info(f"ID da Solicitação: {request_data.get('id')}")
        print_info(f"Status: {request_data.get('status')}")
        request_id = request_data.get('id')
    else:
        print_error(f"Erro ao criar solicitação: {response.status_code}")
        print_error(response.text)
        request_id = None
    
    print_step(5, "Verificando solicitações pendentes...")
    requests_list = get_discipleship_requests()
    pending = [r for r in requests_list if r.get('status') == 'pending']
    print_info(f"Solicitações pendentes: {len(pending)}")
    for req in pending[-3:]:
        print(f"   - Interessado ID: {req.get('interestedId')} | Discipulador ID: {req.get('missionaryId')} | Status: {req.get('status')}")
    
    if request_id:
        print_step(6, f"Admin aprovando solicitação de discipulado ID {request_id}...")
        
        response = approve_discipleship_request(request_id, admin['id'])
        
        if response.ok:
            print_success("Solicitação aprovada com sucesso!")
            approved = response.json()
            print_info(f"Status: {approved.get('status')}")
        else:
            print_error(f"Erro ao aprovar: {response.status_code}")
            print_error(response.text)
    
    print_step(7, "Verificando relacionamentos após aprovação...")
    relationships = get_relationships()
    print_info(f"Total de relacionamentos: {len(relationships)}")
    for rel in relationships[-5:]:
        print(f"   - {rel.get('interestedName', 'N/A')} ← {rel.get('missionaryName', 'N/A')} (Status: {rel.get('status')})")
    
    # ============================================
    # TESTE DE REJEIÇÃO (OPCIONAL)
    # ============================================
    print_header("TESTE DE REJEIÇÃO DE SOLICITAÇÃO")
    
    # Criar nova solicitação para rejeitar
    if len(interested) > 2:
        interessado3 = interested[2]
        print_step(8, f"Criando nova solicitação para teste de rejeição...")
        
        response = create_discipleship_request(interessado3['id'], discipulador['id'])
        
        if response.ok:
            req_to_reject = response.json()
            print_success(f"Solicitação criada (ID: {req_to_reject.get('id')})")
            
            print_step(9, "Admin rejeitando solicitação...")
            response = reject_discipleship_request(req_to_reject.get('id'), admin['id'], "Teste de rejeição pelo script")
            
            if response.ok:
                print_success("Solicitação rejeitada com sucesso!")
            else:
                print_error(f"Erro ao rejeitar: {response.status_code}")
        else:
            print_info("Não foi possível criar solicitação para teste de rejeição")
    
    # ============================================
    # RESUMO FINAL
    # ============================================
    print_header("RESUMO FINAL")
    
    relationships = get_relationships()
    requests_list = get_discipleship_requests()
    
    print_info(f"Total de Relacionamentos de Discipulado: {len(relationships)}")
    print_info(f"Solicitações Pendentes: {len([r for r in requests_list if r.get('status') == 'pending'])}")
    print_info(f"Solicitações Aprovadas: {len([r for r in requests_list if r.get('status') == 'approved'])}")
    print_info(f"Solicitações Rejeitadas: {len([r for r in requests_list if r.get('status') == 'rejected'])}")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ TESTE DE DISCIPULADO CONCLUÍDO!{Colors.END}")
    print(f"\n{Colors.CYAN}Para verificar no sistema:{Colors.END}")
    print(f"   - Admin: http://localhost:3065/users (aba Autorizações)")
    print(f"   - Discipulador: http://localhost:3065/my-interested")
    
if __name__ == "__main__":
    main()
