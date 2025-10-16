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

            if (tabId === 'registrar') {
                configurarDataAtual();
            }
        });
    });

    // ===============================
    // DADOS E URLs DA APLICAÇÃO
    // ===============================
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=0&single=true&output=csv';
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwzlyCPCcREj_bLD5km22ep0xS4g3BnZa7oKYpbRhYsG16OKxtT_VXR_0gejBfhseFzsg/exec';

    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];

    // Variáveis globais
    let despesasData = [];
    let usuarios = [];
    let choicesNome, choicesRelatorio; // Variáveis para as instâncias do Choices.js

    // ===============================
    // SELETORES GLOBAIS DE ELEMENTOS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const selectNome = document.getElementById('nome');
    const selectNomeRelatorio = document.getElementById('relatorio-nomeSelect');
    const imgFuncionario = document.getElementById('funcionario-img');
    const imgFuncionarioRelatorio = document.getElementById('relatorio-funcionario-img');
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');
    const nomeArquivoSpan = document.getElementById('nome-arquivo');
    const inputCamera = document.getElementById('nota_fiscal_camera');
    const inputArquivo = document.getElementById('nota_fiscal_arquivo');

    // ===============================
    // FUNÇÕES DE INICIALIZAÇÃO E POPULAÇÃO
    // ===============================

    async function carregarUsuarios() {
        try {
            const resp = await fetch(`${USUARIOS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            usuarios = parsed.data;
        } catch (error) {
            console.error("Não foi possível carregar os usuários.", error);
            alert("Erro ao carregar a lista de usuários.");
        }
    }

    function popularUsuarios() {
        const ultimoUsuario = localStorage.getItem('ultimoUsuario');

        [
            { select: selectNome, imgElement: imgFuncionario, choicesInstance: 'choicesNome' },
            { select: selectNomeRelatorio, imgElement: imgFuncionarioRelatorio, choicesInstance: 'choicesRelatorio' }
        ].forEach((item) => {
            const { select, imgElement, choicesInstance } = item;

            if (select) {
                select.innerHTML = ''; // Limpa opções existentes
                usuarios.forEach(usuario => {
                    const opt = document.createElement('option');
                    opt.value = usuario.nome;
                    opt.dataset.image = usuario.imagem; // Armazena a imagem como data attribute
                    opt.textContent = usuario.nome;
                    if (usuario.nome === ultimoUsuario) {
                        opt.selected = true;
                    }
                    select.appendChild(opt);
                });

                // Destrói instância anterior do Choices.js se existir
                if (window[choicesInstance]) window[choicesInstance].destroy();

                // Inicializa o Choices.js com customRenderer
                const choicesOptions = {
                    searchEnabled: true,
                    itemSelectText: '', // Removido o texto padrão
                    noResultsText: 'Nenhum resultado encontrado',
                    noChoicesText: 'Sem opções para escolher',
                    callbackOnCreateTemplates: function(template) {
                        return {
                            // Renderiza o item selecionado (o que aparece no campo principal)
                            item: (classNames, data) => {
                                const userImg = data.customProperties && data.customProperties.image ? 
                                    `<img src="${data.customProperties.image}" alt="${data.label}" />` : '';
                                return template(`
                                    <div class="${classNames.item} ${classNames.itemChoice} ${data.isDisabled ? classNames.itemDisabled : classNames.itemSelectable}" data-item data-id="${data.id}" data-value="${data.value}" ${data.active ? 'aria-selected="true"' : ''} ${data.disabled ? 'aria-disabled="true"' : ''}>
                                        ${userImg}
                                        <span>${data.label}</span>
                                    </div>
                                `);
                            },
                            // Renderiza as opções no dropdown
                            choice: (classNames, data) => {
                                const userImg = data.customProperties && data.customProperties.image ? 
                                    `<img src="${data.customProperties.image}" alt="${data.label}" />` : '';
                                return template(`
                                    <div class="${classNames.item} ${classNames.itemChoice} ${data.isDisabled ? classNames.itemDisabled : classNames.itemSelectable}" data-select-text="${this.config.itemSelectText}" data-choice ${data.disabled ? 'data-choice-disabled aria-disabled="true"' : 'data-choice-selectable'} data-id="${data.id}" data-value="${data.value}" ${data.groupId ? 'role="treeitem"' : 'role="option"'}>
                                        ${userImg}
                                        <span>${data.label}</span>
                                    </div>
                                `);
                            },
                        };
                    }
                };

                // Adiciona as propriedades customizadas (imagem) para cada opção
                const choicesData = usuarios.map(usuario => ({
                    value: usuario.nome,
                    label: usuario.nome,
                    customProperties: { image: usuario.imagem }
                }));

                const choicesInstance = new Choices(select, choicesOptions);
                choicesInstance.setChoices(choicesData, 'value', 'label', true); // Passa os dados para o Choices.js

                window[choicesInstance] = choicesInstance; // Atribui à variável global

                // Define o valor selecionado após carregar
                if (ultimoUsuario) {
                    choicesInstance.setChoiceByValue(ultimoUsuario);
                }
            }
        });

        atualizarImagemUsuario(selectNome.value);
        atualizarImagemUsuarioRelatorio(selectNomeRelatorio.value);
    }
    
    function popularSelectsSimples(selectElement, optionsArray) {
        if (selectElement) {
            selectElement.innerHTML = '';
            optionsArray.forEach(optValue => {
                const opt = new Option(optValue, optValue);
                selectElement.appendChild(opt);
            });
        }
    }

    function atualizarImagemUsuario(nome) {
        const usuarioSelecionado = usuarios.find(u => u.nome === nome);
        if (usuarioSelecionado && imgFuncionario) {
            imgFuncionario.src = usuarioSelecionado.imagem;
        } else {
            imgFuncionario.src = 'https://i.imgur.com/xsfzmyg.jpeg'; // Imagem padrão
        }
    }
    function atualizarImagemUsuarioRelatorio(nome) {
        const usuario = usuarios.find(u => u.nome === nome);
        if (usuario && imgFuncionarioRelatorio) {
            imgFuncionarioRelatorio.src = usuario.imagem;
        } else {
            imgFuncionarioRelatorio.src = 'https://i.imgur.com/xsfzmyg.jpeg'; // Imagem padrão
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
        if (inputData) {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            inputData.value = formatter.format(new Date());
        }
    }

    function atualizarNomeArquivo(input) {
        if (input.files.length > 0) {
            nomeArquivoSpan.textContent = input.files[0].name;
            nomeArquivoSpan.classList.add('selected');
        } else {
            nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
            nomeArquivoSpan.classList.remove('selected');
        }
    }

    // ===============================
    // LÓGICA PRINCIPAL
    // ===============================

    async function carregarDadosDespesas() {
        try {
            const resp = await fetch(`${DESPESAS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            despesasData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            }).data;
        } catch (error) {
            console.error("Não foi possível carregar os dados de despesas.", error);
            alert("Não foi possível conectar à planilha de despesas. A verificação de limite pode não funcionar.");
        }
    }

    async function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;

        const nomeSelecionado = selectNome?.value;
        const [ano, mes, dia] = inputData.value.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        const despesaSelecionada = selectGrupo?.value;

        if (despesaSelecionada !== 'Alimentação') {
            spanLimite.textContent = '';
            return;
        }
        
        spanLimite.textContent = 'Calculando...';

        try {
            const url = `${WEBAPP_URL}?action=getDailySum&nome=${encodeURIComponent(nomeSelecionado)}&data=${encodeURIComponent(dataFormatada)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const somaDoDia = data.sum || 0;
            const restante = 170 - somaDoDia;

            spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
            spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
            spanLimite.classList.toggle('danger', restante <= 0);

        } catch (error) {
            console.error('Erro ao buscar soma do dia:', error);
            spanLimite.textContent = 'Erro ao verificar';
        }
    }


    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = formRegistro.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const [ano, mes, dia] = inputData.value.split('-');
            const dataFormatadaParaEnvio = `${dia}/${mes}/${ano}`;
            
            const params = new URLSearchParams();
            params.append('nome', selectNome.value);
            params.append('data', dataFormatadaParaEnvio);
            params.append('grupo', selectGrupo.value);
            params.append('valor', inputValor.value);
            params.append('descricao', document.getElementById('descricao').value);
            params.append('forma_pagamento', selectForma.value);
            params.append('nota_fiscal_url', document.getElementById('nota_fiscal_url').value);

            try {
                const response = await fetch(WEBAPP_URL, {
                    method: 'POST',
                    body: params
                });
                await response.json(); // Aguarda a resposta do servidor
                
                alert('Despesa registrada com sucesso!');

                // Atualiza o limite após o registro bem-sucedido
                await carregarDadosDespesas(); // Recarrega os dados locais para o relatório
                atualizarLimiteAlimentacao();

            } catch (err) {
                console.error("Erro ao enviar despesa:", err);
                alert("Ocorreu um erro ao registrar a despesa. Verifique sua conexão.");
            } finally {
                const usuarioSelecionado = selectNome.value;
                formRegistro.reset();
                
                // Reseta os selects para os valores padrão
                // choicesNome.setChoiceByValue(usuarioSelecionado); // Isso já é feito na inicialização
                popularSelectsSimples(selectForma, formasDePagamento);
                popularSelectsSimples(selectGrupo, categorias);
                selectGrupo.value = 'Alimentação';

                configurarDataAtual();
                nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
                nomeArquivoSpan.classList.remove('selected');
                
                submitBtn.disabled = false;
                submitBtn.textContent = 'Adicionar Despesa';
            }
        });
    }

    // ===============================
    // LÓGICA DE GERAÇÃO DE RELATÓRIO
    // ===============================
    const formRelatorio = document.getElementById('report-form');
    if (formRelatorio) {
        formRelatorio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');
            const originalBtnText = submitBtnRelatorio.textContent;
            submitBtnRelatorio.textContent = 'Gerando...';
            submitBtnRelatorio.disabled = true;

            const nome = selectNomeRelatorio.value;
            const dataInicio = document.getElementById('dataInicio').value;
            const dataFim = document.getElementById('dataFim').value;
            
            const url = `${WEBAPP_URL}?action=generateReport&nome=${encodeURIComponent(nome)}&dataInicio=${dataInicio}&dataFim=${dataFim}`;

            try {
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
                    alert('Nenhuma despesa encontrada para os filtros selecionados.');
                } else {
                    throw new Error(result.message || 'Erro desconhecido ao gerar relatório.');
                }

            } catch (error) {
                console.error("Erro ao gerar relatório: ", error);
                alert("Ocorreu um erro ao gerar o relatório. Tente novamente.");
            } finally {
                submitBtnRelatorio.textContent = originalBtnText;
                submitBtnRelatorio.disabled = false;
            }
        });
    }


    // ===============================
    // EVENT LISTENERS E INICIALIZAÇÃO
    // ===============================
    async function init() {
        await carregarUsuarios();
        popularUsuarios();
        popularSelectsSimples(selectForma, formasDePagamento);
        popularSelectsSimples(selectGrupo, categorias);
        selectGrupo.value = 'Alimentação';
        
        configurarCampoValor();
        configurarDataAtual();
        
        await carregarDadosDespesas(); // Carrega os dados para a aba de relatório
        atualizarLimiteAlimentacao(); // Calcula o limite inicial

        // Listeners para a aba de Registro
        // O evento 'change' no select original não dispara após Choices.js,
        // então usamos o evento 'change' da instância Choices.js
        if (choicesNome) {
            choicesNome.passedElement.element.addEventListener('change', (e) => {
                const nome = e.detail.value;
                localStorage.setItem('ultimoUsuario', nome);
                atualizarImagemUsuario(nome);
                atualizarLimiteAlimentacao();
            });
        }
        inputData?.addEventListener('change', atualizarLimiteAlimentacao);
        selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);
        
        // Listeners para a aba de Relatório
        if (choicesRelatorio) {
            choicesRelatorio.passedElement.element.addEventListener('change', (e) => {
                atualizarImagemUsuarioRelatorio(e.detail.value);
            });
        }

        inputCamera?.addEventListener('change', () => atualizarNomeArquivo(inputCamera));
        inputArquivo?.addEventListener('change', () => atualizarNomeArquivo(inputArquivo));
    }

    init();
});