// ==========================================
// PREVIEW / APROVAÇÃO DO RELATÓRIO
// ==========================================

async function abrirPreviewRelatorio() {

    try {

        const modal =
            document.getElementById("modalPreviewRelatorio");

        const paginasContainer =
            document.getElementById("previewRelatorioPaginas");


        if (!modal || !paginasContainer) {

            console.error(
                "Modal ou container do preview não encontrado."
            );

            return;
        }


        // ==========================================
        // ABRE O MODAL
        // ==========================================

        modal.classList.remove("hidden");


        // Inicializa assinatura se necessário
        if (!assinaturaCanvas) {
            iniciarCanvasAssinatura();
        }


        // ==========================================
        // MOSTRA CARREGAMENTO
        // ==========================================

        paginasContainer.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                color:#777;
                font-family:Arial,sans-serif;
            ">
                Gerando pré-visualização...
            </div>
        `;

        // ==========================================
        // GERA O PDF EM MEMÓRIA
        // ==========================================

        await atualizarLogoAutomatica();
        
        const blob =
            await gerarRelatorio();


        if (!blob) {

            throw new Error(
                "Não foi possível gerar a prévia."
            );

        }


        // ==========================================
        // CONVERTE BLOB PARA ARRAYBUFFER
        // ==========================================

        const arrayBuffer =
            await blob.arrayBuffer();


        // ==========================================
        // CARREGA COM PDF.JS
        // ==========================================

        const pdf =
            await pdfjsLib
                .getDocument({
                    data: arrayBuffer
                })
                .promise;


        console.log(
            `PDF carregado: ${pdf.numPages} página(s)`
        );


        // Limpa mensagem de carregamento
        paginasContainer.innerHTML = "";


        // ==========================================
        // DESENHA TODAS AS PÁGINAS
        // ==========================================

        for (
            let numeroPagina = 1;
            numeroPagina <= pdf.numPages;
            numeroPagina++
        ) {

            const pagina =
                await pdf.getPage(numeroPagina);


            // Tamanho original
            const viewportOriginal =
                pagina.getViewport({
                    scale: 1
                });


            // ======================================
            // CALCULA LARGURA RESPONSIVA
            // ======================================

            const larguraDisponivel =
                Math.min(
                    paginasContainer.clientWidth - 16,
                    900
                );


            const escala =
                larguraDisponivel /
                viewportOriginal.width;


            const viewport =
                pagina.getViewport({
                    scale: escala
                });


            // ======================================
            // BLOCO DA PÁGINA
            // ======================================

            const paginaWrapper =
                document.createElement("div");


            paginaWrapper.style.width =
                "100%";

            paginaWrapper.style.maxWidth =
                `${viewport.width}px`;

            paginaWrapper.style.background =
                "#ffffff";

            paginaWrapper.style.borderRadius =
                "8px";

            paginaWrapper.style.overflow =
                "hidden";

            paginaWrapper.style.boxShadow =
                "0 2px 10px rgba(0,0,0,0.12)";

            paginaWrapper.style.flexShrink = "0";

            paginaWrapper.style.height =
                `${viewport.height + 31}px`;


            // ======================================
            // CANVAS DO PDF
            // ======================================

            const canvas =
                document.createElement("canvas");


            const context =
                canvas.getContext("2d");


            // Melhora nitidez em celular
            const pixelRatio =
                window.devicePixelRatio || 1;


            canvas.width =
                Math.floor(
                    viewport.width * pixelRatio
                );


            canvas.height =
                Math.floor(
                    viewport.height * pixelRatio
                );


            canvas.style.width =
                `${viewport.width}px`;


            canvas.style.height =
                `${viewport.height}px`;


            // ======================================
            // NÚMERO DA PÁGINA
            // ======================================

            const indicador =
                document.createElement("div");


            indicador.innerText =
                `Página ${numeroPagina} de ${pdf.numPages}`;


            indicador.style.fontSize =
                "10px";

            indicador.style.textAlign =
                "center";

            indicador.style.padding =
                "7px";

            indicador.style.color =
                "#666";

            indicador.style.background =
                "#f5f5f5";


            paginaWrapper.appendChild(canvas);

            paginaWrapper.appendChild(indicador);

            paginasContainer.appendChild(
                paginaWrapper
            );


            // ======================================
            // RENDERIZA A PÁGINA
            // ======================================

            await pagina.render({

                canvasContext: context,

                viewport: viewport,

                transform:
                    pixelRatio !== 1
                        ? [
                            pixelRatio,
                            0,
                            0,
                            pixelRatio,
                            0,
                            0
                        ]
                        : null

            }).promise;
        }


    } catch (error) {

        console.error(
            "Erro ao abrir preview:",
            error
        );


        const paginasContainer =
            document.getElementById(
                "previewRelatorioPaginas"
            );


        if (paginasContainer) {

            paginasContainer.innerHTML = `
                <div style="
                    padding:40px;
                    text-align:center;
                    color:#b91c1c;
                ">
                    Não foi possível carregar
                    a pré-visualização.
                </div>
            `;
        }


        alert(
            "Não foi possível gerar a pré-visualização do relatório."
        );
    }
}

// ==========================================
// FECHAR PREVIEW
// ==========================================

function fecharPreviewRelatorio() {

    const modal =
        document.getElementById(
            "modalPreviewRelatorio"
        );

    const paginasContainer =
        document.getElementById(
            "previewRelatorioPaginas"
        );


    if (modal) {

        modal.classList.add("hidden");

    }


    if (paginasContainer) {

        paginasContainer.innerHTML = "";

    }


    if (previewPdfUrl) {

        URL.revokeObjectURL(
            previewPdfUrl
        );

        previewPdfUrl = null;

    }
}

// ==========================================
// BOTÃO DE VISUALIZAÇÃO
// Responsabilidade exclusiva do preview.js
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

    const btnVisualizarRelatorio =
        document.getElementById("btnVisualizarRelatorio");

    if (!btnVisualizarRelatorio) return;

    btnVisualizarRelatorio.addEventListener(
        "click",
        abrirPreviewRelatorio
    );

});

