/**
 * Script MELHORADO para extrair seletores CSS do Dracma
 * Versão 2 - Captura labels visuais e estrutura da página
 *
 * COMO USAR:
 * 1. Fazer login em https://dracma.sdasystems.org
 * 2. Navegar para https://dracma.sdasystems.org/accounts-payable/create
 * 3. Aguardar a página carregar COMPLETAMENTE
 * 4. Abrir DevTools (F12)
 * 5. Colar este script no Console
 * 6. Pressionar Enter
 */

(function extractDracmaSelectorsV2() {
  console.log('🔍 Extraindo seletores MELHORADOS do Dracma...\n');
  console.log('⏳ Aguardando 2 segundos para garantir que tudo carregou...\n');

  setTimeout(() => {
    const selectors = {
      pageUrl: window.location.href,
      extractedAt: new Date().toISOString(),
      formSelectors: {},
      fields: [],
      visualStructure: [],
    };

    // Encontrar o formulário
    const form = document.querySelector('form');

    if (!form) {
      console.error('❌ Nenhum formulário encontrado!');
      return;
    }

    // Extrair todos os elementos visíveis do formulário
    console.log('📸 Capturando estrutura visual da página...\n');

    // Função para encontrar label próximo a um campo
    function findNearestLabel(element) {
      // Tentar encontrar texto visível próximo ao elemento
      const parent = element.closest('.field, .input, .form-group, div');
      if (!parent) return null;

      // Procurar por qualquer texto visível dentro do parent
      const allText = parent.innerText || parent.textContent;
      if (allText && allText.trim()) {
        // Pegar apenas a primeira linha (provavelmente o label)
        const firstLine = allText.split('\n')[0].trim();
        if (firstLine.length < 50) {
          // Labels geralmente são curtos
          return firstLine;
        }
      }

      return null;
    }

    // Função para obter XPath único
    function getXPath(element) {
      if (element.id !== '') {
        return `//*[@id="${element.id}"]`;
      }
      if (element === document.body) {
        return '/html/body';
      }
      let ix = 0;
      const siblings = element.parentNode?.childNodes || [];
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return (
            getXPath(element.parentNode) +
            '/' +
            element.tagName.toLowerCase() +
            '[' +
            (ix + 1) +
            ']'
          );
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          ix++;
        }
      }
    }

    // Capturar TODOS os campos de input
    const allInputs = Array.from(form.querySelectorAll('input, select, textarea'));

    // Filtrar apenas inputs visíveis
    const visibleInputs = allInputs.filter(input => {
      const style = window.getComputedStyle(input);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        input.type !== 'hidden'
      );
    });

    console.log(`📝 Encontrados ${visibleInputs.length} campos VISÍVEIS:\n`);

    visibleInputs.forEach((input, index) => {
      const label = findNearestLabel(input);
      const tagName = input.tagName.toLowerCase();

      const field = {
        index: index + 1,
        tag: tagName,
        type: input.type || tagName,
        name: input.name || null,
        id: input.id || null,
        placeholder: input.placeholder || null,
        value: input.value || null,
        className: input.className || null,
        label: label,
        xpath: getXPath(input),
        selectors: [],
        position: {
          top: input.getBoundingClientRect().top,
          left: input.getBoundingClientRect().left,
        },
      };

      // Gerar seletores únicos
      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.name) {
        field.selectors.push(`${tagName}[name="${field.name}"]`);
      }
      if (field.placeholder) {
        field.selectors.push(`${tagName}[placeholder="${field.placeholder}"]`);
      }

      // Seletor por classe específica
      if (field.className) {
        const classes = field.className.split(' ');
        // Tentar encontrar uma classe única
        const uniqueClass = classes.find(
          c => c && !['au-target', 'form-control', 'input'].includes(c)
        );
        if (uniqueClass) {
          field.selectors.push(`${tagName}.${uniqueClass}`);
        }
      }

      selectors.fields.push(field);

      console.log(`  ${index + 1}. ${label || '(sem label)'}`);
      console.log(`     Tag: ${tagName}`);
      console.log(`     Tipo: ${field.type}`);
      console.log(`     ID: ${field.id || 'N/A'}`);
      console.log(`     Name: ${field.name || 'N/A'}`);
      console.log(`     Placeholder: ${field.placeholder || 'N/A'}`);
      console.log(`     Classes: ${field.className || 'N/A'}`);
      console.log(
        `     Posição: top=${Math.round(field.position.top)}, left=${Math.round(field.position.left)}`
      );
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log(`     XPath: ${field.xpath}`);
      console.log('');
    });

    // Capturar botões (submit, cancelar, etc)
    const buttons = Array.from(
      form.querySelectorAll('button, input[type="submit"], input[type="button"]')
    ).filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    console.log(`\n✅ Encontrados ${buttons.length} botões:\n`);

    buttons.forEach((btn, index) => {
      const field = {
        index: index + 1,
        tag: btn.tagName.toLowerCase(),
        type: 'button',
        text: btn.textContent?.trim() || btn.value || null,
        id: btn.id || null,
        className: btn.className || null,
        selectors: [],
      };

      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.text) {
        field.selectors.push(`button:contains("${field.text}")`);
      }
      field.selectors.push(`${btn.tagName.toLowerCase()}[type="${btn.type}"]`);

      selectors.fields.push(field);

      console.log(`  ${index + 1}. Texto: "${field.text}"`);
      console.log(`     Tipo: ${btn.type || 'button'}`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log('');
    });

    // Capturar estrutura visual geral
    console.log('\n🏗️  Estrutura geral da página:\n');

    // Tentar identificar seções/grupos de campos
    const sections = Array.from(form.querySelectorAll('.field, .form-group, .segment')).filter(
      section => {
        const style = window.getComputedStyle(section);
        return style.display !== 'none';
      }
    );

    console.log(`   Encontradas ${sections.length} seções/grupos de campos\n`);

    sections.forEach((section, index) => {
      const heading = section.querySelector('h1, h2, h3, h4, h5, label, .label');
      const headingText = heading?.textContent?.trim() || null;

      if (headingText) {
        console.log(`   Seção ${index + 1}: ${headingText}`);
        selectors.visualStructure.push({
          section: index + 1,
          heading: headingText,
          fieldsCount: section.querySelectorAll('input, select, textarea').length,
        });
      }
    });

    // Output final
    console.log('\n\n========================================');
    console.log('📋 JSON COMPLETO (COPIE ESTE BLOCO):');
    console.log('========================================\n');
    console.log(JSON.stringify(selectors, null, 2));
    console.log('\n========================================\n');

    // Tentar copiar para clipboard
    const jsonString = JSON.stringify(selectors, null, 2);

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(jsonString)
        .then(() => {
          console.log('✅ JSON copiado para a área de transferência!');
        })
        .catch(() => {
          console.log('⚠️ Copie manualmente o JSON acima.');
        });
    }

    // Criar tabela resumida
    console.log('\n📊 TABELA RESUMIDA DOS CAMPOS:\n');
    console.table(
      selectors.fields
        .filter(f => f.tag !== 'button')
        .map(f => ({
          '#': f.index,
          Label: f.label || '?',
          Tag: f.tag,
          ID: f.id || '-',
          Name: f.name || '-',
          Placeholder: f.placeholder || '-',
          Tipo: f.type,
        }))
    );

    return selectors;
  }, 2000); // Aguarda 2 segundos
})();

console.log('⏳ Script iniciado! Aguarde 2 segundos...');
