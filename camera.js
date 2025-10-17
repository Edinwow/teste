document.addEventListener('DOMContentLoaded', () => {
  const btnCapturar = document.getElementById('btn-capturar');
  const btnSelecionar = document.getElementById('btn-selecionar');
  const inputCamera = document.getElementById('nota_fiscal_camera');
  const inputArquivo = document.getElementById('nota_fiscal_arquivo');
  const form = document.getElementById('despesa-form');
  const nomeArquivoSpan = document.getElementById('nome-arquivo');
  const btnSubmit = form.querySelector('[type="submit"]');

  // Controla o required: só torna required o input que usar
  function limparRequired() {
    inputCamera.required = false;
    inputArquivo.required = false;
  }

  btnCapturar?.addEventListener('click', () => {
    limparRequired();
    inputCamera.required = true;
    inputCamera.click();
  });

  btnSelecionar?.addEventListener('click', () => {
    limparRequired();
    inputArquivo.required = true;
    inputArquivo.click();
  });

  // Mostra nome do arquivo selecionado
  inputCamera?.addEventListener('change', () => {
    if (inputCamera.files.length > 0) {
      nomeArquivoSpan.textContent = `${inputCamera.files[0].name}`;
    } else {
      nomeArquivoSpan.textContent = '';
    }
  });

  inputArquivo?.addEventListener('change', () => {
    if (inputArquivo.files.length > 0) {
      nomeArquivoSpan.textContent = `${inputArquivo.files[0].name}`;
    } else {
      nomeArquivoSpan.textContent = '';
    }
  });

  // Garante que um arquivo será enviado no submit
  form?.addEventListener('submit', function (e) {
    // Não previne o submit, apenas garante que um arquivo está presente
    if (
      (!inputCamera.files || inputCamera.files.length === 0) &&
      (!inputArquivo.files || inputArquivo.files.length === 0)
    ) {
      e.preventDefault();
      // alert('Por favor, envie uma nota fiscal.'); // Removido conforme solicitado
      return false;
    }

    // Garante que apenas o arquivo selecionado está no formData (o script.js usará o arquivo correto)
    if (inputCamera.files.length > 0) {
      inputArquivo.value = ''; // limpa o outro input
    } else if (inputArquivo.files.length > 0) {
      inputCamera.value = '';
    }
    // O envio real é feito pelo script.js
  });

  // Função para bloquear/desbloquear o botão de envio
  function setSubmitEnabled(enabled) {
    if (btnSubmit) {
        btnSubmit.disabled = !enabled;
        btnSubmit.textContent = enabled ? 'Adicionar despesa' : 'Enviando foto...';
    }
  }

  // Ao selecionar/capturar arquivo, desabilita o submit e faz upload
  [inputCamera, inputArquivo].forEach((input) => {
    input?.addEventListener('change', () => {
      if (input.files.length > 0) {
        setSubmitEnabled(false); // Desabilita o botão
        uploadParaImgur(input.files[0]).then(() => {
          setSubmitEnabled(true); // Habilita após upload
        });
      }
    });
  });

  // ===============================================================
  // NOVA FUNÇÃO PARA COMPRIMIR A IMAGEM ANTES DO UPLOAD
  // ===============================================================
  /**
   * Redimensiona e comprime uma imagem.
   * @param {File} arquivo - O arquivo de imagem original.
   * @param {number} maxWidth - A largura máxima desejada (ex: 1200).
   * @param {number} quality - A qualidade do JPEG (de 0.0 a 1.0, ex: 0.85).
   * @returns {Promise<Blob>} - Uma Promise que resolve com o novo Blob (arquivo) comprimido.
   */
  function comprimirImagem(arquivo, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Cria uma URL temporária para a imagem
      img.src = URL.createObjectURL(arquivo);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;

        // Calcula as novas dimensões mantendo a proporção
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenha a imagem no canvas com o novo tamanho
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converte o canvas de volta para um arquivo (Blob)
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg', // Força o formato JPEG (com perdas, menor)
          quality       // Aplica a qualidade definida
        );
        
        // Limpa a memória
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
      };
    });
  }
  // ===============================================================

  async function uploadParaImgur(arquivo) {
    const CLIENT_ID = '2d40b07371c4c21';

    // --- INÍCIO DA MODIFICAÇÃO ---
    let arquivoParaUpload = arquivo;
    try {
      // Comprime para no máximo 1200px de largura e 85% de qualidade
      console.log(`Tamanho original: ${(arquivo.size / 1024 / 1024).toFixed(2)} MB`);
      
      const blobComprimido = await comprimirImagem(arquivo, 1200, 0.85);
      
      // Cria um novo objeto File a partir do Blob
      arquivoParaUpload = new File([blobComprimido], arquivo.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
      });
      
      console.log(`Tamanho comprimido: ${(arquivoParaUpload.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (err) {
      console.error("Erro ao comprimir imagem, enviando original:", err);
      // Se falhar a compressão, apenas envia o arquivo original
      arquivoParaUpload = arquivo;
    }
    // --- FIM DA MODIFICAÇÃO ---

    const formData = new FormData();
    // Envia o arquivo comprimido (ou o original, se a compressão falhar)
    formData.append('image', arquivoParaUpload); 

    try {
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID ' + CLIENT_ID,
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        console.log('Link da imagem no Imgur:', data.data.link);
        const link_nota = document.getElementById('nota_fiscal_url');
        link_nota.value = data.data.link;
      } else {
        console.error('Erro ao enviar imagem para o Imgur:', data);
      }
    } catch (err) {
      console.error('Erro de conexão com o Imgur:', err);
    }
  }
});