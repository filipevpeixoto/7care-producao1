#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Análise de detecção de colunas da planilha DRACMA"""

# Colunas da planilha Santana do Livramento.xlsx (77 total)
colunas = [
    'Igreja', 'Nome', 'Código', 'Tipo', 'Sexo', 'Idade', 'Nascimento', 'Engajamento', 'Classificação',
    'Dizimista', 'Dízimos - 12m', 'Último dízimo - 12m', 'Valor dízimo - 12m', 'Número de meses s/ dizimar',
    'Dizimista antes do últ. dízimo', 'Ofertante', 'Ofertas - 12m', 'Última oferta - 12m', 'Valor oferta - 12m',
    'Número de meses s/ ofertar', 'Ofertante antes da últ. oferta', 'Último movimento', 'Data do último movimento',
    'Tipo de entrada', 'Tempo de batismo', 'Batismo', 'Localidade do batismo', 'Batizado por', 'Idade no Batismo',
    'Tempo de batismo - anos', 'Religião anterior', 'Como conheceu a IASD', 'Fator decisivo', 'Como estudou a Bíblia',
    'Instrutor bíblico', 'Instrutor bíblico 2', 'Tem cargo', 'Teen', 'Departamentos e cargos', 'Nome da mãe',
    'Nome do pai', 'Grau de educação', 'Ocupação', 'Estado civil', 'Data de casamento', 'Celular', 'Email',
    'Cidade e Estado', 'Bairro', 'Endereço', 'Cidade de nascimento', 'Estado de nascimento', 'CPF', 'Nome da unidade',
    'Matriculado na ES', 'Tem lição', 'Comunhão', 'Missão', 'Estudo bíblico', 'Batizou alguém', 'Disc. pós batismal',
    'Total presença no cartão', 'Presença no quiz local', 'Presença no quiz outra unidade', 'Presença no quiz online',
    'Total de presença', 'Teve participação', 'Período ES', 'Campo - colaborador', 'Área - colaborador',
    'Estabelecimento - colaborador', 'Função - colaborador', 'Campos vazios/inválidos', 'CPF válido',
    'Aluno educação Adv.', 'Parentesco p/ c/ aluno', 'Nome dos campos vazios no ACMS'
]

# Mapeamento atual do Step4ExcelImport.tsx
COLUMN_MAPPINGS = {
    'nome': 'nome', 'name': 'nome', 'nome completo': 'nome', 'full name': 'nome', 'membro': 'nome',
    'igreja': 'igreja', 'church': 'igreja', 'congregacao': 'igreja', 'congregação': 'igreja', 'comunidade': 'igreja',
    'email': 'email', 'e-mail': 'email', 'mail': 'email', 'correio': 'email',
    'telefone': 'telefone', 'celular': 'telefone', 'phone': 'telefone', 'cel': 'telefone', 'fone': 'telefone', 'whatsapp': 'telefone',
    'cargo': 'cargo', 'funcao': 'cargo', 'função': 'cargo', 'funcao - colaborador': 'cargo', 'função - colaborador': 'cargo',
    'role': 'cargo', 'ministerio': 'cargo', 'ministério': 'cargo', 'tem cargo': 'cargo',
    'codigo': 'codigo', 'código': 'codigo', 'code': 'codigo',
    'tipo': 'tipo', 'type': 'tipo', 'categoria': 'tipo', 'tipo de entrada': 'tipo',
    'sexo': 'sexo', 'genero': 'sexo', 'gênero': 'sexo', 'gender': 'sexo',
    'idade': 'idade', 'age': 'idade',
    'nascimento': 'dataNascimento', 'data nascimento': 'dataNascimento', 'data de nascimento': 'dataNascimento',
    'dt nascimento': 'dataNascimento', 'dt. nascimento': 'dataNascimento', 'birthdate': 'dataNascimento', 'birth date': 'dataNascimento',
    'cpf': 'cpf', 'cpf valido': 'cpfValido', 'cpf válido': 'cpfValido',
    'estado civil': 'estadoCivil', 'civil status': 'estadoCivil',
    'profissao': 'profissao', 'profissão': 'profissao', 'ocupacao': 'profissao', 'ocupação': 'profissao', 'occupation': 'profissao',
    'escolaridade': 'escolaridade', 'grau de educação': 'escolaridade', 'grau de educacao': 'escolaridade',
    'educacao': 'escolaridade', 'educação': 'escolaridade', 'education': 'escolaridade',
    'endereco': 'endereco', 'endereço': 'endereco', 'address': 'endereco',
    'bairro': 'bairro', 'neighborhood': 'bairro',
    'cidade': 'cidadeEstado', 'cidade e estado': 'cidadeEstado', 'city': 'cidadeEstado',
    'cidade de nascimento': 'cidadeEstado', 'estado de nascimento': 'cidadeEstado',
    'batismo': 'dataBatismo', 'data batismo': 'dataBatismo', 'data de batismo': 'dataBatismo',
    'dt batismo': 'dataBatismo', 'dt. batismo': 'dataBatismo', 'baptism': 'dataBatismo', 'baptism date': 'dataBatismo',
    'tempo de batismo': 'tempoBatismoAnos', 'tempo de batismo - anos': 'tempoBatismoAnos', 'idade no batismo': 'tempoBatismoAnos',
    'dizimista': 'dizimista', 'é dizimista': 'dizimista', 'tither': 'dizimista', 'dizimo': 'dizimista', 'dízimo': 'dizimista',
    'dizimos - 12m': 'dizimista', 'dízimos - 12m': 'dizimista',
    'ofertante': 'ofertante', 'é ofertante': 'ofertante', 'oferta': 'ofertante', 'offering': 'ofertante', 'ofertas - 12m': 'ofertante',
    'engajamento': 'engajamento', 'engagement': 'engajamento',
    'classificacao': 'classificacao', 'classificação': 'classificacao', 'classification': 'classificacao',
    'departamentos': 'departamentosCargos', 'departamentos e cargos': 'departamentosCargos', 'departments': 'departamentosCargos',
    'unidade': 'nomeUnidade', 'nome da unidade': 'nomeUnidade', 'unidade es': 'nomeUnidade',
    'licao': 'temLicao', 'lição': 'temLicao', 'tem lição': 'temLicao', 'tem licao': 'temLicao',
    'matriculado es': 'matriculadoES', 'matriculado na es': 'matriculadoES', 'escola sabatina': 'matriculadoES',
    'presenca': 'totalPresenca', 'presença': 'totalPresenca', 'total presença': 'totalPresenca', 'total presenca': 'totalPresenca',
    'total de presença': 'totalPresenca', 'total de presenca': 'totalPresenca', 'total presença no cartão': 'totalPresenca', 'total presenca no cartao': 'totalPresenca',
    'comunhao': 'comunhao', 'comunhão': 'comunhao',
    'missao': 'missao', 'missão': 'missao',
    'estudo biblico': 'estudoBiblico', 'estudo bíblico': 'estudoBiblico', 'como estudou a biblia': 'estudoBiblico', 'como estudou a bíblia': 'estudoBiblico',
    'batizou alguem': 'batizouAlguem', 'batizou alguém': 'batizouAlguem',
    'disc. pos batismal': 'discPosBatismal', 'disc. pós batismal': 'discPosBatismal',
    'discipulado pos batismal': 'discPosBatismal', 'discipulado pós batismal': 'discPosBatismal',
    'religiao anterior': 'religiaoAnterior', 'religião anterior': 'religiaoAnterior',
    'instrutor biblico': 'instrutorBiblico', 'instrutor bíblico': 'instrutorBiblico',
    'instrutor biblico 2': 'instrutorBiblico', 'instrutor bíblico 2': 'instrutorBiblico', 'batizado por': 'instrutorBiblico',
    'nome da mae': 'nomeMae', 'nome da mãe': 'nomeMae', 'mae': 'nomeMae', 'mãe': 'nomeMae',
    'nome do pai': 'nomePai', 'pai': 'nomePai',
    'campos vazios': 'camposVazios', 'campos vazios/invalidos': 'camposVazios', 'campos vazios/inválidos': 'camposVazios',
    'observacoes': 'observacoes', 'observações': 'observacoes', 'obs': 'observacoes', 'notas': 'observacoes', 'notes': 'observacoes',
    'como conheceu a iasd': 'observacoes', 'fator decisivo': 'observacoes', 'localidade do batismo': 'observacoes',
}

if __name__ == '__main__':
    print('=== ANÁLISE DE DETECÇÃO ===\n')

    detectadas = []
    nao_detectadas = []

    for col in colunas:
        normalized = col.lower().strip()
        if normalized in COLUMN_MAPPINGS:
            detectadas.append((col, COLUMN_MAPPINGS[normalized]))
        else:
            nao_detectadas.append(col)

    print(f'✅ COLUNAS DETECTADAS ({len(detectadas)}/{len(colunas)}):')
    for col, campo in detectadas:
        print(f'   {col} → {campo}')

    print(f'\n❌ COLUNAS NÃO DETECTADAS ({len(nao_detectadas)}/{len(colunas)}):')
    for col in nao_detectadas:
        print(f'   {col}')
