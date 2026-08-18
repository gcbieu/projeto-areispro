// ============================================================
// AREIS PRO
// RELATÓRIOS - GERAÇÃO DE PDF
// ============================================================
//
// Responsável exclusivamente pela montagem do PDF:
//
// - capa;
// - cabeçalho;
// - fachada e marquise;
// - índice;
// - fotos antes e depois;
// - legendas;
// - assinatura;
// - geração de preview;
// - geração do arquivo final.
//
// Os dados utilizados são preparados pelo módulo relatorios.js.
// ============================================================

async function gerarRelatorio(modo = "final") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'cm', format: 'a4', compress: true });
    const pNome = document.getElementById('prestador').value;
    const lojaSelect =
        document.getElementById("lojaSelect");
    const lNome = lojaSelect?.options[lojaSelect.selectedIndex
    ]
        ?.textContent
        ?.trim()
        || "";
    const cNum = document.getElementById('chamado').value || "N/A";
    const dVal = document.getElementById('dataServico').value;
    const dFinal = dVal ? dVal.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    // Função de Borda Padrão
    const border = () => {
        doc.setLineWidth(0.017);
        doc.setDrawColor(0);
        doc.rect(0.5, 0.5, 20, 28.7);
    };

    // CABEÇALHO
    const header = () => {
        border();

        if (logos.prestador) {
            doc.addImage(logos.prestador, 'JPEG', 1, 0.8, 1.55, 1.41, undefined, 'FAST');
        }
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const totalPages = doc.internal.getNumberOfPages();

        doc.setDrawColor(0);
        doc.line(1, 2.4, 20, 2.4); // Linha divisória
        doc.rect(1, 2.6, 19, 1.0);  // Retângulo do topo

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`TIPO: Relatório Fotográfico`, 1.3, 3.2);
        doc.text(`PÁGINA ${pageNumber}`, 19.5, 1.8, { align: 'right' });
        doc.text(`DATA: ${dFinal}`, 10.5, 3.2, { align: 'center' });
        doc.text(`PREPARADO POR: `, 14.8, 3.2);
    };

    // ============================================================
    // 1. CAPA - PÁGINA 1
    // ============================================================

    // Verifica se é o Relatório de Vistoria
    const isVistoria =
        pNome &&
        pNome.toUpperCase().includes("VISTORIA");


    if (isVistoria) {

        // ========================================================
        // CAPA - RELATÓRIO DE VISTORIA
        // ========================================================

        header();

        // Imagem cadastrada no logo_url
        // Largura: 11,66 cm
        // Altura: 3,12 cm
        if (logos.prestador) {

            const larguraImagem = 11.66;
            const alturaImagem = 3.12;

            // Centraliza na folha A4 de 21 cm
            const xImagem = (21 - larguraImagem) / 2;

            doc.addImage(
                logos.prestador,
                "PNG",
                xImagem,
                8.0,
                larguraImagem,
                alturaImagem,
                undefined,
                "FAST"
            );
        }


        // Texto da capa
        doc.setFont("times", "normal");
        doc.setFontSize(20);

        doc.text(
            "RELATÓRIO DE VISTORIA:",
            10.5,
            13.0,
            { align: "center" }
        );

        doc.text(
            `LOJA ${lNome}`,
            10.5,
            14.5,
            { align: "center" }
        );


    } else {

        // ========================================================
        // CAPA NORMAL DOS PRESTADORES
        // ========================================================

        header();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);

        // Título da Capa
        doc.text(
            "RELATÓRIO FOTOGRÁFICO",
            10.5,
            5.0,
            { align: "center" }
        );

        doc.text(
            pNome,
            10.5,
            6.2,
            { align: "center" }
        );

        let yAtualCapa = 7.5;


        // Logo 1 - Prestador
        if (logos.prestador) {

            doc.addImage(
                logos.prestador,
                "PNG",
                6.5,
                yAtualCapa,
                8,
                8
            );

            yAtualCapa += 9;
        }


        // Logo 2 - Americanas
        if (logos.americanas) {

            doc.addImage(
                logos.americanas,
                "PNG",
                5.5,
                yAtualCapa,
                10,
                2.8
            );

            yAtualCapa += 4;
        }


        // Informações da loja
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);

        doc.text(
            `LOJA -  ${lNome}`,
            10.5,
            21.0,
            { align: "center" }
        );

        doc.text(
            `N° CHAMADO: ${cNum}`,
            10.5,
            22.2,
            { align: "center" }
        );

        doc.text(
            `DATA: ${dFinal}`,
            10.5,
            23.4,
            { align: "center" }
        );
    }

    // Segunda página
    if (fotosObrigatorias.fachada || fotosObrigatorias.marquise) {
        doc.addPage();
        header();

        let curY = 5.2;
        const larguraTabela = 18.0;
        const alturaImagem = 8.5;
        const alturaLegenda = 1.0;
        const alturaTotalCelula = alturaImagem + alturaLegenda; // 9.5 total

        doc.setDrawColor(0);
        doc.setLineWidth(0.017);

        if (fotosObrigatorias.fachada) {
            doc.rect(1.0, curY - 0.5, 19.0, alturaTotalCelula + 0.5);

            // Imagem
            doc.addImage(fotosObrigatorias.fachada, 'JPEG', 1.5, curY, larguraTabela, alturaImagem);

            // Legenda
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Figura 1 – Fachada", 1.7, curY + alturaImagem + 0.7);

            // Avança para próxima célula
            curY += alturaTotalCelula;
            curY += 0.5; // ajuste o valor conforme o espaçamento desejado
        }

        if (fotosObrigatorias.marquise) {
            // Moldura externa
            doc.rect(1.0, curY - 0.5, 19.0, alturaTotalCelula + 0.5);

            // Imagem
            doc.addImage(fotosObrigatorias.marquise, 'JPEG', 1.5, curY, larguraTabela, alturaImagem);

            // Linha horizontal separando foto da legenda
            doc.line(1.5, curY + alturaImagem, 1.5 + larguraTabela, curY + alturaImagem);

            // Legenda
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Figura 2 – Marquise, Letreiro", 1.7, curY + alturaImagem + 0.7);
        }
    }

    // --- 2. ÍNDICE (Geração Condicional) ---
    if (anexos && anexos.length > 0 && anexos.some(a => a.obs && a.obs.trim() !== "")) {
        doc.addPage();
        header(); // Cabeçalho

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("ÍNDICE DE ANEXOS", 10.5, 5.2, { align: 'center' });

        let idxY = 6.5;

        anexos.forEach((a, i) => {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(`ANEXO ${i + 1}`, 1.5, idxY);

            doc.setFont("helvetica", "bold");
            let descricao = a.obs ? a.obs.substring(0, 60) : "";
            doc.text(descricao, 4.5, idxY);

            doc.text((i + 4).toString(), 19.5, idxY, { align: 'right' });
            idxY += 1.3;
        });
    }

    // ============================================================
    // 4. PROCESSAR ANEXOS (GALERIA)
    // ============================================================

    let fCount = 3;

    for (const anexo of anexos) {

        const descricaoGeralAnexo = anexo.obs || " ";

        if (
            anexo.fotosAntes.length === 0 &&
            anexo.fotosDepois.length === 0
        ) {
            continue;
        }


        // ========================================================
        // RELATÓRIO DE VISTORIA
        //
        // PADRÃO EXCLUSIVO:
        // - 6 fotos por página
        // - 2 colunas
        // - 3 linhas
        // - cada imagem: 9 cm x 5 cm
        // - descrição abaixo da imagem
        // - topo mostra SOMENTE o nome do anexo
        // - não mostra "RELATÓRIO FOTOGRÁFICO - ANTES/DEPOIS"
        // ========================================================

        if (isVistoria) {

            // Junta as fotos de antes e depois.
            // Na vistoria não existe separação visual
            // "ANTES" e "DEPOIS".
            const todasFotos = [
                ...(anexo.fotosAntes || []),
                ...(anexo.fotosDepois || [])
            ];

            if (todasFotos.length === 0) {
                continue;
            }


            // ----------------------------------------------------
            // Configuração fixa da página
            // ----------------------------------------------------

            const fotosPorPagina = 6;

            const larguraImg = 9.0;
            const alturaImg = 5.0;

            // Duas colunas centralizadas na página
            const xColuna1 = 1.35;
            const xColuna2 = 10.65;

            // Três linhas
            const yLinha1 = 6.0;
            const yLinha2 = 12.9;
            const yLinha3 = 19.8;

            const posicoesY = [
                yLinha1,
                yLinha2,
                yLinha3
            ];


            // ----------------------------------------------------
            // Divide as fotos em grupos de 6
            // ----------------------------------------------------

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


                // Nova página para cada grupo de 6
                doc.addPage();

                header();


                // =================================================
                // DESCRIÇÃO GERAL DO ANEXO
                // =================================================

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


                // =================================================
                // FOTOS
                // =================================================

                fotosPagina.forEach(
                    (foto, index) => {

                        // -----------------------------------------
                        // Descobre coluna
                        // -----------------------------------------

                        const coluna =
                            index % 2;


                        // -----------------------------------------
                        // Descobre linha
                        // 0 e 1 = primeira linha
                        // 2 e 3 = segunda linha
                        // 4 e 5 = terceira linha
                        // -----------------------------------------

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


                        // =========================================
                        // IMAGEM
                        // 9 cm x 5 cm
                        // =========================================

                        // ============================================================
                        // QUADRO DA FOTO + DESCRIÇÃO
                        // ============================================================

                        // Altura reservada para a descrição abaixo da imagem
                        const alturaDescricao = 1.2;

                        // Borda externa da célula
                        doc.setDrawColor(0);
                        doc.setLineWidth(0.017);

                        doc.rect(
                            x,
                            y,
                            larguraImg,
                            alturaImg + alturaDescricao
                        );


                        // Linha que separa a foto da descrição
                        doc.line(
                            x,
                            y + alturaImg,
                            x + larguraImg,
                            y + alturaImg
                        );


                        // Imagem
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


                        // =========================================
                        // DESCRIÇÃO DA FOTO
                        // =========================================

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

            }


            // Terminou este anexo.
            // Não executa o relatório fotográfico normal.
            continue;
        }



        // ========================================================
        // RELATÓRIO NORMAL
        //
        // NÃO ALTERAR.
        // Mantém o comportamento atual dos outros prestadores.
        // ========================================================

        const renderGal = (photos, sub) => {

            if (photos.length === 0) {
                return;
            }


            doc.addPage();

            header();


            // Título da primeira página do anexo
            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(11);

            doc.text(
                sub,
                10.5,
                5.2,
                {
                    align: "center"
                }
            );


            doc.setFontSize(8);

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.text(
                descricaoGeralAnexo,
                1.5,
                5.8,
                {
                    align: "left"
                }
            );


            let y = 6.3;

            let col = 0;

            let alturaUltimaFileira = 0;


            photos.forEach(
                (f, index) => {

                    const x =
                        col === 0
                            ? 1.5
                            : 10.6;


                    const larguraImg = 8.9;

                    const alturaImg = 3.9;


                    // =============================================
                    // LEGENDA
                    // =============================================

                    doc.setFontSize(10);


                    const legendaTexto =
                        `Figura ${fCount++} - ${f.desc || " "}`;


                    const legendaFormatada =
                        doc.splitTextToSize(
                            legendaTexto,
                            8.2
                        );


                    const alturaTextoReal =
                        legendaFormatada.length * 0.45;


                    const alturaTotalTabela =
                        alturaImg +
                        0.6 +
                        alturaTextoReal +
                        0.2;


                    // =============================================
                    // QUEBRA DE PÁGINA
                    // =============================================

                    if (
                        y + alturaTotalTabela >
                        27.5
                    ) {

                        doc.addPage();

                        header();


                        doc.setFont(
                            "helvetica",
                            "bold"
                        );

                        doc.setFontSize(11);

                        doc.text(
                            sub,
                            10.5,
                            5.2,
                            {
                                align: "center"
                            }
                        );


                        doc.setFontSize(9);

                        doc.setFont(
                            "helvetica",
                            "normal"
                        );

                        doc.text(
                            descricaoGeralAnexo,
                            1.5,
                            5.8,
                            {
                                align: "left"
                            }
                        );


                        y = 6.5;

                        col = 0;

                        alturaUltimaFileira = 0;
                    }


                    // =============================================
                    // TABELA
                    // =============================================

                    doc.setDrawColor(0);

                    doc.setLineWidth(0.017);

                    doc.rect(
                        x,
                        y,
                        larguraImg,
                        alturaTotalTabela
                    );


                    // =============================================
                    // IMAGEM
                    // =============================================

                    if (f.src) {

                        doc.addImage(
                            f.src,
                            "JPEG",
                            x,
                            y,
                            larguraImg,
                            alturaImg,
                            undefined,
                            "FAST"
                        );

                    }


                    // =============================================
                    // LEGENDA
                    // =============================================

                    doc.text(
                        legendaFormatada,
                        x + 0.3,
                        y + alturaImg + 0.5
                    );


                    // =============================================
                    // COLUNAS
                    // =============================================

                    if (
                        alturaTotalTabela >
                        alturaUltimaFileira
                    ) {

                        alturaUltimaFileira =
                            alturaTotalTabela;

                    }


                    if (col === 1) {

                        y +=
                            alturaUltimaFileira +
                            0.1;


                        col = 0;

                        alturaUltimaFileira = 0;

                    } else {

                        if (
                            index ===
                            photos.length - 1
                        ) {

                            y +=
                                alturaTotalTabela +
                                0.1;

                        }


                        col = 1;

                    }

                }
            );

        };


        // ========================================================
        // NORMAL: ANTES / DEPOIS
        // ========================================================

        renderGal(
            anexo.fotosAntes,
            "RELATÓRIO FOTOGRÁFICO - ANTES"
        );

        renderGal(
            anexo.fotosDepois,
            "RELATÓRIO FOTOGRÁFICO - DEPOIS"
        );

    }

    // ==========================================
    // PÁGINA FINAL - ASSINATURA DO GERENTE
    // ==========================================

    if (modo === "final") {

        // A página existe SEMPRE
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


        // ======================================
        // ASSINATURA - SOMENTE SE FOI DESENHADA
        // ======================================

        if (assinaturaRealizada && assinaturaCanvas) {

            const assinaturaImagem =
                assinaturaCanvas.toDataURL("image/png");

            doc.addImage(
                assinaturaImagem,
                "PNG",
                5.5,
                10,
                10,
                3.3
            );
        }


        // ======================================
        // LINHA PARA ASSINATURA
        // ======================================

        doc.setDrawColor(0);
        doc.setLineWidth(0.02);

        doc.line(
            6,
            14,
            15,
            14
        );


        // ======================================
        // IDENTIFICAÇÃO
        // ======================================

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(
            "Assinatura do Responsável",
            10.5,
            14.7,
            { align: "center" }
        );

        // ======================================
        // DATA
        // ======================================

        doc.setFontSize(8);

        doc.text(
            `Data: ${new Date().toLocaleDateString("pt-BR")}`,
            10.5,
            15.5,
            { align: "center" }
        );
    }

    // ==========================================
    // PREVIEW OU DOWNLOAD
    // ==========================================

    if (modo === "preview") {
        return doc.output("blob");
    }

    // GERA O ARQUIVO EM MEMÓRIA
    const pdfBlob = doc.output("blob");

    // BAIXA NORMALMENTE NO COMPUTADOR
    doc.save(
        `AREISPRO_${lNome.split(' ')[0] || 'RELATORIO'}.pdf`
    );

    // DEVOLVE O PDF PARA O AREISPRO
    return pdfBlob;
}