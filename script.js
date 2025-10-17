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
    // DADOS DA APLICAÇÃO
    // ===============================
    let usuarios = [];
    const formasDePagamento = ['Cartão de crédito', 'Dinheiro'];
    const categorias = ['Alimentação', 'Deslocamento', 'Outros'];

    // URLs ATUALIZADAS
    const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=0&single=true&output=csv';
    const USUARIOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=62546932&single=true&output=csv';
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwzlyCPCcREj_bLD5km22ep0xS4g3BnZa7oKYpbRhYsG16OKxtT_VXR_0gejBfhseFzsg/exec';

    let despesasData = [];

    // ===============================
    // SELETORES DE ELEMENTOS
    // ===============================
    const formRegistro = document.getElementById('despesa-form');
    const selectNome = document.getElementById('nome');
    const selectForma = document.getElementById('forma_pagamento');
    const selectGrupo = document.getElementById('grupo');
    const inputValor = document.getElementById('valor');
    const inputData = document.getElementById('data');
    const nomeArquivoSpan = document.getElementById('nome-arquivo');
    const inputCamera = document.getElementById('nota_fiscal_camera');
    const inputArquivo = document.getElementById('nota_fiscal_arquivo');

    // ===============================
    // FUNÇÕES DE INICIALIZAÇÃO
    // ===============================

    async function carregarUsuarios() {
        try {
            const resp = await fetch(`${USUARIOS_CSV_URL}&t=${new Date().getTime()}`);
            const csvText = await resp.text();
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            }).data;
            usuarios = parsedData.map(user => ({
                nome: user.nome ? user.nome.trim() : '',
                imagem: user.imagem ? user.imagem.trim() : ''
            })).filter(user => user.nome);
        } catch (error) {
            console.error("Não foi possível carregar os dados de usuários.", error);
            alert("Não foi possível carregar a lista de usuários. Por favor, recarregue a página.");
        }
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
    // LÓGICA DO SELETOR DE USUÁRIO
    // ===============================

    function initCustomSelect(config) {
        const wrapper = document.getElementById(config.wrapperId);
        if (!wrapper) return;

        const trigger = wrapper.querySelector('.custom-select-trigger');
        const optionsContainer = wrapper.querySelector('.custom-options');
        const searchInput = wrapper.querySelector('.custom-select-search');
        const optionsList = wrapper.querySelector('.options-list');
        const hiddenSelect = document.getElementById(config.hiddenSelectId);
        const selectedUserNameSpan = trigger.querySelector('.selected-user-name');
        const userImage = document.getElementById(config.imageId);

        function setSelected(name, imageUrl) {
            if (hiddenSelect.value !== name) {
                hiddenSelect.value = name;
                hiddenSelect.dispatchEvent(new Event('change'));
            }
            selectedUserNameSpan.textContent = name;
            userImage.src = imageUrl;

            // Salva o último usuário selecionado no localStorage
            localStorage.setItem('lastSelectedUser', name);

            optionsList.querySelectorAll('.custom-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.value === name);
            });
        }
        
        optionsList.innerHTML = '';
        hiddenSelect.innerHTML = '';
        usuarios.forEach(user => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-option';
            optionEl.dataset.value = user.nome;
            optionEl.innerHTML = `<img src="${user.imagem}" alt=""><span>${user.nome}</span>`;
            optionsList.appendChild(optionEl);

            const nativeOption = new Option(user.nome, user.nome);
            hiddenSelect.appendChild(nativeOption);

            optionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                setSelected(user.nome, user.imagem);
                wrapper.classList.remove('open');
            });
        });
        
        // Define o usuário inicial (o último salvo ou o primeiro da lista)
        if (usuarios.length > 0) {
            const lastUserName = localStorage.getItem('lastSelectedUser');
            const lastUser = usuarios.find(u => u.nome === lastUserName);

            if (lastUser) {
                setSelected(lastUser.nome, lastUser.imagem);
            } else {
                setSelected(usuarios[0].nome, usuarios[0].imagem);
            }
        }

        trigger.addEventListener('click', () => {
            wrapper.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });

        searchInput.addEventListener('input', () => {
            const filter = searchInput.value.toLowerCase();
            optionsList.querySelectorAll('.custom-option').forEach(opt => {
                const name = opt.dataset.value.toLowerCase();
                opt.style.display = name.includes(filter) ? 'flex' : 'none';
            });
        });
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
            
            const params = new URLSearchParams();
            params.append('nome', selectNome.value);
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
                    nome: selectNome.value,
                    data: dataFormatadaParaEnvio,
                    grupo: selectGrupo.value,
                    valor: inputValor.value
                };
                despesasData.push(novaDespesa);
                
                alert('Despesa registrada!');

                const usuarioSelecionado = selectNome.value;
                formRegistro.reset();
                selectNome.value = usuarioSelecionado;
                selectNome.dispatchEvent(new Event('change'));

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
    // INICIALIZAÇÃO DA APLICAÇÃO
    // ===============================
    async function init() {
        await carregarUsuarios();
        
        initCustomSelect({
            wrapperId: 'registrar-user-select',
            hiddenSelectId: 'nome',
            imageId: 'funcionario-img'
        });
        initCustomSelect({
            wrapperId: 'relatorio-user-select',
            hiddenSelectId: 'relatorio-nomeSelect',
            imageId: 'relatorio-funcionario-img'
        });

        selectNome?.addEventListener('change', atualizarLimiteAlimentacao);
        inputData?.addEventListener('change', atualizarLimiteAlimentacao);
        selectGrupo?.addEventListener('change', atualizarLimiteAlimentacao);

        inputCamera?.addEventListener('change', () => atualizarNomeArquivo(inputCamera));
        inputArquivo?.addEventListener('change', () => atualizarNomeArquivo(inputArquivo));
        
        popularFormasPagamento();
        popularCategorias();
        configurarCampoValor();
        configurarDataAtual();

        await carregarDadosDespesas();
        atualizarLimiteAlimentacao();
    }

    init();


    // ===============================
    // LÓGICA DE GERAÇÃO DE RELATÓRIO
    // ===============================
    const formRelatorio = document.getElementById('report-form');
    if (formRelatorio) {
        const selectNomeRelatorio = document.getElementById('relatorio-nomeSelect');
        const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');

        formRelatorio.addEventListener('submit', (e) => {
            e.preventDefault();
            gerarRelatoriosPorCategoria();
        });

        async function gerarRelatoriosPorCategoria() {
            const originalBtnText = submitBtnRelatorio.textContent;
            submitBtnRelatorio.textContent = 'Gerando relatórios...';
            submitBtnRelatorio.disabled = true;

            const { jsPDF } = window.jspdf;
            const nomeSelecionado = selectNomeRelatorio.value;
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
                if (!acc[categoria]) {
                    acc[categoria] = [];
                }
                acc[categoria].push(despesa);
                return acc;
            }, {});

            const zip = new JSZip();

            for (const categoria in despesasPorCategoria) {
                const pdf = new jsPDF();
                const despesasDaCategoria = despesasPorCategoria[categoria];
                let totalCategoria = 0;

                const pageHeight = pdf.internal.pageSize.getHeight();
                const bottomMargin = 25;
                const topMargin = 20;

                function checkPageBreak(y, neededHeight = 10) {
                    if (y + neededHeight > pageHeight - bottomMargin) {
                        pdf.addPage();
                        return topMargin;
                    }
                    return y;
                }
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.text(`Relatório de Despesas - ${categoria}`, 105, 20, { align: 'center' });
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(12);
                pdf.text(`Funcionário: ${nomeSelecionado}`, 14, 35);
                pdf.text(`Período: ${dataInicio ? dataInicio.split('-').reverse().join('/') : 'N/A'} a ${dataFim ? dataFim.split('-').reverse().join('/') : 'N/A'}`, 14, 42);

                let yPosition = 60;

                if (categoria === 'Alimentação') {
                    const despesasPorDia = despesasDaCategoria.reduce((acc, despesa) => {
                        const dia = despesa.data;
                        if (!acc[dia]) acc[dia] = [];
                        acc[dia].push(despesa);
                        return acc;
                    }, {});
                    
                    const datasOrdenadas = Object.keys(despesasPorDia).sort((a, b) => {
                        const [diaA, mesA, anoA] = a.split('/');
                        const [diaB, mesB, anoB] = b.split('/');
                        return new Date(`${anoA}-${mesA}-${diaA}`) - new Date(`${anoB}-${mesB}-${diaB}`);
                    });

                    for (const dia of datasOrdenadas) {
                        let subtotalDia = 0;
                        yPosition = checkPageBreak(yPosition, 18);
                        
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(12);
                        pdf.text(`Despesas de ${dia}:`, 14, yPosition);
                        yPosition += 8;

                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(11);
                        despesasPorDia[dia].forEach(despesa => {
                            const descricaoLines = pdf.splitTextToSize(despesa.descricao, 130);
                            const alturaLinha = Math.max(10, descricaoLines.length * 5 + 4);

                            yPosition = checkPageBreak(yPosition, alturaLinha);
                            
                            pdf.text(descricaoLines, 14, yPosition);
                            
                            let valor = parseFloat((despesa.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
                            if (!isNaN(valor)) {
                                subtotalDia += valor;
                            }
                            pdf.text(despesa.valor, 196, yPosition, { align: 'right' });
                            yPosition += alturaLinha;
                        });

                        yPosition = checkPageBreak(yPosition, 15);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(11);
                        pdf.text('Subtotal do dia:', 160, yPosition, { align: 'right' });
                        pdf.text(`R$ ${subtotalDia.toFixed(2).replace('.', ',')}`, 196, yPosition, { align: 'right' });
                        yPosition += 5;
                        pdf.line(14, yPosition, 196, yPosition);
                        yPosition += 10;
                        totalCategoria += subtotalDia;
                    }

                } else {
                    const drawTableHeader = (y) => {
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(12);
                        pdf.text('Data', 14, y);
                        pdf.text('Descrição', 50, y);
                        pdf.text('Valor', 196, y, { align: 'right' });
                        y += 5;
                        pdf.line(14, y, 196, y);
                        return y + 8;
                    };
                    
                    yPosition = drawTableHeader(yPosition);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(11);
                    despesasDaCategoria.forEach(despesa => {
                        const descricaoLines = pdf.splitTextToSize(despesa.descricao, 95);
                        const alturaLinha = Math.max(10, descricaoLines.length * 5 + 4);
                        
                        yPosition = checkPageBreak(yPosition, alturaLinha);
                        
                        if(yPosition === topMargin) {
                            yPosition = drawTableHeader(yPosition);
                        }

                        pdf.text(despesa.data, 14, yPosition);
                        pdf.text(descricaoLines, 50, yPosition);
                        
                        let valor = parseFloat((despesa.valor || '0').replace(/[^\d,]/g, '').replace(',', '.'));
                        if (!isNaN(valor)) {
                            totalCategoria += valor;
                        }
                        pdf.text(despesa.valor, 196, yPosition, { align: 'right' });

                        yPosition += alturaLinha;
                    });
                }
                
                yPosition = checkPageBreak(yPosition, 15);
                yPosition += 5;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text('Total do Período:', 160, yPosition, { align: 'right' });
                pdf.text(`R$ ${totalCategoria.toFixed(2).replace('.', ',')}`, 196, yPosition, { align: 'right' });

                for (const row of despesasDaCategoria) {
                    pdf.addPage();
                    const pageH = pdf.internal.pageSize.getHeight();
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(16);
                    pdf.text(row.descricao, 14, 20);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(12);
                    pdf.text(`${row.data} | ${row.valor || ''}`, 14, 30);
                    
                    try {
                        const imageData = await carregarImagemComoBase64(row.nota_fiscal_url);
                        const img = new Image();
                        img.src = imageData;
                        
                        await new Promise(resolve => {
                            img.onload = () => {
                                const marginTop = 40;
                                const availableHeight = pageH - marginTop - 10;
                                const scale = Math.min(190 / img.width, availableHeight / img.height);
                                const imgWidth = img.width * scale;
                                const imgHeight = img.height * scale;
                                const xOffset = (210 - imgWidth) / 2;

                                pdf.addImage(imageData, 'JPEG', xOffset, marginTop, imgWidth, imgHeight);
                                resolve();
                            };
                            img.onerror = () => resolve();
                        });
                    } catch (e) {
                        pdf.setTextColor(255, 0, 0);
                        pdf.text('Erro ao carregar o comprovante.', 14, 50);
                    }
                }

                const pdfBlob = pdf.output('blob');
                zip.file(`relatorio_${nomeSelecionado}_${categoria}.pdf`, pdfBlob);
            }

            zip.generateAsync({ type: 'blob' }).then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `relatorios_${nomeSelecionado}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                submitBtnRelatorio.textContent = originalBtnText;
                submitBtnRelatorio.disabled = false;
            }).catch((err) => {
                console.error("Erro ao gerar o ZIP: ", err);
                alert("Ocorreu um erro ao compactar os relatórios.");
                submitBtnRelatorio.textContent = originalBtnText;
                submitBtnRelatorio.disabled = false;
            });
        }
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
            img.src = url + '?t=' + new Date().getTime(); 
        });
    }
});