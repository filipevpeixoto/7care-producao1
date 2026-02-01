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

async function testImportRemaining(token, inviteId, startFrom = 50) {
  console.log(`\n📦 Testando endpoint import-remaining (startFrom: ${startFrom})...`);
  
  const data = JSON.stringify({ startFrom, limit: 50 });
  const res = await makeRequest({
    hostname: '7careapp-2026.netlify.app',
    path: `/api/invites/${inviteId}/import-remaining`,
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}`,
      'Content-Length': data.length 
    }
  }, data);
  
  console.log(`📡 Status: ${res.status}`);
  console.log(`📄 Resposta: ${res.body}`);
  
  if (res.status === 200) {
    const result = res.json();
    console.log(`✅ Lote importado: ${result.membersImported} membros`);
    console.log(`   Total: ${result.totalMembers}, Próximo: ${result.nextStartFrom}, Mais: ${result.hasMore}`);
    return result;
  }
  
  return null;
}

async function main() {
  try {
    console.log('🔐 Fazendo login...');
    const token = await login();
    
    const invites = await listInvites(token);
    
    // Testar aprovação de convite submitted
    const submitted = invites.filter(i => i.status === 'submitted');
    if (submitted.length > 0) {
      console.log(`\n🎯 Testando aprovação do convite ID: ${submitted[0].id}`);
      const result = await approveInvite(token, submitted[0].id);
      
      // Se há membros pendentes, testar importação em lotes
      if (result?.details?.importDeferred) {
        console.log(`\n📊 ${result.details.membersPending} membros pendentes para importar`);
        let startFrom = result.details.membersImported;
        let hasMore = true;
        let totalImported = startFrom;
        
        while (hasMore) {
          const batch = await testImportRemaining(token, submitted[0].id, startFrom);
          if (batch && batch.success) {
            totalImported += batch.membersImported;
            hasMore = batch.hasMore;
            startFrom = batch.nextStartFrom || startFrom + 50;
          } else {
            hasMore = false;
          }
        }
        
        console.log(`\n🎉 Importação completa! Total: ${totalImported} membros`);
      }
    } else {
      console.log('\n⚠️ Nenhum convite com status "submitted"');
      
      // Testar endpoint import-remaining com convite já aprovado
      const approved = invites.filter(i => i.status === 'approved');
      if (approved.length > 0 && approved[0].onboardingData?.excelData?.data?.length > 0) {
        console.log('\n📋 Testando endpoint import-remaining com convite já aprovado...');
        await testImportRemaining(token, approved[0].id, 0);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
