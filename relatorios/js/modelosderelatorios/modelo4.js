// ============================================================
// AREIS PRO
// MODELO 4 - CAPA DO RELATÓRIO FOTOGRÁFICO
// ============================================================
// Modelo visual utilizado pela SRP Serviços e Reforma Predial.
// ============================================================

function gerarCapaModelo4({
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
    // LOGO PEQUENA DO CABEÇALHO
    // ========================================================

    if (logoPrestador) {

        doc.addImage(
            logoPrestador,
            "JPEG",
            1.0,
            0.8,
            1.6,
            1.6,
            undefined,
            "FAST"
        );

    }


    // ========================================================
    // PÁGINA
    // ========================================================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);

    doc.text(
        "PÁGINA 1",
        19.5,
        1.7,
        { align: "right" }
    );


    // ========================================================
    // CABEÇALHO
    // ========================================================

    doc.line(
        1.0,
        2.5,
        20.0,
        2.5
    );

    doc.rect(
        1.0,
        2.7,
        19.0,
        1.0
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);

    doc.text(
        "TIPO:",
        1.3,
        3.3
    );

    doc.setFont("helvetica", "normal");

    doc.text(
        "Relatório Fotográfico",
        2.0,
        3.3
    );


    doc.setFont("helvetica", "bold");

    doc.text(
        "DATA:",
        9.2,
        3.3
    );

    doc.setFont("helvetica", "normal");

    doc.text(
        dataServico || "",
        10.0,
        3.3
    );


    doc.setFont("helvetica", "bold");

    doc.text(
        "PREPARADO POR:",
        14.6,
        3.3
    );


    // ========================================================
    // TÍTULOS
    // ========================================================

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(14);

    doc.text(
        "RELATÓRIO FOTOGRÁFICO",
        10.5,
        5.2,
        { align: "center" }
    );


    doc.setFontSize(13);

    doc.text(
        "SRP SERVICOS E REFORMA PREDIAL LTDA",
        10.5,
        6.5,
        { align: "center" }
    );


    // ========================================================
    // LOGO SRP
    // ========================================================

    if (logoPrestador) {

        doc.addImage(
            logoPrestador,
            "JPEG",
            5.8,
            7.8,
            9.4,
            7.6,
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
            16.8,
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
        "helvetica",
        "bold"
    );

    doc.setFontSize(12);


    doc.text(
        `LOJA - ${loja || ""}`,
        10.5,
        21.2,
        { align: "center" }
    );


    doc.text(
        `Nº CHAMADO: ${chamado || "N/A"}`,
        10.5,
        22.5,
        { align: "center" }
    );


    doc.text(
        `DATA: ${dataServico || ""}`,
        10.5,
        23.8,
        { align: "center" }
    );

}