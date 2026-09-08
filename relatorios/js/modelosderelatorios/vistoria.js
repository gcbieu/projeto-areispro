function gerarCapaVistoria({
    doc,
    border,
    logos,
    loja,
    dataServico,
    fotoFachada
}) {

    // ========================================================
    // MOLDURA
    // ========================================================

    border();


    // ========================================================
    // LOGO AMERICANAS SA - TOPO
    // ========================================================

    if (logos.americanasSA) {

        doc.addImage(
            logos.americanasSA,
            "PNG",
            1.0,
            0.75,
            3.6,
            1.39,
            undefined,
            "FAST"
        );
    }


    // ========================================================
    // PÁGINA
    // ========================================================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text(
        "1",
        19.5,
        1.7,
        { align: "right" }
    );


    // ========================================================
    // CABEÇALHO
    // ========================================================

    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    doc.rect(
        1,
        2.4,
        19,
        1.3
    );

    // divisões
    doc.line(9.5, 2.4, 9.5, 3.7);
    doc.line(12.0, 2.4, 12.0, 3.7);
    doc.line(13.2, 2.4, 13.2, 3.7);
    doc.line(16.2, 2.4, 16.2, 3.7);


    // ========================================================
    // TIPO
    // ========================================================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);

    doc.text(
        "TIPO:",
        1.2,
        2.75
    );

    doc.setFontSize(8);

    doc.text(
        "RELATÓRIO INTERNO",
        1.2,
        3.35
    );


    // ========================================================
    // DATA
    // ========================================================

    doc.setFontSize(5);

    doc.text(
        "DATA",
        9.7,
        2.75
    );

    doc.setFontSize(7);

    doc.text(
        dataServico || "",
        9.7,
        3.35
    );


    // ========================================================
    // REVISÃO
    // ========================================================

    doc.setFontSize(5);

    doc.text(
        "REV",
        12.2,
        2.75
    );

    doc.setFontSize(7);

    doc.text(
        "A",
        12.55,
        3.35
    );


    // ========================================================
    // PREPARADO POR
    // ========================================================

    doc.setFontSize(5);

    doc.text(
        "PREPARADO POR",
        13.4,
        2.75
    );

    doc.setFontSize(7);

    doc.text(
        "Albetan Reis",
        13.4,
        3.35
    );


    // ========================================================
    // REVISADO POR
    // ========================================================

    doc.setFontSize(5);

    doc.text(
        "REVISADO POR:",
        16.4,
        2.75
    );


    // ========================================================
    // LOGO CENTRAL
    // ========================================================

    if (logos.americanasSA) {

        doc.addImage(
            logos.americanasSA,
            "PNG",
            5.6,
            7.3,
            9.8,
            3.8,
            undefined,
            "FAST"
        );
    }


    // ========================================================
    // TÍTULO
    // ========================================================

    doc.setFont(
        "times",
        "normal"
    );

    doc.setFontSize(15);

    doc.text(
        "RELATÓRIO DE VISTORIA:",
        10.5,
        13.1,
        { align: "center" }
    );


    doc.setFontSize(14);

    doc.text(
        loja || "",
        10.5,
        14.6,
        { align: "center" }
    );


    // ========================================================
    // FOTO DA FACHADA
    // ========================================================

    if (fotoFachada) {

        const x = 1.0;
        const y = 18.0;
        const largura = 19.0;
        const altura = 8.5;

        doc.setDrawColor(0);
        doc.setLineWidth(0.017);

        doc.rect(
            x,
            y,
            largura,
            altura + 0.8
        );

        doc.addImage(
            fotoFachada,
            "JPEG",
            x + 0.1,
            y + 0.1,
            largura - 0.2,
            altura - 0.2,
            undefined,
            "FAST"
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(8);

        doc.text(
            "Figura 1 - Fachada",
            x + 0.15,
            y + altura + 0.5
        );
    }
}

function criarHeaderVistoria({
    doc,
    border,
    logos,
    dFinal
}) {

    return function headerVistoria() {

        border();

        // LOGO AMERICANAS
        if (logos.americanasSA) {

            doc.addImage(
                logos.americanasSA,
                "PNG",
                1.0,
                0.75,
                3.60,
                1.39,
                undefined,
                "FAST"
            );
        }

        // NÚMERO DA PÁGINA
        const pageNumber =
            doc.getCurrentPageInfo().pageNumber;

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(8);

        doc.text(
            `PÁGINA ${pageNumber}`,
            19.5,
            1.8,
            {
                align: "right"
            }
        );

        // LINHA DO CABEÇALHO
        doc.setDrawColor(0);
        doc.setLineWidth(0.017);

        doc.line(
            1,
            2.4,
            20,
            2.4
        );

        // QUADRO TIPO / DATA / PREPARADO POR
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
            "TIPO: Relatório de Vistoria",
            1.3,
            3.2
        );

        doc.text(
            `DATA: ${dFinal}`,
            10.5,
            3.2,
            {
                align: "center"
            }
        );

        doc.text(
            "PREPARADO POR: Albetan Reis",
            14.8,
            3.2
        );
    };
}


function criarRodapeVistoria({
    doc,
    getEndereco
}) {

    return function rodapeVistoria() {

        const rodapeEndereco =
            getEndereco() || "";

        if (!rodapeEndereco) {
            return;
        }

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(11);

        const linhasEndereco =
            doc.splitTextToSize(
                rodapeEndereco.toUpperCase(),
                18
            );

        doc.text(
            linhasEndereco,
            10.5,
            28.5,
            {
                align: "center"
            }
        );
    };
}

// ============================================================
// PÁGINA DE OBJETIVO - VISTORIA
// ============================================================

function gerarObjetivoVistoria({
    doc,
    headerVistoria,
    rodapeVistoria,
    objetivo
}) {

    doc.addPage();
    headerVistoria();

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(12);

    doc.text(
        "1 – OBJETIVO",
        1.5,
        6.0
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    const textoObjetivo =
        objetivo?.trim() || "xxxx";


    const linhasObjetivo =
        doc.splitTextToSize(
            textoObjetivo,
            18
        );


    doc.text(
        linhasObjetivo,
        1.5,
        7.0,
        {
            align: "left",
            lineHeightFactor: 1.4
        }
    );


    rodapeVistoria();
}



// ============================================================
// OBSERVAÇÃO + CONCLUSÃO - VISTORIA
// ============================================================

function gerarTextosFinaisVistoria({
    doc,
    observacao,
    conclusao
}) {

    // ========================================================
    // 3 - OBSERVAÇÃO
    // ========================================================

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(12);

    doc.text(
        "3 – OBSERVAÇÃO",
        1.5,
        6.2
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    const textoObservacao =
        observacao?.trim() || "xxxx";


    const linhasObservacao =
        doc.splitTextToSize(
            textoObservacao,
            18
        );


    doc.text(
        linhasObservacao,
        1.5,
        7.2,
        {
            lineHeightFactor: 1.4
        }
    );


    // ========================================================
    // 3.1 - CONCLUSÕES
    // ========================================================

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(12);

    doc.text(
        "3.1 – CONCLUSÕES",
        1.5,
        9.2
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    const textoConclusao =
        conclusao?.trim() || "xxxx";


    const linhasConclusao =
        doc.splitTextToSize(
            textoConclusao,
            18
        );


    doc.text(
        linhasConclusao,
        1.5,
        10.2,
        {
            lineHeightFactor: 1.4
        }
    );
}

function gerarGaleriaVistoria({
    doc,
    anexo,
    indiceAnexo,
    indiceVistoria,
    descricaoGeralAnexo,
    headerVistoria,
    rodapeVistoria,
    fCount
}) {

    // Na Vistoria não existe separação visual
    // entre ANTES e DEPOIS.
    const todasFotos = [
        ...(anexo.fotosAntes || []),
        ...(anexo.fotosDepois || [])
    ];

    if (todasFotos.length === 0) {
        return fCount;
    }


    // ============================================================
    // CONFIGURAÇÃO DA GALERIA
    // 6 fotos por página
    // 2 colunas x 3 linhas
    // ============================================================

    const fotosPorPagina = 6;

    const larguraImg = 9.0;
    const alturaImg = 5.0;

    const xColuna1 = 1.35;
    const xColuna2 = 10.65;

    const yLinha1 = 6.0;
    const yLinha2 = 12.9;
    const yLinha3 = 19.8;

    const posicoesY = [
        yLinha1,
        yLinha2,
        yLinha3
    ];


    // ============================================================
    // DIVIDE AS FOTOS EM GRUPOS DE 6
    // ============================================================

    for (
        let inicio = 0;
        inicio < todasFotos.length;
        inicio += fotosPorPagina
    ) {

        const fotosPagina =
            todasFotos.slice(
                inicio,
                inicio + fotosPorPagina
            );


        // ========================================================
        // CRIA A PÁGINA
        // ========================================================

        doc.addPage();

        headerVistoria();


        // ========================================================
        // REGISTRA O ANEXO NO ÍNDICE
        // SOMENTE NA PRIMEIRA PÁGINA DELE
        // ========================================================

        if (inicio === 0) {

            const paginaInicialAnexo =
                doc.getCurrentPageInfo().pageNumber;


            const numeroAnexo =
                indiceVistoria.length + 1;


            indiceVistoria.push({

                numero:
                    `2.${numeroAnexo - 1}`,

                anexo:
                    numeroAnexo,

                nome:
                    String(
                        anexo.obs || ""
                    ).trim(),

                pagina:
                    paginaInicialAnexo

            });
        }


        // ========================================================
        // DESCRIÇÃO GERAL DO ANEXO
        // ========================================================

        if (
            descricaoGeralAnexo &&
            descricaoGeralAnexo.trim()
        ) {

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(8);

            const descricaoAnexoFormatada =
                doc.splitTextToSize(
                    descricaoGeralAnexo,
                    18
                );

            doc.text(
                descricaoAnexoFormatada,
                1.5,
                5.35
            );
        }


        // ========================================================
        // FOTOS
        // ========================================================

        fotosPagina.forEach(
            (foto, index) => {

                const coluna =
                    index % 2;

                const linha =
                    Math.floor(
                        index / 2
                    );


                const x =
                    coluna === 0
                        ? xColuna1
                        : xColuna2;


                const y =
                    posicoesY[linha];


                // =================================================
                // QUADRO DA FOTO + DESCRIÇÃO
                // =================================================

                const alturaDescricao = 1.2;

                doc.setDrawColor(0);
                doc.setLineWidth(0.017);

                doc.rect(
                    x,
                    y,
                    larguraImg,
                    alturaImg + alturaDescricao
                );


                // Linha entre imagem e descrição
                doc.line(
                    x,
                    y + alturaImg,
                    x + larguraImg,
                    y + alturaImg
                );


                // =================================================
                // IMAGEM
                // =================================================

                if (foto.src) {

                    doc.addImage(
                        foto.src,
                        "JPEG",
                        x,
                        y,
                        larguraImg,
                        alturaImg,
                        undefined,
                        "FAST"
                    );
                }


                // =================================================
                // DESCRIÇÃO DA FOTO
                // =================================================

                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(8);


                const descricaoFoto =
                    foto.desc
                        ? foto.desc
                        : " ";


                const textoLegenda =
                    `Figura ${fCount++} - ${descricaoFoto}`;


                const legendaFormatada =
                    doc.splitTextToSize(
                        textoLegenda,
                        8.5
                    );


                doc.text(
                    legendaFormatada,
                    x + 0.1,
                    y + alturaImg + 0.45
                );

            }
        );


        rodapeVistoria();
    }


    return fCount;
}

function gerarPaginaFinalVistoria({
    doc,
    headerVistoria,
    rodapeVistoria,
    observacao,
    conclusao,
    assinaturaRealizada,
    assinaturaCanvas,
    dVal
}) {

    // ============================================================
    // CRIA A PÁGINA FINAL
    // ============================================================

    doc.addPage();

    headerVistoria();


    // ============================================================
    // OBSERVAÇÃO + CONCLUSÃO
    // ============================================================

    gerarTextosFinaisVistoria({
        doc,
        observacao,
        conclusao
    });


    // ============================================================
    // ASSINATURA
    // ============================================================

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
            6.5,
            15.0,
            8,
            2.5
        );
    }


    // ============================================================
    // LINHA DA ASSINATURA
    // ============================================================

    doc.setDrawColor(0);
    doc.setLineWidth(0.02);

    doc.line(
        6.0,
        18.0,
        15.0,
        18.0
    );


    // ============================================================
    // NOME
    // ============================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);

    doc.text(
        "Albetan Reis",
        10.5,
        18.7,
        {
            align: "center"
        }
    );


    // ============================================================
    // CARGO
    // ============================================================

    doc.text(
        "Engenharia de Manutenção",
        10.5,
        19.4,
        {
            align: "center"
        }
    );


    // ============================================================
    // DATA POR EXTENSO
    // ============================================================

    const agora =
        dVal
            ? new Date(`${dVal}T12:00:00`)
            : new Date();


    const meses = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro"
    ];


    const dataPorExtenso =
        `Belém, ${agora.getDate()} de ` +
        `${meses[agora.getMonth()]} de ` +
        `${agora.getFullYear()}`;


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    doc.text(
        dataPorExtenso,
        19.0,
        24.5,
        {
            align: "right"
        }
    );


    // ============================================================
    // RODAPÉ
    // ============================================================

    rodapeVistoria();
}