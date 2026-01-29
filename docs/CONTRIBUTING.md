# Guia de Contribuição

Este guia detalha as regras e práticas para contribuir com o projeto 7Care.

## Índice

1. [Branch Protection](#branch-protection)
2. [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
3. [Padrões de Código](#padrões-de-código)
4. [Pull Requests](#pull-requests)
5. [Code Review](#code-review)
6. [Commits](#commits)

---

## Branch Protection

### Regras para a Branch `main`

A branch `main` é protegida e requer as seguintes condições para merge:

#### Requisitos Obrigatórios

| Regra                               | Descrição                                     |
| ----------------------------------- | --------------------------------------------- |
| **Require pull request reviews**    | Mínimo de 1 aprovação necessária              |
| **Require status checks to pass**   | CI/CD deve passar antes do merge              |
| **Require conversation resolution** | Todos os comentários devem ser resolvidos     |
| **Require linear history**          | Squash merge ou rebase (sem merge commits)    |
| **Do not allow bypassing**          | Administradores também devem seguir as regras |

#### Status Checks Obrigatórios

Os seguintes jobs do CI devem passar:

- `lint` - Verificação de linting (ESLint)
- `type-check` - Verificação de tipos TypeScript
- `test` - Testes unitários e de integração
- `build` - Build de produção
- `security-scan` - Scan de vulnerabilidades (npm audit)
- `bundle-size` - Verificação de tamanho do bundle

#### Configuração no GitHub

Para configurar branch protection no GitHub:

1. Acesse **Settings** > **Branches**
2. Clique em **Add rule** para a branch `main`
3. Configure as opções:

```yaml
# Configuração de Branch Protection
branch_protection:
  pattern: 'main'
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: false
    require_last_push_approval: true
  required_status_checks:
    strict: true
    contexts:
      - 'lint'
      - 'type-check'
      - 'test'
      - 'build'
      - 'security-scan'
  enforce_admins: true
  restrictions: null
  allow_force_pushes: false
  allow_deletions: false
  required_linear_history: true
  required_conversation_resolution: true
```

---

## Workflow de Desenvolvimento

### 1. Criar Branch

```bash
# Sempre partir da main atualizada
git checkout main
git pull origin main

# Criar branch com prefixo adequado
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/correcao-bug
# ou
git checkout -b chore/atualizacao-deps
```

### 2. Prefixos de Branch

| Prefixo     | Uso                          |
| ----------- | ---------------------------- |
| `feature/`  | Nova funcionalidade          |
| `fix/`      | Correção de bug              |
| `hotfix/`   | Correção urgente em produção |
| `chore/`    | Manutenção, deps, configs    |
| `docs/`     | Documentação                 |
| `refactor/` | Refatoração de código        |
| `test/`     | Adição/correção de testes    |

### 3. Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Verificar linting
npm run lint

# Executar testes
npm test

# Build de produção
npm run build
```

---

## Padrões de Código

### TypeScript

- Usar tipos explícitos para parâmetros e retornos de funções
- Evitar `any` - usar `unknown` quando necessário
- Interfaces para objetos, types para unions/intersections

### React

- Componentes funcionais com hooks
- Props tipadas com interfaces
- Usar React.memo para otimização quando necessário

### Testes

- Cobertura mínima: 80%
- Testes unitários para lógica de negócio
- Testes de integração para APIs
- Testes e2e para fluxos críticos

---

## Pull Requests

### Template de PR

```markdown
## Descrição

[Descrição clara das mudanças]

## Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Refatoração
- [ ] Documentação

## Checklist

- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Lint passa sem erros
- [ ] Build passa sem erros
- [ ] Self-review realizado

## Screenshots (se aplicável)

[Adicione screenshots aqui]
```

### Regras

1. PRs pequenos e focados (< 400 linhas)
2. Descrição clara do que foi feito e por quê
3. Associar a issues quando aplicável
4. Manter histórico limpo (squash commits)

---

## Code Review

### Checklist do Revisor

- [ ] Código segue os padrões do projeto
- [ ] Lógica está correta
- [ ] Testes adequados
- [ ] Sem vulnerabilidades de segurança
- [ ] Performance aceitável
- [ ] Documentação quando necessário

### Boas Práticas

- Seja construtivo nos comentários
- Sugira alternativas, não apenas críticas
- Aprove apenas quando tiver certeza
- Bloqueie apenas para issues críticos

---

## Commits

### Conventional Commits

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Tipos de Commit

| Tipo       | Descrição                     |
| ---------- | ----------------------------- |
| `feat`     | Nova funcionalidade           |
| `fix`      | Correção de bug               |
| `docs`     | Documentação                  |
| `style`    | Formatação (não afeta lógica) |
| `refactor` | Refatoração                   |
| `perf`     | Melhoria de performance       |
| `test`     | Testes                        |
| `chore`    | Manutenção                    |
| `ci`       | CI/CD                         |

### Exemplos

```bash
# Feature
feat(auth): add two-factor authentication

# Fix
fix(users): correct validation for email field

# Chore
chore(deps): update react to v18.2.0
```

---

## Segurança

### Proibido em Commits

- Credenciais e senhas
- Tokens de API
- Chaves privadas
- Dados sensíveis de usuários

### Pre-commit Hooks

O projeto usa Husky para verificações automáticas:

```bash
# Executado antes de cada commit
npm run lint
npm run type-check

# Executado antes de cada push
npm test
```

---

## Contato

Em caso de dúvidas sobre contribuição:

- Abra uma issue no GitHub
- Consulte a documentação em `/docs`
