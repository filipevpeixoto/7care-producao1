import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Initialize i18n for tests so t() returns translated strings (pt-BR default)
import '@/i18n';

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

const pointsConfig = {
  engajamento: { baixo: 1, medio: 2, alto: 3 },
  classificacao: { frequente: 1, naoFrequente: 2 },
  dizimista: { naoDizimista: 0, pontual: 1, sazonal: 2, recorrente: 3 },
  ofertante: { naoOfertante: 0, pontual: 1, sazonal: 2, recorrente: 3 },
  tempoBatismo: { doisAnos: 1, cincoAnos: 2, dezAnos: 3, vinteAnos: 4, maisVinte: 5 },
  cargos: { umCargo: 1, doisCargos: 2, tresOuMais: 3 },
  nomeUnidade: { comUnidade: 1 },
  temLicao: { comLicao: 1 },
  pontuacaoDinamica: { multiplicador: 1 },
  totalPresenca: { zeroATres: 1, quatroASete: 2, oitoATreze: 3 },
  escolaSabatina: {
    comunhao: 1,
    missao: 1,
    estudoBiblico: 1,
    batizouAlguem: 1,
    discipuladoPosBatismo: 1,
  },
  cpfValido: { valido: 1 },
  camposVaziosACMS: { semCamposVazios: 1 },
};

const server = setupServer(
  http.get('/api/activities', () =>
    HttpResponse.json(
      [
        {
          id: '1',
          title: 'Atividade 1',
          description: 'Descrição',
          imageUrl: 'https://example.com/a1.png',
          date: '2025-01-01',
          active: true,
          order: 1,
        },
        {
          id: '2',
          title: 'Atividade 2',
          description: 'Outra descrição',
          imageUrl: 'https://example.com/a2.png',
          date: '2025-01-02',
          active: false,
          order: 2,
        },
      ],
      { status: 200 }
    )
  ),
  http.post('/api/activities', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: '2',
        ...body,
      },
      { status: 200 }
    );
  }),
  http.put(
    '/api/activities/:id',
    async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        {
          id: String(params.id ?? ''),
          ...body,
        },
        { status: 200 }
      );
    }
  ),
  http.get('/api/system/points-config', () => HttpResponse.json(pointsConfig, { status: 200 })),
  http.get(
    '/api/users/:userId/points-details',
    ({ params }: { params: Record<string, string> }) =>
    HttpResponse.json(
      {
        user: {
          id: Number(params.userId),
          name: 'Usuário Teste',
          email: 'user@test.com',
          role: 'member',
          status: 'active',
        },
        userData: {
          engajamento: 'Baixo',
          classificacao: 'A resgatar',
          dizimista: 'Não dizimista',
          ofertante: 'Não ofertante',
          tempoBatismo: 0,
          cargos: [],
          nomeUnidade: null,
          temLicao: false,
          comunhao: 0,
          missao: 0,
          estudoBiblico: 0,
          totalPresenca: 0,
          batizouAlguem: false,
          discipuladoPosBatismo: 0,
          cpfValido: false,
          camposVaziosACMS: false,
        },
        calculatedPoints: 10,
        breakdown: { base: 10 },
      },
      { status: 200 }
    )
  ),
  http.post('/api/users/:userId/visit', () =>
    HttpResponse.json({ success: true }, { status: 200 })
  ),
  http.post('/api/auth/login', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json(
      {
        success: true,
        token: 'test-token',
        user: {
          id: 1,
          name: 'Admin',
          email: body.email,
          role: 'superadmin',
          firstAccess: false,
        },
      },
      { status: 200 }
    );
  }),
  http.get('/api/user/church', () =>
    HttpResponse.json({ success: true, church: 'Igreja Central' }, { status: 200 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
