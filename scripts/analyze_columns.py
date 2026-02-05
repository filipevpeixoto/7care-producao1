#!/usr/bin/env python3
"""Analisa colunas da planilha vs mapeamentos existentes"""
import unicodedata

# Colunas da planilha Santana do Livramento
planilha_cols = [
    'Igreja', 'Nome', 'Código', 'Tipo', 'Sexo', 'Idade', 'Nascimento', 'Engajamento',
    'Classificação', 'Dizimista', 'Dízimos - 12m', 'Último dízimo - 12m', 'Valor dízimo - 12m',
    'Número de meses s/ dizimar', 'Dizimista antes do últ. dízimo', 'Ofertante', 'Ofertas - 12m',
    'Última oferta - 12m', 'Valor oferta - 12m', 'Número de meses s/ ofertar',
    'Ofertante antes da últ. oferta', 'Último movimento', 'Data do último movimento',
    'Tipo de entrada', 'Tempo de batismo', 'Batismo', 'Localidade do batismo', 'Batizado por',
    'Idade no Batismo', 'Tempo de batismo - anos', 'Religião anterior', 'Como conheceu a IASD',
    'Fator decisivo', 'Como estudou a Bíblia', 'Instrutor bíblico', 'Instrutor bíblico 2',
    'Tem cargo', 'Teen', 'Departamentos e cargos', 'Nome da mãe', 'Nome do pai',
    'Grau de educação', 'Ocupação', 'Estado civil', 'Data de casamento', 'Celular', 'Email',
    'Cidade e Estado', 'Bairro', 'Endereço', 'Cidade de nascimento', 'Estado de nascimento',
    'CPF', 'Nome da unidade', 'Matriculado na ES', 'Tem lição', 'Comunhão', 'Missão',
    'Estudo bíblico', 'Batizou alguém', 'Disc. pós batismal', 'Total presença no cartão',
    'Presença no quiz local', 'Presença no quiz outra unidade', 'Presença no quiz online',
    'Total de presença', 'Teve participação', 'Período ES', 'Campo - colaborador',
    'Área - colaborador', 'Estabelecimento - colaborador', 'Função - colaborador',
    'Campos vazios/inválidos', 'CPF válido', 'Aluno educação Adv.', 'Parentesco p/ c/ aluno',
    'Nome dos campos vazios no ACMS'
]

def normalize(s):
    s = s.lower().strip()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s

# Mapeamentos existentes
existing = {
    'nome', 'name', 'nome completo', 'full name', 'membro',
    'igreja', 'church', 'congregacao', 'comunidade',
    'email', 'e-mail', 'mail', 'correio',
    'telefone', 'celular', 'phone', 'cel', 'fone', 'whatsapp',
    'cargo', 'funcao', 'role', 'ministerio',
    'codigo', 'code', 'tipo', 'type', 'categoria',
    'sexo', 'genero', 'gender', 'idade', 'age',
    'nascimento', 'data nascimento', 'data de nascimento', 'dt nascimento', 'dt. nascimento', 'birthdate', 'birth date',
    'cpf', 'estado civil', 'civil status',
    'profissao', 'ocupacao', 'occupation',
    'escolaridade', 'grau de educacao', 'educacao', 'education',
    'endereco', 'address', 'bairro', 'neighborhood',
    'cidade', 'cidade e estado', 'city',
    'batismo', 'data batismo', 'data de batismo', 'dt batismo', 'dt. batismo', 'baptism', 'baptism date',
    'dizimista', 'e dizimista', 'tither', 'dizimo',
    'ofertante', 'e ofertante', 'oferta', 'offering',
    'engajamento', 'engagement', 'classificacao', 'classification',
    'departamentos', 'departamentos e cargos', 'departments',
    'unidade', 'nome da unidade', 'unidade es',
    'licao', 'tem licao', 'matriculado es', 'matriculado na es', 'escola sabatina',
    'presenca', 'total presenca', 'total de presenca',
    'comunhao', 'missao', 'estudo biblico',
    'batizou alguem', 'religiao anterior', 'instrutor biblico',
    'nome da mae', 'mae', 'nome do pai', 'pai',
    'observacoes', 'obs', 'notas', 'notes',
}
existing = {normalize(x) for x in existing}

print("=== COLUNAS DA PLANILHA QUE NAO TEM MAPEAMENTO ===")
unmapped = []
for col in planilha_cols:
    norm_col = normalize(col)
    if norm_col not in existing:
        unmapped.append((col, norm_col))
        print(f"  - '{col}' -> '{norm_col}'")

print(f"\nTotal nao mapeadas: {len(unmapped)} de {len(planilha_cols)}")
