// ============================================================
// AREIS PRO
// MODELO 3 - CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================
// Modelo visual utilizado pela Thermo Engenharia Soluções Ltda.
// ============================================================

function gerarCapaModelo3({
    doc,
    logoPrestador,
    logoAmericanas,
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
        0.5,
        2.4,
        20.5,
        2.4
    );

    doc.rect(
        0.7,
        2.7,
        19.6,
        1.2
    );

    // Divisões do cabeçalho
    doc.line(
        8.4,
        2.7,
        8.4,
        3.9
    );

    doc.line(
        11.8,
        2.7,
        11.8,
        3.9
    );

    doc.line(
        15.0,
        2.7,
        15.0,
        3.9
    );


    // ========================================================
    // TEXTOS DO CABEÇALHO
    // ========================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(5);

    doc.text(
        "TIPO:",
        0.85,
        3.05
    );

    doc.text(
        "Relatório Fotográfico",
        0.85,
        3.55
    );


    doc.text(
        "DATA:",
        8.55,
        3.05
    );

    doc.setFontSize(7);

    doc.text(
        dataServico || "",
        8.55,
        3.55
    );


    doc.setFontSize(5);

    doc.text(
        "PREPARADO POR:",
        11.95,
        3.05
    );

    doc.setFontSize(7);

    doc.text(
        "Jair Ramos",
        11.95,
        3.55
    );


    // ========================================================
    // PÁGINA
    // ========================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(6);

    doc.text(
        "1 (4)",
        19.3,
        1.8,
        {
            align: "right"
        }
    );


    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFont(
        "times",
        "bolditalic"
    );

    doc.setFontSize(16);

    doc.text(
        "RELATÓRIO FOTOGRÁFICO",
        10.5,
        6.5,
        {
            align: "center"
        }
    );


    doc.setFontSize(15);

    doc.text(
        "THERMO ENGENHARIA SOLUÇÕES LTDA",
        10.5,
        7.8,
        {
            align: "center"
        }
    );


    // ========================================================
    // LOGO THERMO
    // Referência original: 9,32 cm x 8,9 cm
    // ========================================================

    if (logoPrestador) {

        doc.addImage(
            logoPrestador,
            "JPEG",
            5.84,
            9.2,
            9.32,
            8.9,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // LOGO AMERICANAS
    // ========================================================

    if (logoAmericanas) {

        doc.addImage(
            logoAmericanas,
            "JPEG",
            6.0,
            20.0,
            9.0,
            2.0,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // DADOS DO SERVIÇO
    // ========================================================

    doc.setFont(
        "times",
        "bolditalic"
    );

    doc.setFontSize(13);


    doc.text(
        `LOJA ${loja || ""}`,
        10.5,
        23.7,
        {
            align: "center"
        }
    );


    doc.text(
        `Nº CHAMADO: ${chamado || ""}`,
        10.5,
        25.0,
        {
            align: "center"
        }
    );


    doc.text(
        `DATA DO SERVIÇO: ${dataServico || ""}`,
        10.5,
        26.3,
        {
            align: "center"
        }
    );

}