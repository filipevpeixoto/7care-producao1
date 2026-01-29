# ADR-005: Padrão de Gamificação

**Status:** Aceito  
**Data:** 2026-01-28  
**Decisores:** Equipe de Desenvolvimento

## Contexto

O 7Care deseja incentivar engajamento dos membros através de gamificação. Membros devem ser recompensados por:

- Participação em cultos
- Realização de tarefas
- Participação em grupos
- Atingimento de metas

O sistema precisa ser justo, transparente e motivador.

## Decisão

Implementamos um **sistema de pontos e níveis** com as seguintes características:

### Estrutura de Pontos

```typescript
// Ações e pontos
{
  ATTENDANCE: 10,      // Presença em culto
  TASK_COMPLETE: 5,    // Tarefa concluída
  GROUP_PARTICIPATION: 3, // Participação em grupo
  PRAYER_ANSWERED: 2,  // Oração respondida
  FIRST_ATTENDANCE_WEEK: 15, // Bônus primeira presença da semana
}
```

### Níveis

| Nível | Nome         | Pontos Necessários |
| ----- | ------------ | ------------------ |
| 1     | Iniciante    | 0                  |
| 2     | Participante | 50                 |
| 3     | Engajado     | 150                |
| 4     | Dedicado     | 350                |
| 5     | Fiel         | 700                |
| 6     | Líder        | 1200               |
| 7     | Mestre       | 2000               |

### Cálculo de Pontos

```typescript
// client/src/lib/pointsCalculator.ts
calculatePoints(activities: Activity[]): number
calculateLevel(points: number): Level
calculateProgress(points: number): { current: number, next: number, percentage: number }
```

### Armazenamento

- Pontos totais no perfil do usuário
- Log de atividades para auditoria
- Recálculo possível a partir do log

## Alternativas Consideradas

### Badges/Achievements apenas

- **Prós:** Simples, visual
- **Contras:** Menos granular, difícil comparar

### Leaderboard público

- **Prós:** Competição saudável
- **Contras:** Pode desmotivar novatos, privacidade

### Pontos por tempo (streak)

- **Prós:** Incentiva consistência
- **Contras:** Penaliza ausências justificadas

## Consequências

### Positivas

- Engajamento mensurável
- Feedback imediato para usuário
- Progressão clara e motivadora
- Fácil de estender com novas ações

### Negativas

- Pode incentivar "jogar o sistema"
- Requer balanceamento contínuo
- Pode criar competição não saudável

### Mitigações

- Pontos não são públicos por padrão
- Caps diários para evitar spam
- Revisão periódica de balanceamento
- Foco em progresso pessoal, não ranking

## Referências

- [client/src/lib/pointsCalculator.ts](../../client/src/lib/pointsCalculator.ts)
- [client/src/lib/gamification.ts](../../client/src/lib/gamification.ts)
- Testes: [pointsCalculator.test.ts](../../client/src/lib/pointsCalculator.test.ts)
