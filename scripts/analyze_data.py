#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Análise de dados da planilha DRACMA"""

import pandas as pd
import os

file_path = os.path.expanduser('~/Downloads/Santana do Livramento.xlsx')
df = pd.read_excel(file_path)

print("=== AMOSTRA DE DADOS DA PLANILHA ===\n")

# Data de Nascimento
print("DATA NASCIMENTO (primeiras 10 linhas):")
print(df['Nascimento'].head(10).to_string())
print(f"   Tipo: {df['Nascimento'].dtype}")
print()

# Batismo
print("DATA BATISMO (primeiras 10 linhas):")
print(df['Batismo'].head(10).to_string())
print(f"   Tipo: {df['Batismo'].dtype}")
print()

# Tempo de batismo - anos
print("TEMPO DE BATISMO - ANOS (primeiras 10 linhas):")
print(df['Tempo de batismo - anos'].head(10).to_string())
print(f"   Tipo: {df['Tempo de batismo - anos'].dtype}")
print()

# Idade
print("IDADE (primeiras 10 linhas):")
print(df['Idade'].head(10).to_string())
print(f"   Tipo: {df['Idade'].dtype}")
print()

# Dizimista
print("DIZIMISTA (primeiras 10 linhas):")
print(df['Dizimista'].head(10).to_string())
print(f"   Tipo: {df['Dizimista'].dtype}")
print()

# Ofertante
print("OFERTANTE (primeiras 10 linhas):")
print(df['Ofertante'].head(10).to_string())
print(f"   Tipo: {df['Ofertante'].dtype}")
print()

# Engajamento e Classificacao
print("ENGAJAMENTO (primeiras 10 linhas):")
print(df['Engajamento'].head(10).to_string())
print()

print("CLASSIFICACAO (primeiras 10 linhas):")
print(df['Classificação'].head(10).to_string())
print()

# Comunhao, Missao
print("COMUNHAO (primeiras 10 linhas):")
print(df['Comunhão'].head(10).to_string())
print(f"   Tipo: {df['Comunhão'].dtype}")
print()

print("MISSAO (primeiras 10 linhas):")
print(df['Missão'].head(10).to_string())
print(f"   Tipo: {df['Missão'].dtype}")
print()

# CPF Valido
print("CPF VALIDO (primeiras 10 linhas):")
print(df['CPF válido'].head(10).to_string())
print(f"   Tipo: {df['CPF válido'].dtype}")
print()

# Tem licao
print("TEM LICAO (primeiras 10 linhas):")
print(df['Tem lição'].head(10).to_string())
print(f"   Tipo: {df['Tem lição'].dtype}")
print()

# Batizou alguem
print("BATIZOU ALGUEM (primeiras 10 linhas):")
print(df['Batizou alguém'].head(10).to_string())
print(f"   Tipo: {df['Batizou alguém'].dtype}")
print()

# Total presenca
print("TOTAL PRESENCA NO CARTAO (primeiras 10 linhas):")
print(df['Total presença no cartão'].head(10).to_string())
print(f"   Tipo: {df['Total presença no cartão'].dtype}")
print()

# Valores unicos de alguns campos
print("\n=== VALORES UNICOS ===\n")
print(f"Dizimista valores unicos: {df['Dizimista'].unique()[:10]}")
print(f"Ofertante valores unicos: {df['Ofertante'].unique()[:10]}")
print(f"CPF Valido valores unicos: {df['CPF válido'].unique()}")
print(f"Tem licao valores unicos: {df['Tem lição'].unique()}")
print(f"Batizou alguem valores unicos: {df['Batizou alguém'].unique()}")
