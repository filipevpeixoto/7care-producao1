/**
 * Dracma Submission Background Job
 * Job que roda periodicamente para processar recibos pendentes e submetê-los ao Dracma
 */

import { logger } from '../utils/logger';
import { sql } from '../neonConfig';
import { DracmaSubmitter } from '../services/dracmaSubmitter';

interface PendingReceipt {
  id: number;
  user_id: number; // ID do pastor (para buscar credenciais)
  district_id: number; // ID do distrito (isolamento multi-pastor)
  merchant_name: string | null;
  receipt_date: string | null; // yyyy-mm-dd from database
  total_amount: string | null;
  category: string | null;
  image_url: string;
  tax_id: string | null;
  dracma_retry_count: number;
}

/**
 * Processa todos os recibos pendentes e submete ao Dracma
 */
export async function processDracmaSubmissions(): Promise<void> {
  logger.info('🔄 [DracmaJob] Iniciando job de submissão ao Dracma...');

  try {
    // Buscar recibos prontos para submissão (inclui district_id)
    const pendingReceipts = await sql<PendingReceipt[]>`
      SELECT
        id, user_id, district_id, merchant_name, receipt_date, total_amount, category,
        image_url, tax_id, dracma_retry_count
      FROM expense_receipts
      WHERE status = 'pending'
        AND dracma_submitted_at IS NULL
        AND dracma_retry_count < 3
      ORDER BY created_at ASC
      LIMIT 10
    `;

    if (pendingReceipts.length === 0) {
      logger.info('✅ [DracmaJob] Nenhum recibo pendente para processar');
      return;
    }

    logger.info(`📋 [DracmaJob] Encontrados ${pendingReceipts.length} recibos para processar`);

    const submitter = new DracmaSubmitter();
    await submitter.init();

    let successCount = 0;
    let errorCount = 0;

    for (const receipt of pendingReceipts) {
      try {
        logger.info(
          `⏳ [DracmaJob] Processando recibo ${receipt.id} (pastor: ${receipt.user_id}, distrito: ${receipt.district_id})...`
        );

        // Converter dados para formato esperado pelo serviço
        await submitter.submitReceipt({
          id: receipt.id,
          userId: receipt.user_id,
          districtId: receipt.district_id,
          merchantName: receipt.merchant_name,
          receiptDate: receipt.receipt_date,
          totalAmount: receipt.total_amount,
          category: receipt.category,
          imageUrl: receipt.image_url,
          taxId: receipt.tax_id,
        });

        successCount++;
        logger.info(`✅ [DracmaJob] Recibo ${receipt.id} submetido com sucesso`);

        // Delay entre submissões para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
      } catch (error) {
        errorCount++;
        logger.error(`❌ [DracmaJob] Falha ao processar recibo ${receipt.id}:`, error);

        // Continuar com próximo recibo mesmo se este falhar
      }
    }

    await submitter.close();

    logger.info(
      `🎯 [DracmaJob] Job concluído: ${successCount} sucessos, ${errorCount} erros (de ${pendingReceipts.length} total)`
    );
  } catch (error) {
    logger.error('❌ [DracmaJob] Erro fatal no job:', error);
    throw error;
  }
}

/**
 * Processa apenas recibos com erro para retry
 */
export async function retryFailedReceipts(): Promise<void> {
  logger.info('🔄 [DracmaJob] Iniciando retry de recibos com erro...');

  try {
    const failedReceipts = await sql<PendingReceipt[]>`
      SELECT
        id, user_id, district_id, merchant_name, receipt_date, total_amount, category,
        image_url, tax_id, dracma_retry_count
      FROM expense_receipts
      WHERE status = 'error'
        AND dracma_retry_count < 3
        AND dracma_retry_count > 0
      ORDER BY updated_at ASC
      LIMIT 5
    `;

    if (failedReceipts.length === 0) {
      logger.info('✅ [DracmaJob] Nenhum recibo com erro para retry');
      return;
    }

    logger.info(`📋 [DracmaJob] Encontrados ${failedReceipts.length} recibos para retry`);

    // Resetar status para pending antes de processar
    for (const receipt of failedReceipts) {
      await sql`
        UPDATE expense_receipts
        SET status = 'pending', updated_at = NOW()
        WHERE id = ${receipt.id}
      `;
    }

    // Processar normalmente
    await processDracmaSubmissions();
  } catch (error) {
    logger.error('❌ [DracmaJob] Erro no retry:', error);
  }
}

/**
 * Busca estatísticas do job para monitoramento
 */
export async function getDracmaJobStats(): Promise<{
  total: number;
  pending: number;
  submitted: number;
  error: number;
  errorWithRetries: number;
}> {
  const stats = await sql<
    {
      total: number;
      pending: number;
      submitted: number;
      error: number;
      error_with_retries: number;
    }[]
  >`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN status = 'error' AND dracma_retry_count >= 3 THEN 1 ELSE 0 END) as error_with_retries
    FROM expense_receipts
  `;

  return {
    total: Number(stats[0].total),
    pending: Number(stats[0].pending),
    submitted: Number(stats[0].submitted),
    error: Number(stats[0].error),
    errorWithRetries: Number(stats[0].error_with_retries),
  };
}

/**
 * Se executado diretamente via CLI, processar manualmente
 * Nota: Em ESM, usamos import.meta.url para verificar se é o módulo principal
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const command = process.argv[2];

  switch (command) {
    case 'run':
      processDracmaSubmissions()
        .then(() => {
          console.log('✅ Job executado com sucesso');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Job falhou:', err);
          process.exit(1);
        });
      break;

    case 'retry':
      retryFailedReceipts()
        .then(() => {
          console.log('✅ Retry executado com sucesso');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Retry falhou:', err);
          process.exit(1);
        });
      break;

    case 'stats':
      getDracmaJobStats()
        .then(stats => {
          console.log('📊 Estatísticas do Job:');
          console.table(stats);
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Erro ao buscar stats:', err);
          process.exit(1);
        });
      break;

    default:
      console.log('Uso: npx tsx server/jobs/dracmaSubmissionJob.ts [run|retry|stats]');
      console.log('');
      console.log('Comandos:');
      console.log('  run   - Processar recibos pendentes');
      console.log('  retry - Tentar novamente recibos com erro');
      console.log('  stats - Exibir estatísticas');
      process.exit(1);
  }
}
