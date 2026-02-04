const { chromium } = require('playwright');

async function captureDashboard() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  });
  
  const page = await context.newPage();
  
  console.log('1. Opening login page on localhost...');
  
  // Go to localhost login page
  await page.goto('http://localhost:3065');
  
  // Wait for login form to load
  await page.waitForSelector('#email', { timeout: 15000 });
  
  console.log('2. Login form loaded, filling credentials...');
  
  // Fill login credentials - Pastor de demonstração
  await page.fill('#email', 'pastor.demo@7care.com');
  await page.fill('#password', 'Demo7care!2026');
  
  console.log('3. Credentials filled, clicking submit...');
  
  // Click submit button and wait for navigation
  await page.click('button[type="submit"]');
  
  // Wait for page to load after login
  await page.waitForTimeout(5000);
  
  console.log('4. Login completed, current URL:', page.url());
  
  // Check current URL
  const currentUrl = page.url();
  
  // If on first-access and NOT on dashboard, navigate to dashboard
  if (currentUrl.includes('first-access') || (!currentUrl.includes('dashboard'))) {
    console.log('5. Not on dashboard, navigating...');
    await page.goto('http://localhost:3065/dashboard');
    await page.waitForTimeout(3000);
  }
  
  console.log('6. On dashboard, current URL:', page.url());
  console.log('7. Waiting 30 seconds for dashboard cards to fully load...');
  
  // Wait for dashboard to fully load all data
  await page.waitForTimeout(30000);
  
  console.log('8. Modifying content for demo screenshot...');
  
  // Modify content for demo purposes
  await page.evaluate(() => {
    // Demo numbers - coerentes entre si
    const demoNumbers = {
      total: 847,
      amigos: 312,
      membros: 423,
      missionarios: 112,
      interessados: 45,
      oracoes: 156,
      conversas: 89,
      checkins: 78,
      tarefasPendentes: 12,
      tarefasConcluidas: 34,
      tarefasTotal: 46,
      discipulados: 28
    };
    
    // 1. Função para encontrar e modificar número em um card
    function updateCardNumber(cardElement, newNumber) {
      // Procurar por elementos que tipicamente contêm números grandes
      const selectors = [
        'h1', 'h2', 'h3', 
        '.text-4xl', '.text-3xl', '.text-2xl',
        '[class*="text-4xl"]', '[class*="text-3xl"]', '[class*="text-2xl"]',
        '.font-bold', '[class*="font-bold"]'
      ];
      
      for (const selector of selectors) {
        const elements = cardElement.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          // Se o elemento contém apenas um número
          if (text && /^\d+$/.test(text)) {
            el.textContent = newNumber.toString();
            return true;
          }
        }
      }
      return false;
    }
    
    // 2. Encontrar todos os cards do dashboard
    const allCards = document.querySelectorAll('.rounded-xl, .rounded-lg, [class*="card"], [class*="Card"]');
    
    allCards.forEach(card => {
      const cardText = card.textContent?.toLowerCase() || '';
      const cardHTML = card.innerHTML?.toLowerCase() || '';
      
      // Esconder cards de distrito e filtro de pastor
      if (cardText.includes('distrito') || cardText.includes('district') ||
          (cardText.includes('filtrar') && cardText.includes('pastor'))) {
        card.style.display = 'none';
        return;
      }
      
      // Total de Usuários
      if ((cardText.includes('total') && cardText.includes('usu')) || 
          cardHTML.includes('total de') || cardHTML.includes('totalusers')) {
        updateCardNumber(card, demoNumbers.total);
        // Também atualizar "X usuários aprovados" - apenas trocar o número, não o texto todo
        const spans = card.querySelectorAll('span, p, div');
        spans.forEach(span => {
          if (span.textContent?.includes('usuários aprovados') || span.textContent?.includes('usuarios aprovados')) {
            // Usar innerHTML replace para preservar formatação
            span.innerHTML = span.innerHTML.replace(/\b\d+\b/, demoNumbers.total.toString());
          }
        });
      }
      // Amigos da Igreja
      else if (cardText.includes('amigo')) {
        updateCardNumber(card, demoNumbers.amigos);
        // Atualizar "Estão Sendo Discipulados"
        const spans = card.querySelectorAll('span, p, div');
        spans.forEach(span => {
          const text = span.textContent?.toLowerCase() || '';
          if (text.includes('discipulad')) {
            const numEl = span.querySelector('.font-bold, [class*="font-bold"]') || span.previousElementSibling;
            if (numEl && /^\d+$/.test(numEl.textContent?.trim())) {
              numEl.textContent = demoNumbers.discipulados.toString();
            }
          }
        });
      }
      // Membros
      else if (cardText.includes('membro')) {
        updateCardNumber(card, demoNumbers.membros);
      }
      // Missionários
      else if (cardText.includes('mission') || cardText.includes('discipulador')) {
        updateCardNumber(card, demoNumbers.missionarios);
      }
      // Check-ins Espirituais
      else if (cardText.includes('check') || cardText.includes('espiritu')) {
        updateCardNumber(card, demoNumbers.checkins);
      }
      // Tarefas
      else if (cardText.includes('tarefa')) {
        const numbers = card.querySelectorAll('h1, h2, h3, .text-4xl, .text-3xl, .text-2xl, [class*="text-4xl"], [class*="text-3xl"], [class*="text-2xl"], .font-bold');
        let numIndex = 0;
        const tarefasNums = [demoNumbers.tarefasPendentes, demoNumbers.tarefasConcluidas, demoNumbers.tarefasTotal];
        numbers.forEach(el => {
          if (/^\d+$/.test(el.textContent?.trim()) && numIndex < tarefasNums.length) {
            el.textContent = tarefasNums[numIndex].toString();
            numIndex++;
          }
        });
      }
      // Interessados
      else if (cardText.includes('interess')) {
        updateCardNumber(card, demoNumbers.interessados);
      }
    });
    
    // 3. Busca mais agressiva - qualquer elemento com número pequeno próximo de labels específicos
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    
    textNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (text && /^\d+$/.test(text)) {
        const parent = node.parentElement;
        const grandparent = parent?.parentElement;
        const container = grandparent?.parentElement;
        
        const contextText = (container?.textContent || grandparent?.textContent || parent?.textContent || '').toLowerCase();
        
        if (contextText.includes('total') && contextText.includes('usu')) {
          node.textContent = demoNumbers.total.toString();
        } else if (contextText.includes('amigo') && !contextText.includes('discipulad')) {
          node.textContent = demoNumbers.amigos.toString();
        } else if (contextText.includes('discipulad')) {
          node.textContent = demoNumbers.discipulados.toString();
        } else if (contextText.includes('membro') && contextText.includes('ativ')) {
          node.textContent = demoNumbers.membros.toString();
        } else if (contextText.includes('mission') || contextText.includes('discipulador')) {
          node.textContent = demoNumbers.missionarios.toString();
        } else if (contextText.includes('check') || contextText.includes('espiritu')) {
          node.textContent = demoNumbers.checkins.toString();
        }
      }
    });
    
    // 4. Change greeting
    document.body.innerHTML = document.body.innerHTML
      .replace(/Boa noite,?\s*Super\s*(Administrador)?/gi, 'Boa noite, Pastor!')
      .replace(/Bom dia,?\s*Super\s*(Administrador)?/gi, 'Bom dia, Pastor!')
      .replace(/Boa tarde,?\s*Super\s*(Administrador)?/gi, 'Boa tarde, Pastor!')
      .replace(/Boa noite,?\s*Pastor\s*João\s*Silva/gi, 'Boa noite, Pastor!')
      .replace(/Bom dia,?\s*Pastor\s*João\s*Silva/gi, 'Bom dia, Pastor!')
      .replace(/Boa tarde,?\s*Pastor\s*João\s*Silva/gi, 'Boa tarde, Pastor!');
  });
  
  await page.waitForTimeout(500);
  
  console.log('9. Taking screenshot...');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'client/public/app-screenshot.png',
    type: 'png'
  });
  
  console.log('10. Screenshot captured successfully!');
  console.log('    Saved to: client/public/app-screenshot.png');
  
  await browser.close();
}

captureDashboard().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
