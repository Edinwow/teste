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
    const nomeArquivoSpan = document.getElementById('nome-arquivo');
    const inputCamera = document.getElementById('nota_fiscal_camera');
    const inputArquivo = document.getElementById('nota_fiscal_arquivo');

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
            selectGrupo.innerHTML = '';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                selectGrupo.appendChild(opt);
            });
            selectGrupo.value = 'Alimentação';
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
    // LÓGICA PRINCIPAL (COM CORREÇÃO)
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

    // --- FUNÇÃO CORRIGIDA ---
    function atualizarLimiteAlimentacao() {
        const spanLimite = document.getElementById('limite-restante');
        if (!spanLimite) return;

        const nomeSelecionado = selectNome?.value;
        const dataSelecionada = inputData?.value; // Formato: AAAA-MM-DD
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
            if (!row.data || !row.nome || !row.grupo) return; // Pula linhas inválidas

            // Lógica de comparação de data robusta
            const dataDaLinha = row.data.trim(); // Formato esperado: DD/MM/AAAA
            const partes = dataDaLinha.split('/');
            
            // Pula a linha se o formato da data na planilha for inesperado
            if (partes.length !== 3) return; 

            // Converte a data da linha para AAAA-MM-DD para uma comparação segura
            const dataDaLinhaFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            
            // Compara nome, data (já formatada) e grupo
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

            const formData = new FormData(formRegistro);
            const [ano, mes, dia] = inputData.value.split('-');
            const dataFormatadaParaEnvio = `${dia}/${mes}/${ano}`;
            formData.set('data', dataFormatadaParaEnvio);

            const params = new URLSearchParams();
            formData.forEach((value, key) => params.append(key, value));

            try {
                await fetch(WEBAPP_URL, {
                    method: 'POST',
                    body: params
                });
                
                const novaDespesa = {
                    nome: selectNome.value,
                    data: dataFormatadaParaEnvio,
                    grupo: selectGrupo.value,
                    valor: inputValor.value,
                    descricao: document.getElementById('descricao').value,
                    forma_pagamento: selectForma.value,
                    nota_fiscal_url: document.getElementById('nota_fiscal_url').value
                };
                despesasData.push(novaDespesa);
                
                alert('Despesa registrada com sucesso!');

            } catch (err) {
                console.error("Erro no envio:", err);
                alert('Erro ao registrar despesa. Verifique sua conexão.');
            }

            const usuarioSelecionado = selectNome.value;
            formRegistro.reset();
            selectNome.value = usuarioSelecionado;
            configurarDataAtual();
            nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
            nomeArquivoSpan.classList.remove('selected');
            popularCategorias();

            submitBtn.disabled = false;
            submitBtn.textContent = 'Adicionar Despesa';

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

    inputCamera?.addEventListener('change', () => atualizarNomeArquivo(inputCamera));
    inputArquivo?.addEventListener('change', () => atualizarNomeArquivo(inputArquivo));

    popularUsuarios();
    popularFormasPagamento();
    popularCategorias();
    configurarCampoValor();
    configurarDataAtual();
    carregarDadosDespesas().then(atualizarLimiteAlimentacao);


    // ===============================
    // LÓGICA DE GERAÇÃO DE RELATÓRIO (MODIFICADA)
    // ===============================
    const formRelatorio = document.getElementById('report-form');
    if (formRelatorio) {
        const selectNomeRelatorio = document.getElementById('relatorio-nomeSelect');
        const imgFuncionarioRelatorio = document.getElementById('relatorio-funcionario-img');
        const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');

        selectNomeRelatorio?.addEventListener('change', () => {
            const usuario = usuarios.find(u => u.nome === selectNomeRelatorio.value);
            if (usuario && imgFuncionarioRelatorio) {
                imgFuncionarioRelatorio.src = usuario.imagem;
            }
        });

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

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.text(`Relatório de despesas - ${categoria}`, 105, 20, { align: 'center' });

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(12);
                pdf.text(`Funcionário: ${nomeSelecionado}`, 14, 35);
                pdf.text(`Período: ${dataInicio ? dataInicio.split('-').reverse().join('/') : 'N/A'} a ${dataFim ? dataFim.split('-').reverse().join('/') : 'N/A'}`, 14, 42);

                let yPosition = 60;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Data', 14, yPosition);
                pdf.text('Descrição', 50, yPosition);
                pdf.text('Valor', 196, yPosition, { align: 'right' });
                yPosition += 5;
                pdf.line(14, yPosition, 196, yPosition);
                yPosition += 8;

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                despesasDaCategoria.forEach(despesa => {
                    pdf.text(despesa.data, 14, yPosition);
                    const descricaoLines = pdf.splitTextToSize(despesa.descricao, 95);
                    pdf.text(descricaoLines, 50, yPosition);
                    
                    let valorStr = (despesa.valor || 'R$ 0,00').replace(/[^\d,]/g, '').replace(',', '.');
                    let valor = parseFloat(valorStr);
                    if (!isNaN(valor)) {
                        totalCategoria += valor;
                    }
                    pdf.text(despesa.valor, 196, yPosition, { align: 'right' });

                    const alturaLinha = descricaoLines.length * 5;
                    yPosition += Math.max(10, alturaLinha + 4);

                    if (yPosition > 270) {
                        pdf.addPage();
                        yPosition = 20;
                    }
                });

                yPosition += 5;
                pdf.line(14, yPosition, 196, yPosition);
                yPosition += 8;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text('Total:', 160, yPosition, { align: 'right' });
                pdf.text(`R$ ${totalCategoria.toFixed(2).replace('.', ',')}`, 196, yPosition, { align: 'right' });

                for (const row of despesasDaCategoria) {
                    pdf.addPage();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    
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
                                const availableHeight = pageHeight - marginTop - 10;
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

                // Retorna o botão ao estado original
                submitBtnRelatorio.textContent = originalBtnText;
                submitBtnRelatorio.disabled = false;
            }).catch((err) => {
                console.error("Erro ao gerar o ZIP: ", err);
                alert("Ocorreu um erro ao compactar os relatórios.");
                // Retorna o botão ao estado original em caso de erro
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
            img.src = url;
        });
    }
});