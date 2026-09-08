// ============================================================
// AREISPRO
// ÍNDICE PADRÃO DOS RELATÓRIOS
// ============================================================
//
// Baseado no padrão visual atual do relatório de vistoria.
// Recebe as linhas prontas e desenha o índice.
// Não decide quais seções cada relatório possui.
// ============================================================

function preencherIndicePadrao({
    doc,
    paginaIndice,
    itens,
    header,
    rodape
}) {

    // Volta para a página reservada ao índice
    doc.setPage(paginaIndice);


    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(12);

    doc.text(
        "ÍNDICE",
        10.5,
        6.2,
        {
            align: "center"
        }
    );


    // ========================================================
    // CONFIGURAÇÃO
    // ========================================================

    let yIndice = 7.4;

    const xTexto = 1.5;
    const xPagina = 19.3;
    const larguraMaxTexto = 15.7;


    // ========================================================
    // ESCREVE UMA LINHA DO ÍNDICE
    // ========================================================

    const escreverLinhaIndice = (
        texto,
        pagina,
        negrito = false
    ) => {

        doc.setFont(
            "helvetica",
            negrito
                ? "bold"
                : "normal"
        );

        doc.setFontSize(11);


        // Evita o título invadir a coluna da página
        let textoFinal =
            String(texto || "").trim();


        while (
            textoFinal.length > 1 &&
            doc.getTextWidth(textoFinal) >
            larguraMaxTexto
        ) {

            textoFinal =
                textoFinal.slice(
                    0,
                    -1
                );
        }


        if (
            textoFinal !==
            String(texto || "").trim()
        ) {

            textoFinal =
                textoFinal.trimEnd() +
                "...";
        }


        // Texto principal
        doc.text(
            textoFinal,
            xTexto,
            yIndice
        );


        // Onde o texto terminou
        const larguraTexto =
            doc.getTextWidth(
                textoFinal
            );


        const inicioPontilhado =
            xTexto +
            larguraTexto +
            0.15;


        // Número da página
        const paginaTexto =
            String(pagina);


        const larguraPagina =
            doc.getTextWidth(
                paginaTexto
            );


        const fimPontilhado =
            xPagina -
            larguraPagina -
            0.25;


        // ====================================================
        // PONTILHADO
        // ====================================================

        if (
            fimPontilhado >
            inicioPontilhado
        ) {

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(11);


            const larguraPonto =
                doc.getTextWidth(".");


            const quantidadePontos =
                Math.max(
                    1,
                    Math.floor(
                        (
                            fimPontilhado -
                            inicioPontilhado
                        ) /
                        larguraPonto
                    )
                );


            doc.text(
                ".".repeat(
                    quantidadePontos
                ),
                inicioPontilhado,
                yIndice
            );
        }


        // ====================================================
        // PÁGINA
        // ====================================================

        doc.text(
            paginaTexto,
            xPagina,
            yIndice,
            {
                align: "right"
            }
        );


        yIndice += 0.8;
    };


    // ========================================================
    // ITENS RECEBIDOS PELO RELATÓRIO
    // ========================================================

    itens.forEach(item => {

        escreverLinhaIndice(
            item.texto,
            item.pagina,
            item.negrito || false
        );

    });


    // Reaplica o rodapé específico, se houver
    if (typeof rodape === "function") {
        rodape();
    }
}

// ============================================================
// ITENS DO ÍNDICE - RELATÓRIO FOTOGRÁFICO
// ============================================================

function montarItensIndiceFotografico(indiceFotografico) {

    return indiceFotografico.map((item) => ({
        texto: `Anexo ${item.anexo} - ${item.nome}`,
        pagina: item.pagina
    }));

}

// ============================================================
// ITENS DO ÍNDICE - RELATÓRIO DE VISTORIA
// ============================================================

function montarItensIndiceVistoria({
    indiceVistoria,
    paginaObservacao,
    paginaConclusoes
}) {

    return [
        {
            texto: "1 - Objetivo",
            pagina: 2
        },

        ...indiceVistoria.map((item) => ({
            texto: `${item.numero} - Anexo ${item.anexo} - ${item.nome}`,
            pagina: item.pagina
        })),

        {
            texto: "3.0 - Observação",
            pagina: paginaObservacao
        },

        {
            texto: "3.1 - Conclusões",
            pagina: paginaConclusoes
        }
    ];
}