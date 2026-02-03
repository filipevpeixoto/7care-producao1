/**
 * Script v3 - VERSÃO COM FORMULÁRIO PREENCHIDO
 * Captura valores selecionados, opções de dropdowns e comportamento completo
 *
 * COMO USAR:
 * 1. Fazer login em https://dracma.sdasystems.org
 * 2. Navegar para https://dracma.sdasystems.org/accounts-payable/create
 * 3. PREENCHER O FORMULÁRIO (ou deixar alguns campos preenchidos)
 * 4. Abrir DevTools (F12)
 * 5. Colar este script no Console
 * 6. Pressionar Enter
 */

(function extractDracmaSelectorsV3() {
  console.log('🔍 Extraindo seletores COMPLETOS (com valores preenchidos)...\n');
  console.log('⏳ Aguardando 2 segundos...\n');

  setTimeout(() => {
    const selectors = {
      pageUrl: window.location.href,
      extractedAt: new Date().toISOString(),
      formSelectors: {},
      fields: [],
      dropdowns: [],
      visualStructure: [],
    };

    const form = document.querySelector('form');

    if (!form) {
      console.error('❌ Nenhum formulário encontrado!');
      return;
    }

    console.log('✅ Formulário encontrado!\n');

    // ==========================================
    // FUNÇÃO AUXILIAR: Encontrar label próximo
    // ==========================================
    function findNearestLabel(element) {
      // Primeiro: procurar label por "for" attribute
      if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return label.textContent.trim();
      }

      // Segundo: procurar parent com classe .field
      const field = element.closest('.field');
      if (field) {
        const label = field.querySelector('label');
        if (label) return label.textContent.trim();
      }

      // Terceiro: procurar irmão anterior que seja label
      let prev = element.previousElementSibling;
      while (prev) {
        if (prev.tagName === 'LABEL') {
          return prev.textContent.trim();
        }
        prev = prev.previousElementSibling;
      }

      // Quarto: procurar texto no parent direto
      const parent = element.parentElement;
      if (parent) {
        const allText = parent.innerText || parent.textContent;
        if (allText) {
          const lines = allText.split('\n').filter(l => l.trim());
          if (lines.length > 0 && lines[0].length < 50) {
            return lines[0].trim();
          }
        }
      }

      return null;
    }

    // ==========================================
    // EXTRAIR DROPDOWNS CUSTOMIZADOS (Semantic UI)
    // ==========================================
    console.log('📋 Analisando DROPDOWNS CUSTOMIZADOS (Semantic UI):\n');

    const dropdownContainers = Array.from(form.querySelectorAll('.ui.dropdown, .dropdown'));

    dropdownContainers.forEach((dropdown, index) => {
      const isVisible = window.getComputedStyle(dropdown).display !== 'none';

      if (!isVisible) return;

      const field = dropdown.closest('.field');
      const label = findNearestLabel(dropdown);

      const dropdownData = {
        index: index + 1,
        type: 'semantic-ui-dropdown',
        label: label,
        classes: dropdown.className,
        isActive: dropdown.classList.contains('active'),
        isVisible: dropdown.classList.contains('visible'),
        selectedText: null,
        selectedValue: null,
        options: [],
        selectors: [],
        position: {
          top: dropdown.getBoundingClientRect().top,
          left: dropdown.getBoundingClientRect().left,
        },
      };

      // Capturar texto selecionado
      const selectedText = dropdown.querySelector('.text');
      if (selectedText) {
        dropdownData.selectedText = selectedText.textContent.trim();
      }

      // Capturar input hidden associado
      const hiddenInput = dropdown.querySelector('input[type="hidden"]');
      if (hiddenInput) {
        dropdownData.selectedValue = hiddenInput.value;
        dropdownData.hiddenInputName = hiddenInput.name;
      }

      // Capturar input de busca
      const searchInput = dropdown.querySelector('input.search');
      if (searchInput) {
        dropdownData.searchInputId = searchInput.id;
        dropdownData.searchInputName = searchInput.name;
      }

      // Capturar opções do menu (se visível)
      const menu = dropdown.querySelector('.menu');
      if (menu) {
        const items = Array.from(menu.querySelectorAll('.item'));

        items.forEach(item => {
          const value = item.getAttribute('data-value');
          const text = item.textContent.trim();
          const isSelected =
            item.classList.contains('selected') || item.classList.contains('active');

          if (text) {
            dropdownData.options.push({
              value: value,
              text: text,
              isSelected: isSelected,
            });
          }
        });
      }

      // Gerar seletores possíveis
      dropdownData.selectors.push('.ui.dropdown');

      if (searchInput && searchInput.id) {
        dropdownData.selectors.push(`#${searchInput.id}`);
      }
      if (searchInput && searchInput.name) {
        dropdownData.selectors.push(`input[name="${searchInput.name}"]`);
      }

      // Adicionar baseado na posição relativa
      if (label) {
        dropdownData.selectors.push(`// Dropdown com label: "${label}"`);
      }

      selectors.dropdowns.push(dropdownData);

      console.log(`  ${index + 1}. ${label || '(sem label)'}`);
      console.log(`     Texto selecionado: ${dropdownData.selectedText || 'N/A'}`);
      console.log(`     Valor selecionado: ${dropdownData.selectedValue || 'N/A'}`);
      console.log(`     Opções disponíveis: ${dropdownData.options.length}`);
      if (dropdownData.options.length > 0) {
        console.log(`     Primeiras opções:`);
        dropdownData.options.slice(0, 5).forEach(opt => {
          console.log(`       - ${opt.text} (value: ${opt.value || 'N/A'})`);
        });
      }
      console.log(`     Seletores: ${dropdownData.selectors.join(' OU ')}`);
      console.log(`     Posição: top=${Math.round(dropdownData.position.top)}`);
      console.log('');
    });

    // ==========================================
    // EXTRAIR INPUTS DE TEXTO, DATA, NÚMERO
    // ==========================================
    console.log('\n📝 Analisando INPUTS DE TEXTO/DATA/NÚMERO:\n');

    const textInputs = Array.from(
      form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]')
    ).filter(input => {
      const style = window.getComputedStyle(input);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !input.classList.contains('search') && // Ignorar inputs de busca dos dropdowns
        input.type !== 'hidden'
      );
    });

    textInputs.forEach((input, index) => {
      const label = findNearestLabel(input);

      const field = {
        index: index + 1,
        tag: 'input',
        type: input.type,
        label: label,
        id: input.id || null,
        name: input.name || null,
        placeholder: input.placeholder || null,
        value: input.value || null,
        className: input.className,
        selectors: [],
        position: {
          top: input.getBoundingClientRect().top,
          left: input.getBoundingClientRect().left,
        },
      };

      // Gerar seletores
      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.name) {
        field.selectors.push(`input[name="${field.name}"]`);
      }
      if (field.placeholder) {
        field.selectors.push(`input[placeholder="${field.placeholder}"]`);
      }

      // Seletor por classe específica
      if (field.className) {
        const classes = field.className.split(' ');
        const uniqueClass = classes.find(
          c => c && !['au-target', 'form-control', 'input'].includes(c)
        );
        if (uniqueClass) {
          field.selectors.push(`input.${uniqueClass}`);
        }
      }

      // Seletor por label
      if (label) {
        field.selectors.push(`// Input com label: "${label}"`);
      }

      selectors.fields.push(field);

      console.log(`  ${index + 1}. ${label || '(sem label)'}`);
      console.log(`     Tipo: ${field.type}`);
      console.log(`     ID: ${field.id || 'N/A'}`);
      console.log(`     Valor atual: "${field.value || ''}"`);
      console.log(`     Placeholder: ${field.placeholder || 'N/A'}`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log(`     Posição: top=${Math.round(field.position.top)}`);
      console.log('');
    });

    // ==========================================
    // EXTRAIR TEXTAREA
    // ==========================================
    console.log('\n📄 Analisando TEXTAREAS:\n');

    const textareas = Array.from(form.querySelectorAll('textarea')).filter(ta => {
      const style = window.getComputedStyle(ta);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    textareas.forEach((textarea, index) => {
      const label = findNearestLabel(textarea);

      const field = {
        index: index + 1,
        tag: 'textarea',
        type: 'textarea',
        label: label,
        id: textarea.id || null,
        name: textarea.name || null,
        placeholder: textarea.placeholder || null,
        value: textarea.value || null,
        className: textarea.className,
        selectors: [],
        position: {
          top: textarea.getBoundingClientRect().top,
          left: textarea.getBoundingClientRect().left,
        },
      };

      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.name) {
        field.selectors.push(`textarea[name="${field.name}"]`);
      }
      if (label) {
        field.selectors.push(`// Textarea com label: "${label}"`);
      }

      selectors.fields.push(field);

      console.log(`  ${index + 1}. ${label || '(sem label)'}`);
      console.log(`     Valor atual: "${field.value || ''}"`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log(`     Posição: top=${Math.round(field.position.top)}`);
      console.log('');
    });

    // ==========================================
    // EXTRAIR BOTÕES
    // ==========================================
    console.log('\n✅ Analisando BOTÕES:\n');

    const buttons = Array.from(form.querySelectorAll('button')).filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    buttons.forEach((btn, index) => {
      const field = {
        index: index + 1,
        tag: 'button',
        type: btn.type || 'button',
        text: btn.textContent?.trim() || null,
        id: btn.id || null,
        className: btn.className,
        selectors: [],
      };

      if (field.id) {
        field.selectors.push(`#${field.id}`);
      }
      if (field.text) {
        field.selectors.push(`button:contains("${field.text}")`);
      }

      selectors.fields.push(field);

      console.log(`  ${index + 1}. Texto: "${field.text}"`);
      console.log(`     Tipo: ${field.type}`);
      console.log(`     Classes: ${field.className}`);
      console.log(`     Seletores: ${field.selectors.join(' OU ')}`);
      console.log('');
    });

    // ==========================================
    // ESTRUTURA VISUAL
    // ==========================================
    console.log('\n🏗️  ESTRUTURA VISUAL DA PÁGINA:\n');

    const sections = Array.from(form.querySelectorAll('.field')).filter(section => {
      const style = window.getComputedStyle(section);
      return style.display !== 'none';
    });

    sections.forEach((section, index) => {
      const label = section.querySelector('label');
      const labelText = label?.textContent?.trim() || null;

      if (labelText) {
        console.log(`   Seção ${index + 1}: ${labelText}`);
        selectors.visualStructure.push({
          section: index + 1,
          heading: labelText,
          hasDropdown: !!section.querySelector('.dropdown'),
          hasInput: !!section.querySelector('input:not(.search)'),
          hasTextarea: !!section.querySelector('textarea'),
        });
      }
    });

    // ==========================================
    // OUTPUT FINAL
    // ==========================================
    console.log('\n\n========================================');
    console.log('📋 JSON COMPLETO (COPIE ESTE BLOCO):');
    console.log('========================================\n');
    console.log(JSON.stringify(selectors, null, 2));
    console.log('\n========================================\n');

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

    // ==========================================
    // TABELA RESUMIDA
    // ==========================================
    console.log('\n📊 TABELA RESUMIDA:\n');
    console.table([
      ...selectors.dropdowns.map(d => ({
        Tipo: 'Dropdown',
        Label: d.label || '?',
        'Valor Atual': d.selectedText || '-',
        Opções: d.options.length,
        Posição: Math.round(d.position.top),
      })),
      ...selectors.fields
        .filter(f => f.tag !== 'button')
        .map(f => ({
          Tipo: f.type === 'textarea' ? 'Textarea' : 'Input',
          Label: f.label || '?',
          'Valor Atual': f.value ? `"${f.value.substring(0, 20)}"` : '-',
          Opções: '-',
          Posição: Math.round(f.position.top),
        })),
    ]);

    return selectors;
  }, 2000);
})();

console.log('⏳ Script v3 iniciado! Aguarde 2 segundos...');
