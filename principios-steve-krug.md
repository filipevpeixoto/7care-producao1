# Princípios de Usabilidade — Steve Krug

> Referência completa baseada no livro **"Não Me Faça Pensar"** (_Don't Make Me Think_) de Steve Krug.  
> Use este documento como checklist para análise de usabilidade de qualquer aplicação web ou mobile.

---

## Índice

1. [Lei Zero: Não Me Faça Pensar](#1-lei-zero-não-me-faça-pensar)
2. [Como as Pessoas Realmente Usam a Web](#2-como-as-pessoas-realmente-usam-a-web)
3. [Projeto de Páginas: Hierarquia Visual](#3-projeto-de-páginas-hierarquia-visual)
4. [Texto e Conteúdo: Elimine o Desnecessário](#4-texto-e-conteúdo-elimine-o-desnecessário)
5. [Navegação](#5-navegação)
6. [Página Inicial / Home](#6-página-inicial--home)
7. [Testes de Usabilidade](#7-testes-de-usabilidade)
8. [O Mito do Usuário Médio](#8-o-mito-do-usuário-médio)
9. [Boa Vontade do Usuário (Goodwill)](#9-boa-vontade-do-usuário-goodwill)
10. [Acessibilidade](#10-acessibilidade)
11. [Checklist de Análise Rápida](#11-checklist-de-análise-rápida)
12. [Anti-Padrões Comuns](#12-anti-padrões-comuns)

---

## 1. Lei Zero: Não Me Faça Pensar

> _"A última coisa de que você precisa é outra lista de verificação. A coisa mais importante que você pode fazer é compreender o princípio básico de eliminar as perguntas."_

### Princípio Fundamental

Cada página, cada tela, cada interação deve ser **clara** (auto-evidente) ou, no mínimo, **auto-explicativa**.

- **Clara** = o usuário olha e sabe instantaneamente o que é e como usar
- **Auto-explicativa** = requer um pouco de raciocínio, mas apenas um pouco

### Perguntas que NUNCA devem surgir na mente do usuário

| Pergunta mental                        | Significa que algo falhou            |
| -------------------------------------- | ------------------------------------ |
| "Onde estou?"                          | Falta de indicação de localização    |
| "Onde devo começar?"                   | Hierarquia visual confusa            |
| "Onde eles colocaram o \_\_\_?"        | Navegação não intuitiva              |
| "O que é mais importante aqui?"        | Tudo tem o mesmo peso visual         |
| "Por que chamaram isso de \_\_\_?"     | Rótulos confusos ou jargão           |
| "Isso é um botão ou um texto?"         | Affordance visual fraca              |
| "Isso é clicável?"                     | Falta de indicação de interatividade |
| "Essas duas coisas são a mesma coisa?" | Nomenclatura inconsistente           |

### Como aplicar

1. Mostre a tela para alguém por 5 segundos
2. Pergunte: "O que é esta página? O que você pode fazer aqui?"
3. Se a pessoa não souber responder → a página não é clara
4. Se precisar pensar mais de 2 segundos → não é auto-explicativa

---

## 2. Como as Pessoas Realmente Usam a Web

> _"Estamos pensando em 'grande literatura', enquanto a realidade do usuário é muito mais parecida com 'passando por um painel de propaganda a 140 km/h'."_

### 3 Fatos sobre uso real

#### FATO 1: Ninguém lê páginas. Pessoas **escaneiam**.

- Usuários procuram **palavras e frases** que chamem atenção
- Ignoram grandes áreas da página
- Focam no que se parece com: (a) a tarefa atual, (b) interesses pessoais, (c) palavras-gatilho ("Grátis", "Novo", seu próprio nome)

**Implicação para o projeto:**

- Use headings claros e descritivos
- Destaque palavras-chave em negrito
- Use listas em vez de parágrafos
- Mantenha parágrafos curtos (2-3 frases)

#### FATO 2: Ninguém faz a escolha ideal. Fazem **o que for suficiente** (_satisficing_).

- Usuários clicam no **primeiro link razoável** que encontram
- Não comparam todas as opções disponíveis
- Se não funcionar, clicam "Voltar" e tentam outro

**Implicação para o projeto:**

- O caminho mais provável deve ser o mais visível
- Nomes de links devem descrever claramente o destino
- Permita recuperação fácil de erros (botão Voltar funcionando)

#### FATO 3: Ninguém descobre "como as coisas funcionam". Pessoas **se viram**.

- Usuários não leem manuais ou instruções
- Encontram algo que "funciona mais ou menos" e continuam usando
- Formam modelos mentais incorretos mas funcionais

**Implicação para o projeto:**

- Torne as coisas auto-explicativas
- Não dependa de que o usuário tenha lido instruções anteriores
- Se algo pode ser mal interpretado, será

---

## 3. Projeto de Páginas: Hierarquia Visual

> _"Tornar as páginas claras é como ter boa iluminação em uma loja: faz com que tudo pareça melhor."_

### Regras de Hierarquia Visual

#### 3.1. Crie uma hierarquia visual clara

```
[Mais importante]  →  Maior, mais bold, cor mais forte, posição superior
[Importante]       →  Tamanho médio, peso médio
[Secundário]       →  Menor, mais leve, cor neutra
[Terciário]        →  Discreto, texto auxiliar
```

- Quanto mais importante, mais **proeminente** visualmente
- Coisas logicamente relacionadas devem ser **visualmente relacionadas**
- Coisas que fazem parte de algo maior devem estar **visualmente aninhadas**

#### 3.2. Use convenções visuais

| Convenção               | Significado esperado |
| ----------------------- | -------------------- |
| Texto azul sublinhado   | Link clicável        |
| Botão com sombra/relevo | Ação clicável        |
| Ícone de lupa           | Busca                |
| Ícone de engrenagem     | Configurações        |
| Ícone de hamburger (☰) | Menu                 |
| Ícone de X              | Fechar               |
| Ícone de lápis          | Editar               |
| Texto cinza claro       | Placeholder / dica   |

#### 3.3. Divida a página em áreas bem definidas

- O usuário deve ser capaz de apontar para cada área e dizer: "Isso é a navegação", "Isso é o conteúdo", "Isso são as ações"
- Use espaçamento, bordas ou cores de fundo para separar seções
- Evite que tudo pareça uma "sopa" de elementos soltos

#### 3.4. Torne óbvio o que é clicável

- Links, botões e elementos interativos devem ter **affordance visual** clara
- Nunca dependa apenas de hover (mobile não tem hover)
- Botões primários devem se destacar dos secundários

---

## 4. Texto e Conteúdo: Elimine o Desnecessário

> _"Livre-se de metade das palavras em cada página e então livre-se da metade do que sobrou."_

### 4.1. Elimine o "Papo Bobo" (_Happy Talk_)

**Papo bobo** é texto introdutório que:

- Dá boas-vindas ao site sem informação útil
- Diz o quão maravilhoso o serviço é
- Explica o óbvio

❌ **Exemplo ruim:**

> "Bem-vindo ao nosso sistema de gestão! Estamos muito felizes em tê-lo aqui. Este painel oferece uma visão geral completa de todas as funcionalidades disponíveis para você. Esperamos que aproveite!"

✅ **Exemplo bom:**

> _(Nenhum texto. Apenas o painel com os dados.)_

### 4.2. Elimine Instruções

> _"Ninguém irá lê-las."_

- Se o design precisar de instruções, o design está errado
- Torne tudo auto-explicativo
- Se instruções forem absolutamente necessárias: **reduza ao mínimo absoluto**
- Ninguém lê instruções até já ter tentado e falhado

### 4.3. Regra para texto em interfaces

| Tipo de texto              | Ação                               |
| -------------------------- | ---------------------------------- |
| Boas-vindas genéricas      | **Elimine**                        |
| Instruções longas          | **Reduza a 1 frase ou elimine**    |
| Texto que descreve o óbvio | **Elimine**                        |
| Texto informativo útil     | **Mantenha, mas reduza**           |
| Labels de campos           | **Mantenha — claros e curtos**     |
| Mensagens de erro          | **Mantenha — específicas e úteis** |
| Texto de marketing         | **Reduza drasticamente**           |

---

## 5. Navegação

> _"A navegação não é apenas uma característica de um Web site. Ela É o Web site."_

### 5.1. Funções da Navegação

A navegação deve responder a **5 perguntas** em qualquer página:

| #   | Pergunta                                 | Como responder                             |
| --- | ---------------------------------------- | ------------------------------------------ |
| 1   | **O que é este site?**                   | Logo/ID do site visível em toda página     |
| 2   | **Em que página estou?**                 | Título da página + indicador ativo no menu |
| 3   | **Quais são as seções principais?**      | Menu de navegação primário                 |
| 4   | **Quais são minhas opções neste nível?** | Navegação secundária/local                 |
| 5   | **Onde estou na estrutura?**             | Breadcrumbs (migalhas de pão)              |

### 5.2. Elementos Obrigatórios da Navegação

Toda página deve ter **sempre visível**:

```
┌─────────────────────────────────────────────────┐
│  [Logo/Home]  [Nav Principal]       [Busca] 🔍  │  ← Navegação Global
├─────────────────────────────────────────────────┤
│  Home > Seção > Página Atual                     │  ← Breadcrumbs
├─────────────────────────────────────────────────┤
│  <h1> Título da Página </h1>                     │  ← Identifica a página
│                                                  │
│  [Conteúdo da Página]                            │
└─────────────────────────────────────────────────┘
```

### 5.3. Regras Fundamentais

| Regra                        | Descrição                                                         |
| ---------------------------- | ----------------------------------------------------------------- |
| **Consistência**             | Mesmos elementos, mesma posição, mesmo visual em todas as páginas |
| **Logo = Home**              | Clicar no logo sempre volta ao início                             |
| **Busca acessível**          | Caixa de busca visível em toda página                             |
| **Página atual destacada**   | Item do menu ativo claramente diferenciado                        |
| **Breadcrumbs**              | Mostram o caminho: Home > Seção > Subseção > Página               |
| **"Você está aqui"**         | Sempre claro onde o usuário se encontra                           |
| **Nomenclatura consistente** | O mesmo conceito deve ter o mesmo nome em toda a aplicação        |

### 5.4. Breadcrumbs — Regras

- Coloque no topo da página, abaixo da navegação global
- Use `>` como separador: `Home > Produtos > Categoria > Item`
- O último item (página atual) deve ser **bold** e **não clicável**
- Fonte menor que o conteúdo principal
- O primeiro item deve ser sempre "Home" ou "Início"

### 5.5. Exceções à Navegação Estável

Apenas 2 situações justificam remover a navegação completa:

1. **Formulários** — quando o foco não deve ser perdido (checkout, cadastro). Mantenha uma versão mínima com logo + ajuda.
2. **Páginas muito específicas** — como impressão de recibo.

### 5.6. Navegação Mobile

- Use no máximo **5 itens** na barra inferior
- Rótulos devem ser **auto-explicativos** (evite jargão)
- O item ativo deve ser **visualmente diferente** (cor, ícone preenchido)
- Manter **consistência** entre mobile e desktop (mesmos nomes)
- O botão Voltar deve **sempre funcionar** previsivelmente

---

## 6. Página Inicial / Home

> _"A página inicial tem de acomodar muitas pessoas diferentes e é facilmente a página mais difícil de projetar bem."_

### Objetivos da Página Inicial

1. **Identidade do site** — O que é este site/app?
2. **Hierarquia** — O que posso fazer aqui?
3. **Busca** — Como encontro o que preciso?
4. **Conteúdo em destaque** — O que há de novo/importante?
5. **Atalhos** — Links rápidos para tarefas frequentes
6. **Credibilidade** — Posso confiar neste site?

### Regras para a Página Inicial

| Regra                        | Detalhes                                                               |
| ---------------------------- | ---------------------------------------------------------------------- |
| **Tagline**                  | Frase curta que explica o que o site faz (visível nos primeiros 320px) |
| **Sem "papo bobo"**          | Nada de textos de boas-vindas genéricos                                |
| **Botão Grande**             | Call-to-action principal claro para novos usuários                     |
| **Pontos de entrada claros** | Novos vs. retornantes devem saber por onde começar                     |
| **Sem excesso de promoções** | Não transforme a home em um outdoor lotado                             |
| **Título visível**           | `<h1>` com o nome/propósito da página                                  |

### Teste da Página Inicial (Teste do Tronco)

Imagine que você foi transportado para uma página sem nenhum contexto (como se tivesse caído de um helicóptero). Você deveria ser capaz de responder:

1. ✅ Que site é este? (ID do Site)
2. ✅ Em que página estou? (Nome da página)
3. ✅ Quais são as seções principais? (Navegação primária)
4. ✅ Quais são minhas opções neste nível? (Navegação local)
5. ✅ Onde estou na hierarquia? (Indicadores "Você está aqui")
6. ✅ Como posso pesquisar? (Busca)

Se não conseguir responder alguma em **5 segundos** → a página precisa ser melhorada.

---

## 7. Testes de Usabilidade

> _"Testar um usuário é 100% melhor do que não testar nenhum."_

### Princípios de Teste

| Princípio                  | Detalhe                                             |
| -------------------------- | --------------------------------------------------- |
| **Teste cedo**             | Quando ainda é fácil mudar                          |
| **Teste frequente**        | Uma manhã por mês é suficiente                      |
| **Poucos usuários bastam** | 3 a 5 usuários encontram a maioria dos problemas    |
| **Qualquer pessoa serve**  | Não precisa ser do seu público-alvo exato           |
| **Observe, não pergunte**  | O que pessoas fazem importa mais do que o que dizem |

### Como Fazer um Teste Rápido

1. **Recrute**: 3 pessoas (podem ser colegas, amigos, qualquer pessoa)
2. **Defina tarefas**: "Encontre o produto X e adicione ao carrinho"
3. **Observe**: Não ajude. Não explique. Apenas observe onde travam.
4. **Anote**: Cada momento de hesitação é um problema de usabilidade
5. **Priorize**: Corrija os 3 problemas mais graves antes do próximo teste

### O que Observar

- **Hesitação** — O usuário parou? Por quê?
- **Cliques errados** — Clicou em algo que não era o esperado?
- **Expressões faciais** — Frustração, confusão, surpresa?
- **Perguntas** — "O que isso faz?" = o design não é claro
- **Workarounds** — O usuário encontrou um caminho alternativo?

---

## 8. O Mito do Usuário Médio

> _"Não existe Usuário Médio."_

### Princípios

- **Todos os usuários são únicos** — Não tente projetar para um "usuário médio" fictício
- **O que funciona é bom design** — Não é uma questão de preferência ("menus laterais vs. topo") mas sim de execução
- **"A maioria dos usuários gosta de X"** é geralmente **falso** — Diferentes pessoas preferem coisas diferentes
- **Teste, não discuta** — Em vez de debater sobre o que é "melhor", teste com usuários reais

### Como Resolver Debates de Design

| ❌ Não faça                                     | ✅ Faça                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| "A maioria dos usuários prefere menus laterais" | Teste as duas versões com 3 usuários                   |
| "Eu acho que deveria ser azul"                  | "Vamos ver se os usuários conseguem encontrar o botão" |
| Debater opiniões por horas                      | Fazer um teste de 30 minutos                           |
| Citar pesquisas genéricas                       | Observar SEUS usuários com SEU app                     |

---

## 9. Boa Vontade do Usuário (Goodwill)

> _"Cada usuário chega ao seu site com um reservatório de boa vontade. Cada problema que ele encontra drena um pouco desse reservatório."_

### O Reservatório de Boa Vontade

```
[████████████████████] 100% — Usuário chega ao site
[████████████████░░░░]  80% — Encontrou o botão que queria após 2 tentativas
[████████████░░░░░░░░]  60% — Pop-up apareceu pedindo newsletter
[████████░░░░░░░░░░░░]  40% — Formulário longo para cadastro
[████░░░░░░░░░░░░░░░░]  20% — Erro sem mensagem clara
[░░░░░░░░░░░░░░░░░░░░]   0% — Usuário fecha a aba e não volta
```

### O que DRENA a boa vontade

| Ação                                                                  | Dano     |
| --------------------------------------------------------------------- | -------- |
| Esconder informação que o usuário quer (preço, taxa, telefone)        | 🔴 Alto  |
| Forçar formatação específica (telefone com parênteses, CEP com traço) | 🔴 Alto  |
| Pedir informações desnecessárias (data de nascimento para newsletter) | 🔴 Alto  |
| Texto de marketing disfarçado de conteúdo                             | 🟡 Médio |
| Site parecer amador / inacabado, com texto de debug visível           | 🔴 Alto  |
| Não informar sobre custos adicionais até o final do checkout          | 🔴 Alto  |
| Pop-ups repetitivos                                                   | 🟡 Médio |
| Página lenta                                                          | 🟡 Médio |
| Links quebrados                                                       | 🟡 Médio |
| Obrigar cadastro para ver conteúdo                                    | 🟡 Médio |
| Funcionalidades que parecem salvar mas não salvam                     | 🔴 Alto  |
| Forçar o usuário a começar de novo após um erro                       | 🔴 Alto  |

### O que AUMENTA a boa vontade

| Ação                                                   | Ganho    |
| ------------------------------------------------------ | -------- |
| Saber o que o usuário quer fazer e facilitar           | 🟢 Alto  |
| Ser transparente (preços, prazos, limitações)          | 🟢 Alto  |
| Economizar etapas do usuário onde possível             | 🟢 Alto  |
| Ter FaQ reais e atualizadas (não marketing disfarçado) | 🟢 Alto  |
| Facilitar recuperação de erros (desfazer, voltar)      | 🟢 Alto  |
| Pedir desculpas quando não puder atender               | 🟡 Médio |
| Página de impressão amigável                           | 🟡 Médio |
| Mostrar que houve esforço no design e conteúdo         | 🟢 Alto  |
| Funcionalidade de busca que realmente funciona         | 🟢 Alto  |
| Feedback claro após ações (salvar, enviar, deletar)    | 🟢 Alto  |

---

## 10. Acessibilidade

> _"A menos que você decida que pessoas com deficiências não fazem parte do seu público, você não pode dizer que seu site é usável a menos que seja acessível."_

### Teste Rápido de Acessibilidade (3 segundos)

1. Aumente o tamanho da fonte no navegador (Ctrl/Cmd + duas vezes)
2. A página continua funcional? O layout não quebra?
3. Se sim → passou no teste básico

### Checklist de Acessibilidade

#### Percepção

- [ ] Todas as imagens têm `alt` descritivo (ou `alt=""` se decorativas)
- [ ] Vídeos têm legendas/captions
- [ ] Cores não são o único meio de transmitir informação
- [ ] Contraste mínimo de 4.5:1 para texto normal, 3:1 para texto grande
- [ ] A página funciona com zoom de 200% sem perda de conteúdo

#### Operação

- [ ] Toda funcionalidade acessível via teclado (Tab, Enter, Escape)
- [ ] Ordem de tabulação faz sentido lógico
- [ ] Focus visível em todos os elementos interativos
- [ ] Skip link ("Pular para conteúdo principal") presente
- [ ] Nenhuma armadilha de teclado (focus trap acidental)
- [ ] Touch targets de pelo menos 44x44px em mobile

#### Compreensão

- [ ] Linguagem clara e simples
- [ ] Labels associados a inputs (`<label for="">` ou `aria-label`)
- [ ] Erros de formulário identificam o campo com problema
- [ ] Instruções não dependem apenas de localização visual ("clique no botão à esquerda")

#### Robustez

- [ ] HTML semântico (`<nav>`, `<main>`, `<header>`, `<footer>`, `<button>`)
- [ ] ARIA roles apenas quando HTML semântico não é suficiente
- [ ] Anúncio de mudanças dinâmicas (`aria-live`, route announcer para SPA)
- [ ] Funciona com leitores de tela (VoiceOver, NVDA)

### 4 Coisas Essenciais para Começar

Se você não pode fazer tudo, faça **pelo menos estas 4**:

1. **Adicione `alt` descritivo** em toda imagem significativa
2. **Use headings corretamente** (`h1` > `h2` > `h3`, sem pular níveis)
3. **Garanta que formulários funcionem com teclado** (Tab entre campos, Enter para enviar)
4. **Aumente o tamanho da fonte** — se o layout quebra, corrija-o

---

## 11. Checklist de Análise Rápida

Use este checklist para analisar qualquer app em **30 minutos**:

### Primeira Impressão (2 minutos)

- [ ] Em 5 segundos consigo entender o que o app faz?
- [ ] Sei por onde começar?
- [ ] A hierarquia visual guia meu olhar?
- [ ] Parece profissional e confiável?

### Navegação (5 minutos)

- [ ] Sei onde estou a qualquer momento?
- [ ] Consigo voltar ao início com 1 clique?
- [ ] A navegação é consistente em todas as páginas?
- [ ] Os rótulos são claros e auto-explicativos?
- [ ] O mesmo conceito tem o **mesmo nome** em todo lugar?
- [ ] Breadcrumbs estão presentes (em apps com profundidade)?
- [ ] Há busca global acessível?
- [ ] O botão Voltar funciona previsivelmente?

### Conteúdo (5 minutos)

- [ ] Existe "papo bobo" que pode ser eliminado?
- [ ] As instruções são mínimas (ou inexistentes)?
- [ ] Os textos estão formatados para scanning (headings, listas, bold)?
- [ ] Toda página tem um `<h1>` claro?
- [ ] Zero texto de debug, placeholder ou lorem ipsum em produção?

### Formulários (5 minutos)

- [ ] Labels claros em todos os campos?
- [ ] Validação inline (não apenas após submit)?
- [ ] Mensagens de erro específicas e na posição do campo?
- [ ] Campos obrigatórios claramente marcados?
- [ ] Salvar realmente salva (feedback + persistência)?
- [ ] Não pede informação desnecessária?

### Mobile (5 minutos)

- [ ] Touch targets de pelo menos 44x44px?
- [ ] Sem scroll horizontal indesejado?
- [ ] Navegação inferior com no máximo 5 itens?
- [ ] Funciona em orientação portrait e landscape?
- [ ] Teclado virtual não sobrepõe campos?
- [ ] Pull-to-refresh funciona (se aplicável)?

### Acessibilidade (5 minutos)

- [ ] Zoom 200% não quebra o layout?
- [ ] Tab navigation funciona logicamente?
- [ ] Focus ring visível em elementos interativos?
- [ ] Alt text em todas as imagens?
- [ ] Contraste suficiente para texto?

### Boa Vontade (3 minutos)

- [ ] As 3 tarefas principais são fáceis de completar?
- [ ] Informações importantes não estão escondidas?
- [ ] Erros são recuperáveis sem perder dados?
- [ ] Nenhuma ação destrutiva sem confirmação?
- [ ] Feedback visual após toda ação importante?

---

## 12. Anti-Padrões Comuns

Problemas frequentes que violam os princípios de Krug:

### Interface

| Anti-Padrão                             | Violação             | Solução                                         |
| --------------------------------------- | -------------------- | ----------------------------------------------- |
| Tudo com o mesmo peso visual            | Hierarquia visual    | Destacar o mais importante, reduzir o resto     |
| Jargão interno como label               | "Não me faça pensar" | Usar linguagem do usuário, não do desenvolvedor |
| Nomenclatura inconsistente              | Consistência         | Mesmo conceito = mesmo nome em todo o app       |
| Texto de debug em produção              | Boa vontade          | Remover antes do deploy                         |
| Instruções longas para usar uma feature | Simplicidade         | Redesenhar para ser auto-explicativo            |
| Modal sobre modal                       | Complexidade         | Simplificar o fluxo                             |
| Menu com itens duplicados               | Ruído                | Eliminar duplicações                            |
| Botão que não parece botão              | Affordance           | Usar visual de botão padrão                     |

### Formulários

| Anti-Padrão                           | Violação             | Solução                                |
| ------------------------------------- | -------------------- | -------------------------------------- |
| Validação só após submit              | Feedback             | Validação inline em tempo real         |
| Erro genérico ("Formulário inválido") | Clareza              | Indicar qual campo e qual o problema   |
| Pedir dados que não vai usar          | Boa vontade          | Remover campos desnecessários          |
| Salvar sem realmente persistir        | Confiança            | Conectar ao backend ou remover o botão |
| Perder dados ao navegar para trás     | Boa vontade          | Auto-save ou confirmação antes de sair |
| Forçar formato específico (###-####)  | Boa vontade          | Aceitar qualquer formato e normalizar  |
| Forçar escolha sem explicação         | "Não me faça pensar" | Adicionar tooltips ou descrições       |

### Navegação

| Anti-Padrão                                            | Violação      | Solução                          |
| ------------------------------------------------------ | ------------- | -------------------------------- |
| Sem indicação de página atual                          | "Onde estou?" | Destacar item ativo no menu      |
| Logo não leva ao Home                                  | Convenção     | Tornar logo clicável para home   |
| Full page reload em SPA                                | Performance   | Usar client-side routing         |
| Sem busca em app com muitas páginas                    | Busca         | Adicionar busca global           |
| Nav com rótulos diferentes por perfil na mesma posição | Consistência  | Manter posição e rótulo estáveis |
| Sem breadcrumbs em hierarquias profundas               | Localização   | Adicionar breadcrumbs            |
| Página sem `<h1>`                                      | Contexto      | Toda página deve ter um título   |

### Mobile

| Anti-Padrão                              | Violação       | Solução                         |
| ---------------------------------------- | -------------- | ------------------------------- |
| Botões pequenos demais (<44px)           | Touch targets  | Mínimo 44x44px                  |
| Muitos botões apertados na mesma linha   | Touch accuracy | Espaçar ou agrupar em menu      |
| Desabilitar pull-to-refresh              | Convenção      | Manter comportamento padrão     |
| Desktop nav idêntica no mobile           | Responsividade | Adaptar para thumb-zone         |
| Pop-up/modal difícil de fechar no mobile | Acessibilidade | Botão X grande + gesto de swipe |

---

## Citações-Chave para Referência Rápida

> "Não me importo quantas vezes tenho de clicar, desde que cada clique seja uma escolha fácil e sem necessidade de reflexão."

> "Livre-se de metade das palavras em cada página e então livre-se da metade do que sobrou."

> "O fato #1 sobre instruções é que ninguém irá lê-las."

> "Se algo requer uma grande quantidade de raciocínio, ou parece um enigma, isso simplesmente precisa ser corrigido."

> "A maioria das pessoas gastará muito menos tempo examinando as páginas que projetamos do que gostaríamos de pensar."

> "Não escolhemos a melhor opção — escolhemos a primeira opção razoável."

> "A navegação não é apenas uma característica de um Web site. Ela É o Web site."

> "Feita corretamente, a navegação deve ter todas as instruções que você precisa."

> "Todos os usuários Web são únicos e todo o uso da Web é basicamente idiossincrático."

> "A menos que você decida que pessoas com deficiências não fazem parte do seu público, você não pode dizer que seu site é usável a menos que seja acessível."

> "Cada usuário chega ao seu site com um reservatório de boa vontade. Cada problema drena esse reservatório."

---

_Documento gerado a partir do livro "Não Me Faça Pensar" (Don't Make Me Think) — 2ª Edição, de Steve Krug. Para uso como referência interna de análise de usabilidade._
