import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Carregar variáveis de ambiente
config();

const sql = neon(process.env.DATABASE_URL!);

async function recalcularCamposVazios() {
  console.log('🔄 Recalculando campo campos_vazios baseado em dados reais...\n');

  try {
    // Buscar todos os usuários
    const users = await sql`SELECT id, name, email, address, birth_date, baptism_date, civil_status, occupation, education, church, church_code FROM users WHERE role != 'admin'`;
    console.log(`✅ ${users.length} usuários encontrados\n`);

    let updated = 0;
    let comCamposCompletos = 0;
    let comCamposVazios = 0;

    for (const user of users) {
      // Campos essenciais para considerar "completo"
      const camposParaVerificar = [
        user.name,
        user.email,
        user.address,
        user.birth_date,
        user.baptism_date,
        user.civil_status,
        user.occupation,
        user.education,
        user.church,
        user.church_code
      ];

      // Verificar quantos campos estão preenchidos
      const camposPreenchidos = camposParaVerificar.filter(campo => 
        campo !== null && 
        campo !== undefined && 
        campo !== '' && 
        campo.toString().trim() !== ''
      ).length;

      // Se todos os 10 campos essenciais estão preenchidos, não tem campos vazios
      const temCamposVazios = camposPreenchidos < 10;

      // Atualizar no banco
      await sql`
        UPDATE users 
        SET campos_vazios = ${temCamposVazios}
        WHERE id = ${user.id}
      `;

      if (temCamposVazios) {
        comCamposVazios++;
      } else {
        comCamposCompletos++;
      }

      updated++;

      if (updated % 50 === 0) {
        console.log(`   ✓ ${updated} usuários processados...`);
      }
    }

    console.log(`\n✅ Recálculo concluído!`);
    console.log(`   📊 ${updated} usuários processados`);
    console.log(`   ✅ ${comCamposCompletos} usuários com dados completos (ganham pontos)`);
    console.log(`   ❌ ${comCamposVazios} usuários com campos vazios (não ganham pontos)`);

    // Recalcular pontos de todos após corrigir campos_vazios
    console.log('\n🔄 Forçando recálculo de pontos após correção...');
    
    // Buscar configuração
    const configRow = await sql`SELECT * FROM points_configuration LIMIT 1`;
    if (configRow.length === 0) {
      console.log('⚠️  Sem configuração de pontos no banco');
      return;
    }

    const pontosConfig = configRow[0];
    let recalculados = 0;

    // Buscar usuários novamente com todas as colunas
    const usersComplete = await sql`SELECT * FROM users WHERE role != 'admin'`;

    for (const user of usersComplete) {
      try {
        let totalPoints = 0;

        // Cálculo simplificado direto
        if (user.engajamento?.toLowerCase().includes('alto')) totalPoints += pontosConfig.engajamento.alto || 0;
        else if (user.engajamento?.toLowerCase().includes('medio')) totalPoints += pontosConfig.engajamento.medio || 0;
        else if (user.engajamento?.toLowerCase().includes('baixo')) totalPoints += pontosConfig.engajamento.baixo || 0;

        if (user.classificacao?.toLowerCase().includes('frequente')) totalPoints += pontosConfig.classificacao.frequente || 0;
        else if (user.classificacao) totalPoints += pontosConfig.classificacao.naoFrequente || 0;

        if (user.dizimista_type?.toLowerCase().includes('recorrente')) totalPoints += pontosConfig.dizimista.recorrente || 0;
        else if (user.dizimista_type?.toLowerCase().includes('sazonal')) totalPoints += pontosConfig.dizimista.sazonal || 0;
        else if (user.dizimista_type?.toLowerCase().includes('pontual')) totalPoints += pontosConfig.dizimista.pontual || 0;

        if (user.ofertante_type?.toLowerCase().includes('recorrente')) totalPoints += pontosConfig.ofertante.recorrente || 0;
        else if (user.ofertante_type?.toLowerCase().includes('sazonal')) totalPoints += pontosConfig.ofertante.sazonal || 0;
        else if (user.ofertante_type?.toLowerCase().includes('pontual')) totalPoints += pontosConfig.ofertante.pontual || 0;

        if (user.tempo_batismo_anos >= 30) totalPoints += pontosConfig.tempobatismo.maisVinte || 0;
        else if (user.tempo_batismo_anos >= 20) totalPoints += pontosConfig.tempobatismo.vinteAnos || 0;
        else if (user.tempo_batismo_anos >= 10) totalPoints += pontosConfig.tempobatismo.dezAnos || 0;
        else if (user.tempo_batismo_anos >= 5) totalPoints += pontosConfig.tempobatismo.cincoAnos || 0;
        else if (user.tempo_batismo_anos >= 2) totalPoints += pontosConfig.tempobatismo.doisAnos || 0;

        if (user.departamentos_cargos) {
          const numCargos = user.departamentos_cargos.split(';').filter((c: string) => c.trim()).length;
          if (numCargos >= 3) totalPoints += pontosConfig.cargos.tresOuMais || 0;
          else if (numCargos === 2) totalPoints += pontosConfig.cargos.doisCargos || 0;
          else if (numCargos === 1) totalPoints += pontosConfig.cargos.umCargo || 0;
        }

        if (user.nome_unidade) totalPoints += pontosConfig.nomeunidade.comUnidade || 0;
        if (user.tem_licao === true) totalPoints += pontosConfig.temlicao.comLicao || 0;

        if (user.total_presenca >= 8) totalPoints += pontosConfig.totalpresenca.oitoATreze || 0;
        else if (user.total_presenca >= 4) totalPoints += pontosConfig.totalpresenca.quatroASete || 0;
        else if (user.total_presenca > 0) totalPoints += pontosConfig.totalpresenca.zeroATres || 0;

        if (user.comunhao > 0) totalPoints += user.comunhao * (pontosConfig.escolasabatina.comunhao || 0);
        if (user.missao > 0) totalPoints += user.missao * (pontosConfig.escolasabatina.missao || 0);
        if (user.estudo_biblico > 0) totalPoints += user.estudo_biblico * (pontosConfig.escolasabatina.estudoBiblico || 0);
        if (user.batizou_alguem === true) totalPoints += pontosConfig.escolasabatina.batizouAlguem || 0;
        if (user.disc_pos_batismal > 0) totalPoints += user.disc_pos_batismal * (pontosConfig.escolasabatina.discipuladoPosBatismo || 0);
        if (user.cpf_valido === true) totalPoints += pontosConfig.cpfvalido.valido || 0;
        
        // CORRIGIDO: Se NÃO tem campos vazios (campos_vazios = false), ganha pontos
        if (user.campos_vazios === false) totalPoints += pontosConfig.camposvaziosacms.completos || 0;

        const finalPoints = Math.round(totalPoints);

        // Atualizar se mudou
        if (user.points !== finalPoints) {
          await sql`UPDATE users SET points = ${finalPoints} WHERE id = ${user.id}`;
          recalculados++;
        }

      } catch (error) {
        console.error(`❌ Erro ao processar ${user.name}:`, error);
      }
    }

    console.log(`✅ ${recalculados} usuários tiveram pontos recalculados\n`);
    console.log('🎉 Script finalizado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

// Executar
recalcularCamposVazios()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });

