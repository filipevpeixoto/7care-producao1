/**
 * Import Helpers Module
 * Funções de parsing e detecção de colunas compartilhadas
 * Mesmo padrão usado no Gestão de Dados (Settings.tsx)
 */

// =============================================================================
// FUNÇÕES DE PARSING (Copiadas exatamente do Gestão de Dados - Settings.tsx)
// =============================================================================

/**
 * Parse número de qualquer tipo de entrada
 */
export const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Parse data em múltiplos formatos
 * Suporta: Excel serial dates, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY, etc.
 */
export const parseDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  try {
    // Limpa a string (remove espaços, aspas)
    const dateStr = String(dateValue).trim().replace(/['"]/g, '');

    // 1. Detecção de Números do Excel (serial dates) - tipo number
    if (typeof dateValue === 'number') {
      // Excel armazena datas como número de dias desde 1/1/1900
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2; // Excel tem bug do ano bissexto 1900
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);

      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    // 1b. Detecção de serial dates como string numérica (ex: "34195", "41089")
    // Serial dates do Excel geralmente estão entre 1 (01/01/1900) e 60000+ (anos 2060+)
    if (/^\d{4,6}$/.test(dateStr)) {
      const serialNum = parseInt(dateStr, 10);
      // Validar faixa razoável: 1 a 60000 (1900 a ~2064)
      if (serialNum >= 1 && serialNum <= 60000) {
        const excelEpoch = new Date(1900, 0, 1);
        const daysSinceEpoch = serialNum - 2;
        const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);

        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
          return date;
        }
      }
    }

    // 2. Formato DD/MM/YYYY (formato brasileiro padrão)
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        let parsedYear = parseInt(year);

        // Se o ano tem 2 dígitos, converte para 4 dígitos
        if (parsedYear < 100) {
          parsedYear += parsedYear < 50 ? 2000 : 1900;
        }

        // Validação de dados
        if (
          parsedDay >= 1 &&
          parsedDay <= 31 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedYear >= 1900 &&
          parsedYear <= 2100
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            return date;
          }
        }
      }
    }

    // 3. Formato DD-MM-YYYY
    if (dateStr.includes('-') && dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = dateStr.split('-');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 4. Formato YYYY-MM-DD (formato ISO)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    // 5. Formato YYYY/MM/DD (formato alternativo)
    if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      const parts = dateStr.split('/');
      const [year, month, day] = parts;
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedDay = parseInt(day);

      if (
        parsedYear >= 1900 &&
        parsedYear <= 2100 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedDay >= 1 &&
        parsedDay <= 31
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 6. Formato DD.MM.YYYY
    if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 7. Formato DD.MM.YY
    if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      let parsedYear = parseInt(year);

      parsedYear += parsedYear < 50 ? 2000 : 1900;

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 8. Intervalos com ano (ex: "15/01-20/02/2024") - usa a primeira data
    if (dateStr.includes('-') && dateStr.includes('/')) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}\/(\d{4})$/);
      if (match) {
        const firstDate = `${match[1]}/${match[2]}`;
        return parseDate(firstDate);
      }
    }

    // 9. Intervalos sem ano (ex: "24/07-03/08") - usa ano atual
    if (dateStr.includes('-') && dateStr.includes('/') && !dateStr.match(/\d{4}/)) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}$/);
      if (match) {
        const currentYear = new Date().getFullYear();
        const firstDate = `${match[1]}/${currentYear}`;
        return parseDate(firstDate);
      }
    }

    // 10. Data sem ano (ex: "03/12") - usa ano atual
    if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${dateStr}/${currentYear}`;
      return parseDate(dateWithYear);
    }

    // 11. Fallback: tenta o construtor padrão do JavaScript
    const date = new Date(dateValue as string | number | Date);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
      return date;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Converte Date para string ISO (YYYY-MM-DD)
 */
export const formatDateToISO = (date: Date | null): string | undefined => {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse campo booleano (Sim/Não, True/False, 1/0)
 */
export const parseBooleanField = (value: unknown): boolean => {
  if (!value) return false;
  const str = String(value).toLowerCase();
  return str === 'sim' || str === 'true' || str === '1' || str === 'yes' || str === 's';
};

/**
 * Parse campo dizimista com tipo
 */
export const parseDizimistaField = (
  value: unknown
): { isDonor: boolean; dizimistaType: string } => {
  if (!value) return { isDonor: false, dizimistaType: 'Não Dizimista' };

  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  if (
    lowerStr === 'não dizimista' ||
    lowerStr === 'nao dizimista' ||
    lowerStr === 'não' ||
    lowerStr === 'nao' ||
    lowerStr === 'n'
  ) {
    return { isDonor: false, dizimistaType: 'Não Dizimista' };
  }

  if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
    return { isDonor: true, dizimistaType: 'Pontual (1-3)' };
  }

  if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
    return { isDonor: true, dizimistaType: 'Sazonal (4-7)' };
  }

  if (
    lowerStr === 'recorrente (8-12)' ||
    lowerStr === 'recorrente' ||
    lowerStr.includes('recorrente')
  ) {
    return { isDonor: true, dizimistaType: 'Recorrente (8-12)' };
  }

  if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
    return { isDonor: true, dizimistaType: 'Sim' };
  }

  return { isDonor: true, dizimistaType: str };
};

/**
 * Parse campo ofertante com tipo
 */
export const parseOfertanteField = (
  value: unknown
): { isOffering: boolean; ofertanteType: string } => {
  if (!value) return { isOffering: false, ofertanteType: 'Não Ofertante' };

  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  if (
    lowerStr === 'não ofertante' ||
    lowerStr === 'nao ofertante' ||
    lowerStr === 'não' ||
    lowerStr === 'nao' ||
    lowerStr === 'n'
  ) {
    return { isOffering: false, ofertanteType: 'Não Ofertante' };
  }

  if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
    return { isOffering: true, ofertanteType: 'Pontual (1-3)' };
  }

  if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
    return { isOffering: true, ofertanteType: 'Sazonal (4-7)' };
  }

  if (
    lowerStr === 'recorrente (8-12)' ||
    lowerStr === 'recorrente' ||
    lowerStr.includes('recorrente')
  ) {
    return { isOffering: true, ofertanteType: 'Recorrente (8-12)' };
  }

  if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
    return { isOffering: true, ofertanteType: 'Sim' };
  }

  return { isOffering: true, ofertanteType: str };
};

/**
 * Formatar número de telefone para formato brasileiro
 */
export const formatPhoneNumber = (phone: unknown): string | null => {
  if (!phone) return null;

  const cleanPhone = String(phone).replace(/[^0-9]/g, '');

  if (cleanPhone.length < 10) {
    return null;
  }

  let formattedPhone = '';

  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    formattedPhone = `55${cleanPhone}`;
  } else if (!cleanPhone.startsWith('55') && cleanPhone.length === 10) {
    formattedPhone = `55${cleanPhone}`;
  } else {
    formattedPhone = cleanPhone;
  }

  if (formattedPhone.length === 13) {
    const countryCode = formattedPhone.substring(0, 2);
    const areaCode = formattedPhone.substring(2, 4);
    const firstPart = formattedPhone.substring(4, 9);
    const lastPart = formattedPhone.substring(9, 13);
    return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
  } else if (formattedPhone.length === 12) {
    const countryCode = formattedPhone.substring(0, 2);
    const areaCode = formattedPhone.substring(2, 4);
    const firstPart = formattedPhone.substring(4, 8);
    const lastPart = formattedPhone.substring(8, 12);
    return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
  } else {
    return cleanPhone;
  }
};

/**
 * Obter role a partir do tipo de usuário
 */
export const getRole = (tipo: string | undefined): string => {
  if (!tipo) return 'member';
  const tipoLower = tipo.toLowerCase().trim();

  // Superadmin roles
  if (
    tipoLower.includes('superadmin') ||
    tipoLower.includes('super admin') ||
    tipoLower.includes('super-adm') ||
    tipoLower.includes('admin geral')
  ) {
    return 'superadmin';
  }

  // Admin/Pastor roles
  if (
    tipoLower.includes('admin') ||
    tipoLower.includes('pastor') ||
    tipoLower.includes('pastora') ||
    tipoLower.includes('ministro') ||
    tipoLower.includes('ministra') ||
    tipoLower.includes('líder') ||
    tipoLower.includes('lider') ||
    tipoLower.includes('coordenador') ||
    tipoLower.includes('coordenadora')
  ) {
    return 'pastor';
  }

  // Missionary/Diácono roles
  if (
    tipoLower.includes('mission') ||
    tipoLower.includes('missionário') ||
    tipoLower.includes('missionaria') ||
    tipoLower.includes('diácon') ||
    tipoLower.includes('diacon') ||
    tipoLower.includes('evangelista') ||
    tipoLower.includes('pioneiro') ||
    tipoLower.includes('pioneira') ||
    tipoLower.includes('colportor') ||
    tipoLower.includes('colportora')
  ) {
    return 'missionary';
  }

  // Interested/Visitor roles
  if (
    tipoLower.includes('interest') ||
    tipoLower.includes('interessado') ||
    tipoLower.includes('interessada') ||
    tipoLower.includes('visit') ||
    tipoLower.includes('visitante') ||
    tipoLower.includes('simpatizante') ||
    tipoLower.includes('estudante') ||
    tipoLower.includes('candidato') ||
    tipoLower.includes('candidata') ||
    tipoLower.includes('prospecto') ||
    tipoLower.includes('prospecta')
  ) {
    return 'interested';
  }

  // Member roles (default)
  if (
    tipoLower.includes('member') ||
    tipoLower.includes('membro') ||
    tipoLower.includes('fiel') ||
    tipoLower.includes('batizado') ||
    tipoLower.includes('batizada') ||
    tipoLower.includes('adventista') ||
    tipoLower.includes('crente') ||
    tipoLower.includes('frequentador') ||
    tipoLower.includes('frequentadora')
  ) {
    return 'member';
  }

  return 'member';
};

// =============================================================================
// HELPERS AUXILIARES
// =============================================================================

/**
 * Conversão segura para string
 */
export const toStr = (val: unknown): string | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number' && isNaN(val)) return undefined;
  const str = String(val).trim();
  const lowerStr = str.toLowerCase();
  if (
    lowerStr === 'nan' ||
    lowerStr === 'undefined' ||
    lowerStr === 'null' ||
    lowerStr === '#n/a' ||
    lowerStr === '#ref!' ||
    lowerStr === '#value!' ||
    str === ''
  ) {
    return undefined;
  }
  return str;
};

/**
 * Validar e limpar sexo
 */
export const cleanSexo = (val: unknown): string | undefined => {
  const str = toStr(val);
  if (!str) return undefined;
  const lower = str.toLowerCase();
  if (lower === 'm' || lower === 'masculino' || lower === 'male') return 'Masculino';
  if (lower === 'f' || lower === 'feminino' || lower === 'female') return 'Feminino';
  return str;
};

/**
 * Validar e limpar email
 */
export const cleanEmail = (val: unknown): string | undefined => {
  const str = toStr(val);
  if (!str) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(str)) return undefined;
  if (str.includes('example.com') || str.includes('teste@') || str.includes('test@')) {
    return undefined;
  }
  return str.toLowerCase();
};

/**
 * Validar e limpar telefone
 */
export const cleanPhone = (val: unknown): string | undefined => {
  const str = toStr(val);
  if (!str) return undefined;
  const digits = str.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return undefined;
  if (/^0+$/.test(digits) || /^1234567890/.test(digits) || /^9999999999/.test(digits)) {
    return undefined;
  }
  return str;
};

/**
 * Validar e limpar CPF
 */
export const cleanCPF = (val: unknown): string | undefined => {
  const str = toStr(val);
  if (!str) return undefined;
  const digits = str.replace(/\D/g, '');
  if (digits.length !== 11) return undefined;
  if (/^(\d)\1+$/.test(digits)) return undefined;
  return str;
};

// =============================================================================
// INTERFACE DE DADOS IMPORTADOS
// =============================================================================

export interface ImportedMemberData {
  // Campos básicos
  name: string;
  email: string;
  password: string;
  role: string;

  // Campos da igreja
  church: string;
  churchCode?: string;

  // Contato
  phone?: string | null;
  cpf?: string;

  // Endereço
  address?: string;

  // Datas
  birthDate?: Date | null;
  baptismDate?: Date | null;

  // Informações pessoais
  civilStatus?: string;
  occupation?: string;
  education?: string;

  // Engajamento e Classificação
  engajamento?: string | null;
  classificacao?: string | null;

  // Dados financeiros
  isDonor: boolean;
  dizimistaType: string;
  isOffering: boolean;
  ofertanteType: string;

  // Campos de pontuação
  tempoBatismoAnos?: number;
  departamentosCargos?: string | null;
  nomeUnidade?: string | null;
  temLicao?: boolean;
  totalPresenca?: number;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  batizouAlguem?: boolean;
  discPosBatismal?: number;
  cpfValido?: boolean;
  camposVazios?: boolean;

  // Escola Sabatina
  isEnrolledES?: boolean;
  hasLesson?: boolean;
  esPeriod?: string;

  // Dados espirituais
  previousReligion?: string;
  biblicalInstructor?: string;

  // Departamentos
  departments?: string;

  // Observações
  observations?: string | null;

  // Dados extras
  extraData?: string;
}

// =============================================================================
// FUNÇÃO PRINCIPAL DE PROCESSAMENTO
// (Cópia exata da lógica do Gestão de Dados - Settings.tsx)
// =============================================================================

/**
 * Processa uma linha de dados brutos do Excel e retorna um objeto estruturado
 * Usa exatamente a mesma lógica de detecção por OR chains do Gestão de Dados
 */
export function processExcelRow(row: Record<string, unknown>): ImportedMemberData | null {
  // NOME (obrigatório)
  const rawNome =
    row.Nome ||
    row.nome ||
    row.name ||
    row['Nome Completo'] ||
    row['nome completo'] ||
    row['Nome completo'] ||
    row['Full Name'] ||
    row['full name'] ||
    row.Membro ||
    row.membro;

  const nome = toStr(rawNome);
  if (!nome || nome.length < 2 || nome.includes('@') || /^\d+$/.test(nome)) {
    return null;
  }

  // Mapeamento completo de telefone com todas as variações
  const originalPhone =
    row.Celular ||
    row.celular ||
    row.telefone ||
    row.Telefone ||
    row.phone ||
    row['Celular'] ||
    row.Phone ||
    row.Cel ||
    row.cel ||
    row.Fone ||
    row.fone ||
    row.WhatsApp ||
    row.whatsapp;
  const formattedPhone = formatPhoneNumber(originalPhone);
  const phoneWarning = originalPhone && !formattedPhone;

  // IGREJA
  const rawIgreja =
    row.Igreja ||
    row.igreja ||
    row.church ||
    row.Church ||
    row.Congregação ||
    row.congregação ||
    row.Congregacao ||
    row.congregacao ||
    row.Comunidade ||
    row.comunidade;
  let igreja = 'Igreja Principal';
  const igrejaStr = toStr(rawIgreja);
  if (igrejaStr && igrejaStr.length >= 2) {
    igreja = igrejaStr;
  } else if (typeof rawIgreja === 'number' && !isNaN(rawIgreja)) {
    igreja = String(rawIgreja);
  }

  // EMAIL - Usar apenas email válido da planilha, NÃO gerar emails fake
  const emailRaw = row.Email || row.email || row['E-mail'] || row['e-mail'];
  const email = cleanEmail(emailRaw) || undefined; // Backend vai gerar email único se necessário

  // TIPO/ROLE
  const tipo = toStr(row.Tipo || row.tipo || row.role || row.Role);
  const role = getRole(tipo);

  // CÓDIGO IGREJA
  const churchCode = toStr(row.Código || row.codigo || row.code || row.Code);

  // CPF
  const cpf = cleanCPF(row.CPF || row.cpf);

  // ENDEREÇO
  const address = toStr(row.Endereço || row.endereco || row.address || row.Address);

  // DATAS
  const birthDate = parseDate(
    row.Nascimento ||
      row.nascimento ||
      row.birthDate ||
      row['Data de Nascimento'] ||
      row['data de nascimento']
  );
  const baptismDate = parseDate(
    row.Batismo ||
      row.batismo ||
      row.baptismDate ||
      row['Data de Batismo'] ||
      row['data de batismo']
  );

  // INFORMAÇÕES PESSOAIS
  const civilStatus = toStr(
    row['Estado civil'] || row.estadoCivil || row.civilStatus || row['Estado Civil']
  );
  const occupation = toStr(
    row.Ocupação || row.ocupacao || row.profissao || row.Profissão || row.occupation
  );
  const education = toStr(
    row['Grau de educação'] || row.educacao || row.education || row.Escolaridade || row.escolaridade
  );

  // ENGAJAMENTO E CLASSIFICAÇÃO
  const engajamento = toStr(row.Engajamento || row.engajamento);
  const classificacao = toStr(row.Classificação || row.classificacao);

  // DADOS FINANCEIROS
  const dizimistaResult = parseDizimistaField(row.Dizimista || row.dizimista);
  const ofertanteResult = parseOfertanteField(row.Ofertante || row.ofertante);

  // TEMPO BATISMO ANOS
  const tempoBatismoAnos = (() => {
    const direto = parseNumber(row['Tempo de batismo - anos'] || row.tempoBatismoAnos);
    if (direto > 0) return direto;

    if (baptismDate) {
      const hoje = new Date();
      const diffAnos = Math.floor(
        (hoje.getTime() - baptismDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );
      return diffAnos > 0 ? diffAnos : 0;
    }
    return 0;
  })();

  // DEPARTAMENTOS E CARGOS
  const departamentosCargos = toStr(
    row['Departamentos e cargos'] ||
      row.departamentosCargos ||
      row.departamentos ||
      row.Departamentos
  );

  // UNIDADE ES
  const nomeUnidade = toStr(
    row['Nome da unidade'] || row.nomeUnidade || row.Unidade || row.unidade
  );

  // CAMPOS DE PONTUAÇÃO
  const temLicao = parseBooleanField(row['Tem lição'] || row.temLicao);
  const totalPresenca = parseNumber(
    row['Total de presença'] ||
      row.totalPresenca ||
      row.presencaTotal ||
      row.Presença ||
      row.presença
  );
  const comunhao = parseNumber(row.Comunhão || row.comunhao);
  const missao = parseNumber(row.Missão || row.missao);
  const estudoBiblico = parseNumber(row['Estudo bíblico'] || row.estudoBiblico);

  const batizouAlguem = (() => {
    const valor = row['Batizou alguém'] || row.batizouAlguem;
    if (typeof valor === 'number') return valor > 0;
    return parseBooleanField(valor);
  })();

  const discPosBatismal = parseNumber(row['Disc. pós batismal'] || row.discPosBatismal);
  const cpfValido = parseBooleanField(row['CPF válido'] || row.cpfValido);

  const camposVazios = (() => {
    const valor = row['Campos vazios/inválidos'] || row.camposVazios;
    if (typeof valor === 'number') return valor > 0;
    return parseBooleanField(valor);
  })();

  // ESCOLA SABATINA
  const isEnrolledES = parseBooleanField(row['Matriculado na ES'] || row.matriculadoES);
  const hasLesson = parseBooleanField(row['Tem lição'] || row.temLicao);
  const esPeriod = toStr(row['Período ES'] || row.periodoES);

  // DADOS ESPIRITUAIS
  const previousReligion = toStr(row['Religião anterior'] || row.religiaoAnterior);
  const biblicalInstructor = toStr(row['Instrutor bíblico'] || row.instrutorBiblico);

  // DEPARTAMENTOS
  const departments = departamentosCargos;

  // OBSERVAÇÕES (combinação de campos informativos - igual ao Settings.tsx)
  const observations = [
    row['Como estudou a Bíblia'] && `Como estudou: ${row['Como estudou a Bíblia']}`,
    row['Teve participação'] && `Participação: ${row['Teve participação']}`,
    row['Campos vazios/inválidos'] && `Campos vazios: ${row['Campos vazios/inválidos']}`,
    row['Tempo de batismo'] && `Tempo de batismo: ${row['Tempo de batismo']}`,
    row['Engajamento'] && `Engajamento: ${row['Engajamento']}`,
    row['Classificação'] && `Classificação: ${row['Classificação']}`,
  ].filter(Boolean).join(' | ') || null;

  // DADOS EXTRAS (extraData)
  const extraData = JSON.stringify({
    // Dados básicos
    sexo: cleanSexo(row.Sexo || row.sexo),
    idade: parseNumber(row.Idade || row.idade),
    codigo: churchCode,

    // Telefone
    phoneWarning: phoneWarning,
    originalPhone: phoneWarning ? originalPhone : null,

    // Endereço completo
    bairro: toStr(row.Bairro || row.bairro),
    cidadeEstado: toStr(row['Cidade e Estado'] || row.cidadeEstado),
    cidadeNascimento: toStr(row['Cidade de nascimento'] || row.cidadeNascimento),
    estadoNascimento: toStr(row['Estado de nascimento'] || row.estadoNascimento),
    cpf: cpf,

    // Quantidade real de "Batizou alguém"
    quantidadeBatizados:
      typeof (row['Batizou alguém'] || row.batizouAlguem) === 'number'
        ? parseNumber(row['Batizou alguém'] || row.batizouAlguem)
        : 0,

    // Dízimos - VALORES ORIGINAIS DA PLANILHA (para o backend processar)
    dizimistaOriginal: toStr(row.Dizimista || row.dizimista),
    dizimos12m: toStr(row['Dízimos - 12m'] || row.dizimos12m),
    ultimoDizimo: formatDateToISO(parseDate(row['Último dízimo - 12m'] || row.ultimoDizimo)),
    valorDizimo: toStr(row['Valor dízimo - 12m'] || row.valorDizimo),
    numeroMesesSemDizimar: toStr(row['Número de meses s/ dizimar'] || row.numeroMesesSemDizimar),
    dizimistaAntesUltimoDizimo: toStr(
      row['Dizimista antes do últ. dízimo'] || row.dizimistaAntesUltimoDizimo
    ),
    dizimistaType: dizimistaResult.dizimistaType,

    // Ofertas - VALORES ORIGINAIS DA PLANILHA (para o backend processar)
    ofertanteOriginal: toStr(row.Ofertante || row.ofertante),
    ofertas12m: toStr(row['Ofertas - 12m'] || row.ofertas12m),
    ultimaOferta: formatDateToISO(parseDate(row['Última oferta - 12m'] || row.ultimaOferta)),
    valorOferta: toStr(row['Valor oferta - 12m'] || row.valorOferta),
    numeroMesesSemOfertar: toStr(row['Número de meses s/ ofertar'] || row.numeroMesesSemOfertar),
    ofertanteAntesUltimaOferta: toStr(
      row['Ofertante antes da últ. oferta'] || row.ofertanteAntesUltimaOferta
    ),
    ofertanteType: ofertanteResult.ofertanteType,

    // Movimentos
    ultimoMovimento: toStr(row['Último movimento'] || row.ultimoMovimento),
    dataUltimoMovimento: formatDateToISO(parseDate(row['Data do último movimento'] || row.dataUltimoMovimento)),
    tipoEntrada: toStr(row['Tipo de entrada'] || row.tipoEntrada),

    // Batismo
    tempoBatismo: toStr(row['Tempo de batismo'] || row.tempoBatismo),
    localidadeBatismo: toStr(row['Localidade do batismo'] || row.localidadeBatismo),
    batizadoPor: toStr(row['Batizado por'] || row.batizadoPor),
    idadeBatismo: toStr(row['Idade no Batismo'] || row.idadeBatismo),

    // Conversão
    comoConheceu: toStr(row['Como conheceu a IASD'] || row.comoConheceu),
    fatorDecisivo: toStr(row['Fator decisivo'] || row.fatorDecisivo),
    comoEstudou: toStr(row['Como estudou a Bíblia'] || row.comoEstudou),
    instrutorBiblico2: toStr(row['Instrutor bíblico 2'] || row.instrutorBiblico2),

    // Cargos e departamentos
    temCargo: toStr(row['Tem cargo'] || row.temCargo),
    teen: toStr(row.Teen || row.teen),

    // Família
    nomeMae: toStr(row['Nome da mãe'] || row.nomeMae),
    nomePai: toStr(row['Nome do pai'] || row.nomePai),
    dataCasamento: formatDateToISO(parseDate(row['Data de casamento'] || row.dataCasamento)),

    // Presença
    presencaCartao: parseNumber(row['Total presença no cartão'] || row.presencaCartao),
    presencaQuizLocal: parseNumber(row['Presença no quiz local'] || row.presencaQuizLocal),
    presencaQuizOutra: parseNumber(
      row['Presença no quiz outra unidade'] || row.presencaQuizOutraUnidade
    ),
    presencaQuizOnline: parseNumber(row['Presença no quiz online'] || row.presencaQuizOnline),
    teveParticipacao: toStr(row['Teve participação'] || row.teveParticipacao),
    matriculadoES: isEnrolledES,

    // Colaboração
    campoColaborador: toStr(row['Campo - colaborador'] || row.campoColaborador),
    areaColaborador: toStr(row['Área - colaborador'] || row.areaColaborador),
    estabelecimentoColaborador: toStr(
      row['Estabelecimento - colaborador'] || row.estabelecimentoColaborador
    ),
    funcaoColaborador: toStr(row['Função - colaborador'] || row.funcaoColaborador),
    
    // Educação Adventista
    alunoEducacao: toStr(row['Aluno educação Adv.'] || row.alunoEducacao),
    parentesco: toStr(row['Parentesco p/ c/ aluno'] || row.parentesco),
    
    // Validação ACMS
    nomeCamposVazios: toStr(row['Nome dos campos vazios no ACMS'] || row.nomeCamposVazios),
  });

  return {
    name: nome,
    email: email || '',
    password: '123456',
    role,
    church: igreja,
    churchCode,
    phone: formattedPhone,
    cpf,
    address,
    birthDate,
    baptismDate,
    civilStatus,
    occupation,
    education,
    engajamento,
    classificacao,
    isDonor: dizimistaResult.isDonor,
    dizimistaType: dizimistaResult.dizimistaType,
    isOffering: ofertanteResult.isOffering,
    ofertanteType: ofertanteResult.ofertanteType,
    tempoBatismoAnos,
    departamentosCargos,
    nomeUnidade,
    temLicao,
    totalPresenca,
    comunhao,
    missao,
    estudoBiblico,
    batizouAlguem,
    discPosBatismal,
    cpfValido,
    camposVazios,
    isEnrolledES,
    hasLesson,
    esPeriod,
    previousReligion,
    biblicalInstructor,
    departments,
    observations,
    extraData,
  };
}

/**
 * Processa um array de dados brutos do Excel
 */
export function processExcelData(rawData: Record<string, unknown>[]): ImportedMemberData[] {
  return rawData
    .map(row => processExcelRow(row))
    .filter((row): row is ImportedMemberData => row !== null);
}
