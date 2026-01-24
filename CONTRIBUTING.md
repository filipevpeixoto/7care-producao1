# Guia de Contribuição - 7Care

Obrigado pelo interesse em contribuir com o 7Care! Este documento fornece diretrizes para contribuições.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)

## 📜 Código de Conduta

Este projeto adota um Código de Conduta. Ao participar, você concorda em manter um ambiente respeitoso e inclusivo.

### Comportamento Esperado

- Usar linguagem acolhedora e inclusiva
- Respeitar diferentes pontos de vista
- Aceitar críticas construtivas graciosamente
- Focar no que é melhor para a comunidade

### Comportamento Inaceitável

- Uso de linguagem ou imagens ofensivas
- Trolling, comentários insultuosos
- Assédio público ou privado
- Publicar informações privadas de outros

## 🤝 Como Posso Contribuir?

### Reportando Bugs

1. Verifique se o bug já não foi reportado em [Issues](https://github.com/pxttorrent/7care-producao-sem-offline/issues)
2. Se não encontrar, crie uma nova issue usando o template de bug
3. Inclua o máximo de detalhes possível:
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots se aplicável
   - Versão do navegador/Node.js

### Sugerindo Funcionalidades

1. Primeiro, verifique se já não existe uma issue similar
2. Crie uma issue com o template de feature request
3. Descreva claramente:
   - O problema que resolve
   - Como você imagina a solução
   - Alternativas consideradas

### Contribuindo com Código

1. Fork o repositório
2. Crie uma branch para sua feature
3. Desenvolva seguindo os padrões
4. Escreva/atualize testes
5. Envie um Pull Request

## 🛠 Configuração do Ambiente

### Requisitos

- Node.js 18+
- npm 8+
- Git

### Setup

```bash
# 1. Fork e clone o repositório
git clone https://github.com/SEU-USUARIO/7care-producao-sem-offline.git
cd 7care-producao-sem-offline

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# 4. Execute em desenvolvimento
npm run dev

# 5. Execute os testes
npm test
```

### Estrutura do Projeto

```
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Código compartilhado
├── tests/           # Testes
└── docs/            # Documentação
```

## 📝 Padrões de Código

### TypeScript

- Use tipos explícitos sempre que possível
- Evite `any`, prefira `unknown` quando necessário
- Interfaces para objetos, types para uniões

```typescript
// ✅ Bom
interface User {
  id: number;
  name: string;
  email: string;
}

// ❌ Evitar
const user: any = { ... };
```

### React

- Componentes funcionais com hooks
- Props tipadas com interface
- Separar lógica complexa em hooks customizados

```tsx
// ✅ Bom
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Convenções de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

#### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação (não afeta código) |
| `refactor` | Refatoração |
| `test` | Adição/modificação de testes |
| `chore` | Manutenção, dependências |
| `perf` | Melhoria de performance |

#### Exemplos

```bash
feat(auth): adiciona autenticação JWT com refresh tokens
fix(users): corrige validação de email duplicado
docs(readme): atualiza instruções de instalação
refactor(api): extrai lógica de permissões para middleware
test(churches): adiciona testes de integração
```

### Estilo de Código

- ESLint + Prettier configurados
- Máximo 100 caracteres por linha
- Indentação com 2 espaços
- Aspas simples para strings

```bash
# Verificar estilo
npm run lint

# Corrigir automaticamente
npm run lint:fix

# Formatar
npm run format
```

## 🔄 Processo de Pull Request

### Antes de Enviar

1. ✅ Código segue os padrões do projeto
2. ✅ Testes passando (`npm test`)
3. ✅ Lint passando (`npm run lint`)
4. ✅ Build passando (`npm run build`)
5. ✅ Documentação atualizada se necessário

### Criando o PR

1. Título claro seguindo conventional commits
2. Descrição detalhada das mudanças
3. Screenshots para mudanças visuais
4. Link para issue relacionada (se houver)

### Template de PR

```markdown
## Descrição

Breve descrição das mudanças.

## Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar

Passos para testar as mudanças.

## Checklist

- [ ] Código segue os padrões
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
```

### Review

- PRs precisam de pelo menos 1 approval
- CI deve passar (lint, testes, build)
- Mudanças devem ser discutidas se necessário

## 🐛 Reportando Bugs

### Template de Bug Report

```markdown
## Descrição

Descrição clara e concisa do bug.

## Passos para Reproduzir

1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado

O que deveria acontecer.

## Comportamento Atual

O que está acontecendo.

## Screenshots

Se aplicável.

## Ambiente

- OS: [ex: macOS 14]
- Browser: [ex: Chrome 120]
- Node: [ex: 18.19.0]
```

## 💡 Sugerindo Melhorias

### Template de Feature Request

```markdown
## Problema

Descrição do problema que a feature resolve.

## Solução Proposta

Como você imagina a solução.

## Alternativas Consideradas

Outras abordagens pensadas.

## Contexto Adicional

Screenshots, mockups, etc.
```

## 📚 Recursos

- [Documentação do Projeto](./README-FULL.md)
- [API Reference](./API.md)
- [Arquitetura](./ARCHITECTURE.md)

## ❓ Dúvidas?

- Abra uma issue com a tag `question`
- Entre em contato com os maintainers

---

Obrigado por contribuir! 🙏
