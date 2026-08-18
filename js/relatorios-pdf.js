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
let paginaIndiceVistoria = null;

let indiceVistoria = [];

let paginaObservacaoVistoria = null;
let paginaConclusoesVistoria = null;

async function gerarRelatorio(modo = "final") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'cm', format: 'a4', compress: true });

// ============================================================
// RESET DO ÍNDICE DA VISTORIA
// Cada geração começa do zero.
// Evita duplicação ao abrir preview mais de uma vez.
// ============================================================

indiceVistoria = [];

paginaIndiceVistoria = null;
paginaObservacaoVistoria = null;
paginaConclusoesVistoria = null;

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
// CABEÇALHO - RELATÓRIO DE VISTORIA
// Mantém o relatório normal intacto.
// ============================================================

const headerVistoria = () => {

    border();


    // ========================================================
    // LOGO AMERICANAS
    // 3,60 cm largura x 1,39 cm altura
    // ========================================================

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

    // ========================================================
    // NÚMERO DA PÁGINA
    // ========================================================

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


    // ========================================================
    // LINHA DO CABEÇALHO
    // ========================================================

    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    doc.line(
        1,
        2.4,
        20,
        2.4
    );


    // ========================================================
    // QUADRO TIPO / DATA / PREPARADO POR
    // ========================================================

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

let rodapeEndereco = "";

function rodapeVistoria() {

    if (!isVistoria) return;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    if (rodapeEndereco) {

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
    }
}

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

    border();


    // ========================================================
    // 1. DADOS DA LOJA SELECIONADA
    // ========================================================

    const dadosLojaCapa =
        db.lojas.find(loja =>
            String(loja.LOJA || "").trim() ===
            String(lojaSelect.value || "").trim()
        ) || {};


    const enderecoLoja =
        dadosLojaCapa["ENDEREÇO"] ||
        dadosLojaCapa["ENDERECO"] ||
        dadosLojaCapa.endereco ||
        "";


    const cidadeLoja =
        dadosLojaCapa["CIDADE"] ||
        dadosLojaCapa["MUNICIPIO"] ||
        dadosLojaCapa.cidade ||
        dadosLojaCapa.municipio ||
        "";


    const ufLoja =
        dadosLojaCapa["UF"] ||
        dadosLojaCapa.uf ||
        "";


    const cepLoja =
        dadosLojaCapa["CEP"] ||
        dadosLojaCapa.cep ||
        "";


    // Monta o endereço no padrão do relatório
    rodapeEndereco = enderecoLoja;
    if (cidadeLoja) {
        rodapeEndereco += ` - ${cidadeLoja}`;
    }

    if (ufLoja) {
        rodapeEndereco += ` - ${ufLoja}`;
    }

    if (cepLoja) {
        rodapeEndereco += ` CEP: ${cepLoja}`;
    }



    // ========================================================
    // 2. CABEÇALHO DA VISTORIA
    // ========================================================

    // Logo pequena Americanas
    // 3,60 cm largura x 1,39 cm altura
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

    // Número da página
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text(
        "PÁGINA 1",
        19.5,
        1.8,
        {
            align: "right"
        }
    );


    // Linha abaixo do logo
    doc.setDrawColor(0);
    doc.setLineWidth(0.017);

    doc.line(
        1,
        2.4,
        20,
        2.4
    );


    // Caixa do cabeçalho
    doc.rect(
        1,
        2.6,
        19,
        1.0
    );


    doc.setFont("helvetica", "normal");
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



    // ========================================================
    // 3. LOGO CENTRAL DA CAPA
    // ========================================================

    if (logos.prestador) {

        const larguraLogoCapa = 11.66;
        const alturaLogoCapa = 3.12;

        const xLogoCapa =
            (21 - larguraLogoCapa) / 2;


        doc.addImage(
            logos.prestador,
            "PNG",
            xLogoCapa,
            6.3,
            larguraLogoCapa,
            alturaLogoCapa,
            undefined,
            "FAST"
        );
    }



    // ========================================================
    // 4. TÍTULO
    // ========================================================

    doc.setFont(
        "times",
        "normal"
    );

    doc.setFontSize(20);


    doc.text(
        "RELATÓRIO DE VISTORIA:",
        10.5,
        11.0,
        {
            align: "center"
        }
    );


    doc.text(
        `LOJA ${lNome}`,
        10.5,
        12.1,
        {
            align: "center"
        }
    );



    // ========================================================
    // 5. FOTO DA FACHADA
    //
    // 18,71 cm largura
    // 10,33 cm altura
    // ========================================================

    if (fotosObrigatorias.fachada) {

        const larguraFachada = 18.71;
        const alturaFachada = 10.33;

        const xFachada =
            (21 - larguraFachada) / 2;


        // Quadro da Fachada + legenda
        doc.setDrawColor(0);
        doc.setLineWidth(0.017);

        doc.rect(
            xFachada,
            13.2,
            larguraFachada,
            alturaFachada + 1.1
        );


        // Foto
        doc.addImage(
            fotosObrigatorias.fachada,
            "JPEG",
            xFachada,
            13.2,
            larguraFachada,
            alturaFachada,
            undefined,
            "FAST"
        );


        // Linha da legenda
        doc.line(
            xFachada,
            13.2 + alturaFachada,
            xFachada + larguraFachada,
            13.2 + alturaFachada
        );


        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(10);

        doc.text(
            "Figura 1 – Fachada",
            xFachada + 0.25,
            13.2 + alturaFachada + 0.7
        );
    }



    // ========================================================
    // 6. RODAPÉ - ENDEREÇO DA LOJA
    //
    // Arial 11
    // jsPDF usa Helvetica como equivalente nativo ao Arial.
    // ========================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    if (rodapeEndereco) {

        const enderecoFormatado =
            doc.splitTextToSize(
                rodapeEndereco.toUpperCase(),
                18.5
            );


        doc.text(
            enderecoFormatado,
            10.5,
            28.1,
            {
                align: "center"
            }
        );
    }

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

// ============================================================
// 2. SEGUNDA PÁGINA - OBJETIVO
// SOMENTE RELATÓRIO DE VISTORIA
// ============================================================

if (isVistoria) {

    doc.addPage();

    // Cabeçalho próprio da vistoria
    headerVistoria();


    // ========================================================
    // 1 - OBJETIVO
    // Arial equivalente: Helvetica
    // Tamanho 12
    // Negrito
    // Alinhado em 1,5 cm
    // ========================================================

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


    // ========================================================
    // TEXTO DO OBJETIVO
    // Arial equivalente: Helvetica
    // Tamanho 11
    // Normal
    // Mesmo alinhamento: 1,5 cm
    // ========================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);


    const textoObjetivo =
        "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";


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


    // ========================================================
    // RODAPÉ DA VISTORIA
    // ENDEREÇO DA LOJA
    // ========================================================

    rodapeVistoria();

} else {

    // ========================================================
    // RELATÓRIO NORMAL
    // SEGUNDA PÁGINA - FACHADA / MARQUISE
    // ========================================================

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
}
// ============================================================
// 3. ÍNDICE
// ============================================================

if (isVistoria) {

    // ========================================================
    // VISTORIA
    // Cria a página 3 agora, mas preenche depois.
    //
    // Precisamos primeiro gerar os anexos para descobrir
    // em qual página cada um realmente começou.
    // ========================================================

    doc.addPage();

    headerVistoria();

    paginaIndiceVistoria =
        doc.getCurrentPageInfo().pageNumber;

    rodapeVistoria();


} else {

    // ========================================================
    // RELATÓRIO NORMAL
    // Mantém o índice antigo.
    // ========================================================

    if (
        anexos &&
        anexos.length > 0 &&
        anexos.some(
            a =>
                a.obs &&
                a.obs.trim() !== ""
        )
    ) {

        doc.addPage();

        header();

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(14);

        doc.text(
            "ÍNDICE DE ANEXOS",
            10.5,
            5.2,
            {
                align: "center"
            }
        );


        let idxY = 6.5;


        anexos.forEach(
            (a, i) => {

                doc.setFontSize(9);

                doc.setFont(
                    "helvetica",
                    "bold"
                );


                doc.text(
                    `ANEXO ${i + 1}`,
                    1.5,
                    idxY
                );


                let descricao =
                    a.obs
                        ? a.obs.substring(0, 60)
                        : "";


                doc.text(
                    descricao,
                    4.5,
                    idxY
                );


                doc.text(
                    (i + 4).toString(),
                    19.5,
                    idxY,
                    {
                        align: "right"
                    }
                );


                idxY += 1.3;

            }
        );
    }
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


    // ========================================================
    // CRIA A PÁGINA REAL DAS FOTOS
    // ========================================================

    doc.addPage();

    headerVistoria();


    // ========================================================
    // REGISTRA O ANEXO SOMENTE UMA VEZ
    //
    // inicio === 0 significa:
    // esta é a PRIMEIRA página deste anexo.
    //
    // Se o anexo continuar em páginas seguintes,
    // NÃO adiciona uma nova linha no índice.
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
                    descricaoGeralAnexo || ""
                )
                    .trim()
                    .toUpperCase(),

            pagina:
                paginaInicialAnexo

        });

    }

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

 rodapeVistoria();

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

    // ============================================================
// FINALIZA O ÍNDICE DO RELATÓRIO DE VISTORIA
// ============================================================

if (
    isVistoria &&
    paginaIndiceVistoria
) {

    // ========================================================
    // As próximas páginas serão:
    //
    // 3.0 - OBSERVAÇÃO
    // 3.1 - CONCLUSÕES
    //
    // No próximo passo vamos construir essas duas páginas.
    // ========================================================

    paginaObservacaoVistoria =
        doc.getCurrentPageInfo().pageNumber + 1;

    paginaConclusoesVistoria =
        paginaObservacaoVistoria + 1;


    // Volta para a página 3
    doc.setPage(
        paginaIndiceVistoria
    );


    // ========================================================
    // TÍTULO
    // Arial equivalente: Helvetica
    // 12 / Negrito / Centralizado
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
    // CONFIGURAÇÃO DAS LINHAS DO SUMÁRIO
    // ========================================================

    let yIndice = 7.4;

    const xTexto = 1.5;

    // Todos os números terminam exatamente aqui
    const xPagina = 19.3;

    const larguraMaxTexto = 15.7;


    // ========================================================
    // FUNÇÃO PARA ESCREVER UMA LINHA DO ÍNDICE
    // ========================================================

    const escreverLinhaIndice =
        (
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
                String(
                    texto || ""
                ).trim();


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
                textoFinal !== texto
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


            // Calcula onde o texto terminou
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


            // =================================================
            // PONTILHADO
            // =================================================

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


            // =================================================
            // PÁGINA
            // Sempre alinhada na MESMA COLUNA
            // =================================================

            doc.text(
                paginaTexto,
                xPagina,
                yIndice,
                {
                    align: "right"
                }
            );


            yIndice += 1.0;
        };


    // ========================================================
    // 1 - OBJETIVO
    // ========================================================

    escreverLinhaIndice(
        "1 - OBJETIVO",
        2
    );

    // ========================================================
    // 2.X - ANEXOS
    // ========================================================

    indiceVistoria.forEach(
        item => {

            escreverLinhaIndice(

                `${item.numero} - ANEXO ${item.anexo} - ${item.nome}`,

                item.pagina

            );

        }
    );

    // ========================================================
    // 3.0 - OBSERVAÇÃO
    // ========================================================

    escreverLinhaIndice(
        "3.0 - OBSERVAÇÃO",
        paginaObservacaoVistoria,
        false
    );


    // ========================================================
    // 3.1 - CONCLUSÕES
    // ========================================================

    escreverLinhaIndice(
        "3.1 - CONCLUSÕES",
        paginaConclusoesVistoria,
        false
    );


    // Reforça o rodapé na página do índice
    rodapeVistoria();


    // ========================================================
    // VOLTA PARA A ÚLTIMA PÁGINA GERADA
    // ========================================================

    doc.setPage(
        doc.internal.getNumberOfPages()
    );
}

// ============================================================
// PÁGINA FINAL - RELATÓRIO DE VISTORIA
// ============================================================

if (isVistoria && modo === "final") {

    doc.addPage();

    headerVistoria();


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


    // Texto provisório
    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(11);

    const textoObservacao =
        "XXXXXXXXXXXXX";


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
    // Aproximadamente 2 linhas de espaçamento vertical
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
        "XXXXXXXXX";


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


    // ========================================================
    // ASSINATURA
    // Centralizada
    // ========================================================

    // Se houver assinatura desenhada no AREIS,
    // coloca a assinatura acima da linha.
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


    // Linha da assinatura
    doc.setDrawColor(0);
    doc.setLineWidth(0.02);

    doc.line(
        6.0,
        18.0,
        15.0,
        18.0
    );


    // Nome
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


    // Cargo
    doc.text(
        "Engenharia de Manutenção",
        10.5,
        19.4,
        {
            align: "center"
        }
    );


    // ========================================================
    // DATA
    // Belém, xx de xxxx de xxxx
    // ========================================================

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


    // ========================================================
    // RODAPÉ
    // Endereço da loja
    // ========================================================

    rodapeVistoria();

}

    // ==========================================
    // PÁGINA FINAL - ASSINATURA DO GERENTE
    // ==========================================

if (
    modo === "final" &&
    !isVistoria
) {
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