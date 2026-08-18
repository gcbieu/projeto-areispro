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
    const lNome = lojaSelect ?.options[lojaSelect.selectedIndex
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

    // --- 1. CAPA (Página 1) ---
    header();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // Título da Capa:
    doc.text("RELATÓRIO FOTOGRÁFICO", 10.5, 5.0, { align: 'center' });
    doc.text(pNome, 10.5, 6.2, { align: 'center' });

    let yAtualCapa = 7.5;

    // Logo 1 (Prestador)
    if (logos.prestador) {
        // Tamanho grande para a capa
        doc.addImage(logos.prestador, 'PNG', 6.5, yAtualCapa, 8, 8);
        yAtualCapa += 9;
    }

    // Logo 2 (Cliente)
    if (logos.americanas) {
        doc.addImage(logos.americanas, 'PNG', 5.5, yAtualCapa, 10, 2.8);
        yAtualCapa += 4;
    }

    // Rodapé da Capa (Informações da Loja)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`LOJA -  ${lNome}`, 10.5, 21.0, { align: 'center' });
    doc.text(`N° CHAMADO: ${cNum}`, 10.5, 22.2, { align: 'center' });
    doc.text(`DATA: ${dFinal}`, 10.5, 23.4, { align: 'center' });

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

    // 4. PROCESSAR ANEXOS (GALERIA)
    let fCount = 3;
    for (const anexo of anexos) {
        const descricaoGeralAnexo = anexo.obs || " ";
        if (anexo.fotosAntes.length === 0 && anexo.fotosDepois.length === 0) continue;

        const renderGal = (photos, sub) => {
            if (photos.length === 0) return;

            doc.addPage();
            header();

            // Título da primeira página do anexo
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(sub, 10.5, 5.2, { align: 'center' }); // Título centralizado

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(descricaoGeralAnexo, 1.5, 5.8, { align: 'left' }); // Descrição esquerda

            let y = 6.3;
            let col = 0;
            let alturaUltimaFileira = 0;

            photos.forEach((f, index) => {
                const x = col === 0 ? 1.5 : 10.6;
                const larguraImg = 8.9;
                //altura da imagem a baixo
                const alturaImg = 3.9;

                // 1. CALCULA A LEGENDA PRIMEIRO
                doc.setFontSize(10);
                const legendaTexto = `Figura ${fCount++} - ${f.desc || ' '}`;
                const legendaFormatada = doc.splitTextToSize(legendaTexto, 8.2);

                // Calcula a altura do texto (quantidade de linhas * entrelinha de ~0.45cm)
                const alturaTextoReal = legendaFormatada.length * 0.45;

                // 2. DEFINE A ALTURA DA TABELA (Imagem + Margem + Texto + Respiro inferior)
                const alturaTotalTabela = alturaImg + 0.6 + alturaTextoReal + 0.2;

                // 3. QUEBRA DE PÁGINA INTELIGENTE
                if (y + alturaTotalTabela > 27.5) {
                    doc.addPage();
                    header();

                    // 1. Título (Antes/Depois)
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text(sub, 10.5, 5.2, { align: 'center' });

                    // 2. Descrição Geral
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.text(descricaoGeralAnexo, 1.5, 5.8, { align: 'left' });

                    y = 6.5;
                    col = 0;
                    alturaUltimaFileira = 0;
                }
                // 4. DESENHA A TABELA
                doc.setDrawColor(0);
                doc.setLineWidth(0.017);
                doc.rect(x, y, larguraImg, alturaTotalTabela);

                // 5. CONTEÚDO
                if (f.src) {
                    doc.addImage(f.src, 'JPEG', x, y, larguraImg, alturaImg, undefined, 'FAST');
                }
                doc.text(legendaFormatada, x + 0.3, y + alturaImg + 0.5);

                // 6. LOGICA DE COLUNAS
                if (alturaTotalTabela > alturaUltimaFileira) {
                    alturaUltimaFileira = alturaTotalTabela;
                }

                if (col === 1) {

                    y += alturaUltimaFileira + 0.1;
                    col = 0;
                    alturaUltimaFileira = 0; // Reseta para a próxima linha
                } else {
                    // Se for a primeira foto e for a ÚLTIMA do array (não tem par)
                    if (index === photos.length - 1) {
                        y += alturaTotalTabela + 0.1;
                    }
                    col = 1;
                }
            });
        };
        renderGal(anexo.fotosAntes, "RELATÓRIO FOTOGRÁFICO - ANTES");
        renderGal(anexo.fotosDepois, "RELATÓRIO FOTOGRÁFICO - DEPOIS");
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