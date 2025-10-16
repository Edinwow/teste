// /api/gerar-relatorio.js

const { jsPDF } = require('jspdf');
const JSZip = require('jszip');
const fetch = require('node-fetch'); // Para buscar dados e imagens

// URL da sua planilha de despesas
const DESPESAS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCRWa9HQrijm3a3qJyH89vQnpqm2gMTGqBmWi5hUQnvOJjSfhZvGrPDOSDBMR6ksgMHjXXo6p7zdXG/pub?gid=0&single=true&output=csv';

// Função para buscar e converter texto CSV para JSON
async function fetchDespesas() {
    const response = await fetch(`${DESPESAS_CSV_URL}&t=${new Date().getTime()}`);
    const csvText = await response.text();
    const rows = csvText.split(/\r?\n/).slice(1); // Pula o cabeçalho
    const headers = csvText.split(/\r?\n/)[0].split(',').map(h => h.trim());

    return rows.map(rowStr => {
        const rowValues = rowStr.split(',');
        let row = {};
        headers.forEach((header, i) => {
            row[header] = rowValues[i] ? rowValues[i].trim() : '';
        });
        return row;
    });
}

// Função para buscar uma imagem e retornar como um Buffer (formato para o servidor)
async function fetchImageAsBuffer(url) {
    try {
        // No servidor não precisamos de proxy para o CORS!
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao buscar imagem: ${response.statusText}`);
        return response.buffer();
    } catch (error) {
        console.error(`Erro ao carregar imagem de ${url}:`, error);
        return null;
    }
}

// A função principal da API
module.exports = async (req, res) => {
    try {
        // 1. Pega os parâmetros da requisição (que o frontend vai enviar)
        const { nome, dataInicio, dataFim } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'O nome do funcionário é obrigatório.' });
        }

        // 2. Busca e filtra os dados
        const allDespesas = await fetchDespesas();
        const dadosFiltrados = allDespesas.filter(row => {
             if (!row.data || !row.descricao || !row.nota_fiscal_url || !row.nome) return false;
            const partes = row.data.split('/');
            if (partes.length !== 3) return false;
            const dataRow = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            return row.nome.trim() === nome &&
                (!dataInicio || dataRow >= dataInicio) &&
                (!dataFim || dataRow <= dataFim);
        });

        if (dadosFiltrados.length === 0) {
             return res.status(404).json({ error: 'Nenhum dado encontrado para os filtros selecionados.' });
        }

        const despesasPorCategoria = dadosFiltrados.reduce((acc, despesa) => {
            const categoria = despesa.grupo || 'Sem Categoria';
            if (!acc[categoria]) acc[categoria] = [];
            acc[categoria].push(despesa);
            return acc;
        }, {});

        const zip = new JSZip();

        // 3. Processa cada categoria sequencialmente para não sobrecarregar
        for (const categoria in despesasPorCategoria) {
            const despesasDaCategoria = despesasPorCategoria[categoria];
            const pdf = new jsPDF();

            // ... (A lógica de layout do seu PDF pode ser colada aqui) ...
            pdf.setFont('helvetica', 'bold').setFontSize(18).text(`Relatório de Despesas - ${categoria}`, 105, 20, { align: 'center' });
            pdf.setFont('helvetica', 'normal').setFontSize(12).text(`Funcionário: ${nome}`, 14, 35);
            pdf.text(`Período: ${dataInicio || 'N/A'} a ${dataFim || 'N/A'}`, 14, 42);

            // Adiciona comprovantes
            for (const row of despesasDaCategoria) {
                const imageBuffer = await fetchImageAsBuffer(row.nota_fiscal_url);
                pdf.addPage();
                pdf.setFont('helvetica', 'bold').setFontSize(16).text(row.descricao, 14, 20);
                pdf.setFont('helvetica', 'normal').setFontSize(12).text(`${row.data} | ${row.valor || ''}`, 14, 30);

                if (imageBuffer) {
                    try {
                        // Adiciona a imagem a partir do Buffer
                       pdf.addImage(imageBuffer, 'JPEG', 15, 40, 180, 160); // Ajuste as coordenadas conforme necessário
                    } catch (e) {
                        pdf.setTextColor(255, 0, 0).text('Erro ao renderizar a imagem no PDF.', 14, 50);
                    }
                } else {
                    pdf.setTextColor(255, 0, 0).text('Erro ao carregar este comprovante.', 14, 50);
                }
            }

            zip.file(`relatorio_${nome}_${categoria}.pdf`, pdf.output('arraybuffer'));
        }

        // 4. Gera o ZIP e envia como resposta
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=relatorios_${nome}.zip`);
        res.status(200).send(zipBuffer);

    } catch (error) {
        console.error('ERRO NA API:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor ao gerar o relatório.' });
    }
};