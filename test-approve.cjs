const https = require('https');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body, json: () => JSON.parse(body) });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  const data = JSON.stringify({ email: 'admin@7care.com', password: 'meu7care' });
  const res = await makeRequest({
    hostname: '7careapp-2026.netlify.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, data);
  
  const result = res.json();
  if (result.token) {
    console.log('✅ Login OK');
    return result.token;
  }
  throw new Error('Login falhou: ' + res.body);
}

async function listInvites(token) {
  const res = await makeRequest({
    hostname: '7careapp-2026.netlify.app',
    path: '/api/invites',
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  
  const invites = res.json();
  console.log('\n📋 Convites encontrados:', invites.length);
  invites.forEach(inv => {
    console.log(`  - ID: ${inv.id}, Email: ${inv.email}, Status: ${inv.status}`);
    if (inv.onboardingData) {
      const od = inv.onboardingData;
      console.log(`    Distrito: ${od.district?.name || 'N/A'}`);
      console.log(`    Igrejas: ${od.churches?.length || 0}`);
      console.log(`    Membros Excel: ${od.excelData?.data?.length || 0}`);
    }
  });
  return invites;
}

async function approveInvite(token, inviteId) {
  console.log(`\n🚀 Aprovando convite ${inviteId}...`);
  
  const res = await makeRequest({
    hostname: '7careapp-2026.netlify.app',
    path: `/api/invites/${inviteId}/approve`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  
  console.log(`📡 Status: ${res.status}`);
  console.log(`📄 Resposta: ${res.body}`);
  
  if (res.status === 200) {
    console.log('✅ Aprovação OK!');
    return res.json();
  }
  
  throw new Error(res.body);
}

async function main() {
  try {
    console.log('🔐 Fazendo login...');
    const token = await login();
    
    const invites = await listInvites(token);
    
    const submitted = invites.filter(i => i.status === 'submitted');
    if (submitted.length === 0) {
      console.log('\n⚠️ Nenhum convite com status "submitted"');
      return;
    }
    
    console.log(`\n🎯 Testando aprovação do convite ID: ${submitted[0].id}`);
    await approveInvite(token, submitted[0].id);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
