// ============================================================
// AREIS PRO
// MODELO 2 - CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================
// Modelo visual utilizado pela JService.
// ============================================================

function gerarCapaModelo2({
    doc,
    logoPrestador,
    loja,
    chamado,
    dataServico
}) {

    // ========================================================
    // MOLDURA
    // ========================================================

    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    doc.rect(
        0.5,
        0.5,
        20,
        28.7
    );


    // ========================================================
    // CABEÇALHO SUPERIOR
    // ========================================================

    doc.line(
        1,
        2.4,
        20,
        2.4
    );

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
        "PREPARADO POR: Marcos Brabo",
        14.8,
        3.2
    );

    doc.text(
        "PÁGINA 1",
        19.5,
        1.8,
        { align: "right" }
    );


    // ========================================================
    // LOGO DO PRESTADOR
    // ========================================================

    if (logoPrestador) {

        doc.addImage(
            logoPrestador,
            "JPEG",
            6.3,
            5.2,
            8.4,
            5.0,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFont(
        "helvetica",
        "bolditalic"
    );

    doc.setFontSize(15);

    doc.text(
        "RELATÓRIO FOTOGRÁFICO",
        10.5,
        12.8,
        {
            align: "center"
        }
    );


    // ========================================================
    // DADOS
    // ========================================================

    doc.setFont(
        "helvetica",
        "bolditalic"
    );

    doc.setFontSize(12);


    doc.text(
        "CLIENTE: AMERICANAS",
        10.5,
        15.2,
        {
            align: "center"
        }
    );


    doc.text(
        `LOJA: ${loja || ""}`,
        10.5,
        16.4,
        {
            align: "center"
        }
    );


    doc.text(
        `Nº CHAMADO: ${chamado || ""}`,
        10.5,
        17.6,
        {
            align: "center"
        }
    );


    doc.text(
        `DATA DO SERVIÇO: ${dataServico || ""}`,
        10.5,
        18.8,
        {
            align: "center"
        }
    );

}