/**
 * All available positions for church election nominations.
 * Organized by ministry categories.
 */
export const ALL_POSITIONS = [
  // ANCIÃOS / ANCIÃS / DIRETORES
  'Ancião/Anciã Teen',
  'Ancião/Anciã Jovem',
  'Primeiro Ancião(ã)',
  'Secretário(a)',
  'Secretário(a) Associado(a)',
  'Secretário(a) Teen',
  'Tesoureiro(a)',
  'Tesoureiro(a) Associado(a)',
  'Tesoureiro(a) Teen',
  'Patrimônio',

  // DIACONATO
  'Diáconos',
  'Diácono(s) Teen',
  'Diaconisas',
  'Diaconisa(s) Teen',
  'Primeiro Diácono',
  'Primeira Diaconisa',

  // MORDOMIA CRISTÃ
  'Diretor(a)',
  'Diretor(a) Associado(a)',
  'Discípulo Teen',

  // NOVAS GERAÇÕES
  'Ministério da Criança – Coordenador(a)',
  'Ministério da Criança – Coordenador(a) Associado(a)',
  'Ministério dos Adolescentes – Coordenador(a)',
  'Ministério dos Adolescentes – Coordenador(a) Associado(a)',
  'Ministério Jovem – Diretor(a)',
  'Ministério Jovem – Diretor(a) Associado(a)',
  'Clube de Aventureiros – Diretor(a)',
  'Clube de Aventureiros – Diretor(a) Associado(a)',
  'Clube de Aventureiros – Discípulo Teen',
  'Clube de Desbravadores – Diretor(a)',
  'Clube de Desbravadores – Diretor(a) Associado(a)',
  'Clube de Desbravadores – Discípulo Teen',

  // ESCOLA SABATINA
  'Professores(as) das Unidades: Bebês',
  'Professores(as) das Unidades: Iniciantes',
  'Professores(as) das Unidades: Infantis',
  'Professores(as) das Unidades: Primários',
  'Professores(as) das Unidades: Pré-adolescentes',
  'Professores(as) das Unidades: Adolescentes',
  'Secretário(a) Escola Sabatina',
  'Diretor(a) Associado(a) Escola Sabatina',
  'Discípulo Teen Escola Sabatina',

  // MINISTÉRIO PESSOAL E EVANGELISMO
  'Diretor(a) Ministério Pessoal',
  'Diretor(a) Associado(a) Ministério Pessoal',
  'Discípulo Teen Ministério Pessoal',
  'Evangelismo – Diretor(a)',
  'Evangelismo – Diretor(a) Associado(a)',
  'Evangelismo – Secretário(a)',
  'Evangelismo – Discípulo Teen',
  'Coordenador(a) de Classes Bíblicas',
  'Coordenador(a) de Amigos',

  // AÇÃO SOLIDÁRIA ADVENTISTA (ASA)
  'Diretor(a) ASA',
  'Diretor(a) Associado(a) ASA',
  'Discípulo Teen ASA',

  // MINISTÉRIO DA FAMÍLIA
  'Casal Diretor',
  'Casal Associado',
  'Discípulo Teen Ministério da Família',

  // MINISTÉRIO DA MULHER
  'Diretora Ministério da Mulher',
  'Diretora Associada Ministério da Mulher',
  'Discípulo Teen Ministério da Mulher',

  // MINISTÉRIO DA RECEPÇÃO
  'Líder Ministério da Recepção',
  'Equipe Ministério da Recepção',

  // MINISTÉRIO DO HOMEM
  'Diretor Ministério do Homem',
  'Diretor Associado Ministério do Homem',
  'Discípulo Teen Ministério do Homem',

  // MINISTÉRIO DA SAÚDE
  'Diretor(a) Ministério da Saúde',
  'Diretor(a) Associado(a) Ministério da Saúde',
  'Discípulo Teen Ministério da Saúde',

  // MINISTÉRIO DAS POSSIBILIDADES
  'Diretor(a) Ministério das Possibilidades',
  'Diretor(a) Associado(a) Ministério das Possibilidades',
  'Discípulo Teen Ministério das Possibilidades',

  // MINISTÉRIO DA MÚSICA
  'Diretor(a) Ministério da Música',
  'Diretor(a) Associado(a) Ministério da Música',
  'Discípulo Teen Ministério da Música',

  // COMUNICAÇÃO
  'Diretor(a) Comunicação',
  'Diretor(a) Associado(a) Comunicação',
  'Social Media (redes sociais)',
  'Discípulo Teen Comunicação',

  // SONOPLASTIA
  'Diretor(a) Sonoplastia',
  'Diretor(a) Associado(a) Sonoplastia',
  'Equipe Sonoplastia',
] as const;

/**
 * Default position descriptions for common church roles.
 */
export const DEFAULT_POSITION_DESCRIPTIONS: Record<string, string> = {
  'Secretário(a)': `Atribuições:
• Cuidar do sistema de gerenciamento de membros (ACMS);
• Criar e manter registro de membros e frequentadores;
• Formar, treinar e gerenciar uma equipe de secretaria;
• Preparar agenda e participar das reuniões de comissões da igreja;
• Preparar relatórios de acordo com a necessidade da administração da igreja e dos diversos ministérios;
• Entregar certificados das cerimônias (batismos e profissões de fé).`,

  'Tesoureiro(a)': `Atribuições:
• Receber todos os recursos financeiros, gerando os recibos e devidos relatórios;
• Preparar o orçamento anual e acompanhar os gastos dos ministérios;
• Prestar contas ao campo local no momento indicado para a auditoria anual;
• Efetuar os pagamentos autorizados pelo pastorado e/ou Subcomissão Administrativa;
• Formar, treinar e gerenciar uma equipe de tesouraria.`,

  'Diretor(a) ASA': `Atribuições:
• Desenvolver projetos que atendam e aliviem o sofrimento de pessoas em estado de vulnerabilidade em nosso bairro;
• Organizar recebimento e saídas de alimentos/roupas para famílias que necessitam de ajuda (sejam elas membros da Igreja ou amigos);
• Disponibilizar seu tempo durante a semana para atendimentos e distribuição de alimentos;
• Apoiar projetos sociais de outros ministérios da Igreja.`,

  'Diretor(a) Comunicação': `Atribuições:
• Elaboração de textos informativos e promoção de informações assertivas;
• Produção de artes para as divulgações de eventos e séries;
• Gerenciamento das redes sociais da igreja e site da igreja;
• Preservar e manter a imagem da Instituição;
• Preservar a identidade visual da igreja.`,

  'Primeiro Diácono': `Atribuições:
• Prover equipes de trabalho semanais por escala;
• Prover treinamento para o corpo de diáconos e diaconisas;
• Auxiliar nas cerimônias especiais da igreja;
• Participar da equipe de visitação da igreja.`,

  'Primeira Diaconisa': `Atribuições:
• Prover equipes de trabalho semanais por escala;
• Prover treinamento para o corpo de diáconos e diaconisas;
• Auxiliar nas cerimônias especiais da igreja;
• Participar da equipe de visitação da igreja.`,

  'Diretor(a) Associado(a) Escola Sabatina': `Atribuições:
• Recrutar, capacitar e gerenciar a equipe de professores;
• Em parceria com o ancionato, promover o pastoreio através das classes;
• Organizar a programação semanal da escola sabatina;
• Incentivar e promover o estudo e aquisição da lição (Projeto Maná).`,

  'Coordenador(a) de Amigos': `Atribuições:
• Manter atualizada a lista de amigos da igreja;
• Encaminhar novos amigos para os instrutores através do Ministério Pessoal;
• Gerenciar e atualizar periodicamente o progresso dos estudos bíblicos;
• Trabalhar em parceria com a Secretaria da Escola Sabatina e Secretaria da Igreja para atualizar os sistemas com as informações.`,

  'Ministério da Criança – Coordenador(a)': `Atribuições:
• Recrutar e gerenciar a equipe de professores;
• Dar suporte aos coordenadores que auxiliam nas áreas de coral, eventos e programações;
• Compra de materiais para o departamento e classes infantis;
• Trabalhar em parceria com a distrital para aplicar o programa da associação.`,

  'Casal Diretor': `Atribuições:
• Realizar reuniões de fortalecimento do casamento;
• Apresentar palestras sobre paternidade/maternidade e educação cristã sobre sexualidade;
• Fornecer orientações para evangelismo entre famílias;
• Oferecer aconselhamento familiar;
• Promover encontros de celebração e instrução para as famílias.
Normalmente é liderado pelo casal, apesar de apenas um nome ser indicado como líder.`,

  'Diretora Ministério da Mulher': `Atribuições:
• Organizar e planejar encontros espirituais e sociais com as mulheres da Igreja;
• Implementar o programa da associação (com adaptações, se necessário);
• Mobilizar as mulheres da igreja em diversas frentes missionárias.`,

  'Diretor(a) Ministério da Música': `Atribuições:
• Recrutar, capacitar e gerenciar voluntários com aptidões musicais variadas;
• Organizar repertório e equipes para o louvor congregacional;
• Promover encontros musicais e eventos;
• Recrutar e dar suporte aos diretores e regentes dos grupos vocais e instrumentais da igreja.`,

  'Líder Ministério da Recepção': `Atribuições:
• Recrutar, capacitar e gerenciar voluntários para equipe de recepção;
• Organizar equipes de atuação semanal;
• Perfil de pessoa que seja simpática, converse com empatia e gentileza;
• Orientar os visitantes.`,

  'Diretor(a) Ministério da Saúde': `Atribuições:
• Organizar o Clube Vida e Saúde;
• Organizar palestras de saúde (físico, mental, espiritual) que possam incentivar uma vida saudável para membros e amigos da Igreja;
• Planejar feiras de saúde e projetos evangelísticos nessa área;
• Auxiliar nos cursos de saúde que sejam promovidos pela Igreja.`,

  'Diretor(a) Ministério das Possibilidades': `Atribuições:
• Desenvolver atividades para o grupo de terceira idade da Igreja e amigos;
• Identificar e atender necessidades dessa faixa etária (enfermos, unções, visitas);
• Organizar equipe de visitação de idosos;
• Mobilizar visitas em asilos;
• Realizar viagens e excursões de idosos da Igreja.`,

  'Ministério dos Adolescentes – Coordenador(a)': `Atribuições:
• Motivar o grupo de adolescentes da Igreja a terem um encontro com Deus;
• Organizar as atividades da Escola Sabatina de adolescentes;
• Planejar atividades sociais e missionárias com adolescentes;
• Acompanhar os projetos realizados com Adolescentes por nossa Associação;
• Mobilizar adolescentes para que participem ativamente de outros ministérios da Igreja.`,

  'Ministério Jovem – Diretor(a)': `Atribuições:
• Planejar atividades voltadas para jovens;
• Organizar encontros sociais com a juventude da Igreja;
• Desenvolver novos jovens na liderança;
• Realizar encontros de pequenos grupos com jovens;
• Pastorear novos jovens vindos de outros estados e jovens universitários.`,

  'Diretor(a) Ministério Pessoal': `Atribuições:
• Envolver os membros através dos ministérios da Igreja e unidades de ação da Escola Sabatina nos projetos evangelísticos da Igreja;
• Identificar e capacitar membros que dão estudos bíblicos para atendimento de amigos levantados pela Coordenação de Amigos;
• Acompanhar junto com o Coordenador de Pequenos Grupos os pequenos grupos da Igreja;
• Em parceria com o Coordenador de Amigos, conectar amigos com instrutores bíblicos.`,

  'Diretor(a)': `Atribuições:
• Ter uma compreensão do ministério espiritual e financeiro da igreja;
• Promover encontros e eventos sobre mordomia cristã;
• Aplicar (ou adaptar, se necessário) os programas de mordomia denominacionais;
• Trabalhar em parceria com outros ministérios que auxiliam no crescimento espiritual e desenvolvimento dos dons.`,
};
