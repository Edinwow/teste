// /script.js

/**
 * NOVA FUNÇÃO PARA CHAMAR A API NO SERVIDOR
 * Ela apenas envia os dados e aguarda o arquivo ZIP de volta.
 */
async function gerarRelatoriosPorCategoria(nomeSelecionado) {
    const submitBtnRelatorio = formRelatorio.querySelector('button[type="submit"]');
    const originalBtnText = submitBtnRelatorio.textContent;
    submitBtnRelatorio.disabled = true;
    submitBtnRelatorio.textContent = 'Gerando relatório no servidor...';

    try {
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;

        // Monta o corpo da requisição para a nossa API
        const body = JSON.stringify({
            nome: nomeSelecionado,
            dataInicio: dataInicio,
            dataFim: dataFim,
        });

        // Chama a nossa API (o endpoint é o nome do arquivo na pasta /api)
        const response = await fetch('/api/gerar-relatorio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        // Se o servidor responder com um erro (ex: 404, 500), ele virá como JSON
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro desconhecido do servidor.');
        }

        // Se deu tudo certo, a resposta é o arquivo ZIP
        const blob = await response.blob();
        
        // Cria um link temporário para iniciar o download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorios_${nomeSelecionado}.zip`;
        document.body.appendChild(link);
        link.click();
        
        // Limpa o link da memória
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Erro ao chamar a API de relatórios:", error);
        alert(`Falha ao gerar o relatório: ${error.message}`);
    } finally {
        submitBtnRelatorio.textContent = originalBtnText;
        submitBtnRelatorio.disabled = false;
    }
}