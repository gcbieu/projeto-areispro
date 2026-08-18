let db = {
    lojas: [],
    prestadores: []
};

let anexos = [
    {
        id: Date.now(),
        titulo: "ANEXO 1",
        obs: "",
        fotosAntes: [],
        fotosDepois: []
    }
];

let logos = {
    prestador: null,
    americanas: "https://ujwfggunvzsonnsjuvpl.supabase.co/storage/v1/object/public/logos-prestadores/americanas.png"
};

let fotosObrigatorias = {
    fachada: null,
    marquise: null
};

let lojasEnderecosTemp = [];
// ==========================================
// ASSINATURA DO GERENTE
// ==========================================

let assinaturaCanvas = null;
let assinaturaCtx = null;
let assinando = false;
let assinaturaRealizada = false;
let previewPdfUrl = null;


// ==========================================
// INICIALIZA O CAMPO DE ASSINATURA
// ==========================================

function iniciarCanvasAssinatura() {

    assinaturaCanvas = document.getElementById("assinaturaCanvas");

    // O canvas pode ainda não existir na tela.
    // Isso NÃO deve impedir o relatório de funcionar.
    if (!assinaturaCanvas) {
        assinaturaCtx = null;
        return;
    }

    assinaturaCtx = assinaturaCanvas.getContext("2d");

    assinaturaCtx.strokeStyle = "#000000";
    assinaturaCtx.lineWidth = 4;
    assinaturaCtx.lineCap = "round";
    assinaturaCtx.lineJoin = "round";


    function obterPosicao(event) {

        const rect = assinaturaCanvas.getBoundingClientRect();

        const ponto =
            event.touches && event.touches.length
                ? event.touches[0]
                : event;

        return {

            x:
                (ponto.clientX - rect.left) *
                (assinaturaCanvas.width / rect.width),

            y:
                (ponto.clientY - rect.top) *
                (assinaturaCanvas.height / rect.height)

        };
    }


    function iniciar(event) {

        event.preventDefault();

        assinando = true;

        const pos = obterPosicao(event);

        assinaturaCtx.beginPath();
        assinaturaCtx.moveTo(pos.x, pos.y);
    }


    function desenhar(event) {

        if (!assinando) return;

        event.preventDefault();

        const pos = obterPosicao(event);

        assinaturaCtx.lineTo(pos.x, pos.y);
        assinaturaCtx.stroke();

        // Só considera que existe assinatura
        // quando realmente houve desenho.
        assinaturaRealizada = true;
    }


    function finalizar() {

        assinando = false;

        if (assinaturaCtx) {
            assinaturaCtx.closePath();
        }
    }


    // ======================================
    // MOUSE
    // ======================================

    assinaturaCanvas.addEventListener(
        "mousedown",
        iniciar
    );

    assinaturaCanvas.addEventListener(
        "mousemove",
        desenhar
    );

    assinaturaCanvas.addEventListener(
        "mouseup",
        finalizar
    );

    assinaturaCanvas.addEventListener(
        "mouseleave",
        finalizar
    );


    // ======================================
    // CELULAR / TABLET
    // ======================================

    assinaturaCanvas.addEventListener(
        "touchstart",
        iniciar,
        {
            passive: false
        }
    );

    assinaturaCanvas.addEventListener(
        "touchmove",
        desenhar,
        {
            passive: false
        }
    );

    assinaturaCanvas.addEventListener(
        "touchend",
        finalizar
    );
}


// ==========================================
// CARREGAMENTO INICIAL
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarCanvasAssinatura();

    }
);


// ==========================================
// LIMPAR ASSINATURA
// ==========================================

function limparAssinatura() {

    if (
        assinaturaCanvas &&
        assinaturaCtx
    ) {

        assinaturaCtx.clearRect(
            0,
            0,
            assinaturaCanvas.width,
            assinaturaCanvas.height
        );
    }

    // Sempre volta para "sem assinatura"
    assinaturaRealizada = false;
    assinando = false;
}


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

        const blob =
            await gerarRelatorio("preview");


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
// GERAR PDF FINAL
// ==========================================

async function gerarPDFFinal() {

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

const pdfBlob =
    await gerarRelatorio("final");

if (pdfBlob) {

    const numeroChamado =
        document.getElementById("chamado")?.value?.trim();

    if (numeroChamado) {

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
            "Erro ao gerar o PDF final."
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

// ============================================================================
// SALVAR RELATÓRIO NO SUPABASE E VINCULAR AO CHAMADO
// ============================================================================

async function salvarRelatorioNoChamado(pdfBlob) {

    const numeroChamado = String(
        document.getElementById("chamado")?.value || ""
    ).trim();

    if (!numeroChamado) {
        throw new Error("Informe o número do chamado.");
    }


    // ============================================================
    // LOCALIZA O CHAMADO CARREGADO NA CENTRAL
    // ============================================================

    const chamadoEncontrado = (window.chamadosAlbetan || []).find(chamado => {

        const id =
            chamado["ID"] ??
            chamado["Id"] ??
            chamado["id"] ??
            chamado["Chamado"] ??
            chamado["Número do Chamado"];

        return String(id || "").trim() === numeroChamado;

    });


    if (!chamadoEncontrado) {

        throw new Error(
            `Chamado #${numeroChamado} não encontrado na Central de Chamados.`
        );

    }


    // ============================================================
    // NOME DO ARQUIVO
    // ============================================================

    const agora = new Date();

    const timestamp =
        agora.getFullYear() +
        "-" +
        String(agora.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(agora.getDate()).padStart(2, "0") +
        "_" +
        String(agora.getHours()).padStart(2, "0") +
        "-" +
        String(agora.getMinutes()).padStart(2, "0");


    const nomeArquivo =
        `${numeroChamado}/AREISPRO_${numeroChamado}_${timestamp}.pdf`;


    // ============================================================
    // ENVIA PARA O STORAGE
    // ============================================================

    const { data: uploadData, error: uploadError } =
        await supabaseClient
            .storage
            .from("relatorios")
            .upload(
                nomeArquivo,
                pdfBlob,
                {
                    contentType: "application/pdf",
                    upsert: false
                }
            );


    if (uploadError) {

        console.error(
            "Erro ao enviar relatório:",
            uploadError
        );

        throw uploadError;

    }


    // ============================================================
    // PEGA A URL DO RELATÓRIO
    // ============================================================

    const { data: urlData } =
        supabaseClient
            .storage
            .from("relatorios")
            .getPublicUrl(nomeArquivo);


    const urlRelatorio =
        urlData?.publicUrl;


    if (!urlRelatorio) {

        throw new Error(
            "Não foi possível gerar o link do relatório."
        );

    }


    // ============================================================
    // ADICIONA O LINK AO CHAMADO
    // ============================================================

    chamadoEncontrado["Link Relatório"] =
        urlRelatorio;

    chamadoEncontrado["Relatório gerado em"] =
        agora.toLocaleString("pt-BR");


    // ============================================================
    // SALVA ALTERAÇÃO NO SUPABASE
    // ============================================================

    await persistirAlteracaoChamado(
        chamadoEncontrado
    );


    console.log(
        "Relatório vinculado ao chamado:",
        numeroChamado,
        urlRelatorio
    );

    // ============================================================
// ATUALIZA TAMBÉM A MEMÓRIA DO FATURAMENTO
// ============================================================
//
// Se o chamado já entrou no faturamento,
// o relatório aparece imediatamente na coluna RELATÓRIO.
// Não altera valores, NF, fornecedor ou outros dados.
// ============================================================

const { error: erroFaturamento } =
    await supabaseClient
        .from(
            "faturamento_servicos"
        )
        .update({

            relatorio_url:
                urlRelatorio

        })
        .eq(
            "chamado_id",
            numeroChamado
        );


if (erroFaturamento) {

    console.warn(
        "Relatório salvo no chamado, mas não foi possível atualizar o faturamento:",
        erroFaturamento
    );

}

    return urlRelatorio;
}

// FUNÇÃO PARA BUSCAR AS LOJAS NO SUPABASE
async function carregarLojas() {
    try {
        console.log("A procurar lojas no Supabase...");
        const { data, error } = await supabaseClient
            .from('lojas')
            .select('*');

        if (error) {
            console.error('Erro ao buscar lojas:', error.message);
            return;
        }

        if (data && data.length > 0) {
            // Guarda as lojas vindas do banco de dados
            db.lojas = data;
            console.log('Lojas carregadas com sucesso do Supabase:', db.lojas);
        } else {
            console.warn("A tabela 'lojas' retornou vazia do Supabase.");
        }

    } catch (err) {
        console.error('Erro inesperado ao carregar lojas:', err);
    }
}

// FUNÇÃO PARA ATUALIZAR AS FOTOS DO STORAGE COM BASE NA LOJA SELECIONADA
function atualizarFotosObrigatorias() {

    const selectLoja =
        document.getElementById('lojaSelect');


    if (
        !selectLoja ||
        !selectLoja.value
    ) {
        return;
    }


    const nomeLojaSelecionada =
        selectLoja.value;


    const dadosLoja =
        db.lojas.find(
            l =>
                String(l.LOJA).trim() ===
                String(nomeLojaSelecionada).trim()
        );


    if (dadosLoja) {

        fotosObrigatorias.fachada =
            dadosLoja['Foto Fachada'] || null;

        fotosObrigatorias.marquise =
            dadosLoja['Foto Marquise'] || null;


        console.log(
            "URLs das fotos carregadas para esta loja:",
            fotosObrigatorias
        );


        atualizarPreviewInterface(
            'fachada'
        );

        atualizarPreviewInterface(
            'marquise'
        );

    }

}

// FUNÇÃO PARA REDESENHAR A INTERFACE DOS CARDS DE FOTO (FIGURA 1 E 2)
// CORRIJA O NOME AQUI (Troque o 'c' pelo 'z')
function atualizarPreviewInterface(key) {
    const elementoPrev = document.getElementById(`prev-${key}`);
    if (elementoPrev) {
        if (fotosObrigatorias[key]) {
            // Se tem o link do Storage, mostra a imagem direto do Supabase
            elementoPrev.innerHTML = `<div class="delete-btn" onclick="removeObrigatoria('${key}')">×</div><img src="${fotosObrigatorias[key]}" class="w-full h-full object-cover rounded-xl">`;
        } else {
            // Se está NULL no banco, mantém o botão de upload manual ativo
            elementoPrev.innerHTML = `<input type="file" onchange="handleSingleUpload(this, '${key}')" class="absolute inset-0 opacity-0 cursor-pointer"><span class="text-[10px] opacity-40 font-bold uppercase">Figura ${key === 'fachada' ? '1' : '2'} – ${key}</span>`;
        }
    }
}

async function carregarPrestadoresDoBanco() {
    try {
        const { data, error } = await supabaseClient
            .from('prestadores')
            .select('nome, logo_url');

        if (error) throw error;

        const select = document.getElementById('prestador');
        if (data && data.length > 0) {
            select.innerHTML = data.map(p =>
                `<option value="${p.nome}" data-logo="${p.logo_url}">${p.nome}</option>`
            ).join('');

            // Ativa a logo do primeiro prestador da lista
            atualizarLogoAutomatica();
        }
    } catch (error) {
        console.error("Erro no Supabase:", error.message);
    }
}

function atualizarLogoAutomatica() {
    const select = document.getElementById('prestador');
    const opcao = select.options[select.selectedIndex];
    const url = opcao.getAttribute('data-logo');
    if (url) logos.prestador = url; // Define a logo para o PDF
}

if (localStorage.getItem('are_theme') === 'dark') document.documentElement.classList.add('dark');

// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
function renderDB() {
    console.log("Executando renderDB(). Status atual de db.lojas:", db.lojas);

    // Salva no localStorage para manter o cache local atualizado
    localStorage.setItem('are_lojas', JSON.stringify(db.lojas));

    const selectLoja = document.getElementById('lojaSelect');

    if (selectLoja) {
        if (db.lojas && db.lojas.length > 0) {
            // Popula o select mapeando a coluna LOJA de cada objeto do Supabase
selectLoja.innerHTML =
    db.lojas
        .map(loja => {

            const numero =
                String(
                    loja.LOJA ?? ""
                ).trim();

            const nome =
                String(
                    loja.NOME ?? ""
                ).trim();

            const uf =
                String(
                    loja.UF ?? ""
                ).trim();


            let texto =
                `#${numero}`;


            if (nome) {
                texto += ` - ${nome}`;
            }


            if (uf) {
                texto += ` - ${uf}`;
            }


            return `
                <option value="${numero}">
                    ${texto}
                </option>
            `;

        })
        .join("");

            console.log("Select de lojas populado com sucesso!");
        } else {
            selectLoja.innerHTML = `<option value="">Nenhuma loja carregada</option>`;
        }
    }

    // Atualiza a listagem visual na aba de configurações (se o elemento existir na tela)
    const storeListEl = document.getElementById('storeList');
    if (storeListEl && db.lojas && db.lojas.length > 0) {
        storeListEl.innerHTML = db.lojas.map((l, i) =>
            `<div class="flex justify-between p-3 glass rounded-xl text-xs font-medium"><span>${l.LOJA}</span><button onclick="db.lojas.splice(${i},1);renderDB()" class="text-red-500 font-bold">×</button></div>`
        ).join('');
    }

    // Dispara a função para buscar as fotos da primeira loja que ficou selecionada por padrão
    atualizarFotosObrigatorias();
}

function addStore() { const v = document.getElementById('newStore').value.toUpperCase(); if (v) { db.lojas.push(v); document.getElementById('newStore').value = ""; renderDB(); } }
function addProv() { const v = document.getElementById('newProv').value.toUpperCase(); if (v) { db.fornecedores.push(v); document.getElementById('newProv').value = ""; renderDB(); } }

// --- LOGICA DE IMAGENS ---
async function handleSingleUpload(input, key) {
    if (input.files[0]) {
        fotosObrigatorias[key] = await comprimirImagem(input.files[0]);
        document.getElementById(`prev-${key}`).innerHTML = `<div class="delete-btn" onclick="removeObrigatoria('${key}')">×</div><img src="${fotosObrigatorias[key]}" class="w-full h-full object-cover rounded-xl">`;
    }
}

async function handleFotosAnexo(input, anexoId, tipo) {
    const anexo = anexos.find(a => a.id === anexoId);
    for (const file of Array.from(input.files)) {
        const src = await comprimirImagem(file);
        anexo[`fotos${tipo}`].push({ src, desc: "" });
    }
    renderAnexos();
}

// COMPRESSÃO PARA NÃO TRAVAR O CELULAR
function comprimirImagem(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                r(canvas.toDataURL('image/jpeg', 0.7));
            }
        }
    });
}

function renderAnexos() {
    const cont = document.getElementById('anexosContainer');
    cont.innerHTML = "";
    anexos.forEach((anexo, idx) => {
        const div = document.createElement('div');
        div.className = "glass rounded-3xl p-6 mb-6 border-l-4 " + (idx % 2 === 0 ? "border-red-500" : "border-green-500");
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-[10px] font-black opacity-40 uppercase tracking-widest">${anexo.titulo}</h3>
                ${idx > 0 ? `<button onclick="removeAnexo(${anexo.id})" class="text-red-500 text-xs font-bold">EXCLUIR ANEXO</button>` : ''}
            </div>
            <textarea placeholder="Observação geral deste anexo..." onchange="updateAnexoObs(${anexo.id}, this.value)" class="w-full p-3 input-ios text-xs mb-4 h-16 resize-none">${anexo.obs}</textarea>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
<p class="text-[9px] font-black text-red-500 uppercase mb-2">Antes</p>
        <input type="file" multiple onchange="handleFotosAnexo(this, ${anexo.id}, 'Antes')" class="text-[10px] mb-3">
        <div class="grid grid-cols-2 gap-2">
            ${(anexo.fotosAntes || []).map((f, fi) => `
                <div class="relative">
                    <img src="${f.src}" class="w-full h-24 object-cover rounded-xl">
                    <textarea 
                        placeholder="Insira uma Descrição..." 
                        onchange="updateFotoDesc(${anexo.id}, ${fi}, 'Antes', this.value)" 
                        class="w-full mt-1 p-1 text-[8px] bg-white/20 rounded h-10 border-none resize-none"
                    >${f.desc || ""}</textarea>
                    <div class="delete-btn" onclick="removeFotoAnexo(${anexo.id}, ${fi}, 'Antes')">×</div>
                </div>
            `).join('')}
        </div>
    </div>

    <div>
        <p class="text-[9px] font-black text-green-500 uppercase mb-2">Depois</p>
        <input type="file" multiple onchange="handleFotosAnexo(this, ${anexo.id}, 'Depois')" class="text-[10px] mb-3">
        <div class="grid grid-cols-2 gap-2">
            ${(anexo.fotosDepois || []).map((f, fi) => `
                <div class="relative">
                    <img src="${f.src}" class="w-full h-24 object-cover rounded-xl">
                    <textarea 
                        placeholder="Insira uma Descrição..." 
                        onchange="updateFotoDesc(${anexo.id}, ${fi}, 'Depois', this.value)" 
                        class="w-full mt-1 p-1 text-[8px] bg-white/20 rounded h-10 border-none resize-none"
                    >${f.desc || ""}</textarea>
                    <div class="delete-btn" onclick="removeFotoAnexo(${anexo.id}, ${fi}, 'Depois')">×</div>
                </div>
            `).join('')}
        </div>
    </div>
</div>
</div>`;
        cont.appendChild(div);
    });
}

// --- FUNÇÕES DE AUXÍLIO ---

function addNovoAnexo() { anexos.push({ id: Date.now(), titulo: `ANEXO ${anexos.length + 1}`, obs: "", fotosAntes: [], fotosDepois: [] }); renderAnexos(); }
function removeAnexo(id) { if (anexos.length > 1) { anexos = anexos.filter(a => a.id !== id); renderAnexos(); } }
function updateAnexoObs(id, val) { const a = anexos.find(x => x.id === id); if (a) a.obs = val; }
function updateFotoDesc(id, fIdx, tipo, val) { const a = anexos.find(x => x.id === id); if (a) a[`fotos${tipo}`][fIdx].desc = val; }
function removeFotoAnexo(id, fIdx, tipo) { const a = anexos.find(x => x.id === id); a[`fotos${tipo}`].splice(fIdx, 1); renderAnexos(); }
function removeObrigatoria(key) { fotosObrigatorias[key] = null; document.getElementById(`prev-${key}`).innerHTML = `<input type="file" onchange="handleSingleUpload(this, '${key}')" class="absolute inset-0 opacity-0 cursor-pointer"><span class="text-[10px] opacity-40 font-bold uppercase">Figura ${key === 'fachada' ? '1' : '2'} – ${key}</span>`; }
async function saveLogo(input, key) { if (input.files[0]) logos[key] = await comprimirImagem(input.files[0]); }

// CALCULA SIMILARIDADE ENTRE DUAS DESCRIÇÕES (0 a 1)
function calcularSimilaridade(textoA, textoB) {
    if (!textoA || !textoB) return 0;
    const a = normalizarTexto(textoA);
    const b = normalizarTexto(textoB);

    if (a === b) return 1.0;
    if (a.length < 2 || b.length < 2) return 0.0;

    const getBigrams = (str) => {
        const bigrams = new Set();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };

    const setA = getBigrams(a);
    const setB = getBigrams(b);
    let intersection = 0;

    setA.forEach((token) => {
        if (setB.has(token)) intersection++;
    });

    return (2 * intersection) / (setA.size + setB.size);
}

// ============================================================================
// RELATÓRIOS - BUSCA INTELIGENTE DE CHAMADOS
// ============================================================================

function buscarChamadoRelatorio() {

    const input =
        document.getElementById("chamado");

    const container =
        document.getElementById("resultadosChamadoRelatorio");

    if (!input || !container) {
        return;
    }


    const termo =
        String(input.value || "")
            .trim()
            .toLowerCase();


    // ============================================================
    // BASE DE CHAMADOS
    // ============================================================

    const chamados =
        window.chamadosAlbetan || [];


    // Se ainda não digitou nada
    if (!termo) {

        container.classList.add("hidden");

        container.innerHTML = "";

        return;
    }


    // ============================================================
    // FILTRA
    // ============================================================

    const encontrados =
        chamados
            .filter(chamado => {

                const id =
                    chamado["ID"] ??
                    chamado["Id"] ??
                    chamado["id"] ??
                    chamado["Chamado"] ??
                    chamado["Número do Chamado"] ??
                    "";

                const loja =
                    chamado["Loja"] ??
                    chamado["loja"] ??
                    "";

                const servico =
                    chamado["Serviço"] ??
                    chamado["servico"] ??
                    "";

                return (

                    String(id)
                        .toLowerCase()
                        .includes(termo)

                    ||

                    String(loja)
                        .toLowerCase()
                        .includes(termo)

                    ||

                    String(servico)
                        .toLowerCase()
                        .includes(termo)

                );

            })
            .slice(0, 15);


    // ============================================================
    // NENHUM RESULTADO
    // ============================================================

    if (!encontrados.length) {

        container.innerHTML = `

            <div class="p-4 text-xs opacity-50">

                Nenhum chamado encontrado.

            </div>

        `;

        container.classList.remove("hidden");

        return;
    }


    // ============================================================
    // RESULTADOS
    // ============================================================

    container.innerHTML =
        encontrados
            .map((chamado, index) => {

                const id =
                    chamado["ID"] ??
                    chamado["Id"] ??
                    chamado["id"] ??
                    chamado["Chamado"] ??
                    chamado["Número do Chamado"] ??
                    "--";


                const loja =
                    chamado["Loja"] ??
                    chamado["loja"] ??
                    "--";


                const servico =
                    chamado["Serviço"] ??
                    chamado["servico"] ??
                    "Serviço não informado";


                const descricao =
                    chamado["Descrição"] ??
                    chamado["descricao"] ??
                    "";


                return `

                    <button
                        type="button"
                        onclick="selecionarChamadoRelatorio(${index})"
                        class="
                            block
                            w-full
                            text-left
                            p-4
                            border-b
                            border-black/5
                            dark:border-white/5
                            hover:bg-blue-500/10
                            transition
                        "
                    >

                        <div
                            class="
                                flex
                                items-center
                                justify-between
                                gap-3
                            "
                        >

                            <strong class="text-sm">

                                Chamado #${id}

                            </strong>


                            <span
                                class="
                                    text-[9px]
                                    font-bold
                                    px-2
                                    py-1
                                    rounded-full
                                    bg-blue-500/10
                                    text-blue-500
                                "
                            >

                                Loja ${loja}

                            </span>

                        </div>


                        <p
                            class="
                                text-[10px]
                                font-semibold
                                opacity-60
                                mt-1
                            "
                        >

                            ${servico}

                        </p>


                        <p
                            class="
                                text-[10px]
                                opacity-40
                                mt-1
                                truncate
                            "
                        >

                            ${descricao}

                        </p>

                    </button>

                `;

            })
            .join("");


    // Precisamos manter a lista filtrada
    window.resultadosRelatorioAtuais =
        encontrados;


    container.classList.remove("hidden");

}

// ============================================================================
// SELECIONAR CHAMADO PARA O RELATÓRIO
// ============================================================================

function selecionarChamadoRelatorio(index) {

    const chamado =
        window.resultadosRelatorioAtuais?.[index];


    if (!chamado) {
        return;
    }


    const numeroChamado =
        chamado["ID"] ??
        chamado["Id"] ??
        chamado["id"] ??
        chamado["Chamado"] ??
        chamado["Número do Chamado"] ??
        "";


    const lojaChamado =
        chamado["Loja"] ??
        chamado["loja"] ??
        "";


    // ============================================================
    // Nº DO CHAMADO
    // ============================================================

    const inputChamado =
        document.getElementById("chamado");


    if (inputChamado) {

        inputChamado.value =
            numeroChamado;

    }


    // ============================================================
    // LOJA AUTOMÁTICA
    // ============================================================

    selecionarLojaRelatorio(
        lojaChamado
    );


    // ============================================================
    // FECHA RESULTADOS
    // ============================================================

    const resultados =
        document.getElementById(
            "resultadosChamadoRelatorio"
        );


    if (resultados) {

        resultados.classList.add(
            "hidden"
        );

    }


    // ============================================================
    // GUARDA CHAMADO SELECIONADO
    // ============================================================

    window.chamadoRelatorioSelecionado =
        chamado;


    console.log(
        "Chamado selecionado para relatório:",
        chamado
    );

}

// ============================================================================
// SELECIONA A LOJA CORRESPONDENTE AO CHAMADO
// ============================================================================

function selecionarLojaRelatorio(lojaChamado) {

    const select =
        document.getElementById(
            "lojaSelect"
        );


    if (!select || !lojaChamado) {
        return;
    }


    const lojaProcurada =
        String(lojaChamado)
            .trim()
            .toLowerCase();


    // Tenta encontrar pelo VALUE ou pelo texto
    const opcao =
        Array.from(select.options)
            .find(option => {

                const valor =
                    String(option.value || "")
                        .trim()
                        .toLowerCase();

                const texto =
                    String(option.textContent || "")
                        .trim()
                        .toLowerCase();


                return (

                    valor === lojaProcurada

                    ||

                    texto === lojaProcurada

                    ||

                    valor.startsWith(
                        lojaProcurada + " "
                    )

                    ||

                    texto.startsWith(
                        lojaProcurada + " "
                    )

                );

            });


    if (!opcao) {

        console.warn(
            "Loja do chamado não encontrada no select:",
            lojaChamado
        );

        return;

    }


    select.value =
        opcao.value;


    // Atualiza Fachada / Marquise
    atualizarFotosObrigatorias();

}
// ============================================================
// INICIALIZAÇÃO DO MÓDULO DE RELATÓRIOS
// ============================================================

async function initRelatoriosModule() {

    try {

        console.log("Relatórios: iniciando módulo...");

        // Busca dados diretamente no Supabase
        await carregarPrestadoresDoBanco();
        await carregarLojas();

        // Monta selects e interface após os dados chegarem
        renderDB();
        renderAnexos();

        // Atualiza logo do prestador selecionado
        atualizarLogoAutomatica();

        // Atualiza fachada e marquise da loja selecionada
        atualizarFotosObrigatorias();

        console.log(
            "Relatórios carregados:",
            {
                lojas: db.lojas.length,
                prestadores: document.getElementById("prestador")?.options.length || 0
            }
        );

    } catch (error) {

        console.error(
            "Erro ao inicializar Relatórios:",
            error
        );

    }

}

