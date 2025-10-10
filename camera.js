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
    if (btnSubmit) btnSubmit.disabled = !enabled;
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

  async function uploadParaImgur(arquivo) {
    const CLIENT_ID = '2d40b07371c4c21';
    const formData = new FormData();
    formData.append('image', arquivo);

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