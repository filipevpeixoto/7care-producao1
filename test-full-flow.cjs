const https = require('https');

const BASE = '7careapp-2026.netlify.app';

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          body, 
          json: () => { 
            try { return JSON.parse(body); } 
            catch { return body; } 
          } 
        });
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
    hostname: BASE,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, data);
  return res.json().token;
}

async function listInvites(token) {
  const res = await makeRequest({
    hostname: BASE,
    path: '/api/invites',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

async function testImportBatches(token, inviteId) {
  let startFrom = 0;
  let hasMore = true;
  let totalImported = 0;
  let iterations = 0;
  const maxIterations = 3;
  
  console.log('\n📊 Testando importação em lotes...');
  
  while (hasMore && iterations < maxIterations) {
    iterations++;
    const data = JSON.stringify({ startFrom, limit: 50 });
    const res = await makeRequest({
      hostname: BASE,
      path: `/api/invites/${inviteId}/import-remaining`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}`, 
        'Content-Length': data.length 
      }
    }, data);
    
    if (res.status === 200) {
      const result = res.json();
      totalImported += result.membersImported;
      hasMore = result.hasMore;
      startFrom = result.nextStartFrom || startFrom + 50;
      console.log(`  Lote ${iterations}: +${result.membersImported} membros (total: ${totalImported}/${result.totalMembers})`);
    } else {
      console.log(`  ❌ Erro: ${res.body}`);
      break;
    }
  }
  
  if (hasMore) {
    console.log(`  ... (interrompido após ${iterations} lotes para teste)`);
  }
  
  return totalImported;
}

async function main() {
  try {
    console.log('🔐 Fazendo login...');
    const token = await login();
    console.log('✅ Login OK\n');
    
    const invites = await listInvites(token);
    console.log(`📋 ${invites.length} convite(s) encontrado(s)`);
    
    const approved = invites.find(i => i.status === 'approved' && i.onboardingData?.excelData?.data?.length > 0);
    
    if (approved) {
      console.log(`\n🎯 Convite aprovado encontrado: ID ${approved.id}`);
      console.log(`   Email: ${approved.email}`);
      console.log(`   Distrito: ${approved.onboardingData.district?.name}`);
      console.log(`   Membros Excel: ${approved.onboardingData.excelData.data.length}`);
      
      await testImportBatches(token, approved.id);
    } else {
      console.log('\n⚠️ Nenhum convite aprovado com dados Excel encontrado');
    }
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
