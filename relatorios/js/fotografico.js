// ============================================================
// AREISPRO
// CORPO - RELATÓRIO FOTOGRÁFICO
// ============================================================
//
// Responsável pelo conteúdo específico do relatório fotográfico.
// Não gera preview.
// Não faz download.
// Não define capa.
// ============================================================
// ============================================================
// CONFIGURAÇÃO DO RELATÓRIO FOTOGRÁFICO POR PRESTADOR
// ============================================================

function obterConfiguracaoFotografico(nomePrestador) {

    const nome =
        String(nomePrestador || "")
            .trim()
            .toLowerCase();

            // SRP
if (
    nomePrestador
        ?.toLowerCase()
        .includes("srp")
) {
    return {
        modeloCapa: 4,
        preparadoPor: ""
    };
}

if (
    nomePrestador
        ?.toLowerCase()
        .includes("thermo")
) {
    return {
        modeloCapa: 3,
        preparadoPor: "Jair Ramos"
    };
}

    // JSERVICE - MODELO 2
    if (
        nome.includes("jservice") ||
        nome.includes("j service")
    ) {
        return {
            modeloCapa: 2,
            preparadoPor: "Marcos Brabo"
        };
    }


    // EMC - MODELO 1 / PADRÃO ATUAL
    return {
        modeloCapa: 1,
        preparadoPor: "Everaldo Moura"
    };
}

// ============================================================
// CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================

function gerarCapaFotografico({
    doc,
    configuracao,
    logos,
    nomePrestador,
    loja,
    chamado,
    dataServico
}) {

    // ========================================================
// MODELO 4 - SRP
// ========================================================

if (configuracao.modeloCapa === 4) {

    gerarCapaModelo4({
        doc,
        logoPrestador: logos.prestador || null,
        logoAmericanas: logos.americanas || null,
        loja,
        chamado,
        dataServico
    });

    return;
}

    // ========================================================
    // MODELO 2 - JSERVICE
    // ========================================================

    if (configuracao.modeloCapa === 2) {

        gerarCapaModelo2({
            doc,
            logoPrestador: logos.prestador || null,
            loja,
            chamado,
            dataServico
        });

        return;
    }


    // ========================================================
    // MODELO 3 - THERMO
    // ========================================================

    if (configuracao.modeloCapa === 3) {

        gerarCapaModelo3({
            doc,
            logoPrestador: logos.prestador || null,
            logoAmericanas: logos.americanas || null,
            loja,
            chamado,
            dataServico
        });

        return;
    }


    // ========================================================
    // MODELO 1 - PADRÃO / EMC
    // ========================================================

    gerarCapaModelo1({
        doc,
        logoPrestador: logos.prestador || null,
        logoAmericanas: logos.americanas || null,
        nomePrestador,
        loja,
        chamado,
        dataServico
    });

}

function criarHeaderFotografico({
    doc,
    border,
    logos,
    dFinal,
    preparadoPor
}) {
      return function headerFotografico() {
    border();

    if (logos.prestador) {
      doc.addImage(
        logos.prestador,
        "JPEG",
        1,
        0.8,
        1.55,
        1.41,
        undefined,
        "FAST",
      );
    }

    const pageNumber = doc.getCurrentPageInfo().pageNumber;

    doc.setDrawColor(0);

    doc.line(1, 2.4, 20, 2.4);

    doc.rect(1, 2.6, 19, 1.0);

    doc.setFont("helvetica", "normal");

    doc.setFontSize(8);

    doc.text("TIPO: Relatório Fotográfico", 1.3, 3.2);

    doc.text(`PÁGINA ${pageNumber}`, 19.5, 1.8, {
      align: "right",
    });

    doc.text(`DATA: ${dFinal}`, 10.5, 3.2, {
      align: "center",
    });

doc.text(
    `PREPARADO POR: ${preparadoPor || ""}`,
    14.8,
    3.2
);
  };
}

// ============================================================
// PÁGINA - FACHADA E MARQUISE
// ============================================================

function gerarPaginaFachadaMarquise({ doc, header, fotosObrigatorias }) {
  // Se não houver nenhuma das duas fotos, não cria a página.
  if (!fotosObrigatorias.fachada && !fotosObrigatorias.marquise) {
    return;
  }

  doc.addPage();
  header();

  let curY = 5.2;

  const larguraTabela = 18.0;
  const alturaImagem = 8.5;
  const alturaLegenda = 1.0;

  const alturaTotalCelula = alturaImagem + alturaLegenda;

  doc.setDrawColor(0);
  doc.setLineWidth(0.017);

  // ========================================================
  // FACHADA
  // ========================================================

  if (fotosObrigatorias.fachada) {
    doc.rect(1.0, curY - 0.5, 19.0, alturaTotalCelula + 0.5);

    doc.addImage(
      fotosObrigatorias.fachada,
      "JPEG",
      1.5,
      curY,
      larguraTabela,
      alturaImagem,
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text("Figura 1 – Fachada", 1.7, curY + alturaImagem + 0.7);

    curY += alturaTotalCelula;
    curY += 0.5;
  }

  // ========================================================
  // MARQUISE
  // ========================================================

  if (fotosObrigatorias.marquise) {
    doc.rect(1.0, curY - 0.5, 19.0, alturaTotalCelula + 0.5);

    doc.addImage(
      fotosObrigatorias.marquise,
      "JPEG",
      1.5,
      curY,
      larguraTabela,
      alturaImagem,
    );

    doc.line(
      1.5,
      curY + alturaImagem,
      1.5 + larguraTabela,
      curY + alturaImagem,
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text("Figura 2 – Marquise, Letreiro", 1.7, curY + alturaImagem + 0.7);
  }
}
function gerarGaleriaFotografico({
  doc,
  photos,
  sub,
  descricaoGeralAnexo,
  header,
  fCount,
}) {
  if (!photos || photos.length === 0) {
    return fCount;
  }

  doc.addPage();
  header();

  // Título da primeira página do anexo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text(sub, 10.5, 5.2, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  doc.text(descricaoGeralAnexo, 1.5, 5.8, {
    align: "left",
  });

  let y = 6.3;
  let col = 0;
  let alturaUltimaFileira = 0;

  photos.forEach((f, index) => {
    const x = col === 0 ? 1.5 : 10.6;

    const larguraImg = 8.9;
    const alturaImg = 3.9;

    // LEGENDA
    doc.setFontSize(10);

    const legendaTexto = `Figura ${fCount++} - ${f.desc || " "}`;

    const legendaFormatada = doc.splitTextToSize(legendaTexto, 8.2);

    const alturaTextoReal = legendaFormatada.length * 0.45;

    const alturaTotalTabela = alturaImg + 0.6 + alturaTextoReal + 0.2;

    // QUEBRA DE PÁGINA
    if (y + alturaTotalTabela > 27.5) {
      doc.addPage();
      header();

      doc.setFont("helvetica", "bold");

      doc.setFontSize(11);

      doc.text(sub, 10.5, 5.2, {
        align: "center",
      });

      doc.setFontSize(9);

      doc.setFont("helvetica", "normal");

      doc.text(descricaoGeralAnexo, 1.5, 5.8, {
        align: "left",
      });

      y = 6.5;
      col = 0;
      alturaUltimaFileira = 0;
    }

    // TABELA
    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    doc.rect(x, y, larguraImg, alturaTotalTabela);

    // IMAGEM
    if (f.src) {
      doc.addImage(
        f.src,
        "JPEG",
        x,
        y,
        larguraImg,
        alturaImg,
        undefined,
        "FAST",
      );
    }

    // LEGENDA
    doc.text(legendaFormatada, x + 0.3, y + alturaImg + 0.5);

    // COLUNAS
    if (alturaTotalTabela > alturaUltimaFileira) {
      alturaUltimaFileira = alturaTotalTabela;
    }

    if (col === 1) {
      y += alturaUltimaFileira + 0.1;

      col = 0;
      alturaUltimaFileira = 0;
    } else {
      if (index === photos.length - 1) {
        y += alturaTotalTabela + 0.1;
      }

      col = 1;
    }
  });

  return fCount;
}

// ============================================================
// PÁGINA FINAL - RELATÓRIO FOTOGRÁFICO
// ============================================================

function gerarPaginaFinalFotografico({
    doc,
    header,
    assinaturaRealizada,
    assinaturaCanvas,
    dVal
}) {

    doc.addPage();

    header();


    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);

    doc.text(
        " ",
        10.5,
        6,
        { align: "center" }
    );


    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
        "Relatório revisado pelo responsável da loja.",
        10.5,
        7,
        { align: "center" }
    );


    if (
        assinaturaRealizada &&
        assinaturaCanvas
    ) {

        const assinaturaImagem =
            assinaturaCanvas.toDataURL(
                "image/png"
            );

        doc.addImage(
            assinaturaImagem,
            "PNG",
            5.5,
            10,
            10,
            3.3
        );

    }


    doc.setDrawColor(0);
    doc.setLineWidth(0.02);

    doc.line(
        6,
        14,
        15,
        14
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(10);

    doc.text(
        "Assinatura do Responsável",
        10.5,
        14.7,
        { align: "center" }
    );


    doc.setFontSize(8);

const dataServicoFormatada =
    dVal
        ? dVal.split("-").reverse().join("/")
        : "";

doc.text(
    `Data: ${dataServicoFormatada}`,
    10.5,
    15.5,
    { align: "center" }
);

}
