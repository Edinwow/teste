document.addEventListener('DOMContentLoaded', () => {
    // ===============================
    // DADOS E CONFIGURAÇÕES DA APLICAÇÃO
    // ===============================
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwzlyCPCcREj_bLD5km22ep0xS4g3BnZa7oKYpbRhYsG16OKxtT_VXR_0gejBfhseFzsg/exec';
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    const PAPAPARSE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    let listaDeUsuarios = [];

    // ===============================
    // SELETORES GLOBAIS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const formRelatorio = document.getElementById('report-form');
    // ... seletores para os campos de formulário ...
    const userSearchInput = document.getElementById('user-search-input');
    const userDropdown = document.getElementById('user-dropdown');
    const hiddenNomeInput = document.getElementById('nome');
    const userErrorMessage = document.getElementById('user-error-message');
    const imgFuncionario = document.getElementById('funcionario-img');
    const reportUserSearchInput = document.getElementById('relatorio-user-search-input');
    const reportUserDropdown = document.getElementById('relatorio-user-dropdown');
    const reportHiddenNomeInput = document.getElementById('relatorio-nome-hidden');
    const reportUserErrorMessage = document.getElementById('relatorio-user-error-message');
    const reportImgFuncionario = document.getElementById('relatorio-funcionario-img');
    const inputData = document.getElementById('data');
    const selectGrupo = document.getElementById('grupo');

    // ===============================
    // OTIMIZAÇÃO: CARREGADOR DE SCRIPTS DINÂMICO
    // ===============================
    const loadedScripts = {};
    function loadScript(url) {
        if (loadedScripts[url]) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                loadedScripts[url] = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ===============================
    // LÓGICA DO SELETOR DE USUÁRIO (REUTILIZÁVEL)
    // ===============================
    function setupUserSelector(searchInput, dropdown, hiddenInput, imgElement, errorMessage, isRegistroTab = false) {
        const renderDropdown = (filter = '') => {
            dropdown.innerHTML = '';
            const filteredUsers = listaDeUsuarios.filter(u => u.nome.toLowerCase().includes(filter.toLowerCase()));
            if (filteredUsers.length === 0) {
                dropdown.innerHTML = '<div class="user-dropdown-item no-results">Nenhum resultado</div>';
                return;
            }
            filteredUsers.forEach(user => {
                const item = document.createElement('div');
                item.className = 'user-dropdown-item';
                item.innerHTML = `<img src="${user.imagem}" alt="${user.nome}"> <span>${user.nome}</span>`;
                item.addEventListener('click', () => selectUser(user));
                dropdown.appendChild(item);
            });
        };
        const selectUser = (user) => {
            searchInput.value = user.nome;
            hiddenInput.value = user.nome;
            imgElement.src = user.imagem;
            dropdown.classList.add('hidden');
            validateSelection();
            if (isRegistroTab) {
                localStorage.setItem('ultimoUsuarioSalvo', user.nome);
                atualizarLimiteAlimentacao();
            }
        };
        const validateSelection = () => {
            const nomeAtual = searchInput.value;
            const usuarioValido = listaDeUsuarios.some(u => u.nome === nomeAtual);
            hiddenInput.value = usuarioValido ? nomeAtual : '';
            errorMessage.classList.toggle('hidden', usuarioValido || nomeAtual === '');
            return usuarioValido;
        };
        searchInput.addEventListener('focus', () => { renderDropdown(searchInput.value); dropdown.classList.remove('hidden'); });
        searchInput.addEventListener('input', () => { renderDropdown(searchInput.value); validateSelection(); });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-selector-container')) dropdown.classList.add('hidden');
        });
        return { selectUser };
    }

    // ===============================
    // FUNÇÕES DA APLICAÇÃO
    // ===============================
    async function carregarUsuarios() {
        try {
            await loadScript(PAPAPARSE_URL);
            const resp = await fetch(`${USUARIOS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            listaDeUsuarios = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data.filter(u => u.nome && u.imagem);
        } catch (error) { console.error("Falha ao carregar usuários.", error); }
    }

    function carregarUltimoUsuario(registroSelector, relatorioSelector) {
        const ultimoUsuarioNome = localStorage.getItem('ultimoUsuarioSalvo');
        const ultimoUsuario = listaDeUsuarios.find(u => u.nome === ultimoUsuarioNome);
        if (ultimoUsuario) {
            registroSelector.selectUser(ultimoUsuario);
            relatorioSelector.selectUser(ultimoUsuario);
        }
    }
    
    // OTIMIZAÇÃO: Busca a soma diária diretamente do servidor
    async function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        const nomeSelecionado = hiddenNomeInput.value;
        const [ano, mes, dia] = inputData.value.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;

        if (selectGrupo.value !== 'Alimentação' || !nomeSelecionado) {
            spanLimite.textContent = '';
            return;
        }

        try {
            const url = new URL(WEBAPP_URL);
            url.searchParams.append('action', 'getDailySum');
            url.searchParams.append('nome', nomeSelecionado);
            url.searchParams.append('data', dataFormatada);
            
            const response = await fetch(url);
            const data = await response.json();
            const somaDoDia = data.sum || 0;
            const restante = 170 - somaDoDia;
            
            spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
            spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
            spanLimite.classList.toggle('danger', restante <= 0);
        } catch (error) {
            console.error('Erro ao buscar limite diário:', error);
            spanLimite.textContent = 'Erro ao consultar';
        }
    }

    // OTIMIZAÇÃO: Lógica de relatório movida para o servidor
    async function generateReportFromServer() {
        if (reportHiddenNomeInput.value === '') {
            alert("Por favor, selecione um usuário válido da lista.");
            return;
        }

        const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');
        submitBtnRelatorio.disabled = true;
        submitBtnRelatorio.textContent = 'Gerando na nuvem...';

        try {
            const url = new URL(WEBAPP_URL);
            url.searchParams.append('action', 'generateReport');
            url.searchParams.append('nome', reportHiddenNomeInput.value);
            url.searchParams.append('dataInicio', document.getElementById('dataInicio').value);
            url.searchParams.append('dataFim', document.getElementById('dataFim').value);

            const response = await fetch(url);
            const result = await response.json();

            if (result.status === 'success') {
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
                throw new Error(result.message || 'Erro desconhecido no servidor.');
            }
        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            alert(`Falha ao gerar o relatório: ${error.message}`);
        } finally {
            submitBtnRelatorio.disabled = false;
            submitBtnRelatorio.textContent = 'Baixar relatório';
        }
    }
    
    // ===============================
    // INICIALIZAÇÃO E EVENTOS
    // ===============================
    async function init() {
        // Navegação por abas
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', () => {
                document.querySelectorAll('.tab-link, .tab-pane').forEach(item => item.classList.remove('active'));
                link.classList.add('active');
                document.getElementById(link.getAttribute('data-tab')).classList.add('active');
            });
        });

        await carregarUsuarios();
        
        const registroSelector = setupUserSelector(userSearchInput, userDropdown, hiddenNomeInput, imgFuncionario, userErrorMessage, true);
        const relatorioSelector = setupUserSelector(reportUserSearchInput, reportUserDropdown, reportHiddenNomeInput, reportImgFuncionario, reportUserErrorMessage);

        carregarUltimoUsuario(registroSelector, relatorioSelector);

        // Configuração geral dos formulários
        const dataInput = document.getElementById('data');
        if (dataInput) {
            const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
            dataInput.value = formatter.format(new Date());
            dataInput.addEventListener('change', atualizarLimiteAlimentacao);
        }
        selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);
        formRelatorio?.addEventListener('submit', (e) => { e.preventDefault(); generateReportFromServer(); });

        // A lógica de envio do registro não precisa de grandes mudanças
        formRegistro?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = formRegistro.querySelector('button[type="submit"]');
            if(hiddenNomeInput.value === '') { alert("Selecione um usuário válido."); return; }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const formData = new FormData(formRegistro);
            const [ano, mes, dia] = formData.get('data').split('-');
            formData.set('data', `${dia}/${mes}/${ano}`);

            try {
                const response = await fetch(WEBAPP_URL, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                
                alert('Despesa registrada com sucesso!');
                const usuarioSalvo = listaDeUsuarios.find(u => u.nome === hiddenNomeInput.value);
                formRegistro.reset();
                if(usuarioSalvo) registroSelector.selectUser(usuarioSalvo);
                dataInput.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
                document.getElementById('nome-arquivo').textContent = 'Nenhum arquivo selecionado';
                atualizarLimiteAlimentacao();
            } catch (error) {
                console.error("Erro ao registrar despesa:", error);
                alert(`Falha ao registrar a despesa: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Adicionar Despesa';
            }
        });
    }

    init();
});