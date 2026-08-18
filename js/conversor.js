function toggleConverter() { document.getElementById('converterExpand').classList.toggle('hidden'); }
function triggerConverter(id) { document.getElementById(id).click(); }

//conversão de PDF para DOCX usando a API local do Stirling PDF
async function handleConversion(input, type) {
    const file = input.files?.[0];

    if (!file) {
        alert("Selecione um arquivo PDF.");
        return;
    }

    if (type !== "pdfToWord") {
        alert("Este tipo de conversão ainda não está disponível.");
        input.value = "";
        return;
    }

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        alert("Selecione um arquivo no formato PDF.");
        input.value = "";
        return;
    }

    const progress = document.getElementById("convProgress");

    try {
        progress?.classList.remove("hidden");

        const formData = new FormData();
        formData.append("fileInput", file, file.name);
        formData.append("outputFormat", "docx");

        const response = await fetch(
            "http://localhost:8080/api/v1/convert/pdf/word",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            let errorText = "";

            try {
                errorText = await response.text();
            } catch (error) {
                errorText = "";
            }

            console.error(
                "Erro retornado pelo Stirling PDF:",
                response.status,
                response.statusText,
                errorText
            );

            throw new Error(
                `Erro ${response.status}: ${errorText ||
                response.statusText ||
                "O Stirling PDF rejeitou o arquivo enviado."
                }`
            );
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("A API retornou um arquivo vazio.");
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download =
            file.name.replace(/\.pdf$/i, "") + ".docx";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

        alert("PDF convertido para Word com sucesso.");
    } catch (error) {
        console.error("Erro ao converter PDF:", error);

        const mensagem =
            error instanceof TypeError
                ? "Não foi possível conectar ao Stirling PDF. Confirme se o Docker está aberto e se http://localhost:8080 está funcionando."
                : error.message;

        alert(mensagem);
    } finally {
        progress?.classList.add("hidden");
        input.value = "";
    }
}