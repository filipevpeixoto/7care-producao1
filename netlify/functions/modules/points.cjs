/**
 * Módulo de Cálculo de Pontos
 * Centraliza toda lógica de pontuação do sistema 7 Cuidados
 */

/**
 * Configuração padrão de pontos (pode ser sobrescrita por distrito)
 */
const DEFAULT_POINTS_CONFIG = {
  // Etapas do funil
  etapa1: 10,  // Orar por...
  etapa2: 10,  // Cuidar de...
  etapa3: 15,  // Cultivar com...
  etapa4: 15,  // Convidar
  etapa5: 20,  // Apresentar
  etapa6: 20,  // Preparar para batismo
  etapa7: 25,  // Batismo
  
  // Estudos bíblicos
  biblicalStudies: 15,
  
  // Encontros e eventos
  checkIn: 5,
  eventParticipation: 10,
  
  // Bônus
  consecutiveWeeks: 5,  // Por semana consecutiva
  monthlyBonus: 50      // Completar todas atividades do mês
};

/**
 * Calcula pontos para um usuário baseado em seus campos booleanos
 * @param {Object} user - Dados do usuário
 * @param {Object} config - Configuração de pontos (opcional)
 * @returns {number} Total de pontos
 */
function calculateUserPoints(user, config = DEFAULT_POINTS_CONFIG) {
  let totalPoints = 0;
  
  // Etapa 1 - Orar por
  if (user.step1_orar_por_1) totalPoints += config.etapa1;
  if (user.step1_orar_por_2) totalPoints += config.etapa1;
  if (user.step1_orar_por_3) totalPoints += config.etapa1;
  
  // Etapa 2 - Cuidar de
  if (user.step2_cuidar_de_1) totalPoints += config.etapa2;
  if (user.step2_cuidar_de_2) totalPoints += config.etapa2;
  if (user.step2_cuidar_de_3) totalPoints += config.etapa2;
  
  // Etapa 3 - Cultivar com
  if (user.step3_cultivar_1) totalPoints += config.etapa3;
  if (user.step3_cultivar_2) totalPoints += config.etapa3;
  if (user.step3_cultivar_3) totalPoints += config.etapa3;
  
  // Etapa 4 - Convidar
  if (user.step4_convidar_1) totalPoints += config.etapa4;
  if (user.step4_convidar_2) totalPoints += config.etapa4;
  if (user.step4_convidar_3) totalPoints += config.etapa4;
  
  // Etapa 5 - Apresentar (estudos bíblicos)
  if (user.step5_apresentar_1) totalPoints += config.etapa5;
  if (user.step5_apresentar_2) totalPoints += config.etapa5;
  if (user.step5_apresentar_3) totalPoints += config.etapa5;
  
  // Etapa 6 - Preparar para batismo
  if (user.step6_preparar_1) totalPoints += config.etapa6;
  if (user.step6_preparar_2) totalPoints += config.etapa6;
  if (user.step6_preparar_3) totalPoints += config.etapa6;
  
  // Etapa 7 - Batismo
  if (user.step7_batismo_1) totalPoints += config.etapa7;
  if (user.step7_batismo_2) totalPoints += config.etapa7;
  if (user.step7_batismo_3) totalPoints += config.etapa7;
  
  // Estudos bíblicos adicionais
  const biblicalStudiesCount = user.estudos_biblicos_count || 0;
  totalPoints += biblicalStudiesCount * (config.biblicalStudies || 15);
  
  return totalPoints;
}

/**
 * Calcula etapas completas de cada nível
 * @param {Object} user - Dados do usuário
 * @returns {Object} Contagem por etapa
 */
function calculateStepProgress(user) {
  return {
    step1: [user.step1_orar_por_1, user.step1_orar_por_2, user.step1_orar_por_3].filter(Boolean).length,
    step2: [user.step2_cuidar_de_1, user.step2_cuidar_de_2, user.step2_cuidar_de_3].filter(Boolean).length,
    step3: [user.step3_cultivar_1, user.step3_cultivar_2, user.step3_cultivar_3].filter(Boolean).length,
    step4: [user.step4_convidar_1, user.step4_convidar_2, user.step4_convidar_3].filter(Boolean).length,
    step5: [user.step5_apresentar_1, user.step5_apresentar_2, user.step5_apresentar_3].filter(Boolean).length,
    step6: [user.step6_preparar_1, user.step6_preparar_2, user.step6_preparar_3].filter(Boolean).length,
    step7: [user.step7_batismo_1, user.step7_batismo_2, user.step7_batismo_3].filter(Boolean).length
  };
}

/**
 * Calcula nível do usuário baseado nos pontos
 * @param {number} points - Total de pontos
 * @returns {Object} Informações do nível
 */
function calculateLevel(points) {
  const levels = [
    { level: 1, name: 'Semente', minPoints: 0, maxPoints: 49, icon: '🌱' },
    { level: 2, name: 'Broto', minPoints: 50, maxPoints: 149, icon: '🌿' },
    { level: 3, name: 'Planta', minPoints: 150, maxPoints: 299, icon: '🌳' },
    { level: 4, name: 'Flor', minPoints: 300, maxPoints: 499, icon: '🌻' },
    { level: 5, name: 'Fruto', minPoints: 500, maxPoints: 749, icon: '🍎' },
    { level: 6, name: 'Colheita', minPoints: 750, maxPoints: 999, icon: '🌾' },
    { level: 7, name: 'Pescador', minPoints: 1000, maxPoints: Infinity, icon: '🎣' }
  ];
  
  const currentLevel = levels.find(l => points >= l.minPoints && points <= l.maxPoints) || levels[0];
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  
  return {
    ...currentLevel,
    points,
    nextLevel: nextLevel ? {
      ...nextLevel,
      pointsNeeded: nextLevel.minPoints - points
    } : null,
    progressPercent: nextLevel 
      ? Math.round(((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100)
      : 100
  };
}

/**
 * Calcula estatísticas de um grupo de usuários
 * @param {Array} users - Lista de usuários
 * @param {Object} config - Configuração de pontos (opcional)
 * @returns {Object} Estatísticas agregadas
 */
function calculateGroupStats(users, config = DEFAULT_POINTS_CONFIG) {
  if (!users || users.length === 0) {
    return {
      totalMembers: 0,
      totalPoints: 0,
      averagePoints: 0,
      stepProgress: { step1: 0, step2: 0, step3: 0, step4: 0, step5: 0, step6: 0, step7: 0 },
      levelDistribution: {},
      topPerformers: [],
      participationRate: 0
    };
  }
  
  let totalPoints = 0;
  const stepTotals = { step1: 0, step2: 0, step3: 0, step4: 0, step5: 0, step6: 0, step7: 0 };
  const levelCounts = {};
  const userPoints = [];
  let activeUsers = 0;
  
  for (const user of users) {
    const points = user.points || calculateUserPoints(user, config);
    totalPoints += points;
    userPoints.push({ id: user.id, name: user.name, points });
    
    if (points > 0) activeUsers++;
    
    const progress = calculateStepProgress(user);
    for (const step of Object.keys(progress)) {
      stepTotals[step] += progress[step];
    }
    
    const level = calculateLevel(points);
    levelCounts[level.name] = (levelCounts[level.name] || 0) + 1;
  }
  
  // Top 5 performers
  userPoints.sort((a, b) => b.points - a.points);
  const topPerformers = userPoints.slice(0, 5);
  
  return {
    totalMembers: users.length,
    totalPoints,
    averagePoints: Math.round(totalPoints / users.length),
    stepProgress: Object.fromEntries(
      Object.entries(stepTotals).map(([k, v]) => [k, Math.round((v / (users.length * 3)) * 100)])
    ),
    levelDistribution: levelCounts,
    topPerformers,
    participationRate: Math.round((activeUsers / users.length) * 100)
  };
}

/**
 * Calcula ranking de uma igreja
 * @param {Array} users - Lista de usuários da igreja
 * @returns {Array} Ranking ordenado por pontos
 */
function calculateChurchRanking(users) {
  return users
    .map(user => ({
      id: user.id,
      name: user.name,
      points: user.points || calculateUserPoints(user),
      level: calculateLevel(user.points || calculateUserPoints(user))
    }))
    .sort((a, b) => b.points - a.points)
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }));
}

/**
 * Calcula ranking de igrejas em um distrito
 * @param {Array} churches - Lista de igrejas com seus usuários
 * @returns {Array} Ranking de igrejas
 */
function calculateDistrictChurchRanking(churches) {
  return churches
    .map(church => {
      const stats = calculateGroupStats(church.users || []);
      return {
        id: church.id,
        name: church.name,
        totalPoints: stats.totalPoints,
        averagePoints: stats.averagePoints,
        memberCount: stats.totalMembers,
        participationRate: stats.participationRate
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((church, index) => ({
      ...church,
      rank: index + 1
    }));
}

/**
 * Gera relatório de progresso semanal
 * @param {Object} currentWeek - Dados da semana atual
 * @param {Object} previousWeek - Dados da semana anterior
 * @returns {Object} Relatório comparativo
 */
function generateWeeklyReport(currentWeek, previousWeek = null) {
  const current = calculateGroupStats(currentWeek.users || []);
  const previous = previousWeek ? calculateGroupStats(previousWeek.users || []) : null;
  
  return {
    week: currentWeek.weekNumber || 1,
    date: currentWeek.date || new Date().toISOString(),
    current,
    comparison: previous ? {
      pointsChange: current.totalPoints - previous.totalPoints,
      pointsChangePercent: previous.totalPoints > 0 
        ? Math.round(((current.totalPoints - previous.totalPoints) / previous.totalPoints) * 100)
        : 0,
      membersChange: current.totalMembers - previous.totalMembers,
      participationChange: current.participationRate - previous.participationRate
    } : null,
    highlights: generateHighlights(currentWeek.users || [], previousWeek?.users || [])
  };
}

/**
 * Gera destaques de performance
 * @param {Array} currentUsers - Usuários semana atual
 * @param {Array} previousUsers - Usuários semana anterior
 * @returns {Object} Destaques
 */
function generateHighlights(currentUsers, previousUsers) {
  const highlights = {
    topGainer: null,
    newCompletions: [],
    streaks: []
  };
  
  // Encontra quem mais ganhou pontos
  let maxGain = 0;
  for (const current of currentUsers) {
    const previous = previousUsers.find(u => u.id === current.id);
    const currentPoints = current.points || calculateUserPoints(current);
    const previousPoints = previous ? (previous.points || calculateUserPoints(previous)) : 0;
    const gain = currentPoints - previousPoints;
    
    if (gain > maxGain) {
      maxGain = gain;
      highlights.topGainer = {
        id: current.id,
        name: current.name,
        pointsGained: gain
      };
    }
    
    // Verifica novas etapas completadas
    if (previous) {
      const currentProgress = calculateStepProgress(current);
      const previousProgress = calculateStepProgress(previous);
      
      for (const step of Object.keys(currentProgress)) {
        if (currentProgress[step] > previousProgress[step]) {
          highlights.newCompletions.push({
            userId: current.id,
            userName: current.name,
            step,
            count: currentProgress[step] - previousProgress[step]
          });
        }
      }
    }
  }
  
  return highlights;
}

module.exports = {
  DEFAULT_POINTS_CONFIG,
  calculateUserPoints,
  calculateStepProgress,
  calculateLevel,
  calculateGroupStats,
  calculateChurchRanking,
  calculateDistrictChurchRanking,
  generateWeeklyReport,
  generateHighlights
};
