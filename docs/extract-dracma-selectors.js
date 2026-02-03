/**
 * Script para extrair seletores CSS do formulário do Dracma
 *
 * COMO USAR:
 * 1. Fazer login em https://dracma.sdasystems.org
 * 2. Navegar para https://dracma.sdasystems.org/accounts-payable/create
 * 3. Abrir DevTools (F12)
 * 4. Colar este script no Console
 * 5. Pressionar Enter
 * 6. Copiar o JSON que aparecerá
 */

(function extractDracmaSelectors() {
  console.log('🔍 Extraindo seletores do formulário do Dracma...\n');

  const selectors = {
    pageUrl: window.location.href,
    extractedAt: new Date().toISOString(),
    formSelectors: {},
    fields: [],
  };

  // Encontrar o formulário principal
  const form = document.querySelector('form');

  if (!form) {
    console.error('❌ Nenhum formulário encontrado na página!');
    return;
  }

  // Extrair seletor do formulário
  if (form.id) {
    selectors.formSelectors.id = `#${form.id}`;
  }
  if (form.className) {
    selectors.formSelectors.class = `.${form.className.split(' ')[0]}`;
  }
  selectors.formSelectors.tag = 'form';

  console.log('✅ Formulário encontrado:', selectors.formSelectors);

  // Extrair todos os inputs de texto, número, data, etc.
  const inputs = form.querySelectorAll(
    'input[type="text"], input[type="number"], input[type="date"], input[type="tel"], input[type="email"], input:not([type])'
  );

  console.log(`\n📝 Encontrados ${inputs.length} campos de input:\n`);

  inputs.forEach((input, index) => {
    const field = {
      type: 'input',
      inputType: input.type || 'text',
      name: input.name || null,
      id: input.id || null,
      placeholder: input.placeholder || null,
      className: input.className || null,
      label: null,
      selectors: [],
    };

    // Tentar encontrar o label associado
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        field.label = label.textContent.trim();
      }
    }

    // Se não achou label por "for", tentar encontrar label pai
    if (!field.label) {
      const parentLabel = input.closest('label');
      if (parentLabel) {
        field.label = parentLabel.textContent.trim();
      }
    }

    // Se ainda não achou, procurar label irmão anterior
    if (!field.label) {
      let prev = input.previousElementSibling;
      while (prev) {
        if (prev.tagName === 'LABEL') {
          field.label = prev.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }
    }

    // Gerar seletores possíveis
    if (field.id) {
      field.selectors.push(`#${field.id}`);
    }
    if (field.name) {
      field.selectors.push(`input[name="${field.name}"]`);
    }
    if (field.className) {
      const firstClass = field.className.split(' ')[0];
      field.selectors.push(`input.${firstClass}`);
    }

    // Seletor por tipo + placeholder
    if (field.placeholder) {
      field.selectors.push(`input[placeholder="${field.placeholder}"]`);
    }

    selectors.fields.push(field);

    console.log(`  ${index + 1}. ${field.label || '(sem label)'}`);
    console.log(`     Tipo: ${field.inputType}`);
    console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
    console.log('');
  });

  // Extrair selects (dropdowns)
  const selects = form.querySelectorAll('select');

  console.log(`\n📋 Encontrados ${selects.length} campos dropdown:\n`);

  selects.forEach((select, index) => {
    const field = {
      type: 'select',
      name: select.name || null,
      id: select.id || null,
      className: select.className || null,
      label: null,
      options: [],
      selectors: [],
    };

    // Tentar encontrar label
    if (select.id) {
      const label = document.querySelector(`label[for="${select.id}"]`);
      if (label) {
        field.label = label.textContent.trim();
      }
    }

    if (!field.label) {
      const parentLabel = select.closest('label');
      if (parentLabel) {
        field.label = parentLabel.textContent.trim();
      }
    }

    if (!field.label) {
      let prev = select.previousElementSibling;
      while (prev) {
        if (prev.tagName === 'LABEL') {
          field.label = prev.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }
    }

    // Extrair opções
    const options = select.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value) {
        field.options.push({
          value: opt.value,
          text: opt.textContent.trim(),
        });
      }
    });

    // Gerar seletores
    if (field.id) {
      field.selectors.push(`#${field.id}`);
    }
    if (field.name) {
      field.selectors.push(`select[name="${field.name}"]`);
    }
    if (field.className) {
      const firstClass = field.className.split(' ')[0];
      field.selectors.push(`select.${firstClass}`);
    }

    selectors.fields.push(field);

    console.log(`  ${index + 1}. ${field.label || '(sem label)'}`);
    console.log(`     Opções: ${field.options.map(o => o.value).join(', ')}`);
    console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
    console.log('');
  });

  // Extrair textarea
  const textareas = form.querySelectorAll('textarea');

  if (textareas.length > 0) {
    console.log(`\n📄 Encontrados ${textareas.length} campos textarea:\n`);

    textareas.forEach((textarea, index) => {
      const field = {
        type: 'textarea',
        name: textarea.name || null,
        id: textarea.id || null,
        placeholder: textarea.placeholder || null,
        className: textarea.className || null,
        label: null,
        selectors: [],
      };

      // Tentar encontrar label
      if (textarea.id) {
        const label = document.querySelector(`label[for="${textarea.id}"]`);
        if (label) {
          field.label = label.textContent.trim();
        }
      }

      // Gerar seletores
      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.name) {
        field.selectors.push(`textarea[name="${field.name}"]`);
      }

      selectors.fields.push(field);

      console.log(`  ${index + 1}. ${field.label || '(sem label)'}`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log('');
    });
  }

  // Extrair input de arquivo (upload)
  const fileInputs = form.querySelectorAll('input[type="file"]');

  if (fileInputs.length > 0) {
    console.log(`\n📎 Encontrados ${fileInputs.length} campos de upload:\n`);

    fileInputs.forEach((fileInput, index) => {
      const field = {
        type: 'file',
        name: fileInput.name || null,
        id: fileInput.id || null,
        accept: fileInput.accept || null,
        className: fileInput.className || null,
        label: null,
        selectors: [],
      };

      // Tentar encontrar label
      if (fileInput.id) {
        const label = document.querySelector(`label[for="${fileInput.id}"]`);
        if (label) {
          field.label = label.textContent.trim();
        }
      }

      // Gerar seletores
      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.name) {
        field.selectors.push(`input[type="file"][name="${field.name}"]`);
      }

      field.selectors.push('input[type="file"]');

      selectors.fields.push(field);

      console.log(`  ${index + 1}. ${field.label || '(sem label)'}`);
      console.log(`     Aceita: ${field.accept || 'qualquer arquivo'}`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log('');
    });
  }

  // Extrair botão de submit
  const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');

  if (submitButtons.length > 0) {
    console.log(`\n✅ Encontrados ${submitButtons.length} botões de submit:\n`);

    submitButtons.forEach((btn, index) => {
      const field = {
        type: 'submit',
        tag: btn.tagName.toLowerCase(),
        id: btn.id || null,
        className: btn.className || null,
        text: btn.textContent?.trim() || btn.value || null,
        selectors: [],
      };

      // Gerar seletores
      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.className) {
        const firstClass = field.className.split(' ')[0];
        field.selectors.push(`${field.tag}.${firstClass}`);
      }

      field.selectors.push(`${field.tag}[type="submit"]`);

      selectors.fields.push(field);

      console.log(`  ${index + 1}. Texto: "${field.text}"`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log('');
    });
  }

  // Salvar JSON no console
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
      .catch(err => {
        console.log('⚠️ Não foi possível copiar automaticamente. Copie manualmente o JSON acima.');
      });
  } else {
    console.log('⚠️ Clipboard API não disponível. Copie manualmente o JSON acima.');
  }

  return selectors;
})();
