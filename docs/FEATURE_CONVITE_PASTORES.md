# Sistema de Convite Self-Service para Pastores

> **Versão:** 1.0  
> **Data:** 28 de Janeiro de 2026  
> **Status:** Aprovado para Implementação  
> **Estimativa:** 10-12 dias de desenvolvimento

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo Completo](#fluxo-completo)
3. [Wizard de 6 Passos](#wizard-de-6-passos)
4. [Validação de Igrejas](#validação-de-igrejas)
5. [Workflow de Aprovação](#workflow-de-aprovação)
6. [Schema do Banco de Dados](#schema-do-banco-de-dados)
7. [API Endpoints](#api-endpoints)
8. [Estrutura de Componentes](#estrutura-de-componentes)
9. [Design Multi-Geracional](#design-multi-geracional)
10. [Plano de Implementação](#plano-de-implementação)

---

## Visão Geral

### Problema

Atualmente, o cadastro de pastores e suas igrejas depende totalmente do administrador do sistema, criando gargalos e demoras no processo de onboarding.

### Solução

Sistema de convite self-service onde:

1. **Superadmin** gera link de convite
2. **Pastor** acessa link e preenche wizard de 6 passos
3. **Sistema** valida igrejas contra base cadastrada
4. **Superadmin** aprova ou rejeita o cadastro
5. **Pastor** recebe acesso após aprovação

### Decisões Técnicas

- **Persistência:** Salvar todos os dados no final do wizard (não step-by-step)
- **Backup:** localStorage para rascunhos durante preenchimento
- **Validação:** Verificar se igrejas importadas do Excel existem no sistema
- **Aprovação:** Superadmin deve aprovar antes do pastor ter acesso

---

## Fluxo Completo

```
┌─────────────────┐
│   SUPERADMIN    │
│  Gera Convite   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Link enviado   │
│   para Pastor   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    WIZARD DO PASTOR                      │
├─────────────────────────────────────────────────────────┤
│  Passo 1: Dados Pessoais                                │
│  Passo 2: Criar Distrito                                │
│  Passo 3: Cadastrar Igrejas                             │
│  Passo 4: Importar Excel de Membros                     │
│  Passo 5: Validar Igrejas (verificação automática)      │
│  Passo 6: Definir Senha                                 │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│    SUBMISSÃO    │
│ status=submitted│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPERADMIN                            │
│  Vê notificação → Revisa dados → Aprova ou Rejeita      │
└────────┬────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────┐
│APROVADO│ │ REJEITADO │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌───────────┐ ┌─────────────────────┐
│ Cria user │ │ Email com motivo    │
│ + distrito│ │ Pastor pode corrigir│
│ + igrejas │ └─────────────────────┘
└───────────┘
```

---

## Wizard de 6 Passos

### Passo 1: Dados Pessoais

**Campos:**

- Nome completo (obrigatório)
- Email (pré-preenchido do convite, readonly)
- Telefone (obrigatório)
- Foto de perfil (opcional)

**Interface:**

```
┌────────────────────────────────────────────────┐
│  📝 Passo 1 de 6 - Seus Dados                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  👤 Foto de Perfil                       │  │
│  │  [Clique para adicionar]                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Nome Completo *                               │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Email                                         │
│  ┌──────────────────────────────────────────┐  │
│  │ pastor@email.com                    🔒   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Telefone *                                    │
│  ┌──────────────────────────────────────────┐  │
│  │ (00) 00000-0000                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────┐           ┌─────────────────┐   │
│  │ ← Voltar │           │ Próximo Passo → │   │
│  └──────────┘           └─────────────────┘   │
└────────────────────────────────────────────────┘
```

---

### Passo 2: Criar Distrito

**Campos:**

- Nome do distrito (obrigatório)
- Região/Associação (dropdown)
- Descrição (opcional)

**Interface:**

```
┌────────────────────────────────────────────────┐
│  🏛️ Passo 2 de 6 - Seu Distrito                │
│  ━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                │
│  Nome do Distrito *                            │
│  ┌──────────────────────────────────────────┐  │
│  │ Ex: Distrito Central de São Paulo        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Associação/Missão *                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Selecione...                          ▼  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Descrição (opcional)                          │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────┐           ┌─────────────────┐   │
│  │ ← Voltar │           │ Próximo Passo → │   │
│  └──────────┘           └─────────────────┘   │
└────────────────────────────────────────────────┘
```

---

### Passo 3: Cadastrar Igrejas

**Funcionalidades:**

- Adicionar igrejas manualmente (nome + endereço)
- Lista dinâmica com opção de remover
- Mínimo de 1 igreja obrigatória

**Interface:**

```
┌────────────────────────────────────────────────┐
│  ⛪ Passo 3 de 6 - Suas Igrejas                 │
│  ━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                │
│  Adicione as igrejas do seu distrito:          │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  Igreja Central          📍 Rua A, 123  │ 🗑 │
│  ├──────────────────────────────────────────┤  │
│  │  Igreja do Bairro Norte  📍 Av B, 456   │ 🗑 │
│  ├──────────────────────────────────────────┤  │
│  │  Congregação Vila Nova   📍 Rua C, 789  │ 🗑 │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  ➕ Adicionar Nova Igreja                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  💡 Dica: Você pode importar membros por      │
│     igreja no próximo passo.                  │
│                                                │
│  ┌──────────┐           ┌─────────────────┐   │
│  │ ← Voltar │           │ Próximo Passo → │   │
│  └──────────┘           └─────────────────┘   │
└────────────────────────────────────────────────┘
```

---

### Passo 4: Importar Excel de Membros

**Funcionalidades:**

- Upload de arquivo Excel
- Preview dos dados importados
- Mapeamento de colunas
- Associar membros a igrejas cadastradas no passo 3

**Formato esperado do Excel:**
| Nome | Igreja | Telefone | Email | Cargo |
|------|--------|----------|-------|-------|
| João Silva | Igreja Central | 11999... | joao@... | Ancião |
| Maria Santos | Igreja Bairro Norte | 11988... | maria@... | Diaconisa |

**Interface:**

```
┌────────────────────────────────────────────────┐
│  📊 Passo 4 de 6 - Importar Membros            │
│  ━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │     📁 Arraste seu arquivo Excel aqui    │  │
│  │     ou clique para selecionar            │  │
│  │                                          │  │
│  │     Formatos: .xlsx, .xls, .csv          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  📋 Preview dos dados:                         │
│  ┌──────────────────────────────────────────┐  │
│  │ Nome          │ Igreja        │ Telefone │  │
│  ├───────────────┼───────────────┼──────────┤  │
│  │ João Silva    │ Central       │ 119999...│  │
│  │ Maria Santos  │ Bairro Norte  │ 119888...│  │
│  │ ... mais 45 registros                    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ⚠️ 47 membros serão importados               │
│                                                │
│  ┌──────────────────────┐  ┌────────────────┐  │
│  │ ⏭️ Pular esta etapa   │  │ Próximo Passo →│  │
│  └──────────────────────┘  └────────────────┘  │
└────────────────────────────────────────────────┘
```

---

### Passo 5: Validar Igrejas

**Objetivo:**
Verificar se as igrejas informadas no Excel correspondem às igrejas cadastradas no sistema.

**Lógica de Validação:**

```typescript
interface ChurchValidation {
  excelName: string; // Nome no Excel
  status: 'match' | 'similar' | 'not_found';
  registeredChurch?: {
    // Igreja cadastrada (se encontrada)
    id: number;
    name: string;
  };
  similarChurches?: {
    // Sugestões (se similar)
    id: number;
    name: string;
    similarity: number; // 0-100%
  }[];
}
```

**Algoritmo de Similaridade:**

```typescript
function findSimilarChurches(excelName: string, registeredChurches: Church[]) {
  return registeredChurches
    .map(church => ({
      ...church,
      similarity: calculateSimilarity(normalize(excelName), normalize(church.name)),
    }))
    .filter(c => c.similarity > 60) // Threshold 60%
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 sugestões
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/igreja|adventista|setimo dia|iasd/gi, '')
    .trim();
}
```

**Interface:**

```
┌────────────────────────────────────────────────────────────────┐
│  ✅ Passo 5 de 6 - Validar Igrejas                              │
│  ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                 │
│  Verificando igrejas do Excel com igrejas cadastradas:         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Igreja Central                                        │   │
│  │    → Correspondência exata encontrada                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚠️ IASD Bairro Norte                                     │   │
│  │    Igreja não encontrada. Sugestões:                     │   │
│  │    ○ Igreja Adventista do Bairro Norte (92%)             │   │
│  │    ○ Igreja Bairro Norte Central (78%)                   │   │
│  │    ┌─────────────────────────────────────────────────┐   │   │
│  │    │ Selecione a correspondência ou ignore      ▼   │   │   │
│  │    └─────────────────────────────────────────────────┘   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ❌ Congregação Esperança                                 │   │
│  │    Nenhuma correspondência encontrada                    │   │
│  │    [ ] Criar nova igreja com este nome                   │   │
│  │    [ ] Ignorar membros desta igreja                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 Resumo: 1 correspondência exata, 1 similar, 1 não encontrada│
│                                                                 │
│  ┌──────────┐                           ┌─────────────────┐    │
│  │ ← Voltar │                           │ Próximo Passo → │    │
│  └──────────┘                           └─────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

---

### Passo 6: Definir Senha

**Campos:**

- Senha (mínimo 8 caracteres)
- Confirmar senha
- Checkbox de termos de uso

**Requisitos de Senha:**

- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número

**Interface:**

```
┌────────────────────────────────────────────────┐
│  🔐 Passo 6 de 6 - Criar Senha                  │
│  ━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                │
│  Crie uma senha segura para sua conta:         │
│                                                │
│  Senha *                                       │
│  ┌──────────────────────────────────────────┐  │
│  │ ●●●●●●●●                            👁️  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ✅ Mínimo 8 caracteres                        │
│  ✅ Pelo menos 1 maiúscula                     │
│  ⬜ Pelo menos 1 número                        │
│                                                │
│  Confirmar Senha *                             │
│  ┌──────────────────────────────────────────┐  │
│  │ ●●●●●●●●                            👁️  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ☐ Li e aceito os Termos de Uso               │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │      ✅ Finalizar Cadastro                │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  💡 Seu cadastro será enviado para aprovação  │
│     do administrador.                         │
└────────────────────────────────────────────────┘
```

---

## Validação de Igrejas

### Fluxo de Validação Detalhado

```typescript
// Tipos
interface ExcelRow {
  nome: string;
  igreja: string;
  telefone?: string;
  email?: string;
  cargo?: string;
}

interface ValidationResult {
  churchName: string;
  status: 'exact_match' | 'similar_found' | 'not_found';
  matchedChurchId?: number;
  suggestions?: Array<{
    id: number;
    name: string;
    similarity: number;
  }>;
  memberCount: number;
  action?: 'use_suggestion' | 'create_new' | 'ignore';
  selectedSuggestionId?: number;
}

// Função principal de validação
async function validateExcelChurches(
  excelData: ExcelRow[],
  registeredChurches: Church[]
): Promise<ValidationResult[]> {
  // 1. Extrair nomes únicos de igrejas do Excel
  const uniqueChurchNames = [...new Set(excelData.map(row => row.igreja))];

  // 2. Para cada igreja, verificar correspondência
  return uniqueChurchNames.map(excelChurchName => {
    // Busca exata (case-insensitive)
    const exactMatch = registeredChurches.find(
      c => normalize(c.name) === normalize(excelChurchName)
    );

    if (exactMatch) {
      return {
        churchName: excelChurchName,
        status: 'exact_match',
        matchedChurchId: exactMatch.id,
        memberCount: excelData.filter(r => r.igreja === excelChurchName).length,
      };
    }

    // Busca por similaridade
    const similar = findSimilarChurches(excelChurchName, registeredChurches);

    if (similar.length > 0) {
      return {
        churchName: excelChurchName,
        status: 'similar_found',
        suggestions: similar,
        memberCount: excelData.filter(r => r.igreja === excelChurchName).length,
      };
    }

    // Não encontrada
    return {
      churchName: excelChurchName,
      status: 'not_found',
      memberCount: excelData.filter(r => r.igreja === excelChurchName).length,
    };
  });
}
```

### Opções para Igrejas Não Encontradas

| Situação           | Opção 1       | Opção 2         | Opção 3         |
| ------------------ | ------------- | --------------- | --------------- |
| Similar encontrada | Usar sugestão | Criar nova      | Ignorar membros |
| Não encontrada     | Criar nova    | Ignorar membros | -               |

---

## Workflow de Aprovação

### Estados do Convite

```typescript
type InviteStatus =
  | 'pending' // Link gerado, aguardando pastor
  | 'submitted' // Pastor finalizou wizard
  | 'approved' // Superadmin aprovou
  | 'rejected'; // Superadmin rejeitou
```

### Diagrama de Estados

```
pending ──────────► submitted ──────────► approved
    │                   │                     │
    │                   │                     ▼
    │                   │              [Cria usuário]
    │                   │              [Cria distrito]
    │                   │              [Cria igrejas]
    │                   │              [Importa membros]
    │                   │
    │                   ▼
    │              rejected
    │                   │
    │                   ▼
    │            [Email com motivo]
    │            [Pastor pode corrigir]
    │                   │
    └───────────────────┘
         (resubmit)
```

### Interface do Superadmin

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔔 Solicitações de Cadastro Pendentes (3)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  👤 Pastor João Silva                                              │  │
│  │  📧 joao.silva@email.com                                          │  │
│  │  📅 Submetido em: 28/01/2026 às 14:30                             │  │
│  │                                                                    │  │
│  │  📊 Resumo:                                                        │  │
│  │  • Distrito: Central São Paulo                                     │  │
│  │  • Igrejas: 3                                                      │  │
│  │  • Membros: 127                                                    │  │
│  │                                                                    │  │
│  │  ⚠️ Alertas:                                                       │  │
│  │  • 1 igreja sem correspondência exata                              │  │
│  │                                                                    │  │
│  │  ┌─────────────────┐  ┌───────────────┐  ┌────────────────────┐   │  │
│  │  │ 👁️ Ver Detalhes │  │ ✅ Aprovar    │  │ ❌ Rejeitar        │   │  │
│  │  └─────────────────┘  └───────────────┘  └────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modal de Rejeição

```
┌────────────────────────────────────────────────────────────┐
│  ❌ Rejeitar Cadastro                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Motivo da rejeição: *                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Selecione um motivo...                            ▼  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ Dados pessoais incompletos                         │  │
│  │ ○ Distrito já existe no sistema                      │  │
│  │ ○ Igrejas não correspondem às registradas            │  │
│  │ ○ Arquivo Excel com formato inválido                 │  │
│  │ ○ Outro (especificar abaixo)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Detalhes adicionais:                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ⚠️ O pastor receberá um email com este motivo e          │
│     poderá corrigir e reenviar o cadastro.                │
│                                                            │
│  ┌────────────────────┐  ┌─────────────────────────────┐  │
│  │     Cancelar       │  │   Confirmar Rejeição        │  │
│  └────────────────────┘  └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Schema do Banco de Dados

### Nova Tabela: pastor_invites

```sql
CREATE TABLE pastor_invites (
  id SERIAL PRIMARY KEY,

  -- Token e identificação
  token VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- Quem criou o convite
  created_by INTEGER REFERENCES users(id) NOT NULL,

  -- Validade
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status do workflow
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),

  -- Dados do onboarding (JSON completo)
  onboarding_data JSONB,

  -- Datas importantes
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Quem revisou
  reviewed_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,

  -- Referências após aprovação
  user_id INTEGER REFERENCES users(id),
  district_id INTEGER REFERENCES districts(id),

  -- Timestamps padrão
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pastor_invites_token ON pastor_invites(token);
CREATE INDEX idx_pastor_invites_status ON pastor_invites(status);
CREATE INDEX idx_pastor_invites_email ON pastor_invites(email);
```

### Estrutura do onboarding_data (JSONB)

```typescript
interface OnboardingData {
  // Passo 1: Dados Pessoais
  personal: {
    name: string;
    email: string;
    phone: string;
    photoUrl?: string;
  };

  // Passo 2: Distrito
  district: {
    name: string;
    associationId?: number;
    description?: string;
  };

  // Passo 3: Igrejas
  churches: Array<{
    name: string;
    address: string;
    isNew: boolean; // true se criada pelo pastor
  }>;

  // Passo 4: Dados do Excel
  excelData: {
    fileName: string;
    uploadedAt: string;
    totalRows: number;
    data: Array<{
      nome: string;
      igreja: string;
      telefone?: string;
      email?: string;
      cargo?: string;
    }>;
  };

  // Passo 5: Validação de Igrejas
  churchValidation: Array<{
    excelChurchName: string;
    status: 'exact_match' | 'similar_found' | 'not_found';
    matchedChurchId?: number;
    action: 'use_match' | 'use_suggestion' | 'create_new' | 'ignore';
    selectedSuggestionId?: number;
    memberCount: number;
  }>;

  // Metadados
  completedSteps: number[];
  lastStepAt: string;
}
```

---

## API Endpoints

### Endpoints Necessários

```typescript
// ========== SUPERADMIN ==========

// Criar convite
POST /api/invites
Body: { email: string, expiresInDays?: number }
Response: { token: string, link: string, expiresAt: string }

// Listar convites pendentes de aprovação
GET /api/invites?status=submitted
Response: { invites: PastorInvite[] }

// Detalhes de um convite
GET /api/invites/:id
Response: { invite: PastorInvite, onboardingData: OnboardingData }

// Aprovar convite
POST /api/invites/:id/approve
Response: { success: true, userId: number, districtId: number }

// Rejeitar convite
POST /api/invites/:id/reject
Body: { reason: string, details?: string }
Response: { success: true }


// ========== PASTOR (PÚBLICO) ==========

// Validar token do convite
GET /api/invites/validate/:token
Response: { valid: boolean, email: string, expiresAt: string }

// Buscar igrejas cadastradas (para validação)
GET /api/churches/registered
Response: { churches: Array<{ id: number, name: string }> }

// Submeter onboarding completo
POST /api/invites/:token/submit
Body: {
  personal: {...},
  district: {...},
  churches: [...],
  excelData: {...},
  churchValidation: [...],
  password: string
}
Response: { success: true, message: string }

// Upload do arquivo Excel
POST /api/invites/:token/upload-excel
Body: FormData (arquivo)
Response: {
  fileName: string,
  totalRows: number,
  preview: ExcelRow[],
  churches: string[] // Lista única de igrejas encontradas
}
```

### Exemplo de Implementação (API)

```typescript
// server/routes/invites.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateToken, hashPassword } from '../utils/crypto';
import { sendEmail } from '../services/email';

const router = Router();

// Criar convite (superadmin)
router.post('/', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { email, expiresInDays = 7 } = req.body;

  const token = generateToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invite = await db
    .insert(pastorInvites)
    .values({
      token,
      email,
      createdBy: req.user.id,
      expiresAt,
      status: 'pending',
    })
    .returning();

  const link = `${process.env.APP_URL}/pastor-onboarding/${token}`;

  // Enviar email
  await sendEmail({
    to: email,
    subject: 'Convite para 7Care',
    template: 'pastor-invite',
    data: { link, expiresAt },
  });

  res.json({
    token,
    link,
    expiresAt: expiresAt.toISOString(),
  });
});

// Aprovar convite
router.post('/:id/approve', requireAuth, requireRole('superadmin'), async (req, res) => {
  const invite = await db.query.pastorInvites.findFirst({
    where: eq(pastorInvites.id, req.params.id),
  });

  if (!invite || invite.status !== 'submitted') {
    return res.status(400).json({ error: 'Convite inválido' });
  }

  const data = invite.onboardingData as OnboardingData;

  // Transação para criar tudo
  const result = await db.transaction(async tx => {
    // 1. Criar usuário
    const [user] = await tx
      .insert(users)
      .values({
        name: data.personal.name,
        email: data.personal.email,
        phone: data.personal.phone,
        role: 'pastor',
        passwordHash: data.passwordHash,
      })
      .returning();

    // 2. Criar distrito
    const [district] = await tx
      .insert(districts)
      .values({
        name: data.district.name,
        associationId: data.district.associationId,
        pastorId: user.id,
      })
      .returning();

    // 3. Criar igrejas
    for (const church of data.churches) {
      await tx.insert(churches).values({
        name: church.name,
        address: church.address,
        districtId: district.id,
      });
    }

    // 4. Importar membros
    for (const member of data.excelData.data) {
      const validation = data.churchValidation.find(v => v.excelChurchName === member.igreja);

      if (validation?.action === 'ignore') continue;

      const churchId = validation?.matchedChurchId;
      if (!churchId) continue;

      await tx.insert(members).values({
        name: member.nome,
        phone: member.telefone,
        email: member.email,
        role: member.cargo,
        churchId,
      });
    }

    // 5. Atualizar convite
    await tx
      .update(pastorInvites)
      .set({
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        userId: user.id,
        districtId: district.id,
      })
      .where(eq(pastorInvites.id, invite.id));

    return { userId: user.id, districtId: district.id };
  });

  // Enviar email de boas-vindas
  await sendEmail({
    to: data.personal.email,
    subject: 'Cadastro Aprovado - 7Care',
    template: 'pastor-approved',
    data: { name: data.personal.name },
  });

  res.json({ success: true, ...result });
});

export default router;
```

---

## Estrutura de Componentes

### Árvore de Componentes React

```
client/src/
├── pages/
│   ├── pastor-onboarding/
│   │   ├── index.tsx              # Página principal do wizard
│   │   ├── [token].tsx            # Rota dinâmica
│   │   └── success.tsx            # Página de sucesso
│   │
│   └── admin/
│       └── invite-requests/
│           ├── index.tsx          # Lista de solicitações
│           └── [id].tsx           # Detalhes de uma solicitação
│
├── components/
│   └── pastor-onboarding/
│       ├── OnboardingWizard.tsx   # Container principal
│       ├── StepIndicator.tsx      # Indicador de progresso
│       ├── steps/
│       │   ├── Step1Personal.tsx
│       │   ├── Step2District.tsx
│       │   ├── Step3Churches.tsx
│       │   ├── Step4ExcelImport.tsx
│       │   ├── Step5Validation.tsx
│       │   └── Step6Password.tsx
│       ├── ChurchValidationCard.tsx
│       ├── ExcelPreviewTable.tsx
│       └── SimilarChurchSelector.tsx
│
├── hooks/
│   └── useOnboardingWizard.ts     # Estado e lógica do wizard
│
└── services/
    └── inviteService.ts           # API calls
```

### Hook Principal

```typescript
// client/src/hooks/useOnboardingWizard.ts
import { useState, useEffect, useCallback } from 'react';

interface WizardState {
  currentStep: number;
  data: Partial<OnboardingData>;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'pastor_onboarding_draft';

export function useOnboardingWizard(token: string) {
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    data: {},
    isLoading: false,
    error: null,
  });

  // Recuperar rascunho do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${token}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setState(prev => ({
        ...prev,
        currentStep: parsed.currentStep || 1,
        data: parsed.data || {},
      }));
    }
  }, [token]);

  // Salvar rascunho no localStorage
  const saveDraft = useCallback(() => {
    localStorage.setItem(
      `${STORAGE_KEY}_${token}`,
      JSON.stringify({
        currentStep: state.currentStep,
        data: state.data,
        savedAt: new Date().toISOString(),
      })
    );
  }, [token, state]);

  // Atualizar dados de um passo
  const updateStepData = useCallback(
    (step: number, data: any) => {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          ...data,
          completedSteps: [...new Set([...(prev.data.completedSteps || []), step])],
        },
      }));
      saveDraft();
    },
    [saveDraft]
  );

  // Ir para próximo passo
  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6),
    }));
    saveDraft();
  }, [saveDraft]);

  // Voltar passo
  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  // Submeter tudo no final
  const submit = useCallback(
    async (password: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await inviteService.submitOnboarding(token, {
          ...state.data,
          password,
        });

        // Limpar rascunho após sucesso
        localStorage.removeItem(`${STORAGE_KEY}_${token}`);

        return true;
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
        return false;
      }
    },
    [token, state.data]
  );

  return {
    ...state,
    updateStepData,
    nextStep,
    prevStep,
    submit,
    saveDraft,
  };
}
```

---

## Design Multi-Geracional

### Princípios para Usuários de 20-60+ anos

| Aspecto              | Implementação                                   |
| -------------------- | ----------------------------------------------- |
| **Tamanho de fonte** | Base 16px, botões 18px, títulos 24px+           |
| **Contraste**        | WCAG AAA (7:1 mínimo)                           |
| **Áreas clicáveis**  | Mínimo 48x48px                                  |
| **Feedback visual**  | Estados claros (hover, focus, active, disabled) |
| **Linguagem**        | Simples e direta, evitar jargões técnicos       |
| **Ícones**           | Sempre acompanhados de texto                    |
| **Navegação**        | Linear e previsível, sem surpresas              |
| **Ajuda contextual** | Tooltips e dicas em cada campo                  |

### Exemplo de Componente Acessível

```tsx
// Botão grande e acessível
<Button
  size="lg"
  className="
    min-h-[48px]
    min-w-[120px]
    text-lg
    font-medium
    focus:ring-4
    focus:ring-blue-300
    transition-all
    duration-200
  "
>
  <Icon className="mr-2 h-5 w-5" />
  Próximo Passo
</Button>

// Input com label clara
<div className="space-y-2">
  <Label
    htmlFor="name"
    className="text-base font-medium"
  >
    Nome Completo
    <span className="text-red-500 ml-1">*</span>
  </Label>
  <Input
    id="name"
    className="h-12 text-lg"
    placeholder="Digite seu nome completo"
  />
  <p className="text-sm text-muted-foreground">
    Como você gostaria de ser chamado
  </p>
</div>
```

---

## Plano de Implementação

### Cronograma (10-12 dias)

| Fase                      | Dias | Tarefas                       |
| ------------------------- | ---- | ----------------------------- |
| **1. Setup**              | 0.5  | Schema + migration + tipos    |
| **2. API Base**           | 1.5  | Endpoints CRUD básicos        |
| **3. Wizard Frontend**    | 4-5  | 6 componentes de steps + hook |
| **4. Upload Excel**       | 1    | Parser + preview + validação  |
| **5. Church Validation**  | 1    | Algoritmo + interface         |
| **6. Approval Interface** | 1.5  | Lista + detalhes + ações      |
| **7. Emails**             | 0.5  | Templates + serviço           |
| **8. Testes**             | 1-2  | Unit + integration + E2E      |

### Ordem de Desenvolvimento Recomendada

```
1. Criar migration e schema (pastor_invites)
   ↓
2. API: POST /invites (criar convite)
   ↓
3. API: GET /invites/validate/:token
   ↓
4. Frontend: OnboardingWizard + Step1Personal
   ↓
5. Frontend: Step2District + Step3Churches
   ↓
6. API: POST /invites/:token/upload-excel
   ↓
7. Frontend: Step4ExcelImport
   ↓
8. API: GET /churches/registered
   ↓
9. Frontend: Step5Validation (algoritmo similaridade)
   ↓
10. Frontend: Step6Password + Submit
    ↓
11. API: POST /invites/:token/submit
    ↓
12. Admin: Lista de solicitações pendentes
    ↓
13. API: POST /invites/:id/approve + /reject
    ↓
14. Admin: Interface de aprovação/rejeição
    ↓
15. Emails: Convite + Aprovação + Rejeição
    ↓
16. Testes e refinamentos
```

---

## Checklist de Implementação

### Backend

- [ ] Migration: tabela `pastor_invites`
- [ ] Tipos TypeScript para OnboardingData
- [ ] Endpoint: criar convite
- [ ] Endpoint: validar token
- [ ] Endpoint: listar igrejas registradas
- [ ] Endpoint: upload Excel
- [ ] Endpoint: submeter onboarding
- [ ] Endpoint: listar pendentes
- [ ] Endpoint: aprovar
- [ ] Endpoint: rejeitar
- [ ] Serviço de email
- [ ] Algoritmo de similaridade de nomes

### Frontend

- [ ] Página do wizard (/pastor-onboarding/:token)
- [ ] Componente StepIndicator
- [ ] Step1Personal
- [ ] Step2District
- [ ] Step3Churches
- [ ] Step4ExcelImport
- [ ] Step5Validation
- [ ] Step6Password
- [ ] Hook useOnboardingWizard
- [ ] Página de sucesso
- [ ] Admin: lista de solicitações
- [ ] Admin: detalhes do convite
- [ ] Admin: modal de rejeição

### Testes

- [ ] Unit: algoritmo de similaridade
- [ ] Unit: validação de dados
- [ ] Integration: fluxo de convite
- [ ] Integration: fluxo de aprovação
- [ ] E2E: wizard completo
- [ ] E2E: aprovação/rejeição

---

## Notas Finais

### Pontos de Atenção

1. **Segurança do Token:** Usar crypto.randomBytes(32) para tokens seguros
2. **Expiração:** Implementar cron job para limpar convites expirados
3. **Rate Limiting:** Limitar tentativas de validação de token
4. **Backup:** localStorage não é permanente, avisar usuário
5. **Acessibilidade:** Testar com leitores de tela
6. **Mobile:** Wizard deve funcionar bem em celulares

### Extensões Futuras

- [ ] Permitir pastor reenviar após rejeição
- [ ] Dashboard de status do convite para o pastor
- [ ] Notificações push além de email
- [ ] Importação de múltiplos arquivos Excel
- [ ] Preview de como ficará o distrito/igrejas

---

_Documento criado para facilitar implementação e consulta por outras IAs ou desenvolvedores._
