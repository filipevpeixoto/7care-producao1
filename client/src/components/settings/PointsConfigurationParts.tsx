import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Trophy,
  TrendingUp,
  Users,
  Gift,
  Heart,
  Calendar,
  Award,
  CheckCircle,
  Book,
  Crown,
  Star,
  Mountain,
  Globe,
  Building2,
} from 'lucide-react';
import type { PointsConfig } from './pointsConfigurationConfig';

type SectionField = {
  key: string;
  label: string;
  description: string;
};

type SectionConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  section: keyof PointsConfig;
  fields: SectionField[];
};

type PointsSectionCardProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  section: keyof PointsConfig;
  fields: SectionField[];
  config: PointsConfig;
  onUpdate: (section: keyof PointsConfig, field: string, value: number) => void;
};

type DistrictIndicatorProps = {
  districtId: number | null;
  isGlobalConfig: boolean;
  districtName: string;
};

type SummaryCardProps = {
  totalMaxPoints: number;
  categoriesCount: number;
  criteriaCount: number;
};

export const pointsSections: SectionConfig[] = [
  {
    title: 'Engajamento',
    icon: TrendingUp,
    section: 'engajamento',
    fields: [
      { key: 'baixo', label: 'Baixo', description: 'Engajamento baixo' },
      { key: 'medio', label: 'Médio', description: 'Engajamento médio' },
      { key: 'alto', label: 'Alto', description: 'Engajamento alto' },
    ],
  },
  {
    title: 'Classificação',
    icon: Users,
    section: 'classificacao',
    fields: [
      { key: 'frequente', label: 'Frequente', description: 'Usuários frequentes' },
      { key: 'naoFrequente', label: 'Não Frequente', description: 'Usuários não frequentes' },
    ],
  },
  {
    title: 'Dizimista',
    icon: Gift,
    section: 'dizimista',
    fields: [
      { key: 'naoDizimista', label: 'Não dizimista', description: 'Sem contribuição' },
      { key: 'pontual', label: 'Pontual (1-3 meses)', description: 'Contribuição pontual' },
      { key: 'sazonal', label: 'Sazonal (4-7 meses)', description: 'Contribuição sazonal' },
      {
        key: 'recorrente',
        label: 'Recorrente (8-12 meses)',
        description: 'Contribuição recorrente',
      },
    ],
  },
  {
    title: 'Ofertante',
    icon: Heart,
    section: 'ofertante',
    fields: [
      { key: 'naoOfertante', label: 'Não ofertante', description: 'Sem ofertas' },
      { key: 'pontual', label: 'Pontual (1-3 meses)', description: 'Ofertas pontuais' },
      { key: 'sazonal', label: 'Sazonal (4-7 meses)', description: 'Ofertas sazonais' },
      {
        key: 'recorrente',
        label: 'Recorrente (8-12 meses)',
        description: 'Ofertas recorrentes',
      },
    ],
  },
  {
    title: 'Tempo de Batismo',
    icon: Calendar,
    section: 'tempoBatismo',
    fields: [
      { key: 'doisAnos', label: '0-2 anos', description: 'Batismo recente' },
      { key: 'cincoAnos', label: '3-5 anos', description: 'Batismo intermediário' },
      { key: 'dezAnos', label: '6-10 anos', description: 'Batismo consolidado' },
      { key: 'vinteAnos', label: '11-20 anos', description: 'Batismo maduro' },
      { key: 'maisVinte', label: '20+ anos', description: 'Batismo veterano' },
    ],
  },
  {
    title: 'Cargos',
    icon: Award,
    section: 'cargos',
    fields: [
      { key: 'umCargo', label: '1 cargo', description: 'Um cargo de liderança' },
      { key: 'doisCargos', label: '2 cargos', description: 'Dois cargos de liderança' },
      { key: 'tresOuMais', label: '3+ cargos', description: 'Três ou mais cargos' },
    ],
  },
  {
    title: 'Nome da Unidade',
    icon: CheckCircle,
    section: 'nomeUnidade',
    fields: [{ key: 'comUnidade', label: 'Com unidade', description: 'Unidade cadastrada' }],
  },
  {
    title: 'Tem Lição',
    icon: Book,
    section: 'temLicao',
    fields: [{ key: 'comLicao', label: 'Com lição', description: 'Participação em estudos' }],
  },
  {
    title: 'Pontuação Dinâmica',
    icon: Star,
    section: 'pontuacaoDinamica',
    fields: [
      {
        key: 'multiplicador',
        label: 'Multiplicador',
        description: 'Multiplicador para valores 0-13',
      },
    ],
  },
  {
    title: 'Total de Presença',
    icon: Calendar,
    section: 'totalPresenca',
    fields: [
      { key: 'zeroATres', label: '0-3 presenças', description: 'Baixa frequência' },
      { key: 'quatroASete', label: '4-7 presenças', description: 'Frequência regular' },
      { key: 'oitoATreze', label: '8-13 presenças', description: 'Alta frequência' },
    ],
  },
  {
    title: 'Escola Sabatina',
    icon: Crown,
    section: 'escolaSabatina',
    fields: [
      { key: 'comunhao', label: 'Comunhão', description: 'Presença na comunhão' },
      { key: 'missao', label: 'Missão', description: 'Participação em missões' },
      { key: 'estudoBiblico', label: 'Estudo Bíblico', description: 'Participação em estudos bíblicos' },
      { key: 'batizouAlguem', label: 'Batizou Alguém', description: 'Liderança em batismos' },
      {
        key: 'discipuladoPosBatismo',
        label: 'Discipulado Pós-Batismo',
        description: 'Participação em estudos de discipulado',
      },
    ],
  },
  {
    title: 'CPF Válido',
    icon: CheckCircle,
    section: 'cpfValido',
    fields: [{ key: 'valido', label: 'Válido', description: 'Documentação em dia' }],
  },
  {
    title: 'Campos Vazios ACMS',
    icon: Mountain,
    section: 'camposVaziosACMS',
    fields: [
      {
        key: 'semCamposVazios',
        label: 'Sem campos vazios',
        description: 'Perfil completo no sistema',
      },
    ],
  },
];

export const PointsSectionCard = ({
  title,
  icon: IconComponent,
  section,
  fields,
  config,
  onUpdate,
}: PointsSectionCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <IconComponent className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={field.key}
                type="number"
                min="0"
                value={config[section]?.[field.key as keyof (typeof config)[typeof section]] || 0}
                onChange={e => onUpdate(section, field.key, parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <Badge variant="secondary" className="text-xs">
                pontos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{field.description}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const DistrictIndicator = ({
  districtId,
  isGlobalConfig,
  districtName,
}: DistrictIndicatorProps) =>
  districtId ? (
    <div
      className={`p-4 rounded-lg border ${isGlobalConfig ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isGlobalConfig ? (
            <>
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Usando configuração global</p>
                <p className="text-sm text-blue-700">
                  {districtName} ainda não tem configuração própria. Salve para criar uma.
                </p>
              </div>
            </>
          ) : (
            <>
              <Building2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Configuração do {districtName}</p>
                <p className="text-sm text-green-700">
                  Este distrito tem sua própria escala de pontuação.
                </p>
              </div>
            </>
          )}
        </div>
        {!isGlobalConfig && (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Personalizado
          </Badge>
        )}
      </div>
    </div>
  ) : null;

export const SummaryCard = ({ totalMaxPoints, categoriesCount, criteriaCount }: SummaryCardProps) => (
  <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600" />
        Resumo da Base de Cálculo
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalMaxPoints}
          </div>
          <div className="text-sm text-muted-foreground">Pontos Máximos Possíveis</div>
        </div>

        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {categoriesCount}
          </div>
          <div className="text-sm text-muted-foreground">Categorias Configuradas</div>
        </div>

        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {criteriaCount}
          </div>
          <div className="text-sm text-muted-foreground">Critérios de Pontuação</div>
        </div>
      </div>
    </CardContent>
  </Card>
);
