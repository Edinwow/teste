document.addEventListener('DOMContentLoaded', () => {

  // ===============================
  // CONFIGURAÇÕES / SUPOSIÇÕES
  // ===============================
  // Suposições feitas:
  // 1) Armazenamento principal: localStorage (chave 'despesas') para permitir uso offline e evitar necessidade de backend.
  // 2) Se houver dados históricos em uma planilha CSV remota, manteremos compatibilidade lendo-a como fallback (existente no app antigo).
  // 3) Limite diário de Alimentação: R$170,00 por pessoa por dia (valor fixo).
  // 4) Campos obrigatórios: nome, data, grupo (categoria), forma_pagamento, descricao, valor.
  //
  // Justificativa: localStorage facilita testes, prototipagem e é suficiente para pequenos grupos. Se preferir um backend,
  // posso adaptar o código para trocar localStorage por chamadas a uma API REST.

  const LIMITE_ALIMENTACAO = 170.0;

  // ===============================
  // 1. SELETORES
  // ===============================
  const selectNome = document.getElementById('nome');
  const imgFuncionario = document.getElementById('funcionario-img');
  const selectForma = document.getElementById('forma_pagamento');
  const selectGrupo = document.getElementById('grupo');
  const inputValor = document.getElementById('valor');
  const inputData = document.getElementById('data');
  const inputDescricao = document.getElementById('descricao');
  const form = document.getElementById('despesa-form');
  const painelAlim = document.getElementById('painel-alimentacao');
  const listaAlim = document.getElementById('lista-alimentacao');
  const totalAlimSpan = document.getElementById('total-alimentacao');
  const limiteRestanteSpan = document.getElementById('limite-restante');
  const notaFiscalUrl = document.getElementById('nota_fiscal_url');

  // elementos de captura/seleção de nota fiscal
  const btnCapturar = document.getElementById('btn-capturar');
  const btnSelecionar = document.getElementById('btn-selecionar');
  const inputCamera = document.getElementById('nota_fiscal_camera');
  const inputArquivo = document.getElementById('nota_fiscal_arquivo');
  const nomeArquivoSpan = document.getElementById('nome-arquivo');

  // ===============================
  // 2. UTILITÁRIOS: leitura/escrita localStorage
  // ===============================
  function carregarDespesasLocal() {
    try {
      return JSON.parse(localStorage.getItem('despesas') || '[]');
    } catch (e) {
      console.warn('Erro ao parsear despesas do localStorage', e);
      return [];
    }
  }

  function salvarDespesasLocal(arr) {
    localStorage.setItem('despesas', JSON.stringify(arr));
  }

  function gerarId() {
    return 'd-' + Date.now() + '-' + Math.floor(Math.random()*10000);
  }

  // converte valores "R$ 12,34" ou "12,34" para float
  function valorParaNumero(vstr) {
    if (!vstr && vstr !== 0) return 0;
    let s = vstr.toString().replace(/[R$\s\.]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // formata numero para R$ X,XX
  function formatarReal(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  // ===============================
  // 3. INICIALIZAÇÃO: popular select 'nome' com qualquer nome existente em localStorage / CSV remoto
  // ===============================
  async function init() {
    // coletar nomes de localStorage
    const local = carregarDespesasLocal();
    const nomes = new Set(local.map(d => (d.nome || '').trim()).filter(n => n));

    // tentar buscar funcionários remotos (compatibilidade)
    const csvFuncionariosUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvfKNijsXtDu3AKopOksK_9sEIpMI9O7sSCx3aX3Mo7IqspCy6mVI1jPKO939WxbKpnntTCfWoQu5R/pub?gid=1347748477&single=true&output=csv';
    try {
      const resp = await fetch(csvFuncionariosUrl);
      const txt = await resp.text();
      const parsed = (typeof Papa !== 'undefined' && Papa.parse) ? Papa.parse(txt, {header:true, skipEmptyLines:true}) : {data:[]};
      parsed.data.forEach(r => {
        const n = (r.nome || '').trim();
        if (n) nomes.add(n);
      });
    } catch (e) {
      console.warn('Não foi possível carregar funcionários remotos (não obrigatório).', e);
    }

    // popular select
    const arrNomes = Array.from(nomes).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    selectNome.innerHTML = '';
    arrNomes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      selectNome.appendChild(opt);
    });

    // se não houver nomes, deixar uma opção vazia para o usuário escrever/selecionar
    if (arrNomes.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- selecione --';
      selectNome.appendChild(opt);
    }

    // definir data padrão para hoje
    if (inputData && !inputData.value) {
      const hoje = new Date().toISOString().slice(0,10);
      inputData.value = hoje;
    }

    // atualizar painel alimentação quando mudar grupo/nome/data
    if (selectGrupo) selectGrupo.addEventListener('change', atualizarPainelAlimentacao);
    if (selectNome) selectNome.addEventListener('change', atualizarPainelAlimentacao);
    if (inputData) inputData.addEventListener('change', atualizarPainelAlimentacao);

    // captura nota fiscal
    if (btnCapturar) btnCapturar.addEventListener('click', ()=> inputCamera.click());
    if (btnSelecionar) btnSelecionar.addEventListener('click', ()=> inputArquivo.click());

    if (inputCamera) inputCamera.addEventListener('change', async (e)=> {
      const f = e.target.files && e.target.files[0];
      if (f) {
        nomeArquivoSpan.textContent = f.name;
        // convert to data URL for storage reference (lightweight)
        const dataUrl = await fileToDataURL(f);
        notaFiscalUrl.value = dataUrl;
      }
    });

    if (inputArquivo) inputArquivo.addEventListener('change', async (e)=> {
      const f = e.target.files && e.target.files[0];
      if (f) {
        nomeArquivoSpan.textContent = f.name;
        const dataUrl = await fileToDataURL(f);
        notaFiscalUrl.value = dataUrl;
      }
    });

    // vincular submit
    if (form) form.addEventListener('submit', onSubmit);
    // inicial update
    atualizarPainelAlimentacao();
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ===============================
  // 4. LÓGICA: painel/validação de Alimentação
  // ===============================
  function despesasDoDiaPorNomeCategoria(nome, dataISO, categoria) {
    const all = carregarDespesasLocal();
    return all.filter(d => {
      const sameNome = (d.nome||'').trim() === (nome||'').trim();
      const sameData = (d.data||'') === (dataISO||'');
      const sameCat = (d.grupo||'') === (categoria||'');
      return sameNome && sameData && sameCat;
    });
  }

  function atualizarPainelAlimentacao() {
    try {
      const categoria = (selectGrupo && selectGrupo.value) || '';
      const nome = (selectNome && selectNome.value) || '';
      const dataISO = (inputData && inputData.value) || new Date().toISOString().slice(0,10);

      if (categoria === 'Alimentação') {
        const itens = despesasDoDiaPorNomeCategoria(nome, dataISO, 'Alimentação');
        painelAlim.style.display = 'block';
        listaAlim.innerHTML = '';
        let total = 0;
        itens.forEach(it => {
          const div = document.createElement('div');
          div.textContent = `${it.descricao || '—'} — ${formatarReal(valorParaNumero(it.valor))}`;
          listaAlim.appendChild(div);
          total += valorParaNumero(it.valor);
        });
        totalAlimSpan.textContent = formatarReal(total);
        const restante = Math.max(0, LIMITE_ALIMENTACAO - total);
        limiteRestanteSpan.textContent = `Resta ${formatarReal(restante)}`;
      } else {
        painelAlim.style.display = 'none';
        limiteRestanteSpan.textContent = '';
      }
    } catch (e) {
      console.error('Erro ao atualizar painel alimentação', e);
    }
  }

  // ===============================
  // 5. SUBMIT: validações e salvamento
  // ===============================
  function validarCampos({nome, data, grupo, forma_pagamento, descricao, valor}) {
    if (!nome || !nome.trim()) return 'Nome é obrigatório.';
    if (!data) return 'Data é obrigatória.';
    if (!grupo || !grupo.trim()) return 'Categoria (Despesa) é obrigatória.';
    if (!forma_pagamento || !forma_pagamento.trim()) return 'Forma de pagamento é obrigatória.';
    if (!descricao || !descricao.trim()) return 'Descrição é obrigatória.';
    const valnum = valorParaNumero(valor);
    if (valnum <= 0) return 'Valor deve ser maior que zero.';
    return null;
  }

  function onSubmit(e) {
    e.preventDefault();
    const payload = {
      id: gerarId(),
      nome: (selectNome.value || '').trim(),
      data: inputData.value,
      grupo: (selectGrupo.value || '').trim(),
      forma_pagamento: (selectForma.value || '').trim(),
      descricao: (inputDescricao.value || '').trim(),
      valor: (inputValor.value || '').trim(),
      nota_fiscal_url: (notaFiscalUrl.value || '').trim()
    };

    // validar
    const err = validarCampos(payload);
    if (err) {
      alert(err);
      return;
    }

    // se alimentação: validar limite diário
    if (payload.grupo === 'Alimentação') {
      const existentes = despesasDoDiaPorNomeCategoria(payload.nome, payload.data, 'Alimentação');
      const somaExistente = existentes.reduce((s,it)=> s + valorParaNumero(it.valor), 0);
      const somaNova = somaExistente + valorParaNumero(payload.valor);
      if (somaNova > LIMITE_ALIMENTACAO + 0.0001) {
        alert(`Limite diário de Alimentação excedido. Já registrado: ${formatarReal(somaExistente)}. Limite: ${formatarReal(LIMITE_ALIMENTACAO)}.`);
        // não salvar
        return;
      }
    }

    // salvar localmente
    const arr = carregarDespesasLocal();
    arr.push(payload);
    salvarDespesasLocal(arr);

    // feedback e reset mínimo do form
    alert('Despesa registrada com sucesso.');
    inputDescricao.value = '';
    inputValor.value = '';
    nomeArquivoSpan.textContent = '';
    notaFiscalUrl.value = '';
    atualizarPainelAlimentacao();
  }

  // inicializar
  init();

});