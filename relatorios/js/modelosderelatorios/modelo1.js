// ============================================================
// AREIS PRO
// MODELO 1 - CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================
//
// O modelo define apenas o VISUAL da capa.
// Logo e nome do prestador são dinâmicos.
//
// ============================================================

function gerarCapaModelo1({
    doc,
    logoPrestador,
    logoAmericanas,
    nomePrestador,
    loja,
    chamado,
    dataServico
}) {

        // ========================================================
    // MOLDURA DA CAPA
    // ========================================================

    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    // Moldura externa
    doc.rect(
        0.5,
        0.5,
        20,
        28.7
    );


    // ========================================================
    // CABEÇALHO SUPERIOR
    // ========================================================

    // Linha abaixo da área superior
    doc.line(
        1,
        2.4,
        20,
        2.4
    );

    // Caixa com Tipo / Data / Preparado por
    doc.rect(
        1,
        2.6,
        19,
        1.0
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(8);

    doc.text(
        "TIPO: Relatório Fotográfico",
        1.3,
        3.2
    );

    doc.text(
        `DATA: ${dataServico}`,
        10.5,
        3.2,
        { align: "center" }
    );

    doc.text(
        "PREPARADO POR: Everaldo Moura",
        14.8,
        3.2
    );

    // Número da página
    doc.text(
        "PÁGINA 1",
        19.5,
        1.8,
        { align: "right" }
    );

    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(15);

    doc.text(
        [
            "RELATÓRIO FOTOGRÁFICO DE SERVIÇOS",
            "EXECUTADOS"
        ],
        10.5,
        5.2,
        {
            align: "center",
            lineHeightFactor: 1.2
        }
    );


    // ========================================================
    // LOGO DO PRESTADOR
    // ========================================================

    if (logoPrestador) {

        doc.addImage(
            logoPrestador,
            "PNG",
            6.5,
            7.0,
            8,
            5,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // NOME DO PRESTADOR
    // ========================================================

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(15);

    const nomeFormatado =
        String(nomePrestador || "")
            .toUpperCase();

    const linhasPrestador =
        doc.splitTextToSize(
            `EMPRESA: ${nomeFormatado}`,
            15
        );

    doc.text(
        linhasPrestador,
        10.5,
        13.7,
        {
            align: "center",
            lineHeightFactor: 1.2
        }
    );


    // ========================================================
    // LOGO AMERICANAS
    // ========================================================

    if (logoAmericanas) {

        doc.addImage(
            logoAmericanas,
            "PNG",
            6.0,
            16.2,
            9,
            2.4,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // DADOS DO RELATÓRIO
    // ========================================================

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(15);

    doc.text(
        `LOJA: ${loja || ""}`,
        10.5,
        20.5,
        { align: "center" }
    );

    doc.text(
        `Nº CHAMADO: ${chamado || ""}`,
        10.5,
        22.0,
        { align: "center" }
    );

    doc.text(
        `DATA DO SERVIÇO: ${dataServico || ""}`,
        10.5,
        23.5,
        { align: "center" }
    );
}