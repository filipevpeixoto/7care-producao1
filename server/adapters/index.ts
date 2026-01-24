/**
 * Índice de Adapters do Banco de Dados
 * Reexporta todos os adapters modulares
 */

export * from './userAdapter';
export * from './eventAdapter';
export * from './churchAdapter';

import userAdapter from './userAdapter';
import eventAdapter from './eventAdapter';
import churchAdapter from './churchAdapter';

export const adapters = {
  user: userAdapter,
  event: eventAdapter,
  church: churchAdapter,
};

export default adapters;
