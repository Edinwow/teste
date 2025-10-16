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
    // DADOS DA APLICAÇÃO
    // ===============================
    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];
    const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=0&single=true&output=csv';
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwzlyCPCcREj_bLD5km22ep0xS4g3BnZa7oKYpbRhYsG16OKxtT_VXR_0gejBfhseFzsg/exec';

    let despesasData = [];
    let listaDeUsuarios = [];

    // ===============================
    // SELETORES GLOBAIS DE ELEMENTOS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const formRelatorio = document.getElementById('report-form');

    // Elementos do seletor de REGISTRO
    const userSearchInput = document.getElementById('user-search-input');
    const userDropdown = document.getElementById('user-dropdown');
    const hiddenNomeInput = document.getElementById('nome');
    const userErrorMessage = document.getElementById('user-error-message');
    const imgFuncionario = document.getElementById('funcionario-img');

    // Elementos do seletor de RELATÓRIO
    const reportUserSearchInput = document.getElementById('relatorio-user-search-input');
    const reportUserDropdown = document.getElementById('relatorio-user-dropdown');
    const reportHiddenNomeInput = document.getElementById('relatorio-nome-hidden');
    const reportUserErrorMessage = document.getElementById('relatorio-user-error-message');
    const reportImgFuncionario = document.getElementById('relatorio-funcionario-img');

    // Outros elementos
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');

    // ===============================
    // FUNÇÃO REUTILIZÁVEL PARA O SELETOR DE USUÁRIO
    // ===============================
    function setupUserSelector(searchInput, dropdown, hiddenInput, imgElement, errorMessage, isRegistroTab = false) {
        const renderDropdown = (filter = '') => {
            dropdown.innerHTML = '';
            const filteredUsers = listaDeUsuarios.filter(user =>
                user.nome.toLowerCase().includes(filter.toLowerCase())
            );

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
            if (usuarioValido) {
                hiddenInput.value = nomeAtual;
                errorMessage.classList.add('hidden');
            } else {
                hiddenInput.value = '';
                if(nomeAtual !== '') errorMessage.classList.remove('hidden');
                else errorMessage.classList.add('hidden');
            }
            return usuarioValido;
        };

        searchInput.addEventListener('focus', () => {
            renderDropdown(searchInput.value);
            dropdown.classList.remove('hidden');
        });
        searchInput.addEventListener('input', () => {
            renderDropdown(searchInput.value);
            validateSelection();
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-selector-container')) {
                 dropdown.classList.add('hidden');
            }
        });
        
        return { selectUser, validateSelection };
    }

    // ===============================
    // FUNÇÕES GERAIS DA APLICAÇÃO
    // ===============================
    async function carregarUsuarios() {
        try {
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
    
    function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;
        const nomeSelecionado = hiddenNomeInput.value;
        const dataSelecionada = inputData?.value;
        const despesaSelecionada = selectGrupo?.value;
        if (despesaSelecionada !== 'Alimentação' || !nomeSelecionado) {
            spanLimite.textContent = '';
            return;
        }
        let somaDoDia = 0;
        despesasData.forEach(row => {
            if (!row.data || !row.nome || !row.grupo) return;
            const partes = row.data.trim().split('/');
            if (partes.length !== 3) return;
            const dataDaLinhaFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            if (row.nome.trim() === nomeSelecionado && dataDaLinhaFormatada === dataSelecionada && row.grupo.trim() === 'Alimentação') {
                let valor = parseFloat((row.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
                if (!isNaN(valor)) somaDoDia += valor;
            }
        });
        const restante = 170 - somaDoDia;
        spanLimite.textContent = `Resta R$ ${restante.toFixed(2).replace('.', ',')}`;
        spanLimite.classList.toggle('warning', restante <= 50 && restante > 0);
        spanLimite.classList.toggle('danger', restante <= 0);
    }
    
    // ===============================
    // LÓGICA DOS FORMULÁRIOS
    // ===============================
    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = formRegistro.querySelector('button[type="submit"]');
            
            if (hiddenNomeInput.value === '') {
                alert("Por favor, selecione um usuário válido da lista.");
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const formData = new FormData(formRegistro);
            const [ano, mes, dia] = formData.get('data').split('-');
            formData.set('data', `${dia}/${mes}/${ano}`);
            try {
                const response = await fetch(WEBAPP_URL, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Despesa registrada com sucesso!');
                    despesasData.push(Object.fromEntries(formData));
                    const usuarioSelecionado = listaDeUsuarios.find(u => u.nome === hiddenNomeInput.value);
                    formRegistro.reset();
                    if (usuarioSelecionado) {
                       setupUserSelector(userSearchInput, userDropdown, hiddenNomeInput, imgFuncionario, userErrorMessage, true).selectUser(usuarioSelecionado);
                    }
                    configurarDataAtual();
                    document.getElementById('nome-arquivo').textContent = 'Nenhum arquivo selecionado';
                    document.getElementById('nome-arquivo').classList.remove('selected');
                    popularCategorias();
                    atualizarLimiteAlimentacao();
                } else { throw new Error(result.message || 'Ocorreu um erro no servidor.'); }
            } catch (error) {
                console.error("Erro ao registrar despesa:", error);
                alert(`Falha ao registrar a despesa: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Adicionar Despesa';
            }
        });
    }

    if(formRelatorio) {
        formRelatorio.addEventListener('submit', (e) => {
            e.preventDefault();
            if (reportHiddenNomeInput.value === '') {
                alert("Por favor, selecione um usuário válido da lista para gerar o relatório.");
                return;
            }
            gerarRelatoriosPorCategoria(reportHiddenNomeInput.value);
        });
    }

    // ===============================
    // INICIALIZAÇÃO DA APLICAÇÃO
    // ===============================
    async function init() {
        await carregarUsuarios();
        
        const registroSelector = setupUserSelector(userSearchInput, userDropdown, hiddenNomeInput, imgFuncionario, userErrorMessage, true);
        const relatorioSelector = setupUserSelector(reportUserSearchInput, reportUserDropdown, reportHiddenNomeInput, reportImgFuncionario, reportUserErrorMessage);

        popularFormasPagamento();
        popularCategorias();
        configurarCampoValor();
        configurarDataAtual();
        
        carregarUltimoUsuario(registroSelector, relatorioSelector);
        
        await carregarDadosDespesas();
        atualizarLimiteAlimentacao();
    }
    
    // ===============================
    // FUNÇÕES AUXILIARES E RESTANTES
    // ===============================
    function popularFormasPagamento() {
        if (selectForma) {
            selectForma.innerHTML = '';
            formasDePagamento.forEach(forma => {
                selectForma.appendChild(new Option(forma, forma));
            });
        }
    }

    function popularCategorias() {
        if (selectGrupo) {
            selectGrupo.innerHTML = '';
            categorias.forEach(cat => {
                selectGrupo.appendChild(new Option(cat, cat));
            });
            selectGrupo.value = 'Alimentação';
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

    async function carregarDadosDespesas() {
        try {
            const resp = await fetch(`${DESPESAS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            despesasData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim()
            }).data;
        } catch (error) {
            console.error("Não foi possível carregar os dados de despesas.", error);
            alert("Não foi possível conectar à planilha de despesas. A verificação de limite pode não funcionar.");
        }
    }

    async function gerarRelatoriosPorCategoria(nomeSelecionado) {
        const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');
        const originalBtnText = submitBtnRelatorio.textContent;
        submitBtnRelatorio.textContent = 'Gerando relatórios...';
        submitBtnRelatorio.disabled = true;

        const { jsPDF } = window.jspdf;
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;

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
            submitBtnRelatorio.textContent = originalBtnText;
            submitBtnRelatorio.disabled = false;
            return;
        }

        const despesasPorCategoria = dadosFiltrados.reduce((acc, despesa) => {
            const categoria = despesa.grupo || 'Sem Categoria';
            if (!acc[categoria]) acc[categoria] = [];
            acc[categoria].push(despesa);
            return acc;
        }, {});

        const zip = new JSZip();

        for (const categoria in despesasPorCategoria) {
            const pdf = new jsPDF();
            const despesasDaCategoria = despesasPorCategoria[categoria];
            let totalCategoria = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const bottomMargin = 25, topMargin = 20;

            const checkPageBreak = (y, neededHeight = 10) => (y + neededHeight > pageHeight - bottomMargin) ? (pdf.addPage(), topMargin) : y;
            
            pdf.setFont('helvetica', 'bold').setFontSize(18).text(`Relatório de Despesas - ${categoria}`, 105, 20, { align: 'center' });
            pdf.setFont('helvetica', 'normal').setFontSize(12).text(`Funcionário: ${nomeSelecionado}`, 14, 35);
            pdf.text(`Período: ${dataInicio ? dataInicio.split('-').reverse().join('/') : 'N/A'} a ${dataFim ? dataFim.split('-').reverse().join('/') : 'N/A'}`, 14, 42);

            let yPosition = 60;

            if (categoria === 'Alimentação') {
                const despesasPorDia = despesasDaCategoria.reduce((acc, d) => ({...acc, [d.data]: [...(acc[d.data] || []), d]}), {});
                const datasOrdenadas = Object.keys(despesasPorDia).sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
                for (const dia of datasOrdenadas) {
                    let subtotalDia = 0;
                    yPosition = checkPageBreak(yPosition, 18);
                    pdf.setFont('helvetica', 'bold').text(`Despesas de ${dia}:`, 14, yPosition); yPosition += 8;
                    pdf.setFont('helvetica', 'normal');
                    despesasPorDia[dia].forEach(despesa => {
                        const descricaoLines = pdf.splitTextToSize(despesa.descricao, 130);
                        const alturaLinha = Math.max(10, descricaoLines.length * 5 + 4);
                        yPosition = checkPageBreak(yPosition, alturaLinha);
                        pdf.text(descricaoLines, 14, yPosition);
                        let valor = parseFloat((despesa.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
                        if (!isNaN(valor)) subtotalDia += valor;
                        pdf.text(despesa.valor, 196, yPosition, { align: 'right' });
                        yPosition += alturaLinha;
                    });
                    yPosition = checkPageBreak(yPosition, 15);
                    pdf.setFont('helvetica', 'bold').text('Subtotal do dia:', 160, yPosition, { align: 'right' });
                    pdf.text(`R$ ${subtotalDia.toFixed(2).replace('.', ',')}`, 196, yPosition, { align: 'right' });
                    yPosition += 5; pdf.line(14, yPosition, 196, yPosition); yPosition += 10;
                    totalCategoria += subtotalDia;
                }
            } else {
                const drawTableHeader = (y) => {
                    pdf.setFont('helvetica', 'bold').text('Data', 14, y).text('Descrição', 50, y).text('Valor', 196, y, { align: 'right' });
                    y += 5; pdf.line(14, y, 196, y); return y + 8;
                };
                yPosition = drawTableHeader(yPosition);
                pdf.setFont('helvetica', 'normal');
                despesasDaCategoria.forEach(despesa => {
                    const descricaoLines = pdf.splitTextToSize(despesa.descricao, 95);
                    const alturaLinha = Math.max(10, descricaoLines.length * 5 + 4);
                    yPosition = checkPageBreak(yPosition, alturaLinha);
                    if(yPosition === topMargin) yPosition = drawTableHeader(yPosition);
                    pdf.text(despesa.data, 14, yPosition).text(descricaoLines, 50, yPosition);
                    let valor = parseFloat((despesa.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
                    if (!isNaN(valor)) totalCategoria += valor;
                    pdf.text(despesa.valor, 196, yPosition, { align: 'right' });
                    yPosition += alturaLinha;
                });
            }
            
            yPosition = checkPageBreak(yPosition, 15) + 5;
            pdf.setFont('helvetica', 'bold').text('Total do Período:', 160, yPosition, { align: 'right' });
            pdf.text(`R$ ${totalCategoria.toFixed(2).replace('.', ',')}`, 196, yPosition, { align: 'right' });

            // --- OTIMIZAÇÃO E CORREÇÃO APLICADA AQUI ---
            // 1. Criamos uma lista de "promessas" para buscar todas as imagens em paralelo.
            submitBtnRelatorio.textContent = `Carregando ${despesasDaCategoria.length} comprovantes...`;
            const promessasDeImagens = despesasDaCategoria.map(row => {
                // 2. CORREÇÃO: Usamos o proxy de CORS para evitar o bloqueio do navegador.
                const urlDaImagemComProxy = `https://corsproxy.io/?${encodeURIComponent(row.nota_fiscal_url)}`;
                return carregarImagemComoBase64(urlDaImagemComProxy)
                    // Adicionamos um .catch para que, se UMA imagem falhar, o processo continue.
                    .catch(err => {
                        console.error(`Falha ao carregar imagem: ${row.nota_fiscal_url}`, err);
                        return null; // Retorna nulo em caso de erro.
                    });
            });

            // 3. OTIMIZAÇÃO: Esperamos que TODAS as imagens terminem de carregar.
            const imagensBase64 = await Promise.all(promessasDeImagens);
            submitBtnRelatorio.textContent = 'Montando PDFs...';

            // 4. Agora, com todas as imagens já carregadas, adicionamos as páginas ao PDF.
            despesasDaCategoria.forEach((row, index) => {
                pdf.addPage();
                pdf.setFont('helvetica', 'bold').setFontSize(16).text(row.descricao, 14, 20);
                pdf.setFont('helvetica', 'normal').setFontSize(12).text(`${row.data} | ${row.valor || ''}`, 14, 30);
                
                const imgData = imagensBase64[index]; // Pegamos a imagem já carregada.
                
                if (imgData) { // Se a imagem foi carregada com sucesso...
                    try {
                        const img = new Image();
                        img.src = imgData;
                        const marginTop = 40, availableHeight = pageHeight - marginTop - 10;
                        const scale = Math.min(190 / img.width, availableHeight / img.height);
                        pdf.addImage(img.src, 'JPEG', (210 - img.width * scale) / 2, marginTop, img.width * scale, img.height * scale);
                    } catch (e) {
                         pdf.setTextColor(255, 0, 0).text('Erro ao renderizar o comprovante no PDF.', 14, 50);
                    }
                } else { // Se ocorreu erro ao carregar...
                    pdf.setTextColor(255, 0, 0).text('Erro ao carregar o comprovante (URL inválida ou offline).', 14, 50);
                }
            });
            // --- FIM DA OTIMIZAÇÃO E CORREÇÃO ---

            zip.file(`relatorio_${nomeSelecionado}_${categoria}.pdf`, pdf.output('blob'));
        }

        submitBtnRelatorio.textContent = 'Compactando arquivos...';
        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `relatorios_${nomeSelecionado}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error("Erro ao gerar o ZIP: ", err);
            alert("Ocorreu um erro ao compactar os relatórios.");
        }).finally(() => {
            submitBtnRelatorio.textContent = originalBtnText;
            submitBtnRelatorio.disabled = false;
        });
    }
    
    // Nenhuma alteração necessária nesta função
    function carregarImagemComoBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = (err) => reject(new Error('Erro ao carregar imagem: ' + url + '. Detalhes: ' + err));
            // Adicionado timestamp para evitar problemas de cache no proxy
            img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        });
    }

    init();
});