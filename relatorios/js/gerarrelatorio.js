// ==========================================
// GERAR PDF FINAL
// ==========================================

async function gerarPDFFinal() {

    console.log("🔥 ENTROU NO GERAR PDF FINAL");

    const botao =
        document.getElementById(
            "btnGerarPdfFinal"
        );


    try {

        if (botao) {

            botao.disabled = true;

            botao.innerText =
                "GERANDO...";

            botao.style.opacity =
                "0.6";
        }


        // ======================================
        // ASSINATURA É OPCIONAL
        // ======================================

console.log("🔥 VAI GERAR O PDF FINAL");

await atualizarLogoAutomatica();

const pdfBlob =
    await gerarRelatorio();
            
        console.log("🔥 PDF FINAL GERADO", pdfBlob);

        // ======================================
        // DOWNLOAD DO PDF FINAL
        // ======================================
        if (pdfBlob) {
            const lojaSelect = document.getElementById("lojaSelect");
            const nomeLoja =
                lojaSelect?.options[lojaSelect.selectedIndex]
                    ?.textContent
                    ?.trim()
                || "RELATORIO";

            const nomeLimpo =
                nomeLoja
                    .replace(/^#/, "")
                    .replace(/\s*-\s*/g, "-")
                    .replace(/[\\/:*?"<>|]/g, "")
                    .trim();

            const modeloRelatorio =
                new URLSearchParams(window.location.search)
                    .get("modelo");

            const tipoNomeArquivo =
                modeloRelatorio === "vistoria"
                    ? "RELATÓRIO VISTORIA LOJA"
                    : "RELATÓRIO FOTOGRÁFICO";

            const urlDownload = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");

            link.href = urlDownload;
            link.download = `${tipoNomeArquivo} ${nomeLimpo}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(urlDownload), 1000);
        }


        if (pdfBlob) {

            const numeroChamado =
                document.getElementById("chamado")?.value?.trim();

            console.log("🔥 NÚMERO DO CHAMADO:", numeroChamado);

            if (numeroChamado) {

                console.log("🔥 VAI SALVAR NO SUPABASE");
                try {
                    await salvarRelatorioNoChamado(
                        pdfBlob
                    );

                    console.log(
                        `Relatório vinculado ao chamado #${numeroChamado}.`
                    );

                } catch (error) {

                    console.error(
                        "Erro ao vincular relatório ao chamado:",
                        error
                    );

                    alert(
                        "O PDF foi gerado, mas não foi possível vincular o relatório ao chamado.\n\n" +
                        error.message
                    );

                }

            }
        }

    } catch (error) {

        console.error(
            "Erro ao gerar PDF final:",
            error
        );


        alert(
            "Erro ao gerar o PDF final.\n\n" +
            (error?.message || error)
        );


    } finally {

        if (botao) {

            botao.disabled = false;

            botao.innerText =
                "GERAR PDF FINAL";

            botao.style.opacity =
                "1";
        }
    }
}

// ============================================================
// SALVAR RELATÓRIO
// Gera o PDF atual e salva no Supabase
// ============================================================

async function salvarRelatorio() {

    const botao =
        document.getElementById("btnSalvarRelatorio");

    if (!botao) return;

    const textoOriginal = botao.textContent;

    try {

        // Evita clique duplo enquanto salva
        botao.disabled = true;
        botao.textContent = "SALVANDO...";

await atualizarLogoAutomatica();

const pdfBlob =
    await gerarRelatorio();
        // Salva no Storage + histórico + chamado
        await salvarRelatorioNoChamado(
            pdfBlob
        );

        botao.textContent =
            "RELATÓRIO SALVO";

        console.log(
            "Relatório salvo com sucesso."
        );

        setTimeout(() => {

            botao.textContent =
                textoOriginal;

        }, 2000);

    } catch (erro) {

        console.error(
            "Erro ao salvar relatório:",
            erro
        );

        botao.textContent =
            "ERRO AO SALVAR";

        alert(
            erro?.message ||
            "Não foi possível salvar o relatório."
        );

        setTimeout(() => {

            botao.textContent =
                textoOriginal;

        }, 2000);

    } finally {

        botao.disabled = false;

    }
}


// ============================================================
// BOTÃO SALVAR RELATÓRIO
// ============================================================

document
    .getElementById("btnSalvarRelatorio")
    ?.addEventListener(
        "click",
        salvarRelatorio
    );