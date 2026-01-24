module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipo é obrigatório
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação, ponto-e-vírgula, etc
        'refactor', // Refatoração de código
        'perf',     // Melhorias de performance
        'test',     // Adição/correção de testes
        'build',    // Build system ou dependências
        'ci',       // CI/CD
        'chore',    // Tarefas de manutenção
        'revert',   // Reverter commit anterior
        'wip',      // Work in progress
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    
    // Escopo é opcional
    'scope-case': [2, 'always', 'lower-case'],
    
    // Subject (descrição curta)
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    
    // Header (type + scope + subject)
    'header-max-length': [2, 'always', 100],
    
    // Body (descrição longa)
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Footer
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
  /*
   * Exemplos de commits válidos:
   * 
   * feat: adiciona sistema de gamificação
   * fix(auth): corrige validação de jwt
   * docs: atualiza readme com instruções de deploy
   * style: formata código com prettier
   * refactor(api): extrai lógica para service
   * perf: otimiza queries de listagem
   * test: adiciona testes para useAuth
   * build: atualiza dependências
   * ci: adiciona job de security audit
   * chore: limpa arquivos temporários
   * 
   * Com escopo:
   * feat(gamification): implementa sistema de badges
   * fix(dashboard): corrige exibição de estatísticas
   * 
   * Com breaking change:
   * feat(api)!: altera estrutura de resposta de autenticação
   * 
   * BREAKING CHANGE: o campo 'token' foi renomeado para 'accessToken'
   */
};
