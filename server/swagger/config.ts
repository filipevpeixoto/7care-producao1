/**
 * Configuração do Swagger/OpenAPI
 * Documentação automática da API
 * @version 1.0.0
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '7Care API',
      version: '1.0.0',
      description: `
# Sistema de Gestão para Igrejas - API

## Visão Geral
A API 7Care é uma plataforma completa para gestão de igrejas, incluindo:
- 👥 **Gestão de Membros** - Cadastro, aprovação, perfis
- 🏛️ **Gestão de Igrejas** - Múltiplas igrejas e distritos
- 📅 **Calendário de Eventos** - Eventos e reuniões
- 🎮 **Gamificação** - Sistema de pontos e níveis
- 💬 **Comunicação** - Chat e notificações
- 🗳️ **Eleições** - Sistema de votação

## Autenticação
A API usa autenticação baseada em sessão com header \`x-user-id\`.

## Rate Limiting
- 100 requisições por 15 minutos para endpoints gerais
- 5 tentativas de login por 15 minutos

## Códigos de Status
- \`200\` - Sucesso
- \`201\` - Criado com sucesso
- \`400\` - Requisição inválida
- \`401\` - Não autenticado
- \`403\` - Acesso negado
- \`404\` - Não encontrado
- \`429\` - Muitas requisições
- \`500\` - Erro interno
      `,
      contact: {
        name: '7Care Support',
        email: 'suporte@7care.com.br',
        url: 'https://7care.com.br'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://7care.netlify.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        userId: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID for authentication'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for API access'
        }
      },
      schemas: {
        // ==================== USUÁRIOS ====================
        User: {
          type: 'object',
          description: 'Representa um usuário/membro do sistema',
          properties: {
            id: { type: 'integer', description: 'ID único do usuário', example: 1 },
            name: { type: 'string', description: 'Nome completo', example: 'João Silva' },
            email: { type: 'string', format: 'email', description: 'Email único', example: 'joao@email.com' },
            role: {
              type: 'string',
              enum: ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'],
              description: 'Papel do usuário no sistema',
              example: 'member'
            },
            church: { type: 'string', description: 'Nome da igreja', example: 'Igreja Central' },
            churchCode: { type: 'string', description: 'Código da igreja', example: 'CENTRAL01' },
            districtId: { type: 'integer', nullable: true, description: 'ID do distrito', example: 1 },
            isApproved: { type: 'boolean', description: 'Se usuário foi aprovado', example: true },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'], description: 'Status do usuário', example: 'active' },
            firstAccess: { type: 'boolean', description: 'Primeiro acesso', example: false },
            points: { type: 'integer', description: 'Pontos de gamificação', example: 1500 },
            level: { type: 'string', description: 'Nível de gamificação', example: 'Ouro' },
            phone: { type: 'string', nullable: true, description: 'Telefone', example: '(11) 99999-9999' },
            birthDate: { type: 'string', format: 'date', nullable: true, description: 'Data de nascimento' },
            address: { type: 'string', nullable: true, description: 'Endereço completo' },
            photo: { type: 'string', nullable: true, description: 'URL da foto de perfil' },
            baptismDate: { type: 'string', format: 'date', nullable: true, description: 'Data de batismo' },
            conversionDate: { type: 'string', format: 'date', nullable: true, description: 'Data de conversão' },
            disciplerId: { type: 'integer', nullable: true, description: 'ID do discipulador' },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Data de atualização' }
          },
          required: ['name', 'email', 'role']
        },
        CreateUserRequest: {
          type: 'object',
          description: 'Dados para criar um novo usuário',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Maria Santos' },
            email: { type: 'string', format: 'email', example: 'maria@email.com' },
            password: { type: 'string', minLength: 6, example: '******' },
            role: { type: 'string', enum: ['member', 'interested'], example: 'member' },
            church: { type: 'string', example: 'Igreja Central' },
            churchCode: { type: 'string', example: 'CENTRAL01' },
            phone: { type: 'string', nullable: true, example: '(11) 99999-9999' }
          },
          required: ['name', 'email', 'password', 'church', 'churchCode']
        },
        UpdateUserRequest: {
          type: 'object',
          description: 'Dados para atualizar um usuário',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            phone: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            birthDate: { type: 'string', format: 'date', nullable: true },
            photo: { type: 'string', nullable: true }
          }
        },
        UserList: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            total: { type: 'integer', description: 'Total de usuários', example: 342 },
            page: { type: 'integer', description: 'Página atual', example: 1 },
            limit: { type: 'integer', description: 'Itens por página', example: 20 }
          }
        },
        
        // ==================== IGREJAS ====================
        Church: {
          type: 'object',
          description: 'Representa uma igreja no sistema',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Igreja Central' },
            code: { type: 'string', example: 'CENTRAL01' },
            address: { type: 'string', nullable: true, example: 'Rua Principal, 100' },
            email: { type: 'string', format: 'email', nullable: true, example: 'contato@igreja.com' },
            phone: { type: 'string', nullable: true, example: '(11) 3333-3333' },
            pastor: { type: 'string', nullable: true, description: 'Nome do pastor responsável' },
            districtId: { type: 'integer', nullable: true, description: 'ID do distrito' },
            memberCount: { type: 'integer', description: 'Número de membros', example: 150 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateChurchRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 3, maxLength: 20 },
            address: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            districtId: { type: 'integer', nullable: true }
          },
          required: ['name', 'code']
        },
        
        // ==================== DISTRITOS ====================
        District: {
          type: 'object',
          description: 'Representa um distrito (agrupamento de igrejas)',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Distrito Norte' },
            code: { type: 'string', example: 'DN01' },
            pastorId: { type: 'integer', nullable: true, description: 'ID do pastor responsável' },
            description: { type: 'string', nullable: true, example: 'Região norte da cidade' },
            churchCount: { type: 'integer', description: 'Número de igrejas', example: 5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateDistrictRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            pastorId: { type: 'integer', nullable: true },
            description: { type: 'string', nullable: true }
          },
          required: ['name', 'code']
        },
        
        // ==================== EVENTOS ====================
        Event: {
          type: 'object',
          description: 'Representa um evento no calendário',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Culto de Domingo' },
            description: { type: 'string', nullable: true, example: 'Culto dominical às 19h' },
            date: { type: 'string', format: 'date-time', description: 'Data e hora de início' },
            endDate: { type: 'string', format: 'date-time', nullable: true, description: 'Data e hora de término' },
            location: { type: 'string', nullable: true, example: 'Templo principal' },
            type: { type: 'string', enum: ['culto', 'reuniao', 'evento', 'treinamento', 'outro'], example: 'culto' },
            color: { type: 'string', nullable: true, example: '#3B82F6' },
            capacity: { type: 'integer', nullable: true, description: 'Capacidade máxima', example: 200 },
            isRecurring: { type: 'boolean', description: 'Se é evento recorrente', example: true },
            recurrenceRule: { type: 'string', nullable: true, description: 'Regra de recorrência RRULE' },
            createdBy: { type: 'integer', nullable: true, description: 'ID do criador' },
            churchId: { type: 'integer', nullable: true, description: 'ID da igreja' }
          }
        },
        CreateEventRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', nullable: true },
            date: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            location: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['culto', 'reuniao', 'evento', 'treinamento', 'outro'] },
            color: { type: 'string', nullable: true },
            capacity: { type: 'integer', nullable: true },
            isRecurring: { type: 'boolean' }
          },
          required: ['title', 'date', 'type']
        },
        
        // ==================== REUNIÕES ====================
        Meeting: {
          type: 'object',
          description: 'Representa uma reunião (célula, GC, etc)',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Célula Centro' },
            date: { type: 'string', format: 'date-time' },
            location: { type: 'string', nullable: true },
            leaderId: { type: 'integer', description: 'ID do líder' },
            attendees: { type: 'array', items: { type: 'integer' }, description: 'IDs dos participantes' },
            notes: { type: 'string', nullable: true },
            churchId: { type: 'integer', nullable: true }
          }
        },
        
        // ==================== MENSAGENS/CHAT ====================
        Message: {
          type: 'object',
          description: 'Representa uma mensagem de chat',
          properties: {
            id: { type: 'integer', example: 1 },
            content: { type: 'string', example: 'Olá! Tudo bem?' },
            senderId: { type: 'integer', description: 'ID do remetente' },
            recipientId: { type: 'integer', nullable: true, description: 'ID do destinatário (null se for grupo)' },
            conversationId: { type: 'integer', description: 'ID da conversa' },
            isRead: { type: 'boolean', example: false },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Conversation: {
          type: 'object',
          description: 'Representa uma conversa/chat',
          properties: {
            id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['direct', 'group'], example: 'direct' },
            name: { type: 'string', nullable: true, description: 'Nome (para grupos)' },
            participants: { type: 'array', items: { type: 'integer' } },
            lastMessage: { $ref: '#/components/schemas/Message' },
            unreadCount: { type: 'integer', example: 3 },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        SendMessageRequest: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            conversationId: { type: 'integer' }
          },
          required: ['content', 'conversationId']
        },
        
        // ==================== NOTIFICAÇÕES ====================
        Notification: {
          type: 'object',
          description: 'Representa uma notificação',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', description: 'ID do usuário destinatário' },
            type: { type: 'string', enum: ['info', 'warning', 'success', 'error', 'message', 'event'], example: 'info' },
            title: { type: 'string', example: 'Nova mensagem' },
            message: { type: 'string', example: 'Você recebeu uma nova mensagem.' },
            isRead: { type: 'boolean', example: false },
            link: { type: 'string', nullable: true, description: 'Link para ação relacionada' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // ==================== ORAÇÕES ====================
        Prayer: {
          type: 'object',
          description: 'Representa um pedido de oração',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', description: 'ID do autor' },
            title: { type: 'string', example: 'Pela família' },
            description: { type: 'string', example: 'Orar pela saúde da família.' },
            isPublic: { type: 'boolean', example: true },
            isAnswered: { type: 'boolean', example: false },
            prayerCount: { type: 'integer', description: 'Número de pessoas orando', example: 15 },
            createdAt: { type: 'string', format: 'date-time' },
            answeredAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        CreatePrayerRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            isPublic: { type: 'boolean' }
          },
          required: ['title', 'description']
        },
        
        // ==================== TAREFAS ====================
        Task: {
          type: 'object',
          description: 'Representa uma tarefa',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Preparar estudo bíblico' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], example: 'pending' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'medium' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            assignedTo: { type: 'integer', nullable: true, description: 'ID do responsável' },
            createdBy: { type: 'integer', description: 'ID do criador' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', nullable: true },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            assignedTo: { type: 'integer', nullable: true }
          },
          required: ['title']
        },
        
        // ==================== ELEIÇÕES ====================
        Election: {
          type: 'object',
          description: 'Representa uma eleição',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Eleição para diácono' },
            description: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['draft', 'active', 'closed', 'cancelled'], example: 'active' },
            candidates: { type: 'array', items: { $ref: '#/components/schemas/Candidate' } },
            totalVotes: { type: 'integer', example: 150 },
            churchId: { type: 'integer', nullable: true },
            createdBy: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Candidate: {
          type: 'object',
          description: 'Representa um candidato em eleição',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', description: 'ID do usuário candidato' },
            electionId: { type: 'integer' },
            votes: { type: 'integer', example: 45 },
            position: { type: 'string', nullable: true, example: 'Diácono' }
          }
        },
        Vote: {
          type: 'object',
          description: 'Representa um voto',
          properties: {
            id: { type: 'integer', example: 1 },
            electionId: { type: 'integer' },
            candidateId: { type: 'integer' },
            voterId: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateElectionRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            candidates: { type: 'array', items: { type: 'integer' }, description: 'IDs dos candidatos' }
          },
          required: ['title', 'startDate', 'endDate', 'candidates']
        },
        CastVoteRequest: {
          type: 'object',
          properties: {
            electionId: { type: 'integer' },
            candidateId: { type: 'integer' }
          },
          required: ['electionId', 'candidateId']
        },
        
        // ==================== GAMIFICAÇÃO ====================
        PointsConfig: {
          type: 'object',
          description: 'Configuração de pontos do sistema de gamificação',
          properties: {
            id: { type: 'integer' },
            criteria: { type: 'string', example: 'hasPhoto' },
            points: { type: 'integer', example: 100 },
            description: { type: 'string', example: 'Pontos por ter foto de perfil' },
            isActive: { type: 'boolean' }
          }
        },
        UserPoints: {
          type: 'object',
          description: 'Pontuação detalhada de um usuário',
          properties: {
            userId: { type: 'integer' },
            totalPoints: { type: 'integer', example: 1500 },
            level: { type: 'string', example: 'Ouro' },
            breakdown: {
              type: 'object',
              properties: {
                hasPhoto: { type: 'integer', example: 100 },
                hasBio: { type: 'integer', example: 50 },
                isApproved: { type: 'integer', example: 200 },
                isBaptized: { type: 'integer', example: 300 },
                eventsAttended: { type: 'integer', example: 400 },
                disciplesCount: { type: 'integer', example: 450 }
              }
            },
            rank: { type: 'integer', description: 'Posição no ranking', example: 15 }
          }
        },
        
        // ==================== DISCIPULADO ====================
        DiscipleshipRequest: {
          type: 'object',
          description: 'Solicitação de discipulado',
          properties: {
            id: { type: 'integer' },
            requesterId: { type: 'integer', description: 'ID do solicitante' },
            disciplerId: { type: 'integer', description: 'ID do discipulador' },
            status: { type: 'string', enum: ['pending', 'accepted', 'rejected'], example: 'pending' },
            message: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            respondedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        
        // ==================== RELACIONAMENTOS ====================
        Relationship: {
          type: 'object',
          description: 'Relacionamento entre usuários',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            relatedUserId: { type: 'integer' },
            type: { type: 'string', enum: ['family', 'friend', 'mentor', 'disciple'], example: 'mentor' },
            status: { type: 'string', enum: ['pending', 'active', 'inactive'], example: 'active' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // ==================== DASHBOARD ====================
        DashboardStats: {
          type: 'object',
          description: 'Estatísticas do dashboard',
          properties: {
            totalUsers: { type: 'integer', example: 342 },
            activeUsers: { type: 'integer', example: 280 },
            pendingApprovals: { type: 'integer', example: 15 },
            eventsThisMonth: { type: 'integer', example: 8 },
            prayerRequests: { type: 'integer', example: 45 },
            averagePoints: { type: 'number', example: 1250.5 },
            topUsers: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            recentActivity: { type: 'array', items: { type: 'object' } }
          }
        },
        
        // ==================== RESPOSTAS PADRÃO ====================
        ApiResponse: {
          type: 'object',
          description: 'Resposta padrão da API',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', description: 'Dados da resposta' },
            message: { type: 'string', example: 'Operação realizada com sucesso' }
          }
        },
        ErrorResponse: {
          type: 'object',
          description: 'Resposta de erro da API',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Recurso não encontrado' },
            code: { type: 'string', example: 'NOT_FOUND' },
            details: { type: 'array', items: { type: 'object' }, description: 'Detalhes adicionais do erro' }
          }
        },
        ValidationError: {
          type: 'object',
          description: 'Erro de validação',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Erro de validação' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Email inválido' }
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          description: 'Resposta paginada',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 342 },
                totalPages: { type: 'integer', example: 18 },
                hasNext: { type: 'boolean', example: true },
                hasPrev: { type: 'boolean', example: false }
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          description: 'Requisição de login',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@email.com' },
            password: { type: 'string', example: '******' }
          }
        },
        LoginResponse: {
          type: 'object',
          description: 'Resposta de login bem-sucedido',
          properties: {
            success: { type: 'boolean', example: true },
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', description: 'JWT token (se aplicável)' }
          }
        },
        
        // ==================== UPLOAD ====================
        FileUpload: {
          type: 'object',
          description: 'Informações de arquivo enviado',
          properties: {
            id: { type: 'string', example: '0030864ef77ac39a1ecfdd2f25d56fb9' },
            filename: { type: 'string', example: 'foto_perfil.jpg' },
            mimetype: { type: 'string', example: 'image/jpeg' },
            size: { type: 'integer', example: 102400 },
            url: { type: 'string', example: '/uploads/0030864ef77ac39a1ecfdd2f25d56fb9' }
          }
        },
        
        // ==================== VISITAS ====================
        Visit: {
          type: 'object',
          description: 'Registro de visita/presença',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            eventId: { type: 'integer', nullable: true },
            date: { type: 'string', format: 'date-time' },
            type: { type: 'string', enum: ['culto', 'celula', 'reuniao', 'evento'], example: 'culto' },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        MarkVisitRequest: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            eventId: { type: 'integer', nullable: true },
            date: { type: 'string', format: 'date-time' },
            type: { type: 'string', enum: ['culto', 'celula', 'reuniao', 'evento'] }
          },
          required: ['userId', 'date', 'type']
        }
      },
      responses: {
        NotFound: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Recurso não encontrado',
                code: 'NOT_FOUND'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Não autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Autenticação necessária',
                code: 'UNAUTHORIZED'
              }
            }
          }
        },
        Forbidden: {
          description: 'Acesso negado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Você não tem permissão para esta ação',
                code: 'FORBIDDEN'
              }
            }
          }
        },
        BadRequest: {
          description: 'Requisição inválida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' }
            }
          }
        },
        TooManyRequests: {
          description: 'Muitas requisições',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Muitas requisições. Tente novamente em alguns minutos.',
                code: 'RATE_LIMIT_EXCEEDED'
              }
            }
          }
        },
        InternalError: {
          description: 'Erro interno do servidor',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
              }
            }
          }
        }
      },
      parameters: {
        userId: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'ID do usuário'
        },
        churchId: {
          name: 'churchId',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'ID da igreja'
        },
        eventId: {
          name: 'eventId',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'ID do evento'
        },
        page: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Número da página'
        },
        limit: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 100 },
          description: 'Itens por página'
        },
        search: {
          name: 'search',
          in: 'query',
          schema: { type: 'string' },
          description: 'Termo de busca'
        },
        sortBy: {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string' },
          description: 'Campo para ordenação'
        },
        sortOrder: {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          description: 'Direção da ordenação'
        }
      }
    },
    tags: [
      { name: 'System', description: '🔧 System health and status endpoints' },
      { name: 'Auth', description: '🔐 Authentication and authorization' },
      { name: 'Users', description: '👥 User management (CRUD, search, filters)' },
      { name: 'Churches', description: '🏛️ Church management' },
      { name: 'Districts', description: '📍 District management' },
      { name: 'Events', description: '📅 Event and calendar management' },
      { name: 'Meetings', description: '🤝 Meeting management (células, GCs)' },
      { name: 'Relationships', description: '💞 User relationships management' },
      { name: 'Discipleship', description: '📖 Discipleship requests and management' },
      { name: 'Messages', description: '💬 Chat and messaging' },
      { name: 'Notifications', description: '🔔 Push notifications' },
      { name: 'Prayers', description: '🙏 Prayer requests management' },
      { name: 'Tasks', description: '✅ Task management' },
      { name: 'Points', description: '🎮 Gamification and points system' },
      { name: 'Elections', description: '🗳️ Election and voting system' },
      { name: 'Dashboard', description: '📊 Dashboard statistics' },
      { name: 'Settings', description: '⚙️ System settings' },
      { name: 'Upload', description: '📤 File upload endpoints' },
      { name: 'Visits', description: '📋 Visit/attendance tracking' }
    ],
    security: [{ userId: [] }]
  },
  apis: [
    './server/routes/*.ts',
    './server/electionRoutes.ts',
    './server/districtRoutes.ts',
    './server/importRoutes.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
