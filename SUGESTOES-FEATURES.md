# 7Care — Sugestões de Novas Features

> Documento de avaliação. Propósitos do app: desenvolvimento da fé e espiritualidade, gestão de pessoas, relacionamento com Deus e com o próximo, pastores cuidando de pessoas e pessoas cuidando de pessoas, acompanhamento de interessados, ferramenta de pastoreio.

---

## 1. Agente IA de Pastoreio ("Pastor Digital")

**Prioridade:** Alta

**Como funciona:** Um chatbot inteligente dentro do app que o pastor ou missionário conversa como se fosse um assistente. Ele tem acesso a todos os dados do distrito — membros, check-ins emocionais, visitas, presença, pedidos de oração, funil de interessados. O pastor abre o chat e pergunta coisas como "quem precisa de atenção esta semana?" ou "como está o engajamento da igreja Vila Argeni?". O agente cruza os dados e responde com insights acionáveis. Além de responder perguntas, ele envia alertas proativos: toda segunda-feira, o pastor recebe um resumo "3 membros com score emocional em queda, 2 interessados parados no passo 3 há 1 mês, 5 aniversários esta semana".

**Como ajuda:** Hoje o pastor precisa olhar cada membro manualmente para saber quem precisa de cuidado. Com centenas de pessoas, é impossível não esquecer alguém. O agente age como uma "memória pastoral" — ninguém fica invisível. O missionário com 10 interessados recebe sugestões de qual abordar primeiro e o que falar. O resultado é que cada pessoa se sente mais cuidada, mesmo quando o pastor tem muitas responsabilidades.

**Implementação resumida:**
- Endpoint `/api/ai/chat` usando OpenAI/Anthropic com contexto do banco (RAG sobre dados do distrito)
- Widget de chat flutuante no app
- Job semanal para gerar resumo pastoral automatizado
- Tabelas: `ai_conversations`, `ai_messages`, `pastoral_alerts`

---

## 2. Plano de Discipulado Personalizado

**Prioridade:** Alta

**Como funciona:** Quando um missionário começa a acompanhar um interessado, o sistema gera automaticamente um plano de estudos e acompanhamento baseado no perfil da pessoa. Se é alguém que já tem conhecimento bíblico (ex-adventista), o plano pula os fundamentos. Se é alguém sem religião anterior, começa pelos básicos com mais tempo. Cada passo tem conteúdos sugeridos (vídeos, textos, perguntas para conversa), um prazo estimado e checkpoints. O missionário marca cada etapa como concluída e o sistema ajusta o ritmo — se a pessoa está avançando rápido, acelera; se está com dificuldade num tema, sugere material complementar.

**Como ajuda:** Muitos missionários são voluntários sem formação teológica. Eles querem ajudar mas não sabem por onde começar com cada pessoa. O plano personalizado dá um roteiro claro. O interessado recebe atenção adequada ao seu momento — não é tratado como "mais um" num processo genérico. Isso aumenta a taxa de pessoas que realmente chegam ao batismo porque o acompanhamento é relevante e não abandona ninguém no meio do caminho.

**Implementação resumida:**
- Tabelas: `discipleship_plans`, `plan_steps`, `plan_progress`, `plan_content`
- IA gera plano baseado no perfil do interessado (religião anterior, idade, situação)
- Interface de timeline para o missionário acompanhar
- Notificações automáticas de lembrete para próximos passos

---

## 3. Devocional Diário com IA

**Prioridade:** Média

**Como funciona:** Todo dia, ao abrir o app, o membro encontra um devocional feito sob medida. Se ele registrou um pedido de oração sobre ansiedade, o devocional traz um texto sobre paz e confiança em Deus. Se está na fase 4 do discipulado (Convidar), recebe uma reflexão sobre coragem para compartilhar a fé. O devocional inclui: versículo, reflexão curta (2-3 parágrafos), uma pergunta para meditação e uma oração sugerida. O membro pode marcar como lido, salvar nos favoritos e compartilhar com seu grupo. A cada 7 dias consecutivos de leitura, ganha pontos no sistema de gamificação.

**Como ajuda:** A maioria dos membros quer ter uma vida devocional regular mas não sabe por onde começar ou esquece. Um devocional que aparece no app que já usam todo dia, que fala diretamente com o que estão vivendo, remove a barreira. Não é genérico — é pessoal. Isso constrói o hábito de conexão diária com Deus e dá ao membro a sensação de que o app realmente se importa com sua vida espiritual, não só com gestão.

**Implementação resumida:**
- Página `/devotional` com card diário
- IA gera devocional baseado em: check-ins recentes, pedidos de oração, fase do discipulado
- Tabelas: `devotionals`, `devotional_reads`, `devotional_favorites`
- Integração com sistema de pontos (streak de leitura)

---

## 4. Grupos Pequenos / Células

**Prioridade:** Alta

**Como funciona:** O pastor ou líder cria um grupo com nome, líder responsável, dia/horário de encontro e local. Membros são adicionados e o grupo aparece na tela de cada participante. O líder do grupo tem um mini-dashboard: lista de membros, presença de cada encontro (marca com um toque), histórico de frequência, e pode enviar mensagens para o grupo inteiro. Interessados novos podem ser sugeridos automaticamente para o grupo mais próximo da sua casa ou mais adequado ao seu perfil (idade, interesse). O sistema gera relatório para o pastor mostrando quais grupos estão crescendo, quais estão diminuindo e quais membros não estão em nenhum grupo.

**Como ajuda:** Grupos pequenos são onde o cuidado real acontece — é onde as pessoas criam vínculos, oram umas pelas outras e crescem juntas. Sem essa feature, o app gerencia pessoas individualmente mas não facilita a comunidade. Com grupos, o membro se sente pertencente ("eu faço parte do grupo da Rua XV, todo sábado à tarde"). O pastor consegue ver se alguém está isolado e não pertence a nenhum grupo — que é o maior fator de evasão da igreja.

**Implementação resumida:**
- Tabelas: `small_groups`, `group_members`, `group_meetings`, `group_attendance`
- Página `/groups` para membros e `/groups/manage` para líderes
- Dashboard do líder com presença e tendências
- IA sugere matching de novos membros para grupos

---

## 5. Mapa de Cuidado Pastoral

**Prioridade:** Normal

**Como funciona:** Uma tela com um mapa da cidade/região mostrando pins coloridos onde cada membro/interessado mora (usando o endereço já cadastrado). Pins verdes = membros ativos, amarelos = ausentes há 2+ semanas, vermelhos = ausentes há 1+ mês, azuis = interessados. Ao clicar num pin, aparece o resumo da pessoa. O pastor pode filtrar por status, grupo, ou situação. Há também uma visão de "rede de relacionamentos" — um grafo mostrando quem discipula quem, quais membros estão conectados entre si. Membros sem nenhuma conexão (sem grupo, sem missionário, sem visita recente) aparecem destacados como "isolados".

**Como ajuda:** O pastor ganha uma visão geográfica que antes só existia na cabeça dele. Vê que tem 5 interessados no bairro X e nenhum missionário por perto — pode designar alguém. Vê que 3 membros do mesmo quarteirão estão afastados — pode pedir a um vizinho que os visite. A visão de rede mostra claramente quem está desconectado e em risco de abandonar a igreja. É a diferença entre reagir quando alguém já saiu e prevenir antes que saia.

**Implementação resumida:**
- Biblioteca: Leaflet ou Google Maps (gratuito até limite)
- Geocodificação dos endereços já cadastrados
- Página `/care-map` com filtros por status/grupo/situação
- Visão de grafo com D3.js ou similar para rede de relacionamentos

---

## 6. Jornada de Crescimento Espiritual

**Prioridade:** Normal

**Como funciona:** Além dos pontos e níveis que já existem, o membro vê trilhas temáticas que pode percorrer: "Fundamentos da Fé" (12 semanas), "Vida de Oração" (8 semanas), "Servindo ao Próximo" (6 semanas). Cada trilha tem etapas com conteúdo curto (5 min de leitura), um desafio prático ("esta semana, ore por 3 pessoas que você encontrar") e uma auto-avaliação. A cada etapa concluída, o progresso visual avança (como a montanha que já existe). A cada 3 meses, o membro faz uma auto-avaliação de maturidade espiritual (10 perguntas tipo "quanto tempo dedico à oração semanalmente?") e vê sua evolução ao longo do tempo num gráfico.

**Como ajuda:** O sistema de gamificação atual mede atividades externas (presença, dízimo). As trilhas medem crescimento interno — a vida espiritual real. O membro deixa de se perguntar "como eu cresço?" e ganha um caminho claro. Os desafios práticos transformam conhecimento em ação. A auto-avaliação traz autoconsciência sem julgamento. O pastor vê quais trilhas são mais populares e onde os membros mais travam, podendo criar sermões e programas que atendam essas necessidades reais.

**Implementação resumida:**
- Tabelas: `spiritual_tracks`, `track_steps`, `track_progress`, `maturity_assessments`
- Página `/growth` com visualização de trilhas
- Integração com sistema de pontos existente
- Auto-avaliação periódica com gráfico de evolução

---

## 7. Central de Visitas Inteligente

**Prioridade:** Alta

**Como funciona:** Uma agenda dedicada a visitas pastorais. O sistema sugere automaticamente quem visitar baseado em critérios: score emocional baixo (check-in de 1 ou 2), ausência prolongada, pedido de oração recente, interessado parado no funil, membro novo sem visita de boas-vindas. Cada sugestão vem com prioridade e motivo. O pastor/missionário agenda a visita, e após realizá-la, preenche um formulário rápido: "como foi?", "como a pessoa está?", "próximos passos?", "precisa de acompanhamento?". Tudo fica no histórico daquela pessoa. Se o pastor tem 4 visitas no mesmo dia, o sistema sugere a ordem baseada na proximidade geográfica.

**Como ajuda:** Visitas são o coração do pastoreio, mas são desorganizadas — dependem da memória do pastor. Com a central, ninguém é esquecido. O missionário novo que não sabe quem visitar recebe orientação clara. O relatório pós-visita cria um histórico que qualquer líder pode consultar — se o pastor muda de distrito, o próximo tem todo o contexto. O membro se sente cuidado porque as visitas acontecem nos momentos certos, não meses depois do problema.

**Implementação resumida:**
- Tabelas: `visits`, `visit_reports`, `visit_suggestions`
- Página `/visits` com agenda e sugestões priorizadas
- Formulário pós-visita rápido (otimizado para mobile)
- Job de IA que gera sugestões semanais baseado nos dados do distrito
- Timeline de histórico por pessoa

---

## 8. Painel de Saúde da Igreja

**Prioridade:** Média

**Como funciona:** Um dashboard com indicadores-chave que o pastor vê ao abrir o app: taxa de retenção (% de membros ativos nos últimos 30/60/90 dias), funil de conversão (interessados → estudando → preparando → batizados, com taxa de cada etapa), tendência de engajamento (subindo/caindo comparado ao mês anterior), NPS espiritual (média dos check-ins emocionais como termômetro), e projeções: "no ritmo atual, o distrito terá X batismos até o fim do trimestre". Pode comparar igrejas do distrito entre si e ver quais estão em alta ou precisam de atenção.

**Como ajuda:** O pastor hoje toma decisões baseado em intuição. Com dados, ele vê que a igreja A tem 80% de retenção e a igreja B tem 45% — e investiga por quê. Vê que o funil trava no passo 3 (Cultivar) — e entende que precisa de mais missionários treinados nessa etapa. Vê que o NPS espiritual caiu em dezembro — e descobre que faltaram programas de acolhimento nas férias. São dados que já existem no banco mas hoje ninguém visualiza de forma útil. Transforma informação em decisão pastoral.

**Implementação resumida:**
- Página `/church-health` com gráficos (Recharts, já usado no app)
- Queries agregadas sobre dados existentes (nenhuma tabela nova necessária)
- Funil visual com taxas de conversão por etapa
- Comparativo entre igrejas do distrito
- Projeção simples com regressão linear sobre tendências

---

## 9. Comunicação Inteligente

**Prioridade:** Média

**Como funciona:** O pastor configura mensagens automáticas que disparam em momentos-chave: boas-vindas quando alguém é aprovado, parabéns no aniversário com versículo personalizado, lembrete 1 dia antes de um evento, mensagem de "sentimos sua falta" após 2 semanas sem presença. Além do automático, o pastor pode enviar mensagens segmentadas: "todos os interessados do passo 5", "membros com score emocional abaixo de 3", "líderes de grupo". Se quiser, escreve o que quer comunicar de forma simples ("quero convidar os jovens para o retiro") e a IA gera uma mensagem pastoral bem escrita. As mensagens vão como notificação push no app e opcionalmente via WhatsApp.

**Como ajuda:** O pastor passa horas por semana mandando mensagens manuais — parabéns, convites, lembretes. A automação cuida do repetitivo e libera tempo para o que importa: conversas profundas. O membro recebe comunicação no momento certo (não 3 dias depois do aniversário). A segmentação garante que cada pessoa recebe só o que é relevante para ela. A geração de texto por IA ajuda pastores que têm dificuldade em escrever — a mensagem sai profissional e calorosa.

**Implementação resumida:**
- Tabelas: `message_templates`, `message_automations`, `message_logs`
- Página `/communications` com editor de templates e regras de automação
- Segmentação por filtros (role, status, score emocional, passo do funil, grupo)
- IA gera texto a partir de intenção descrita em linguagem natural
- Integração com push notifications existentes + WhatsApp Business API (opcional)

---

## 10. Diário Espiritual do Membro

**Prioridade:** Normal

**Como funciona:** Um espaço 100% privado no app onde o membro registra sua vida espiritual. Tem 4 seções: **Pedidos de oração** (cria pedidos pessoais, marca como "respondido" quando Deus responde — cria uma lista de vitórias), **Diário de gratidão** (registro diário com prompts como "pelo que você é grato hoje?"), **Metas espirituais** ("ler Bíblia 15 min/dia" com tracker de progresso), e **Anotações** (notas livres conectadas a estudos ou sermões). Ninguém além do próprio membro vê esse conteúdo — nem o pastor, nem o admin. O sistema sugere prompts baseados na época do ano, no devocional do dia ou no momento do membro.

**Como ajuda:** Muitas pessoas querem crescer espiritualmente mas não têm o hábito de registrar e refletir. O diário digital é mais acessível que um caderno — está no celular que já usam todo dia. A lista de orações respondidas é poderosa: nos momentos de dúvida, o membro olha para trás e vê evidências concretas da ação de Deus. A privacidade total é crucial — se o membro sentir que alguém lê suas notas, nunca será honesto. É a feature que transforma o app de "ferramenta de gestão da igreja" para "companheiro pessoal de fé".

**Implementação resumida:**
- Tabelas: `prayer_journal` (privado), `gratitude_entries`, `spiritual_goals`, `spiritual_notes`
- Página `/journal` com 4 abas (orações, gratidão, metas, notas)
- Criptografia end-to-end opcional para máxima privacidade
- Prompts diários gerados por IA baseados no contexto do membro
- Integração com sistema de pontos (streak de gratidão diária)

---

## Resumo de Priorização

| Prioridade | Feature | Esforço Estimado |
|---|---|---|
| 🔴 Alta | 1. Agente IA de Pastoreio | 3-4 semanas |
| 🔴 Alta | 4. Grupos Pequenos / Células | 2-3 semanas |
| 🔴 Alta | 7. Central de Visitas Inteligente | 2-3 semanas |
| 🔴 Alta | 2. Plano de Discipulado Personalizado | 2-3 semanas |
| 🟡 Média | 8. Painel de Saúde da Igreja | 1-2 semanas |
| 🟡 Média | 9. Comunicação Inteligente | 2-3 semanas |
| 🟡 Média | 3. Devocional Diário com IA | 1-2 semanas |
| 🟢 Normal | 6. Jornada de Crescimento Espiritual | 2-3 semanas |
| 🟢 Normal | 10. Diário Espiritual do Membro | 1-2 semanas |
| 🟢 Normal | 5. Mapa de Cuidado Pastoral | 2-3 semanas |

---

*Gerado em 10/02/2026 — avaliar e priorizar conforme necessidade do distrito.*
