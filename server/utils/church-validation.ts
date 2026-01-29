/**
 * Utilitários para validação de igrejas
 * Algoritmo de similaridade de nomes
 */

import {
  SimilarChurch,
  ChurchValidationStatus,
  ValidationResult,
} from '../types/pastor-invite.types';

interface Church {
  id: number;
  name: string;
}

/**
 * Normaliza nome de igreja removendo prefixos comuns e acentos
 */
export function normalizeChurchName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\b(igreja|adventista|setimo|dia|iasd|congregacao|grupo)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similaridade entre duas strings usando distância de Levenshtein
 * Retorna valor entre 0 (completamente diferente) e 100 (idêntico)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Se são idênticas, retorna 100
  if (s1 === s2) return 100;

  // Calcular distância de Levenshtein
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  // Converter para porcentagem de similaridade
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Distância de Levenshtein (número de edições necessárias)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Encontra igrejas similares baseado no nome
 */
export function findSimilarChurches(
  excelName: string,
  registeredChurches: Church[],
  threshold: number = 60
): SimilarChurch[] {
  const normalizedExcelName = normalizeChurchName(excelName);

  return registeredChurches
    .map(church => ({
      id: church.id,
      name: church.name,
      similarity: calculateSimilarity(normalizedExcelName, normalizeChurchName(church.name)),
    }))
    .filter(c => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 sugestões
}

/**
 * Valida uma lista de nomes de igrejas do Excel contra igrejas registradas
 */
export function validateExcelChurches(
  excelChurchNames: string[],
  registeredChurches: Church[],
  memberCountByChurch: Record<string, number>
): ValidationResult[] {
  return excelChurchNames.map(excelChurchName => {
    // Busca exata (case-insensitive e normalizada)
    const exactMatch = registeredChurches.find(
      c => normalizeChurchName(c.name) === normalizeChurchName(excelChurchName)
    );

    if (exactMatch) {
      return {
        churchName: excelChurchName,
        status: 'exact_match' as ChurchValidationStatus,
        matchedChurchId: exactMatch.id,
        memberCount: memberCountByChurch[excelChurchName] || 0,
      };
    }

    // Busca por similaridade
    const similar = findSimilarChurches(excelChurchName, registeredChurches);

    if (similar.length > 0) {
      return {
        churchName: excelChurchName,
        status: 'similar_found' as ChurchValidationStatus,
        suggestions: similar,
        memberCount: memberCountByChurch[excelChurchName] || 0,
      };
    }

    // Não encontrada
    return {
      churchName: excelChurchName,
      status: 'not_found' as ChurchValidationStatus,
      memberCount: memberCountByChurch[excelChurchName] || 0,
    };
  });
}

/**
 * Extrai lista única de igrejas e conta membros por igreja
 */
export function extractChurchesFromExcel(excelData: Array<{ igreja: string }>): {
  churches: string[];
  memberCount: Record<string, number>;
} {
  const memberCount: Record<string, number> = {};

  excelData.forEach(row => {
    if (row.igreja) {
      memberCount[row.igreja] = (memberCount[row.igreja] || 0) + 1;
    }
  });

  return {
    churches: Object.keys(memberCount),
    memberCount,
  };
}
