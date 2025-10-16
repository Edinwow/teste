document.addEventListener('DOMContentLoaded', () => {
    // ===============================
    // DADOS E CONFIGURAÇÕES GLOBAIS
    // ===============================
    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];

    // URLs para a planilha (leitura de usuários e escrita de despesas via WebApp)
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwzlyCPCcREj_bLD5km22ep0xS4g3BnZa7oKYpbRhYsG16OKxtT_VXR_0gejBfhseFzsg/exec';

    let usuarios = [];

    // ===============================
    // SELETORES GLOBAIS DE ELEMENTOS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');
    const nomeArquivoSpan = document.getElementById('nome-arquivo');
    const inputCamera = document.getElementById('nota_fiscal_camera');
    const inputArquivo = document.getElementById('nota_fiscal_arquivo');

    // ===============================
    // FUNÇÕES DE INICIALIZAÇÃO E LÓGICA
    // ===============================

    function popularFormasPagamento() {
        if (selectForma) {
            formasDePagamento.forEach(forma => selectForma.add(new Option(forma, forma)));
        }
    }

    function popularCategorias() {
        if (selectGrupo) {
            categorias.forEach(cat => selectGrupo.add(new Option(cat, cat)));
            selectGrupo.value = 'Alimentação';
        }
    }

    function configurarCampoValor() {
        inputValor?.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '');
            valor = (valor / 100).toFixed(2).replace('.', ',');
            valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            e.target.value = 'R$ ' + valor;
        });
    }

    function configurarDataAtual() {
        if (inputData) {
            const data = new Date();
            data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const offset = data.getTimezoneOffset() * 60000;
            const dataLocal = new Date(data - offset);
            inputData.value = dataLocal.toISOString().slice(0, 10);
        }
    }

    function atualizarNomeArquivo(input) {
        if (input.files.length > 0) {
            nomeArquivoSpan.textContent = input.files[0].name;
            nomeArquivoSpan.classList.add('selected');
        }
    }
    
    // --- NOVO: Lógica do Seletor Pesquisável ---
    function setupSearchSelect(wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        const trigger = wrapper.querySelector('.search-select-trigger');
        const searchInput = wrapper.querySelector('.search-select-search');
        const optionsList = wrapper.querySelector('.options-list');
        const selectedUserNameSpan = wrapper.querySelector('.selected-user-name');
        const userImage = wrapper.querySelector('img');
        const hiddenInput = document.getElementById(wrapperId.includes('registrar') ? 'nome' : 'relatorio-nome');

        // Popula as opções
        optionsList.innerHTML = '';
        usuarios.forEach(user => {
            const option = document.createElement('div');
            option.className = 'option';
            option.dataset.value = user.nome;
            option.innerHTML = `<img src="${user.imagem}" alt="${user.nome}"><span>${user.nome}</span>`;
            option.addEventListener('click', () => {
                selectUser(user.nome);
                wrapper.classList.remove('open');
            });
            optionsList.appendChild(option);
        });
        
        const selectUser = (nome) => {
            const user = usuarios.find(u => u.nome === nome);
            if (!user) return;
            
            selectedUserNameSpan.textContent = user.nome;
            userImage.src = user.imagem;
            hiddenInput.value = user.nome;
            
            // Dispara um evento para outras partes do código saberem da mudança
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        };
        
        trigger.addEventListener('click', () => wrapper.classList.toggle('open'));

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            optionsList.querySelectorAll('.option').forEach(option => {
                const name = option.dataset.value.toLowerCase();
                option.classList.toggle('hidden', !name.includes(searchTerm));
            });
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });
        
        return { selectUser }; // Retorna a função para poder usá-la externamente
    }

    // --- NOVO: Lógica para carregar usuários da planilha ---
    async function carregarUsuarios() {
        try {
            const resp = await fetch(`${USUARIOS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            usuarios = parsed.data.filter(u => u.nome && u.imagem); // Garante que nome e imagem existam
            
            const registrarSelector = setupSearchSelect('user-selector-registrar');
            const relatorioSelector = setupSearchSelect('user-selector-relatorio');

            // --- NOVO: Recupera o último usuário selecionado ---
            const ultimoUsuario = localStorage.getItem('ultimoUsuario');
            if (ultimoUsuario && usuarios.some(u => u.nome === ultimoUsuario)) {
                registrarSelector.selectUser(ultimoUsuario);
                relatorioSelector.selectUser(ultimoUsuario);
            }

        } catch (error) {
            console.error("Não foi possível carregar os dados de usuários.", error);
            alert("Erro ao carregar lista de usuários. Tente recarregar a página.");
        }
    }
    
    // --- OTIMIZADO: Busca limite de alimentação no backend ---
    async function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;

        const nomeSelecionado = document.getElementById('nome').value;
        const dataSelecionada = inputData?.value;
        const despesaSelecionada = selectGrupo?.value;

        if (despesaSelecionada !== 'Alimentação' || !nomeSelecionado || !dataSelecionada) {
            spanLimite.textContent = '';
            return;
        }

        try {
            const [ano, mes, dia] = dataSelecionada.split('-');
            const dataFormatada = `${dia}/${mes}/${ano}`;
            const url = new URL(WEBAPP_URL);
            url.searchParams.append('action', 'getDailySum');
            url.searchParams.append('nome', nomeSelecionado);
            url.searchParams.append('data', dataFormatada);

            const response = await fetch(url);
            const result = await response.json();
            const somaDoDia = result.sum || 0;
            
            const restante = 170 - somaDoDia;
            spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
            spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
            spanLimite.classList.toggle('danger', restante <= 0);

        } catch (error) {
            console.error('Erro ao buscar a soma diária:', error);
            spanLimite.textContent = 'Erro ao verificar limite.';
            spanLimite.classList.remove('warning', 'danger');
        }
    }

    // ===============================
    // LÓGICA PRINCIPAL - REGISTRO
    // ===============================
    formRegistro?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = formRegistro.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const [ano, mes, dia] = inputData.value.split('-');
        const dataFormatadaParaEnvio = `${dia}/${mes}/${ano}`;
        
        const params = new URLSearchParams();
        params.append('nome', document.getElementById('nome').value);
        params.append('data', dataFormatadaParaEnvio);
        params.append('grupo', selectGrupo.value);
        params.append('valor', inputValor.value);
        params.append('descricao', document.getElementById('descricao').value);
        params.append('forma_pagamento', selectForma.value);
        params.append('nota_fiscal_url', document.getElementById('nota_fiscal_url').value);

        try {
            await fetch(WEBAPP_URL, {
                method: 'POST',
                body: params,
                mode: 'no-cors' // Necessário para evitar erro de CORS com Apps Script
            });
            alert('Despesa registrada com sucesso!');

        } catch (err) {
            console.error("Erro de rede (ignorado para Apps Script):", err);
            alert('Despesa registrada! (A confirmação do servidor não foi recebida)');
        } finally {
            const usuarioSelecionado = document.getElementById('nome').value;
            formRegistro.reset();
            
            // Repopula e re-seleciona os dados
            setupSearchSelect('user-selector-registrar').selectUser(usuarioSelecionado);
            popularCategorias();
            configurarDataAtual();

            nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
            nomeArquivoSpan.classList.remove('selected');

            submitBtn.disabled = false;
            submitBtn.textContent = 'Adicionar Despesa';

            atualizarLimiteAlimentacao();
        }
    });

    // ===============================
    // LÓGICA PRINCIPAL - RELATÓRIO
    // ===============================
    const formRelatorio = document.getElementById('report-form');
    formRelatorio?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');
        const originalBtnText = submitBtnRelatorio.textContent;
        submitBtnRelatorio.textContent = 'Gerando...';
        submitBtnRelatorio.disabled = true;

        const url = new URL(WEBAPP_URL);
        url.searchParams.append('action', 'generateReport');
        url.searchParams.append('nome', document.getElementById('relatorio-nome').value);
        url.searchParams.append('dataInicio', document.getElementById('dataInicio').value);
        url.searchParams.append('dataFim', document.getElementById('dataFim').value);

        try {
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.status === 'success') {
                // Converte base64 para blob e inicia o download
                const byteCharacters = atob(result.file);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/zip' });

                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (result.status === 'nodata') {
                alert('Nenhum dado encontrado para os filtros selecionados.');
            } else {
                alert(`Ocorreu um erro ao gerar o relatório: ${result.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            alert("Não foi possível conectar ao servidor para gerar o relatório.");
        } finally {
            submitBtnRelatorio.textContent = originalBtnText;
            submitBtnRelatorio.disabled = false;
        }
    });


    // ===============================
    // INICIALIZAÇÃO E EVENT LISTENERS
    // ===============================
    
    // --- NOVO: Listener para salvar último usuário e atualizar limite ---
    document.getElementById('nome').addEventListener('change', () => {
        const nomeSelecionado = document.getElementById('nome').value;
        localStorage.setItem('ultimoUsuario', nomeSelecionado);
        atualizarLimiteAlimentacao();
    });

    inputData?.addEventListener('change', atualizarLimiteAlimentacao);
    selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);
    inputCamera?.addEventListener('change', () => atualizarNomeArquivo(inputCamera));
    inputArquivo?.addEventListener('change', () => atualizarNomeArquivo(inputArquivo));

    // Lógica de navegação por abas
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabPanes.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'registrar') configurarDataAtual();
        });
    });

    // Inicia a aplicação
    async function init() {
        popularFormasPagamento();
        popularCategorias();
        configurarCampoValor();
        configurarDataAtual();
        await carregarUsuarios(); // Espera carregar usuários antes de verificar o limite
        atualizarLimiteAlimentacao();
    }
    init();
});