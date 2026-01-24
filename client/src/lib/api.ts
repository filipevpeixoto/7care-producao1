// Helper para fazer requisições autenticadas com JWT

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('7care_token');
  
  if (token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }
  
  return {
    'Content-Type': 'application/json'
  };
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('7care_token');
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}
