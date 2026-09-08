// ============================================================
// AREIS PRO
// RELATÓRIOS - MOTOR / ORQUESTRADOR DE PDF
// ============================================================
//
// Responsável pela montagem e sequência do documento:
//
// - identifica o tipo de relatório;
// - prepara os dados usados na geração;
// - controla a ordem das páginas;
// - coordena os índices;
// - chama os módulos específicos de cada relatório;
// - devolve o PDF final em memória.
//
// Módulos específicos:
//
// fotografico.js
// - cabeçalho;
// - fachada e marquise;
// - galeria antes/depois;
// - página final.
//
// modelosderelatorios/vistoria.js
// - cabeçalho e rodapé;
// - objetivo;
// - galeria de vistoria;
// - observação e conclusão;
// - página final.
//
// indice.js
// - renderização do índice padrão.
//
// preview.js
// - visualização do PDF.
//
// gerarrelatorio.js
// - ações finais de geração/salvamento.
//
// Os dados da interface são gerenciados por relatorios.js.
// ============================================================

async function gerarRelatorio() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "cm", format: "a4", compress: true });

  const parametros = new URLSearchParams(window.location.search);

  const tipoRelatorio = parametros.get("modelo");

  const isVistoria = tipoRelatorio === "vistoria";

  // ============================================================
  // ESTADO DOS ÍNDICES DESTA GERAÇÃO
  // ============================================================

  let paginaIndiceVistoria = null;
  let indiceVistoria = [];

  let paginaObservacaoVistoria = null;
  let paginaConclusoesVistoria = null;

  let paginaIndiceFotografico = null;
  let indiceFotografico = [];

  const pNome = document.getElementById("prestador")?.value || "";

  const lojaSelect = document.getElementById("lojaSelect");

  const lNome =
    lojaSelect?.options[lojaSelect.selectedIndex]?.textContent?.trim() || "";

  const cNum = document.getElementById("chamado")?.value || "N/A";

  const dVal = document.getElementById("dataServico")?.value || "";

  const dFinal = dVal
    ? dVal.split("-").reverse().join("/")
    : new Date().toLocaleDateString("pt-BR");

  const objetivoVistoria =
    document.getElementById("objetivoRelatorio")?.value?.trim() || "xxxx";

  const observacaoVistoria =
    document.getElementById("observacaoRelatorio")?.value?.trim() || "xxxx";

  const conclusaoVistoria =
    document.getElementById("conclusaoRelatorio")?.value?.trim() || "xxxx";

  const border = () => {
    doc.setLineWidth(0.017);
    doc.setDrawColor(0);
    doc.rect(0.5, 0.5, 20, 28.7);
  };

const configuracaoFotografico =
    !isVistoria
        ? obterConfiguracaoFotografico(pNome)
        : null;

const header =
    criarHeaderFotografico({
        doc,
        border,
        logos,
        dFinal,
        preparadoPor:
            configuracaoFotografico?.preparadoPor || ""
    });
    
  let headerVistoria = null;
  let rodapeVistoria = null;

  let rodapeEndereco = "";

  if (isVistoria) {
    headerVistoria = criarHeaderVistoria({
      doc,
      border,
      logos,
      dFinal,
    });

    rodapeVistoria = criarRodapeVistoria({
      doc,
      getEndereco: () => rodapeEndereco,
    });
  }

// ============================================================
// CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================

if (!isVistoria) {

    gerarCapaFotografico({
        doc,
        configuracao: configuracaoFotografico,
        logos,
        nomePrestador: pNome,
        loja: lNome,
        chamado: cNum,
        dataServico: dFinal
    });
}

// ============================================================
// CAPA DO RELATÓRIO DE VISTORIA
// ============================================================

if (isVistoria) {

    gerarCapaVistoria({
        doc,
        border,
        logos,
        loja: lNome,
        dataServico: dFinal,
        fotoFachada: fotosObrigatorias?.fachada || null
    });

}

  if (isVistoria) {
    gerarObjetivoVistoria({
      doc,
      headerVistoria,
      rodapeVistoria,
      objetivo: objetivoVistoria,
    });
  } else {
    gerarPaginaFachadaMarquise({
      doc,
      header,
      fotosObrigatorias,
    });
  }

  if (isVistoria) {
    doc.addPage();

    headerVistoria();

    paginaIndiceVistoria = doc.getCurrentPageInfo().pageNumber;

    rodapeVistoria();
  } else {
    const temAnexosNoIndice =
      anexos &&
      anexos.length > 0 &&
      anexos.some((a) => a.obs && a.obs.trim() !== "");

    if (temAnexosNoIndice) {
      doc.addPage();

      header();

      paginaIndiceFotografico = doc.getCurrentPageInfo().pageNumber;
    }
  }

  let fCount = 3;

  for (let indiceAnexo = 0; indiceAnexo < anexos.length; indiceAnexo++) {
    const anexo = anexos[indiceAnexo];

const descricaoGeralAnexo =
    anexo.obs?.trim()
        ? `Anexo ${indiceAnexo + 1} - ${anexo.obs.trim()}`
        : "";

    if (anexo.fotosAntes.length === 0 && anexo.fotosDepois.length === 0) {
      continue;
    }

    if (isVistoria) {
      fCount = gerarGaleriaVistoria({
        doc,
        anexo,
        indiceAnexo,
        indiceVistoria,
        descricaoGeralAnexo,
        headerVistoria,
        rodapeVistoria,
        fCount,
      });

      continue;
    }

if (descricaoGeralAnexo) {
  indiceFotografico.push({
    anexo: indiceAnexo + 1,
    nome: anexo.obs.trim(),
    pagina: doc.internal.getNumberOfPages() + 1,
  });
}

fCount = gerarGaleriaFotografico({
  doc,
  photos: anexo.fotosAntes,
  sub: "RELATÓRIO FOTOGRÁFICO - ANTES",
  descricaoGeralAnexo,
  header,
  fCount,
});

fCount = gerarGaleriaFotografico({
  doc,
  photos: anexo.fotosDepois,
  sub: "RELATÓRIO FOTOGRÁFICO - DEPOIS",
  descricaoGeralAnexo,
  header,
  fCount,
});
  }

if (!isVistoria && paginaIndiceFotografico) {

    const itensIndiceFotografico =
        montarItensIndiceFotografico(indiceFotografico);

    preencherIndicePadrao({
        doc,
        paginaIndice: paginaIndiceFotografico,
        itens: itensIndiceFotografico,
        header: header,
    });

    doc.setPage(doc.internal.getNumberOfPages());
}

  if (isVistoria && paginaIndiceVistoria) {
    paginaObservacaoVistoria = doc.getCurrentPageInfo().pageNumber + 1;

    paginaConclusoesVistoria = paginaObservacaoVistoria;

    const itensIndiceVistoria =
  montarItensIndiceVistoria({
    indiceVistoria,
    paginaObservacao: paginaObservacaoVistoria,
    paginaConclusoes: paginaConclusoesVistoria,
  });

    preencherIndicePadrao({
      doc,
      paginaIndice: paginaIndiceVistoria,
      itens: itensIndiceVistoria,
      header: headerVistoria,
      rodape: rodapeVistoria,
    });
  }

  if (isVistoria) {
    gerarPaginaFinalVistoria({
      doc,
      headerVistoria,
      rodapeVistoria,
      observacao: observacaoVistoria,
      conclusao: conclusaoVistoria,
      assinaturaRealizada,
      assinaturaCanvas,
      dVal,
    });
  }

  if (!isVistoria) {
gerarPaginaFinalFotografico({
  doc,
  header,
  assinaturaRealizada,
  assinaturaCanvas,
  dVal,
});
  }
  return doc.output("blob");
}
