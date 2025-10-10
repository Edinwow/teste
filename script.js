document.addEventListener('DOMContentLoaded', () => {
  // ===============================
  // 1. DEFINIÇÃO DE VARIÁVEIS E SELETORES GLOBAIS
  // ===============================

  // URLs dos CSVs
  const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvfKNijsXtDu3AKopOksK_9sEIpMI9O7sSCx3aX3Mo7IqspCy6mVI1jPKO939WxbKpnntTCfWoQu5R/pub?gid=0&single=true&output=csv';
  const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvfKNijsXtDu3AKopOksK_9sEIpMI9O7sSCx3aX3Mo7IqspCy6mVI1jPKO939WxbKpnntTCfWoQu5R/pub?gid=1347748477&single=true&output=csv';
  const PROJETOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvfKNijsXtDu3AKopOksK_9sEIpMI9O7sSCx3aX3Mo7IqspCy6mVI1jPKO939WxbKpnntTCfWoQu5R/pub?gid=1599009483&single=true&output=csv';
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwY1IiBheTmS421ThMhetm3YBGVBZg3nEb8hYYiWPbns8Blnl5gK7fA0hssb4N_CoXIMw/exec';

  // Variáveis de escopo global
  let usuarios = [];
  let despesasData = [];
  let aplicarPadroesUsuario = null;

  // ===============================
  // SEÇÃO: REGISTRO DE DESPESAS
  // ===============================

  const formRegistro = document.getElementById('despesa-form');
  if (formRegistro) {
    // Seletores dos campos do formulário de registro
    const selectNome = document.getElementById('nome');
    const imgFuncionario = document.getElementById('funcionario-img');
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');

    // Inicialização do formulário de registro
    inicializarFormularioRegistro();

    function inicializarFormularioRegistro() {
      carregarGruposDeDespesa();
      carregarUsuarios();
      configurarCampoValor();
      configurarDataAtual();
      configurarEnvioFormulario();
    }

    function carregarGruposDeDespesa() {
      fetch(PROJETOS_CSV_URL)
        .then(response => response.text())
        .then(csv => {
          const lines = csv.trim().split('\n');
          const header = lines[0].split(',');
          const gruposCabecalhos = header.slice(3).map(h => h.trim()).filter(Boolean);

          if (selectGrupo) {
            selectGrupo.innerHTML = '<option value="">Selecione...</option>'; // Adicionado
            gruposCabecalhos.forEach(grupo => {
              const opt = document.createElement('option');
              opt.value = grupo;
              opt.textContent = grupo;
              selectGrupo.appendChild(opt);
            });
          }
        });
    }

    function carregarUsuarios() {
      fetch(USUARIOS_CSV_URL)
        .then(response => response.text())
        .then(csv => {
          const lines = csv.trim().split('\n');
          const header = lines[0].split(',');
          // Mapeamento dos índices das colunas
          const idx = {
            nome: header.indexOf('nome'),
            imagem: header.indexOf('imagem'),
            forma: header.indexOf('forma_padrao'),
            grupo: header.indexOf('despesa_padrao'),
          };

          usuarios = lines.slice(1).map(line => {
            const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            return {
              nome: cols[idx.nome]?.trim() || '',
              imagem: cols[idx.imagem]?.trim() || '',
              forma: cols[idx.forma]?.trim() || '',
              grupo: cols[idx.grupo]?.trim() || '',
            };
          }).filter(u => u.nome);

          // Popula os selects de nome nos dois formulários
          const selectsNome = [document.getElementById('nome'), document.getElementById('relatorio-nomeSelect')];
          selectsNome.forEach(select => {
            if (select) {
              select.innerHTML = '';
              usuarios.forEach(usuario => {
                const opt = document.createElement('option');
                opt.value = usuario.nome;
                opt.textContent = usuario.nome;
                select.appendChild(opt);
              });
            }
          });

          aplicarPadroesUsuario = (usuario) => {
            if (imgFuncionario && usuario.imagem) imgFuncionario.src = usuario.imagem;
            if (selectForma && usuario.forma) selectForma.value = usuario.forma;
            if (selectGrupo && usuario.grupo) selectGrupo.value = usuario.grupo;
          };

          if (usuarios.length > 0) {
            aplicarPadroesUsuario(usuarios[0]);
            atualizarLimiteAlimentacao();
          }

          selectNome?.addEventListener('change', () => {
            const usuario = usuarios.find(u => u.nome === selectNome.value);
            if (usuario) aplicarPadroesUsuario(usuario);
            atualizarLimiteAlimentacao();
          });

          if (imgFuncionario && usuarios.length > 0) imgFuncionario.src = usuarios[0].imagem;
        });
    }

    function configurarCampoValor() {
      if (!inputValor) return;
      inputValor.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        valor = (valor / 100).toFixed(2).replace('.', ',');
        valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        e.target.value = 'R$ ' + valor;
      });
    }

    function configurarDataAtual() {
      if (inputData) inputData.valueAsDate = new Date();
    }

    function configurarEnvioFormulario() {
      formRegistro.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = formRegistro.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const formData = new FormData(formRegistro);
        const [ano, mes, dia] = inputData.value.split('-');
        formData.set('data', `${dia}/${mes}/${ano}`);

        const params = new URLSearchParams();
        formData.forEach((value, key) => params.append(key, value));

        try {
          await fetch(WEBAPP_URL, {
            method: 'POST',
            body: params
          });
        } catch (err) {
          console.error("Erro no envio:", err);
        }

        const usuarioSelecionado = selectNome.value;
        formRegistro.reset();
        selectNome.value = usuarioSelecionado;
        inputData.valueAsDate = new Date();
        document.getElementById('nome-arquivo').textContent = '';
        
        // Recarregar dados de despesas e atualizar UI
        carregarDadosDespesas().then(() => {
            alert('Despesa registrada com sucesso!');
            const usuario = usuarios.find(u => u.nome === usuarioSelecionado);
            if (usuario) aplicarPadroesUsuario(usuario);
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar despesa';
            atualizarLimiteAlimentacao();
        });
      });
    }

    // NOVA LÓGICA: Verificação de limite para Alimentação
    function atualizarLimiteAlimentacao() {
      const spanLimite = document.getElementById('limite-restante');
      if (!spanLimite) return;

      const nomeSelecionado = selectNome?.value;
      const dataSelecionada = inputData?.value; // formato yyyy-mm-dd
      const despesaSelecionada = selectGrupo?.value;

      if (despesaSelecionada !== 'Alimentação') {
        spanLimite.textContent = '';
        return;
      }

      if (!nomeSelecionado || !dataSelecionada || despesasData.length === 0) {
        spanLimite.textContent = 'Resta R$ 170,00';
        return;
      }
      
      const [ano, mes, dia] = dataSelecionada.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;

      let somaDoDia = 0;
      despesasData.forEach(row => {
        if (
          row.nome?.trim() === nomeSelecionado &&
          row.data?.trim() === dataFormatada &&
          row.grupo?.trim() === 'Alimentação'
        ) {
          let valorStr = (row.valor || '').replace(/[^\d,]/g, '').replace(',', '.');
          let valor = parseFloat(valorStr);
          if (!isNaN(valor)) {
            somaDoDia += valor;
          }
        }
      });
      
      const restante = 170 - somaDoDia;
      spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
    }
    
    // Carregar dados de despesas uma vez para uso na verificação de limite
    async function carregarDadosDespesas() {
        const resp = await fetch(DESPESAS_CSV_URL);
        const csvText = await resp.text();
        despesasData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    }
    
    // Gatilhos para atualizar o limite
    selectNome?.addEventListener('change', atualizarLimiteAlimentacao);
    inputData?.addEventListener('change', atualizarLimiteAlimentacao);
    selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);

    // Carregamento inicial dos dados de despesas
    carregarDadosDespesas().then(() => atualizarLimiteAlimentacao());
  }

  // ===============================
  // SEÇÃO: GERAÇÃO DE RELATÓRIO
  // ===============================

  const formRelatorio = document.getElementById('report-form');
  if (formRelatorio) {
    const selectNomeRelatorio = document.getElementById('relatorio-nomeSelect');
    const imgFuncionarioRelatorio = document.getElementById('relatorio-funcionario-img');

    selectNomeRelatorio?.addEventListener('change', () => {
        const usuario = usuarios.find(u => u.nome === selectNomeRelatorio.value);
        if (usuario && imgFuncionarioRelatorio) {
            imgFuncionarioRelatorio.src = usuario.imagem || 'https://i.imgur.com/xsfzmyg.jpeg';
        }
    });
    
    formRelatorio.addEventListener('submit', (e) => {
        e.preventDefault();
        gerarPDF();
    });

    async function gerarPDF() {
      const nomeSelecionado = selectNomeRelatorio.value;
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const dadosFiltrados = despesasData.filter(row => {
        if (!row.data || !row.descricao || !row.nota_fiscal_url || !row.nome) return false;
        
        const partes = row.data.split('/');
        if (partes.length !== 3) return false;
        const dataRow = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        
        const dentroDoIntervalo = (!dataInicio || dataRow >= dataInicio) && (!dataFim || dataRow <= dataFim);
        const nomeConfere = row.nome.trim() === nomeSelecionado;
        
        return dentroDoIntervalo && nomeConfere;
      });

      if (dadosFiltrados.length === 0) {
        alert('Nenhum dado encontrado para os filtros selecionados.');
        return;
      }
      
      for (let i = 0; i < dadosFiltrados.length; i++) {
        const row = dadosFiltrados[i];
        if (i > 0) pdf.addPage();

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(row.descricao, 10, 20);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const dataValor = `${row.data}${row.valor ? ' | ' + row.valor : ''}`;
        pdf.text(dataValor, 10, 30);

        try {
          const imageData = await carregarImagemComoBase64(row.nota_fiscal_url);
          const img = new Image();
          img.src = imageData;

          await new Promise((resolve) => {
            img.onload = () => {
              const imgWidthOriginal = img.width;
              const imgHeightOriginal = img.height;
              const marginTop = 40;
              const availableHeight = pageHeight - marginTop - 10;
              const scale = Math.min(180 / imgWidthOriginal, availableHeight / imgHeightOriginal);
              const imgWidth = imgWidthOriginal * scale;
              const imgHeight = imgHeightOriginal * scale;

              pdf.addImage(imageData, 'JPEG', 10, marginTop, imgWidth, imgHeight);
              resolve();
            };
            img.onerror = () => {
                pdf.setTextColor(255, 0, 0);
                pdf.text('Erro ao carregar imagem.', 10, 50);
                resolve();
            }
          });
        } catch (e) {
          pdf.setTextColor(255, 0, 0);
          pdf.text('Erro ao carregar imagem.', 10, 50);
        }
      }
      
      pdf.save(`relatorio_${nomeSelecionado}.pdf`);

      // Geração do TXT
      let linhasTXT = [];
      dadosFiltrados.forEach(row => {
        let formaPag = row.forma_pagamento === "Cartão de crédito" ? "C=CreditCard" : "D=Cash";
        const linha = [
          row.data || "", "", "", row.grupo || "", "", row.descricao || "", "", "Real", "", formaPag, row.valor || ""
        ].join('\t');
        linhasTXT.push(linha);
      });

      const conteudoTXT = linhasTXT.join('\n');
      const blob = new Blob([conteudoTXT], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_${nomeSelecionado}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function carregarImagemComoBase64(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem: ' + url));
        img.src = url;
      });
    }
  }
});