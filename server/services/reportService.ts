/**
 * Report Service
 * Centraliza lógica de relatórios, estatísticas e exportações
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
// Tipos inferidos do schema do banco

export class ReportService {
  /**
   * Gera relatório de membros por distrito
   */
  async getMembersReport(districtId: number | null = null) {
    try {
      const whereCondition = districtId
        ? and(eq(schema.users.role, 'member'), eq(schema.users.districtId, districtId))
        : eq(schema.users.role, 'member');

      const members = await db
        .select({
          total: count(),
          approved: sql<number>`count(*) FILTER (WHERE ${schema.users.isApproved} = true)`,
          pending: sql<number>`count(*) FILTER (WHERE ${schema.users.isApproved} = false)`,
          donors: sql<number>`count(*) FILTER (WHERE ${schema.users.isDonor} = true)`,
          tithers: sql<number>`count(*) FILTER (WHERE ${schema.users.isTither} = true)`,
        })
        .from(schema.users)
        .where(whereCondition);

      return members[0] || { total: 0, approved: 0, pending: 0, donors: 0, tithers: 0 };
    } catch (error) {
      logger.error('Erro ao gerar relatório de membros:', error);
      return { total: 0, approved: 0, pending: 0, donors: 0, tithers: 0 };
    }
  }

  /**
   * Gera relatório de eventos por período
   */
  async getEventsReport(startDate: Date, endDate: Date, districtId: number | null = null) {
    try {
      const whereConditions = [
        gte(schema.events.date, startDate),
        lte(schema.events.date, endDate),
      ];

      if (districtId) {
        whereConditions.push(eq(schema.events.districtId, districtId));
      }

      const events = await db
        .select()
        .from(schema.events)
        .where(and(...whereConditions))
        .orderBy(desc(schema.events.date));

      return events;
    } catch (error) {
      logger.error('Erro ao gerar relatório de eventos:', error);
      return [];
    }
  }

  // Nota: getTasksReport removido pois não existe tabela 'tasks' no schema

  /**
   * Gera estatísticas de presença
   */
  async getAttendanceStats(districtId: number | null = null) {
    try {
      const whereCondition = districtId ? eq(schema.users.districtId, districtId) : sql`1=1`;

      const stats = await db
        .select({
          totalMembers: count(),
          avgAttendance: sql<number>`avg(${schema.users.attendance})`,
          highAttendance: sql<number>`count(*) FILTER (WHERE ${schema.users.attendance} >= 80)`,
          mediumAttendance: sql<number>`count(*) FILTER (WHERE ${schema.users.attendance} >= 50 AND ${schema.users.attendance} < 80)`,
          lowAttendance: sql<number>`count(*) FILTER (WHERE ${schema.users.attendance} < 50)`,
        })
        .from(schema.users)
        .where(whereCondition);

      return (
        stats[0] || {
          totalMembers: 0,
          avgAttendance: 0,
          highAttendance: 0,
          mediumAttendance: 0,
          lowAttendance: 0,
        }
      );
    } catch (error) {
      logger.error('Erro ao gerar estatísticas de presença:', error);
      return {
        totalMembers: 0,
        avgAttendance: 0,
        highAttendance: 0,
        mediumAttendance: 0,
        lowAttendance: 0,
      };
    }
  }

  /**
   * Gera relatório de crescimento (novos membros por mês)
   */
  async getGrowthReport(months: number = 12, districtId: number | null = null) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const whereConditions = [gte(schema.users.createdAt, startDate)];

      if (districtId) {
        whereConditions.push(eq(schema.users.districtId, districtId));
      }

      const growth = await db
        .select({
          month: sql<string>`to_char(${schema.users.createdAt}, 'YYYY-MM')`,
          count: count(),
        })
        .from(schema.users)
        .where(and(...whereConditions))
        .groupBy(sql`to_char(${schema.users.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.users.createdAt}, 'YYYY-MM')`);

      return growth;
    } catch (error) {
      logger.error('Erro ao gerar relatório de crescimento:', error);
      return [];
    }
  }

  /**
   * Gera dashboard de estatísticas gerais
   */
  async getDashboardStats(districtId: number | null = null) {
    try {
      // Executar queries em paralelo
      const [membersReport, attendanceStats, topMembers] = await Promise.all([
        this.getMembersReport(districtId),
        this.getAttendanceStats(districtId),
        this.getTopMembers(10, districtId),
      ]);

      return {
        members: membersReport,
        attendance: attendanceStats,
        topMembers,
      };
    } catch (error) {
      logger.error('Erro ao gerar dashboard:', error);
      return {
        members: { total: 0, approved: 0, pending: 0, donors: 0, tithers: 0 },
        attendance: {
          totalMembers: 0,
          avgAttendance: 0,
          highAttendance: 0,
          mediumAttendance: 0,
          lowAttendance: 0,
        },
        topMembers: [],
      };
    }
  }

  /**
   * Busca top membros por pontos
   */
  async getTopMembers(limit: number = 10, districtId: number | null = null) {
    try {
      const whereCondition = districtId
        ? and(eq(schema.users.role, 'member'), eq(schema.users.districtId, districtId))
        : eq(schema.users.role, 'member');

      const members = await db
        .select()
        .from(schema.users)
        .where(whereCondition)
        .orderBy(desc(schema.users.points))
        .limit(limit);

      return members;
    } catch (error) {
      logger.error('Erro ao buscar top membros:', error);
      return [];
    }
  }

  /**
   * Gera relatório de aniversariantes do mês
   */
  async getBirthdayReport(month: number, districtId: number | null = null) {
    try {
      const whereConditions = [
        sql`EXTRACT(MONTH FROM ${schema.users.birthDate}) = ${month}`,
      ];

      if (districtId) {
        whereConditions.push(eq(schema.users.districtId, districtId));
      }

      const birthdays = await db
        .select()
        .from(schema.users)
        .where(and(...whereConditions))
        .orderBy(sql`EXTRACT(DAY FROM ${schema.users.birthDate})`);

      return birthdays;
    } catch (error) {
      logger.error('Erro ao gerar relatório de aniversariantes:', error);
      return [];
    }
  }

  /**
   * Exporta dados para CSV (retorna array de objetos)
   */
  async exportToCSV<T>(data: T[]): Promise<string> {
    try {
      if (data.length === 0) return '';

      // Pegar headers do primeiro objeto
      const headers = Object.keys(data[0] as object);
      const csvHeaders = headers.join(',');

      // Converter cada linha
      const csvRows = data.map((row) =>
        headers
          .map((header) => {
            const value = (row as any)[header];
            // Escapar valores com vírgula ou aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(',')
      );

      return [csvHeaders, ...csvRows].join('\n');
    } catch (error) {
      logger.error('Erro ao exportar CSV:', error);
      return '';
    }
  }
}

// Singleton
export const reportService = new ReportService();
export default reportService;
