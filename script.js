document.addEventListener('DOMContentLoaded', async () => {
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

            // Sincroniza a seleção em ambas as barras de navegação (caso existam)
            document.querySelectorAll(`.tab-link[data-tab="${tabId}"]`).forEach(l => l.classList.add('active'));

            if (tabId === 'registrar') {
                configurarDataAtual();
            }
        });
    });

    // ===============================
    // DADOS E URLs
    // ===============================
    const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=0&single=true&output=csv';
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwY1IiBheTmS421ThMhetm3YBGVBZg3nEb8hYYiWPbns8Blnl5gK7fA0hssb4N_CoXIMw/exec';

    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];

    // Variáveis globais
    let despesasData = [];
    let usuarios = [];
    let choicesRegistro, choicesRelatorio;

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
    // FUNÇÕES DE INICIALIZAÇÃO E DADOS
    // ===============================

    async function carregarUsuarios() {
        try {
            const response = await fetch(`${USUARIOS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await response.text();
            usuarios = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            }).data.map(u => ({
                nome: u.nome.trim(),
                imagem: u.imagem.trim()
            }));
        } catch (error) {
            console.error("Não foi possível carregar os usuários.", error);
            alert("Não foi possível carregar a lista de usuários.");
        }
    }

    function popularUsuarios() {
        const ultimoUsuarioSalvo = localStorage.getItem('ultimoUsuario');

        const popularSelect = (selectElement, choicesInstance) => {
            if (selectElement) {
                const choicesOptions = usuarios.map(usuario => ({
                    value: usuario.nome,
                    label: usuario.nome,
                    customProperties: {
                        imagem: usuario.imagem
                    }
                }));

                choicesInstance.clearStore();
                choicesInstance.setChoices(choicesOptions, 'value', 'label', true);

                if (ultimoUsuarioSalvo && usuarios.some(u => u.nome === ultimoUsuarioSalvo)) {
                    choicesInstance.setValue([ultimoUsuarioSalvo]);
                } else if (usuarios.length > 0) {
                    choicesInstance.setValue([usuarios[0].nome]);
                }
            }
        };

        popularSelect(selectNome, choicesRegistro);
        popularSelect(selectNomeRelatorio, choicesRelatorio);
        
        atualizarImagemUsuario();
        atualizarImagemUsuarioRelatorio();
    }

    function popularFormasPagamento() {
        if (selectForma) {
            selectForma.innerHTML = '';
            formasDePagamento.forEach(forma => {
                const opt = new Option(forma, forma);
                selectForma.appendChild(opt);
            });
        }
    }

    function popularCategorias() {
        if (selectGrupo) {
            selectGrupo.innerHTML = '';
            categorias.forEach(cat => {
                const opt = new Option(cat, cat);
                selectGrupo.appendChild(opt);
            });
            selectGrupo.value = 'Alimentação';
        }
    }
    
    function atualizarImagemUsuario() {
        const nomeSelecionado = choicesRegistro.getValue(true);
        const usuarioSelecionado = usuarios.find(u => u.nome === nomeSelecionado);
        if (usuarioSelecionado && imgFuncionario) {
            imgFuncionario.src = usuarioSelecionado.imagem;
        }
    }

    function atualizarImagemUsuarioRelatorio() {
        const nomeSelecionado = choicesRelatorio.getValue(true);
        const usuarioSelecionado = usuarios.find(u => u.nome === nomeSelecionado);
        if (usuarioSelecionado && imgFuncionarioRelatorio) {
            imgFuncionarioRelatorio.src = usuarioSelecionado.imagem;
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

    function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;

        const nomeSelecionado = choicesRegistro?.getValue(true);
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

        let somaDoDia = 0;

        despesasData.forEach(row => {
            if (!row.data || !row.nome || !row.grupo) return;

            const dataDaLinha = row.data.trim();
            const partes = dataDaLinha.split('/');
            
            if (partes.length !== 3) return; 

            const dataDaLinhaFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            
            if (row.nome.trim() === nomeSelecionado && dataDaLinhaFormatada === dataSelecionada && row.grupo.trim() === 'Alimentação') {
                let valorStr = (row.valor || '').replace(/[^\d,]/g, '').replace(',', '.');
                let valor = parseFloat(valorStr);
                if (!isNaN(valor)) {
                    somaDoDia += valor;
                }
            }
        });

        const restante = 170 - somaDoDia;
        spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
        spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
        spanLimite.classList.toggle('danger', restante <= 0);
    }


    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = formRegistro.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const [ano, mes, dia] = inputData.value.split('-');
            const dataFormatadaParaEnvio = `${dia}/${mes}/${ano}`;
            const nomeSelecionado = choicesRegistro.getValue(true);
            
            const params = new URLSearchParams();
            params.append('nome', nomeSelecionado);
            params.append('data', dataFormatadaParaEnvio);
            params.append('grupo', selectGrupo.value);
            params.append('valor', inputValor.value);
            params.append('descricao', document.getElementById('descricao').value);
            params.append('forma_pagamento', selectForma.value);
            params.append('nota_fiscal_url', document.getElementById('nota_fiscal_url').value);

            try {
                fetch(WEBAPP_URL, {
                    method: 'POST',
                    body: params
                });
            } catch (err) {
                console.error("Erro de rede ignorado:", err);
            } finally {
                const novaDespesa = {
                    nome: nomeSelecionado,
                    data: dataFormatadaParaEnvio,
                    grupo: selectGrupo.value,
                    valor: inputValor.value,
                    // ... (outros campos)
                };
                despesasData.push(novaDespesa);
                
                alert('Despesa registrada!');

                formRegistro.reset();
                choicesRegistro.setValue([nomeSelecionado]); // Mantém o usuário selecionado
                configurarDataAtual();
                nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
                nomeArquivoSpan.classList.remove('selected');
                popularCategorias();

                submitBtn.disabled = false;
                submitBtn.textContent = 'Adicionar Despesa';

                atualizarLimiteAlimentacao();
            }
        });
    }

    // ===============================
    // EVENT LISTENERS E INICIALIZAÇÃO
    // ===============================
    
    choicesRegistro = new Choices(selectNome, {
        searchEnabled: true,
        shouldSort: false,
        itemSelectText: '', // Remove o texto
    });
    choicesRelatorio = new Choices(selectNomeRelatorio, {
        searchEnabled: true,
        shouldSort: false,
        itemSelectText: '', // Remove o texto
    });

    selectNome.addEventListener('change', (event) => {
        const selectedValue = event.detail.value;
        localStorage.setItem('ultimoUsuario', selectedValue);
        atualizarImagemUsuario();
        atualizarLimiteAlimentacao();
    });
    
    selectNomeRelatorio.addEventListener('change', () => {
         atualizarImagemUsuarioRelatorio();
    });

    inputData?.addEventListener('change', atualizarLimiteAlimentacao);
    selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);

    inputCamera?.addEventListener('change', () => atualizarNomeArquivo(inputCamera));
    inputArquivo?.addEventListener('change', () => atualizarNomeArquivo(inputArquivo));

    popularFormasPagamento();
    popularCategorias();
    configurarCampoValor();
    configurarDataAtual();
    
    await carregarUsuarios();
    popularUsuarios();
    
    await carregarDadosDespesas();
    atualizarLimiteAlimentacao();

    // ===============================
    // LÓGICA DE GERAÇÃO DE RELATÓRIO (sem alterações)
    // ===============================
    // ... (o restante do código de relatório permanece igual) ...
});