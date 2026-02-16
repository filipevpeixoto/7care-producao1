import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Briefcase,
  Edit,
  Gift,
  GraduationCap,
  Heart,
  Phone,
  Star,
  User,
  Users,
} from 'lucide-react';
import { ariaLabels } from '@/lib/accessibility';
import {
  calculateAge,
  calculateYearsSince,
  formatDate,
  formatDateForDisplay,
  getCivilStatusLabel,
  getRoleLabel,
} from './userDetailUtils';
import type { ReactNode } from 'react';
import type { UserMember } from '@/types/domain';

interface UserDetailSectionsProps {
  user: UserMember;
  extraData: Record<string, string | number | boolean | null | undefined>;
  phoneWarning: { hasWarning: boolean; originalPhone?: string };
  departments: string[];
  renderEditableField: (
    field: string,
    label: string,
    value: string | number | boolean | null | undefined,
    type?: 'text' | 'textarea' | 'select',
    options?: string[]
  ) => JSX.Element;
  onStartEditing: (field: string, currentValue: string | number | boolean | null) => void;
}

const renderInfoItem = (label: string, value: ReactNode) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <p className="text-sm text-muted-foreground mt-1">{value}</p>
  </div>
);

export const UserDetailSections = ({
  user,
  extraData,
  phoneWarning,
  departments,
  renderEditableField,
  onStartEditing,
}: UserDetailSectionsProps) => (
  <>
    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Básicas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>{renderEditableField('church', 'Igreja', user.church)}</div>
          <div>{renderEditableField('name', 'Nome', user.name)}</div>
          <div>
            {renderEditableField('church_code', 'Código', user.church_code || user.churchCode)}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tipo</label>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
            </div>
          </div>
          <div>{renderEditableField('extraData.sexo', 'Sexo', extraData.sexo)}</div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Idade</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {extraData.idade || calculateAge(user.birth_date || user.birthDate)}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Nascimento</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateForDisplay(user.birth_date || user.birthDate)}
            </p>
          </div>
          <div>{renderEditableField('engajamento', 'Engajamento', user.engajamento)}</div>
          <div>{renderEditableField('classificacao', 'Classificação', user.classificacao)}</div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Estado Civil</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getCivilStatusLabel(user.civil_status || user.civilStatus)}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ocupação</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.occupation || 'Não informado'}</p>
          </div>
          {renderInfoItem('Educação', user.education || 'Não informado')}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Status</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <Badge
                variant={
                  user.status === 'active' || user.status === 'approved' ? 'default' : 'secondary'
                }
              >
                {user.status === 'active' || user.status === 'approved'
                  ? 'Ativo'
                  : user.status === 'pending'
                    ? 'Pendente'
                    : user.status === 'inactive'
                      ? 'Inativo'
                      : 'Rejeitado'}
              </Badge>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Dízimos e Ofertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem('Classificação', user.level || 'Iniciante')}
          <div>
            <label className="text-sm font-medium">Dizimista</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.is_donor || user.isDonor ? 'default' : 'secondary'}>
                {extraData.dizimistaOriginal ||
                  user.dizimista_type ||
                  (user.is_donor || user.isDonor ? 'Sim' : 'Não')}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">É Dizimista (DB)</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.is_tither || user.isTither ? 'default' : 'secondary'}>
                {user.is_tither || user.isTither ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">É Doador</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.is_donor || user.isDonor ? 'default' : 'secondary'}>
                {user.is_donor || user.isDonor ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          {renderInfoItem('Dízimos - 12m', extraData.dizimos12m || 'Não informado')}
          {renderInfoItem('Último dízimo - 12m', formatDate(extraData.ultimoDizimo))}
          {renderInfoItem('Valor dízimo - 12m', extraData.valorDizimo || 'Não informado')}
          {renderInfoItem(
            'Número de meses s/ dizimar',
            extraData.numeroMesesSemDizimar || 'Não informado'
          )}
          {renderInfoItem(
            'Dizimista antes do últ. dízimo',
            extraData.dizimistaAntesUltimoDizimo || 'Não informado'
          )}
          <div>
            <label className="text-sm font-medium">Ofertante</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.isOffering ? 'default' : 'secondary'}>
                {extraData.ofertanteOriginal ||
                  user.ofertante_type ||
                  (user.isOffering ? 'Sim' : 'Não')}
              </Badge>
            </div>
          </div>
          {renderInfoItem('Ofertas - 12m', extraData.ofertas12m || 'Não informado')}
          {renderInfoItem('Última oferta - 12m', formatDate(extraData.ultimaOferta))}
          {renderInfoItem('Valor oferta - 12m', extraData.valorOferta || 'Não informado')}
          {renderInfoItem(
            'Número de meses s/ ofertar',
            extraData.numeroMesesSemOfertar || 'Não informado'
          )}
          {renderInfoItem(
            'Ofertante antes da últ. oferta',
            extraData.ofertanteAntesUltimaOferta || 'Não informado'
          )}
          {renderInfoItem('Último movimento', extraData.ultimoMovimento || 'Não informado')}
          {renderInfoItem('Data do último movimento', formatDate(extraData.dataUltimoMovimento))}
          {renderInfoItem('Tipo de entrada', extraData.tipoEntrada || 'Não informado')}
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Batismo e Vida Espiritual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem(
            'Tempo de batismo',
            calculateYearsSince(user.baptism_date || user.baptismDate)
          )}
          {renderInfoItem('Batismo', formatDate(user.baptism_date || user.baptismDate))}
          {renderInfoItem(
            'Tempo de batismo',
            extraData.tempoBatismo || calculateYearsSince(user.baptism_date || user.baptismDate)
          )}
          {renderInfoItem('Localidade do batismo', extraData.localidadeBatismo || 'Não informado')}
          {renderInfoItem('Batizado por', extraData.batizadoPor || 'Não informado')}
          {renderInfoItem('Idade no Batismo', extraData.idadeBatismo || 'Não informado')}
          {renderInfoItem(
            'Tempo de batismo - anos',
            calculateYearsSince(user.baptism_date || user.baptismDate)
          )}
          {renderInfoItem('Religião anterior', user.previousReligion || 'Não informado')}
          {renderInfoItem('Como conheceu a IASD', extraData.comoConheceu || 'Não informado')}
          {renderInfoItem('Fator decisivo', extraData.fatorDecisivo || 'Não informado')}
          {renderInfoItem('Como estudou a Bíblia', extraData.comoEstudou || 'Não informado')}
          {renderInfoItem('Tipo de Entrada', extraData.tipoEntrada || 'Não informado')}
          {renderInfoItem(
            'Instrutor bíblico',
            user.biblicalInstructor || extraData.instrutorBiblico || 'Não informado'
          )}
          {renderInfoItem('Instrutor bíblico 2', extraData.instrutorBiblico2 || 'Não informado')}
          {renderInfoItem('Tem cargo', extraData.temCargo || 'Não informado')}
          {renderInfoItem('Teen', extraData.teen || 'Não informado')}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Departamentos e cargos</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {departments.length > 0 ? (
                departments.map((dept: string, index: number) => (
                  <Badge key={index} variant="secondary" data-testid={`badge-department-${index}`}>
                    {dept}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhum departamento</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Informações Familiares
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem('Nome da mãe', extraData.nomeMae || 'Não informado')}
          {renderInfoItem('Nome do pai', extraData.nomePai || 'Não informado')}
          {renderInfoItem('Estado civil', getCivilStatusLabel(user.civilStatus))}
          {renderInfoItem('Data de casamento', formatDate(extraData.dataCasamento))}
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Educação e Profissão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem('Grau de educação', user.education || 'Não informado')}
          {renderInfoItem('Ocupação', user.occupation || 'Não informado')}
          {renderInfoItem('Endereço Completo', user.address || 'Não informado')}
          {renderInfoItem(
            'Religião Anterior',
            user.previous_religion ||
              user.previousReligion ||
              (extraData.comoConheceu === 'Família/parentes' ? 'Nenhuma' : 'Não informado')
          )}
          {renderInfoItem(
            'Instrutor Bíblico',
            user.biblical_instructor ||
              user.biblicalInstructor ||
              extraData.batizadoPor ||
              'Não informado'
          )}
          <div>
            <label className="text-sm font-medium">Primeiro Acesso</label>
            <p className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.first_access || user.firstAccess ? 'default' : 'secondary'}>
                {user.first_access || user.firstAccess ? 'Sim' : 'Não'}
              </Badge>
            </p>
          </div>
          {renderInfoItem('Aluno educação Adv.', extraData.alunoEducacao || 'Não informado')}
          {renderInfoItem('Parentesco p/ c/ aluno', extraData.parentesco || 'Não informado')}
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contato e Endereço
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                Celular
                {phoneWarning.hasWarning && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartEditing('phone', user.phone ?? null)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                aria-label={ariaLabels.editField('Celular')}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mt-1">
                {user.phone || 'Não informado'}
              </p>
              {phoneWarning.hasWarning && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    <strong>Telefone original:</strong> {phoneWarning.originalPhone}
                    <br />
                    <span className="text-muted-foreground">
                      Telefone muito curto durante a importação
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>{renderEditableField('email', 'Email', user.email)}</div>
          <div>
            {renderEditableField('extraData.cidadeEstado', 'Cidade e Estado', extraData.cidadeEstado)}
          </div>
          <div>{renderEditableField('extraData.bairro', 'Bairro', extraData.bairro)}</div>
          <div className="md:col-span-2">
            {renderEditableField('address', 'Endereço', user.address, 'textarea')}
          </div>
          <div>
            {renderEditableField(
              'extraData.cidadeNascimento',
              'Cidade de nascimento',
              extraData.cidadeNascimento
            )}
          </div>
          <div>
            {renderEditableField(
              'extraData.estadoNascimento',
              'Estado de nascimento',
              extraData.estadoNascimento
            )}
          </div>
          <div>{renderEditableField('cpf', 'CPF', user.cpf)}</div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">CPF válido</label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.cpf_valido ? 'default' : 'secondary'}>
                {user.cpf_valido ? 'Sim' : 'Não'}
              </Badge>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Escola Sabatina
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem(
            'Nome da unidade',
            user.nome_unidade || extraData.cidadeEstado || 'Não informado'
          )}
          <div>
            <label className="text-sm font-medium">Matriculado na ES</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.isEnrolledES ? 'default' : 'secondary'}>
                {user.isEnrolledES ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tem lição</label>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.tem_licao || user.hasLesson ? 'default' : 'secondary'}>
                {user.tem_licao || user.hasLesson ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          {renderInfoItem('Período ES', user.esPeriod || 'Não informado')}
          {renderInfoItem('Comunhão', user.comunhao ?? 'Não informado')}
          {renderInfoItem('Missão', user.missao ?? 'Não informado')}
          {renderInfoItem('Estudo bíblico', user.estudo_biblico ?? 'Não informado')}
          {renderInfoItem('Batizou alguém', user.batizou_alguem ? 'Sim' : 'Não')}
          {renderInfoItem('Disc. pós batismal', user.disc_pos_batismal ?? 'Não informado')}
          {renderInfoItem('Total presença no cartão', extraData.presencaTotal || 'Não informado')}
          {renderInfoItem('Presença no quiz local', extraData.presencaQuizLocal || 'Não informado')}
          {renderInfoItem(
            'Presença no quiz outra unidade',
            extraData.presencaQuizOutraUnidade || 'Não informado'
          )}
          {renderInfoItem('Presença no quiz online', extraData.presencaQuizOnline || 'Não informado')}
          {renderInfoItem('Total de presença', user.total_presenca ?? user.attendance ?? 0)}
          {renderInfoItem('Teve participação', extraData.teveParticipacao || 'Não informado')}
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-divine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Colaboração e Outros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInfoItem('Campo - colaborador', extraData.campoColaborador || 'Não informado')}
          {renderInfoItem('Área - colaborador', extraData.areaColaborador || 'Não informado')}
          {renderInfoItem(
            'Estabelecimento - colaborador',
            extraData.estabelecimentoColaborador || 'Não informado'
          )}
          {renderInfoItem('Função - colaborador', extraData.funcaoColaborador || 'Não informado')}
          <div>
            <label className="text-sm font-medium">Campos vazios/inválidos</label>
            <p className="text-sm text-muted-foreground mt-1">
              <Badge variant={user.campos_vazios ? 'destructive' : 'default'}>
                {user.campos_vazios ? 'Tem campos vazios' : 'Completo'}
              </Badge>
            </p>
          </div>
          {renderInfoItem(
            'Nome dos campos vazios no ACMS',
            extraData.nomeCamposVazios || 'Não informado'
          )}
          {renderInfoItem('Pontos', user.points || 0)}
          {renderInfoItem('Nível', user.level || 'Iniciante')}
          {renderInfoItem('Frequência', user.attendance || 0)}
          {renderInfoItem('Pontuação', user.points || 0)}
          {renderInfoItem('Código (extra)', extraData.codigo || 'Não informado')}
          {renderInfoItem('Bairro', extraData.bairro || 'Não informado')}
          {renderInfoItem('Cidade/Estado', extraData.cidadeEstado || 'Não informado')}
          {renderInfoItem(
            'Valor Dízimo',
            extraData.valorDizimo ? `R$ ${extraData.valorDizimo}` : 'Não informado'
          )}
        </div>
      </CardContent>
    </Card>

    {user.observations && (
      <Card className="shadow-divine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user.observations}</p>
        </CardContent>
      </Card>
    )}
  </>
);
