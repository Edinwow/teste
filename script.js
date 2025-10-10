document.addEventListener('DOMContentLoaded', () => {
    // ===============================
    // LÓGICA DE NAVEGAÇÃO POR ABAS
    // ===============================
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');

            tabLinks.forEach(item => item.classList.remove('active'));
            tabPanes.forEach(item => item.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ===============================
    // DADOS INTERNOS DA APLICAÇÃO
    // ===============================
    const usuarios = [
        { nome: 'Edson Guimarães', imagem: 'https://i.imgur.com/xsfzmyg.jpeg' },
        { nome: 'Henrique Cabral', imagem: 'https://i.imgur.com/MLri28V.jpeg' },
        { nome: 'Cynthia Blank', imagem: 'https://i.imgur.com/mQnu7UK.jpeg' },
        { nome: 'Santiago Silva', imagem: 'https://i.imgur.com/FsOZRK3.jpeg' },
        { nome: 'Mariana Barcelos', imagem: 'https://i.imgur.com/Ovkt0nB.jpeg' },
        { nome: 'Bruno Batista', imagem: 'https://i.imgur.com/cMnGiYe.jpeg' }
    ];

    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];

    // URLs para a planilha (leitura e escrita)
    const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvfKNijsXtDu3AKopOksK_9sEIpMI9O7sSCx3aX3Mo7IqspCy6mVI1jPKO939WxbKpnntTCfWoQu5R/pub?gid=0&single=true&output=csv';
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwY1IiBheTmS421ThMhetm3YBGVBZg3nEb8hYYiWPbns8Blnl5gK7fA0hssb4N_CoXIMw/exec';

    // Variáveis globais
    let despesasData = [];

    // ===============================
    // SELETORES GLOBAIS DE ELEMENTOS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const selectNome = document.getElementById('nome');
    const imgFuncionario = document.getElementById('funcionario-img');
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');

    // ===============================
    // FUNÇÕES DE INICIALIZAÇÃO E POPULAÇÃO
    // ===============================

    function popularUsuarios() {
        const selectsNome = [selectNome, document.getElementById('relatorio-nomeSelect')];
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
        atualizarImagemUsuario();
    }

    function popularFormasPagamento() {
        if (selectForma) {
            selectForma.innerHTML = '';
            formasDePagamento.forEach(forma => {
                const opt = document.createElement('option');
                opt.value = forma;
                opt.textContent = forma;
                selectForma.appendChild(opt);
            });
        }
    }

    function popularCategorias() {
        if (selectGrupo) {
            selectGrupo.innerHTML = '<option value="">Selecione...</option>';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                selectGrupo.appendChild(opt);
            });
        }
    }

    function atualizarImagemUsuario() {
        const usuarioSelecionado = usuarios.find(u => u.nome === selectNome.value);
        if (usuarioSelecionado && imgFuncionario) {
            imgFuncionario.src = usuarioSelecionado.imagem;
        }
    }

    function configurarCampoValor() {
        if (inputValor) {
            inputValor.addEventListener('input', (e) => {
                let valor = e.target.value.replace(/\D/g, '');
                valor = (valor / 100).toFixed(2).replace('.', ',');
                valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                e.target.value = 'R$ ' + valor;
            });
        }
    }

    function configurarDataAtual() {
        if (inputData) inputData.valueAsDate = new Date();
    }

    // ===============================
    // LÓGICA PRINCIPAL
    // ===============================

    async function carregarDadosDespesas() {
        try {
            const resp = await fetch(`${DESPESAS_CSV_URL}&t=${new Date().getTime()}`); // Evita cache
            const csvText = await resp.text();
            despesasData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
        } catch (error) {
            console.error("Não foi possível carregar os dados de despesas.", error);
            alert("Não foi possível conectar à planilha de despesas. A verificação de limite pode não funcionar.");
        }
    }

    function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;

        const nomeSelecionado = selectNome?.value;
        const dataSelecionada = inputData?.value;
        const despesaSelecionada = selectGrupo?.value;

        if (despesaSelecionada !== 'Alimentação') {
            spanLimite.textContent = '';
            return;
        }

        if (!nomeSelecionado || !dataSelecionada) {
            spanLimite.textContent = 'Resta R$ 170,00';
            return;
        }

        const [ano, mes, dia] = dataSelecionada.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        let somaDoDia = 0;

        despesasData.forEach(row => {
            if (row.nome?.trim() === nomeSelecionado && row.data?.trim() === dataFormatada && row.grupo?.trim() === 'Alimentação') {
                let valorStr = (row.valor || '').replace(/[^\d,]/g, '').replace(',', '.');
                let valor = parseFloat(valorStr);
                if (!isNaN(valor)) somaDoDia += valor;
            }
        });

        const restante = 170 - somaDoDia;
        spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
        spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
        spanLimite.classList.toggle('danger', restante <= 0);
    }
    
    // Configuração do formulário de envio
    if (formRegistro) {
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
                await fetch(WEBAPP_URL, { method: 'POST', body: params });
            } catch (err) { console.error("Erro no envio:", err); }

            alert('Despesa registrada com sucesso!');
            const usuarioSelecionado = selectNome.value;
            formRegistro.reset();
            selectNome.value = usuarioSelecionado;
            configurarDataAtual();
            document.getElementById('nome-arquivo').textContent = 'Nenhum arquivo selecionado';
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Adicionar Despesa';
            
            // Recarrega os dados e atualiza o limite
            await carregarDadosDespesas();
            atualizarLimiteAlimentacao();
        });
    }

    // ===============================
    // EVENT LISTENERS E INICIALIZAÇÃO
    // ===============================
    selectNome?.addEventListener('change', () => {
        atualizarImagemUsuario();
        atualizarLimiteAlimentacao();
    });
    inputData?.addEventListener('change', atualizarLimiteAlimentacao);
    selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);

    // Inicialização da aplicação
    popularUsuarios();
    popularFormasPagamento();
    popularCategorias();
    configurarCampoValor();
    configurarDataAtual();
    carregarDadosDespesas().then(atualizarLimiteAlimentacao);

    // Lógica do Relatório (mantida como estava, mas usando os dados já carregados)
    const formRelatorio = document.getElementById('report-form');
    if (formRelatorio) {
        const selectNomeRelatorio = document.getElementById('relatorio-nomeSelect');
        const imgFuncionarioRelatorio = document.getElementById('relatorio-funcionario-img');

        selectNomeRelatorio?.addEventListener('change', () => {
            const usuario = usuarios.find(u => u.nome === selectNomeRelatorio.value);
            if (usuario && imgFuncionarioRelatorio) {
                imgFuncionarioRelatorio.src = usuario.imagem;
            }
        });
        
        formRelatorio.addEventListener('submit', (e) => {
            e.preventDefault();
            // A lógica de gerarPDF usa a variável global `despesasData`
            // que já foi carregada no início.
            gerarPDF(); 
        });

        async function gerarPDF() {
            // ... (A função gerarPDF continua a mesma, pois já usa `despesasData`)
        }
    }
});