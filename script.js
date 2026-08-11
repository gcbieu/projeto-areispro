// --- CONFIGURAÇÃO SUPABASE ---
const _supabaseUrl = 'https://ujwfggunvzsonnsjuvpl.supabase.co';
const _supabaseKey = 'sb_publishable_hcM_2Z8eE_3sdJybZGz1HQ_rae8MIH7';

const supabaseClient = supabase.createClient(_supabaseUrl, _supabaseKey);

//--- BANCO DE DADOS LOJAS ---
let db = {
    lojas: [],
    prestadores: []
};

let anexos = [{ id: Date.now(), titulo: "ANEXO 1", obs: "", fotosAntes: [], fotosDepois: [] }];
let logos = { prestador: null, americanas: "https://ujwfggunvzsonnsjuvpl.supabase.co/storage/v1/object/public/logos-prestadores/americanas.png" };
let fotosObrigatorias = { fachada: null, marquise: null };
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

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('are_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
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
            selectLoja.innerHTML = db.lojas.map(l =>
                `<option value="${l.LOJA}">${l.LOJA}</option>`
            ).join('');

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
async function entrarNoSistema() {
    try {
        // 1. Altera as telas visíveis do App
        document.getElementById('welcomeView').classList.add('hidden-view');
        document.getElementById('appContainer').classList.remove('hidden-view');

        // 2. AGUARDA que os dados venham do Supabase antes de desenhar qualquer coisa no ecrã
        await carregarPrestadoresDoBanco();
        await carregarLojas(); // Aguarda a resposta das lojas

        // 3. Adiciona os ouvintes de evento nos Selects que agora já existem na tela
        document.getElementById('prestador').addEventListener('change', atualizarLogoAutomatica);
        document.getElementById('lojaSelect').addEventListener('change', atualizarFotosObrigatorias);

        // 4. Agora sim, com os dados prontos no objeto 'db', desenha na interface
        renderDB();
        renderAnexos();

        // 5. Abre a Home da plataforma. Relatórios agora é um módulo.
        navigate('home');
    } catch (err) {
        console.error("Erro ao iniciar sistema:", err);
    }
}

function navigate(view) {
    const views = {
        home: "homeView",
        main: "mainView",
        chamados: "chamadosView",
        os: "osView",
        converter: "converterView",
        cadastros: "cadastrosView",
        faturamento: "faturamentoView",

        lojas: "lojasView",
        prestadores: "prestadoresView",
        config: "configView"
    };

    // Esconde todas as telas
    Object.values(views).forEach((viewId) => {
        const elemento = document.getElementById(viewId);

        if (elemento) {
            elemento.classList.add("hidden-view");
        }
    });

    const destinoId = views[view];
    const destino = document.getElementById(destinoId);

    if (!destino) {
        console.error(`View não encontrada: ${view}`);
        return;
    }

    destino.classList.remove("hidden-view");

if (view === "cadastros") {
    abrirAbaCadastros("lojas");
    carregarLojasPrestadores();
}

if (view === "faturamento") {
    initFaturamentoModule();
}

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function toggleMenu() { document.getElementById('userMenu').classList.toggle('hidden'); }
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

// --- GERAÇÃO DE PDF ---
async function gerarRelatorio(modo = "final") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'cm', format: 'a4', compress: true });

    // Coleta de dados
    const pNome = document.getElementById('prestador').value;
    const lNome = document.getElementById('lojaSelect').value;
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

// ANIMAÇÃO DE TEXTO
const frases = ["PLATAFORMA AREISPRO", "GESTÃO DE NEGÓCIOS", "RELATÓRIOS TÉCNICOS", "CENTRAL DE CHAMADOS"];
let fIdx = 0;
setInterval(() => {
    const el = document.getElementById('changingText');
    if (el) { el.style.opacity = 0; setTimeout(() => { fIdx = (fIdx + 1) % frases.length; el.innerText = frases[fIdx]; el.style.opacity = 1; }, 500); }
}, 3000);

// ==========================================
// MÓDULO: CENTRAL DE CHAMADOS
// ==========================================

async function initChamadosModule() {
    await carregarChamadosDoBanco();
    renderizarMapaLojas();
}

async function carregarChamadosDoBanco() {
    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            chamadosAlbetan = data;
            renderizarChamados(chamadosAlbetan);
            atualizarDashboards(chamadosAlbetan);
        }
    } catch (err) {
        console.warn("Supabase tickets offline/vazio. Mantendo dados importados:", err.message);
        if (chamadosAlbetan.length > 0) {
            renderizarChamados(chamadosAlbetan);
            atualizarDashboards(chamadosAlbetan);
        }
    }
}


// ==========================================
// MEMÓRIA OPERACIONAL DE CHAMADOS
// ==========================================
function chamadoEstaFechadoInternamente(chamado) {
    const statusInterno = normalizarTexto(
        chamado?.["Status interno"] ?? chamado?.status_interno ?? chamado?.["Status"] ?? chamado?.status ?? ""
    );
    return statusInterno.includes('fechado') ||
        statusInterno.includes('encerrado') ||
        statusInterno.includes('fechar chamado');
}

async function buscarMemoriaChamadosFechados() {
    const { data, error } = await supabaseClient
        .from('chamados_historico')
        .select('payload_json,data_importacao')
        .order('data_importacao', { ascending: false });

    if (error) throw error;

    const memoria = new Map();
    for (const registro of data || []) {
        const chamado = registro.payload_json || {};
        const id = obterIdChamado(chamado);
        if (!id || memoria.has(id) || !chamadoEstaFechadoInternamente(chamado)) continue;
        memoria.set(id, { chamado, dataImportacao: registro.data_importacao });
    }
    return memoria;
}

async function aplicarMemoriaOperacional(chamadosNovos) {
    let memoria;
    try {
        memoria = await buscarMemoriaChamadosFechados();
    } catch (error) {
        console.warn('Não foi possível consultar a memória operacional:', error);
        return [];
    }

    const reincidentes = [];
    const agora = new Date();

    for (const novo of chamadosNovos) {
        const id = obterIdChamado(novo);
        const anterior = id ? memoria.get(id) : null;
        if (!anterior) continue;

        const fechado = anterior.chamado;
        const statusExterno = novo["Status"] ?? novo.status ?? novo["STATUS"] ?? 'Aberto';
        const chaveStatus = Object.keys(novo).find(k => normalizarTexto(k) === 'status') || 'Status';

        // Preserva o que veio da Americanas e mantém o tratamento interno já realizado.
        novo['Status Americanas'] = statusExterno;
        novo['Status interno'] = 'Fechado';
        novo['Status de envio'] = fechado['Status de envio'] || fechado.status_envio || 'Pendente de retorno';
        novo[chaveStatus] = 'Fechar Chamado';
        novo['Encerrado em'] = fechado['Encerrado em'] || fechado.encerrado_em || '';
        novo['data_encerramento_iso'] = fechado['data_encerramento_iso'] || fechado.data_encerramento_iso || '';
        novo['Encerrado por'] = fechado['Encerrado por'] || fechado.encerrado_por || 'Equipe AREISPRO';
        novo['Reincidente'] = true;
        novo['Reapareceu em'] = agora.toLocaleDateString('pt-BR');
        novo['reapareceu_em_iso'] = agora.toISOString();

        reincidentes.push(novo);
    }

    return reincidentes;
}

function mostrarPopupReincidentes(reincidentes) {
    if (!reincidentes?.length) return;

    document.getElementById('modalReincidentesImportacao')?.remove();

    const itens = reincidentes.map(chamado => {
        const id = obterIdChamado(chamado);
        const loja = chamado['Loja'] ?? chamado.loja ?? '--';
        const encerrado = chamado['Encerrado em'] || 'data não informada';
        return `
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div class="flex items-center justify-between gap-4">
                    <strong class="text-sm">Chamado #${id}</strong>
                    <span class="text-[10px] font-bold uppercase text-amber-600">Loja ${loja}</span>
                </div>
                <p class="mt-1 text-[10px] font-bold uppercase text-amber-600">fechado · aguardando retorno</p>
            </div>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'modalReincidentesImportacao';
    modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4';
    modal.innerHTML = `
        <div class="glass w-full max-w-2xl rounded-[32px] p-6 md:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div class="flex items-start justify-between gap-5 mb-5">
                <div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Chamados Duplicados</p>
                    <h2 class="mt-2 text-xl md:text-2xl font-bold">${reincidentes.length} chamado(s) já fechado(s)</h2>
                    <p class="mt-2 text-sm opacity-60">Chamados reabertos.</p>
                </div>
                <button type="button" data-fechar-reincidentes class="w-10 h-10 shrink-0 rounded-xl bg-black/5 dark:bg-white/10 text-xl">×</button>
            </div>
            <div class="space-y-3 overflow-y-auto pr-1">${itens}</div>
            <button type="button" data-fechar-reincidentes class="mt-6 w-full py-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-bold">
                Entendi, manter encerrados
            </button>
        </div>`;

    modal.querySelectorAll('[data-fechar-reincidentes]').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });
    document.body.appendChild(modal);
}

function processarExcelImportacao(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // Marcamos a callback como ASYNC para poder usar o await do Supabase lá dentro!
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (!rawData || rawData.length === 0) {
                alert("A planilha está vazia!");
                return;
            }

            // 1. FILTRAGEM RIGOROSA POR ALBETAN
            const chamadosAlbetan = rawData.filter(row => ehChamadoDoAlbetan(row));

            // 2. CONSULTA A MEMÓRIA PERMANENTE E MANTÉM FECHADOS OS CHAMADOS JÁ TRATADOS
            const reincidentes = await aplicarMemoriaOperacional(chamadosAlbetan);
            window.chamadosAlbetan = chamadosAlbetan;

            // 3. ATUALIZA A TELA COM O STATUS INTERNO PRESERVADO
            atualizarDashboards(chamadosAlbetan);
            renderizarChamados(chamadosAlbetan);
            renderizarMapaLojas();

            // 4. ENVIA PARA O SUPABASE (Torna a planilha atual e guarda histórico)
            await salvarNoSupabase(chamadosAlbetan);

            // 5. MOSTRA OS CHAMADOS QUE REAPARECERAM PARA EVITAR RETRABALHO
            mostrarPopupReincidentes(reincidentes);

            // 6. ALERTA DE SUCESSO
            const pendentesCount = chamadosAlbetan.filter(c => {
                const st = normalizarTexto(c["Status"] || c.status);
                return st.includes("pendente") || st.includes("aberto");
            }).length;

            alert(`Planilha importada com sucesso!\n\n` +
                `• Total: ${chamadosAlbetan.length}\n` +
                `• Pendentes: ${pendentesCount}\n` +
                `• Encerrados: ${chamadosAlbetan.length - pendentesCount}`);

        } catch (error) {
            console.error("Erro ao importar planilha:", error);
            alert("Erro ao processar a planilha.");
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsArrayBuffer(file);
}
// Roda automaticamente quando o usuário abre o sistema
document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaImportacaoDoBanco();
});

// Garanta que isso roda ao abrir/atualizar a página (F5)
document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaImportacaoDoBanco();
});

async function carregarUltimaImportacaoDoBanco() {
    try {
        if (typeof supabaseClient === 'undefined') {
            console.error("Cliente Supabase não está inicializado.");
            return;
        }

        console.log("Buscando dados no Supabase...");

        // Pega todos os registros marcados como atuais
        const { data, error } = await supabaseClient
            .from('chamados_historico')
            .select('payload_json')
            .eq('is_atual', true);

        if (error) {
            console.error("Erro Supabase ao ler:", error);
            return;
        }

        if (data && data.length > 0) {
            console.log(`Sucesso! ${data.length} registros carregados do Supabase.`);

            // Extrai a linha original de cada registro
            const chamadosSalvos = data.map(item => item.payload_json);

            // Atualiza a variável global e renderiza a tela
            window.chamadosAlbetan = chamadosSalvos;

            atualizarDashboards(window.chamadosAlbetan);
            renderizarChamados(window.chamadosAlbetan);
            renderizarMapaLojas();
        } else {
            console.log("Nenhum registro com is_atual = true foi encontrado no banco.");
        }

    } catch (err) {
        console.error("Falha ao inicializar dados do banco:", err);
    }
}

// --- 1. ATUALIZAÇÃO DO DASHBOARD (CARDS SUPERIORES) ---
// --- 1. ATUALIZAÇÃO DO DASHBOARD (CARDS SUPERIORES) ---
function atualizarDashboards(lista) {
    if (!lista) return;

    const baseGeral = window.chamadosAlbetan || [];
    const total = baseGeral.length;

    const pendentes = baseGeral.filter(i => {
        const st = normalizarTexto(i["Status"] || i.status);
        return st.includes("pendente") || st.includes("aberto");
    }).length;

    const fechados = baseGeral.filter(i => {
        const st = normalizarTexto(i["Status"] || i.status);
        return st.includes("encerrado") || st.includes("fechado") || st.includes("fechar");
    }).length;

    // Contagem de duplicados baseada EXCLUSIVAMENTE no número/ID do chamado
    const duplicados = baseGeral.filter(c => {
        const st = normalizarTexto(c["Status"] || c.status);
        if (st.includes('duplicado')) return true;

        const idAtual = normalizarTexto(c["ID"] || c.id);
        if (!idAtual) return false;

        return baseGeral.some(out => {
            if (out === c) return false; // Ignora o próprio item
            const outId = normalizarTexto(out["ID"] || out.id);
            return outId && outId === idAtual;
        });
    }).length;

    if (document.getElementById("dashTotal")) document.getElementById("dashTotal").innerText = total;
    if (document.getElementById("dashPendentes")) document.getElementById("dashPendentes").innerText = pendentes;
    if (document.getElementById("dashFechados")) document.getElementById("dashFechados").innerText = fechados;
    if (document.getElementById("dashDuplicados")) document.getElementById("dashDuplicados").innerText = duplicados;
}

// --- 2. FILTRAGEM UNIFICADA COM SPINNER/BOLINHA AZUL ---
function aplicarFiltrosEspecificos() {
    if (!window.chamadosAlbetan || window.chamadosAlbetan.length === 0) return;

    // Tenta capturar qualquer elemento de loader presente na página
    const loader = document.getElementById('loader') || document.getElementById('loading') || document.querySelector('.spinner');
    if (loader) loader.style.display = 'block';

    // requestAnimationFrame + setTimeout forçam o navegador a renderizar o loader na tela antes de executar a filtragem
    requestAnimationFrame(() => {
        setTimeout(() => {
            const inputLoja = document.getElementById('inputLojaAuto');
            const inputPesquisa = document.getElementById('inputPesquisaGeral') || document.getElementById('inputBuscaChamados');

            const termoLoja = normalizarTexto(inputLoja ? inputLoja.value : '');
            const termoGeral = normalizarTexto(inputPesquisa ? inputPesquisa.value : '');

            let dadosFiltrados = [...window.chamadosAlbetan];

            // A) FILTRO DE STATUS
            const statusTarget = estadoFiltroStatus !== 'todos' ? estadoFiltroStatus : window.filtroStatusAtivo;

            if (statusTarget && statusTarget !== 'todos') {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const st = normalizarTexto(c["Status"] || c.status || c["STATUS"]);

                    if (statusTarget === 'pendente' || statusTarget === 'pendentes') {
                        return st.includes('pendente') || st.includes('aberto');
                    }

                    if (statusTarget === 'fechado' || statusTarget === 'fechar_chamado') {
                        return st.includes('encerrado') || st.includes('fechado') || st.includes('fechar');
                    }

                    if (statusTarget === 'duplicado') {
                        // 1. Checa status 'duplicado' explícito
                        if (st.includes('duplicado')) return true;

                        // 2. Checa se o número (ID) do chamado se repete na base
                        const idAtual = normalizarTexto(c["ID"] || c.id);
                        if (!idAtual) return false;

                        return window.chamadosAlbetan.some(out => {
                            if (out === c) return false;
                            const outId = normalizarTexto(out["ID"] || out.id);
                            return outId && outId === idAtual;
                        });
                    }

                    return true;
                });
            }

            // B) FILTRO DE PERÍODO
            if (estadoFiltroPeriodo !== 'todos') {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                dadosFiltrados = dadosFiltrados.filter(c => {
                    const rawData = c["Data Abertura"] || c["Criado em"] || c["Data"] || c["DATA"] || c.data || c.data_abertura;
                    if (!rawData) return true;

                    const dataChamado = new Date(rawData);
                    if (isNaN(dataChamado.getTime())) return true;

                    dataChamado.setHours(0, 0, 0, 0);
                    const diffDias = Math.floor((hoje - dataChamado) / (1000 * 60 * 60 * 24));

                    if (estadoFiltroPeriodo === 'hoje') return diffDias === 0;
                    if (estadoFiltroPeriodo === '7dias') return diffDias <= 7 && diffDias >= 0;
                    if (estadoFiltroPeriodo === '30dias') return diffDias <= 30 && diffDias >= 0;

                    return true;
                });
            }

            // C) PESQUISA POR LOJA
            if (termoLoja) {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const lojaStr = normalizarTexto(c["Loja"] || c.loja);
                    return lojaStr.includes(termoLoja);
                });
            }

            // D) PESQUISA GERAL (TEXTO)
            if (termoGeral) {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const idStr = normalizarTexto(c["ID"] || c.id);
                    const servicoStr = normalizarTexto(c["Serviço"] || c.servico);
                    const descStr = normalizarTexto(c["Descrição"] || c.descricao);

                    return idStr.includes(termoGeral) || servicoStr.includes(termoGeral) || descStr.includes(termoGeral);
                });
            }

            // RENDERIZA RESULTADO (Se estiver vazio, o renderizarChamados oculta os cards e mostra o empty state)
            renderizarChamados(dadosFiltrados);

            // DESLIGA O SPINNER APÓS RENDERIZAR
            if (loader) loader.style.display = 'none';
        }, 80);
    });
}

// Sincroniza buscas por texto com o filtro geral
function aplicarFiltrosEBusca() {
    aplicarFiltrosEspecificos();
}

function setFiltroStatus(status) {
    estadoFiltroStatus = status;
    window.filtroStatusAtivo = status;

    // Atualiza estado visual dos chips/botões
    document.querySelectorAll('.btn-chip, .btn-filtro-status').forEach(btn => {
        const attrVal = btn.getAttribute('data-status') || btn.dataset.filtro;
        if (attrVal === status) {
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('bg-white/5', 'opacity-70');
        } else {
            btn.classList.remove('active', 'bg-blue-600', 'text-white');
            btn.classList.add('bg-white/5', 'opacity-70');
        }
    });

    aplicarFiltrosEspecificos();
}

// --- 2. FILTRAGEM UNIFICADA COM ANIMAÇÃO DA BOLINHA AZUL ---
function aplicarFiltrosEspecificos() {
    if (!window.chamadosAlbetan || window.chamadosAlbetan.length === 0) return;

    const loader = document.getElementById('loader') || document.getElementById('loading') || document.querySelector('.spinner');
    if (loader) loader.style.display = 'block';

    // Usamos requestAnimationFrame para garantir que o navegador desenhe a bolinha azul na tela ANTES de filtrar
    requestAnimationFrame(() => {
        setTimeout(() => {
            const inputLoja = document.getElementById('inputLojaAuto');
            const inputPesquisa = document.getElementById('inputPesquisaGeral') || document.getElementById('inputBuscaChamados');

            const termoLoja = normalizarTexto(inputLoja ? inputLoja.value : '');
            const termoGeral = normalizarTexto(inputPesquisa ? inputPesquisa.value : '');

            let dadosFiltrados = [...window.chamadosAlbetan];

            // A) FILTRO DE STATUS (Informa estadoFiltroStatus ou window.filtroStatusAtivo)
            const statusTarget = estadoFiltroStatus !== 'todos' ? estadoFiltroStatus : window.filtroStatusAtivo;

            if (statusTarget && statusTarget !== 'todos') {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const st = normalizarTexto(c["Status"] || c.status || c["STATUS"]);

                    if (statusTarget === 'pendente' || statusTarget === 'pendentes') {
                        return st.includes('pendente') || st.includes('aberto');
                    }

                    if (statusTarget === 'fechado' || statusTarget === 'fechar_chamado') {
                        return st.includes('encerrado') || st.includes('fechado') || st.includes('fechar');
                    }

                    if (statusTarget === 'duplicado') {
                        // 1. Checagem direta de status
                        if (st.includes('duplicado')) return true;

                        // 2. Checagem de ID ou Loja + Serviço idênticos
                        const idAtual = normalizarTexto(c["ID"] || c.id);
                        const lojaAtual = normalizarTexto(c["Loja"] || c.loja);
                        const servicoAtual = normalizarTexto(c["Serviço"] || c.servico);

                        return window.chamadosAlbetan.some(out => {
                            if (out === c) return false;
                            const outId = normalizarTexto(out["ID"] || out.id);
                            const outLoja = normalizarTexto(out["Loja"] || out.loja);
                            const outServico = normalizarTexto(out["Serviço"] || out.servico);

                            return (idAtual && idAtual === outId) || (lojaAtual && servicoAtual && lojaAtual === outLoja && servicoAtual === outServico);
                        });
                    }

                    return true;
                });
            }

            // B) FILTRO DE PERÍODO
            if (estadoFiltroPeriodo !== 'todos') {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                dadosFiltrados = dadosFiltrados.filter(c => {
                    const rawData = c["Data Abertura"] || c["Criado em"] || c["Data"] || c["DATA"] || c.data || c.data_abertura;
                    if (!rawData) return true;

                    const dataChamado = new Date(rawData);
                    if (isNaN(dataChamado.getTime())) return true;

                    dataChamado.setHours(0, 0, 0, 0);
                    const diffDias = Math.floor((hoje - dataChamado) / (1000 * 60 * 60 * 24));

                    if (estadoFiltroPeriodo === 'hoje') return diffDias === 0;
                    if (estadoFiltroPeriodo === '7dias') return diffDias <= 7 && diffDias >= 0;
                    if (estadoFiltroPeriodo === '30dias') return diffDias <= 30 && diffDias >= 0;

                    return true;
                });
            }

            // C) PESQUISA POR LOJA
            if (termoLoja) {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const lojaStr = normalizarTexto(c["Loja"] || c.loja);
                    return lojaStr.includes(termoLoja);
                });
            }

            // D) PESQUISA GERAL (TEXTO)
            if (termoGeral) {
                dadosFiltrados = dadosFiltrados.filter(c => {
                    const idStr = normalizarTexto(c["ID"] || c.id);
                    const servicoStr = normalizarTexto(c["Serviço"] || c.servico);
                    const descStr = normalizarTexto(c["Descrição"] || c.descricao);

                    return idStr.includes(termoGeral) || servicoStr.includes(termoGeral) || descStr.includes(termoGeral);
                });
            }

            // RENDERIZAR RESULTADO NA TELA
            renderizarChamados(dadosFiltrados);

            // OCULTAR SPINNER
            if (loader) loader.style.display = 'none';
        }, 100);
    });
}

// Sincroniza a busca de texto rápida com o motor principal
function aplicarFiltrosEBusca() {
    aplicarFiltrosEspecificos();
}

function setFiltroStatus(status) {
    estadoFiltroStatus = status;
    window.filtroStatusAtivo = status;

    // Atualiza estado visual dos chips/botões
    document.querySelectorAll('.btn-chip, .btn-filtro-status').forEach(btn => {
        const attrVal = btn.getAttribute('data-status') || btn.dataset.filtro;
        if (attrVal === status) {
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('bg-white/5', 'opacity-70');
        } else {
            btn.classList.remove('active', 'bg-blue-600', 'text-white');
            btn.classList.add('bg-white/5', 'opacity-70');
        }
    });

    aplicarFiltrosEspecificos();
}

// Variáveis de estado global para os filtros
let estadoFiltroStatus = 'todos';
let estadoFiltroPeriodo = 'todos';



function setFiltroPeriodo(periodo) {
    estadoFiltroPeriodo = periodo;

    // Atualiza o estado visual dos botões (chips)
    const container = document.getElementById('filterPeriodoChips');
    if (container) {
        container.querySelectorAll('.btn-chip').forEach(btn => {
            if (btn.getAttribute('data-periodo') === periodo) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    aplicarFiltrosEspecificos();
}

// Apelido para a busca por texto do input
function aplicarFiltrosChamados() {
    aplicarFiltrosEspecificos();
}

function renderizarChamados(lista) {
    const container = document.getElementById("listaChamadosContainer");
    const emptyState = document.getElementById("emptyStateChamados");

    if (!container) return;
    container.innerHTML = "";

    if (!lista || lista.length === 0) {
        if (emptyState) emptyState.classList.remove("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    lista.slice(0, 100).forEach(item => {
        const statusRaw = String(item["Status"] || "Pendente").trim();
        let badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";

        if (statusRaw.toLowerCase().includes("encerrado") || statusRaw.toLowerCase().includes("fechado")) {
            badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        } else if (statusRaw.toLowerCase().includes("duplicado")) {
            badgeColor = "bg-red-500/10 text-red-600 border-red-500/20";
        }

        // --- CHECAGEM DE SIMILARIDADE ---
        const lojaAtual = item["Loja"] || item.loja;
        const idAtual = item["ID"] || item.id;
        const descAtual = extrairDescricao(
            item["Descrição"] || item.descricao || ""
        );
        function extrairDescricao(texto) {
            if (!texto) return "";

            const match = texto.match(/Descrição\s*:\s*(.*)$/is);

            return match ? match[1].trim() : texto;
        }

        const chamadosMesmaLoja = (window.chamadosAlbetan || []).filter(c =>
            String(c["Loja"] || c.loja) === String(lojaAtual) &&
            String(c["ID"] || c.id) !== String(idAtual)
        );

        const temSimilar = chamadosMesmaLoja.some(c =>
            calcularSimilaridade(descAtual, c["Descrição"] || c.descricao || "") >= 0.6
        );

        const card = document.createElement("div");
        card.className = "glass rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-3 relative cursor-pointer hover:border-blue-500/40 transition-all";

        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-widest opacity-40">Loja ${item["Loja"] || "--"}</span>
                <div class="flex gap-2 items-center">
                    ${temSimilar ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30" title="Possível problema repetido!">⚠️ Problema Recorrente</span>` : ''}
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold border ${badgeColor}">
                        ${statusRaw}
                    </span>
                </div>
            </div>
            <div>
                <h4 class="text-base font-semibold">Chamado #${item["ID"] || "--"}</h4>
                <p class="text-xs font-medium opacity-60 mt-0.5">${item["Serviço"] || "Serviço não especificado"}</p>
            </div>
            <p class="text-xs opacity-70 line-clamp-2">
                ${descAtual || "Sem descrição."}
            </p>
            <div class="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 text-[10px] opacity-50 font-medium">
                <span>Criado: ${item["Criado em"] || "--"}</span>
                <span>Vencimento: ${item["Vencimento"] || "--"}</span>
            </div>
        `;

        // Evento de clique para abrir o Modal de Detalhes
        card.onclick = () => abrirModalDetalhesChamado(item);

        container.appendChild(card);
    });
}


function exportarPlanilhaAmericanas() {
    if (!chamadosAlbetan || chamadosAlbetan.length === 0) {
        alert("Nenhum chamado do Eng. Albetan carregado para exportar!");
        return;
    }

const dadosExportacao = chamadosAlbetan.map(item => ({
    "ID": item["ID"] || "",
    "Loja": item["Loja"] || "",
    "Serviço": item["Serviço"] || "",
    "Coordenador": item["Coordenador"] || "Márcio André",
    "Engenheiro": item["Engenheiro"] || "Albetan",
    "Criado em": item["Criado em"] || "",
    "Vencimento": item["Vencimento"] || "",
    "Status": item["Status"] || "",
    "Encerrado em": item["Encerrado em"] || "",
    "TMA (dias)": item["TMA (dias)"] !== undefined ? item["TMA (dias)"] : "",
    "Descrição": item["Descrição"] || "",
    "Link Relatório": item["Link Relatório"] || ""
}));
    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados Albetan");

    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
    XLSX.writeFile(workbook, `Retorno_Chamados_Albetan_${hoje}.xlsx`);
}

// ==========================================
// MÓDULO: MAPA INTERATIVO (SPRINT 4)
// ==========================================

const baseLojasOficial = {
    "1093": { nome: "SANTARÉM", uf: "PA", x: 18, y: 35 },
    "1113": { nome: "SHC RIO TAPAJOS", uf: "PA", x: 26, y: 38 },
    "1119": { nome: "ALTAMIRA", uf: "PA", x: 38, y: 45 },
    "1317": { nome: "ITAITUBA", uf: "PA", x: 12, y: 55 },
    "1448": { nome: "ALTAMIRA 2", uf: "PA", x: 44, y: 52 },
    "1527": { nome: "ALENQUER", uf: "PA", x: 20, y: 22 },
    "1558": { nome: "MEDICILÂNDIA", uf: "PA", x: 30, y: 50 },
    "1559": { nome: "URUARÁ", uf: "PA", x: 24, y: 58 },
    "5211": { nome: "MONTE ALEGRE EXPRESS", uf: "PA", x: 28, y: 28 },
    "5407": { nome: "RURÓPOLIS EXPRESS", uf: "PA", x: 18, y: 65 },
    "5411": { nome: "PARAISO SHOPPING CENTER EXPRESS", uf: "PA", x: 28, y: 38 },
    "1089": { nome: "BOA VISTA", uf: "RR", x: 15, y: 12 },
    "1137": { nome: "SHC RORAIMA GARDEN", uf: "RR", x: 25, y: 12 },
    "1161": { nome: "SHC PÁTIO RORAIMA", uf: "RR", x: 35, y: 12 },
    "1404": { nome: "PINTOLÂNDIA", uf: "RR", x: 45, y: 12 },
    "133": { nome: "SHC PARQUE BELEM", uf: "PA", x: 62, y: 28 },
    "368": { nome: "CASTANHAL", uf: "PA", x: 76, y: 28 },
    "421": { nome: "ICOARACI", uf: "PA", x: 58, y: 20 },
    "1068": { nome: "MARITUBA", uf: "PA", x: 68, y: 35 },
    "1143": { nome: "CAPANEMA", uf: "PA", x: 84, y: 28 },
    "1149": { nome: "SALINAS", uf: "PA", x: 88, y: 18 },
    "1227": { nome: "SHC BOSQUE GRAO PARA", uf: "PA", x: 60, y: 38 },
    "1261": { nome: "ANANINDEUA", uf: "PA", x: 70, y: 44 },
    "1270": { nome: "SHC CASTANHEIRA", uf: "PA", x: 64, y: 48 },
    "1333": { nome: "SHOPPING METRÓPOLE ANANINDEUA", uf: "PA", x: 72, y: 52 },
    "1378": { nome: "VIGIA DE NAZARÉ", uf: "PA", x: 68, y: 18 },
    "1402": { nome: "DISTRITO INDUSTRIAL", uf: "PA", x: 76, y: 58 },
    "1409": { nome: "BRAGANÇA", uf: "PA", x: 88, y: 28 },
    "1430": { nome: "BREVES", uf: "PA", x: 50, y: 30 },
    "1476": { nome: "SÃO MIGUEL DO GUAMÁ", uf: "PA", x: 82, y: 44 },
    "1522": { nome: "VISEU", uf: "PA", x: 92, y: 38 },
    "1548": { nome: "BENEVIDES", uf: "PA", x: 74, y: 36 },
    "1553": { nome: "PORTEL", uf: "PA", x: 48, y: 42 },
    "5186": { nome: "MARAMBAIA", uf: "PA", x: 62, y: 20 },
    "5243": { nome: "MÃE DO RIO EXPRESS", uf: "PA", x: 84, y: 54 },
    "5255": { nome: "SANTA IZABEL DO PARÁ EXPRESS", uf: "PA", x: 78, y: 32 }
};

function renderizarMapaLojas() {
    const mapaContainer = document.getElementById('mapaLojasContainer');
    if (!mapaContainer) return;

    mapaContainer.innerHTML = '';

    if (!chamadosAlbetan || chamadosAlbetan.length === 0) return;

    const resumoLojas = {};

    chamadosAlbetan.forEach(c => {
        const codigoLoja = String(c["Loja"] || c.loja || '').trim();
        if (!codigoLoja) return;

        if (!resumoLojas[codigoLoja]) {
            resumoLojas[codigoLoja] = { total: 0, pendentes: 0, duplicados: 0, fechadosHoje: 0, chamados: [] };
        }

        resumoLojas[codigoLoja].total++;
        const st = normalizarTexto(c["Status"] || c.status);

        if (st.includes('pendente') || st.includes('aberto')) {
            resumoLojas[codigoLoja].pendentes++;
        } else if (st.includes('duplicado')) {
            resumoLojas[codigoLoja].duplicados++;
        } else if (st.includes('encerrado') || st.includes('fechado')) {
            resumoLojas[codigoLoja].fechadosHoje++;
        }

        resumoLojas[codigoLoja].chamados.push(c);
    });

    Object.keys(resumoLojas).forEach((lojaCode, idx) => {
        const dados = resumoLojas[lojaCode];

        // Se quiser ocultar do mapa lojas que não têm NENHUM pendente, desatrapalhando a visão:
        // if (dados.pendentes === 0) return; 

        const infoCadastrada = baseLojasOficial[lojaCode] || {
            nome: `LOJA ${lojaCode}`, uf: 'PA', x: (10 + (idx * 12)) % 85, y: (15 + (idx * 14)) % 75
        };

        // Cor baseada rigorosamente nos Pendentes da loja
        let corClasse = "bg-emerald-500 shadow-emerald-500/30"; // 0 pendentes
        if (dados.pendentes >= 1 && dados.pendentes <= 3) corClasse = "bg-amber-400 shadow-amber-400/30";
        else if (dados.pendentes >= 4 && dados.pendentes <= 7) corClasse = "bg-orange-500 shadow-orange-500/30";
        else if (dados.pendentes > 7) corClasse = "bg-red-500 shadow-red-500/30";

        const tooltipPosicaoClasse = infoCadastrada.y < 30 ? "top-full mt-2" : "bottom-full mb-2";

        const pin = document.createElement('div');
        pin.className = "absolute cursor-pointer group transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-125 z-10 hover:z-50";
        pin.style.left = `${infoCadastrada.x}%`;
        pin.style.top = `${infoCadastrada.y}%`;

        pin.innerHTML = `
            <div class="flex flex-col items-center gap-0.5">
                <div class="w-7 h-7 rounded-full ${corClasse} text-white font-bold text-[10px] flex items-center justify-center shadow-md border-2 border-white dark:border-black">
                    ${dados.pendentes}
                </div>
                <span class="text-[8px] font-bold opacity-80 bg-black/40 text-white dark:bg-white/20 px-1.5 py-0.5 rounded-md backdrop-blur-sm whitespace-nowrap shadow-sm">
                    ${lojaCode}
                </span>
            </div>
            
            <div class="hidden group-hover:block absolute left-1/2 -translate-x-1/2 ${tooltipPosicaoClasse} w-52 glass p-3.5 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-[100] pointer-events-none">
                <p class="text-xs font-bold text-main">${infoCadastrada.nome} (${infoCadastrada.uf})</p>
                <p class="text-[10px] opacity-50 mb-2">Loja ${lojaCode}</p>
                <div class="space-y-1 text-[10px]">
                    <div class="flex justify-between text-amber-500 font-bold"><span>Pendentes:</span><b>${dados.pendentes}</b></div>
                    <div class="flex justify-between text-emerald-500"><span>Fechados:</span><b>${dados.fechadosHoje}</b></div>
                    <div class="flex justify-between opacity-60"><span>Total na Loja:</span><b>${dados.total}</b></div>
                </div>
            </div>
        `;

        pin.onclick = (e) => {
            e.stopPropagation();
            abrirHistoricoLoja(`${lojaCode} - ${infoCadastrada.nome}`, dados);
        };

        mapaContainer.appendChild(pin);
    });

    configurarDragAndZoom();
}

let mapaZoomNivel = 1;
let isDraggingMapa = false;
let startX, startY, translateX = 0, translateY = 0;

function aplicarZoomMapa(delta) {
    mapaZoomNivel = Math.max(0.8, Math.min(3, mapaZoomNivel + delta));
    atualizarTransformMapa();
}

function resetarZoomMapa() {
    mapaZoomNivel = 1;
    translateX = 0;
    translateY = 0;
    atualizarTransformMapa();
}

function atualizarTransformMapa() {
    const container = document.getElementById('mapaLojasContainer');
    if (container) {
        container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${mapaZoomNivel})`;
    }
}

function configurarDragAndZoom() {
    const viewport = document.getElementById('mapaViewport');
    if (!viewport) return;

    viewport.onmousedown = (e) => {
        isDraggingMapa = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    };

    window.onmousemove = (e) => {
        if (!isDraggingMapa) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        atualizarTransformMapa();
    };

    window.onmouseup = () => { isDraggingMapa = false; };

    viewport.onwheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        aplicarZoomMapa(delta);
    };
}
// Remove acentos, espaços extras e converte para minúsculo
function normalizarTexto(txt) {
    if (!txt) return "";
    return String(txt)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toLowerCase()
        .trim();
}

// Verifica se o texto da planilha bate com "Albetan" mesmo com sobrenome ou caixa alta/baixa
function ehChamadoDoAlbetan(linha) {
    // Procura a coluna de Engenheiro (aceita 'Engenheiro', 'ENGENHEIRO', 'Eng. Responsavel', etc.)
    const chaveEng = Object.keys(linha).find(k => normalizarTexto(k).includes("eng"));
    const valorEng = chaveEng ? normalizarTexto(linha[chaveEng]) : "";

    if (valorEng && valorEng.includes("albetan")) {
        return true;
    }

    // Varredura de fallback por toda a linha caso a coluna tenha outro nome
    return Object.values(linha).some(val => normalizarTexto(val).includes("albetan"));
}
function abrirHistoricoLoja(loja, dados) {
    const elTitulo = document.getElementById('modalLojaTitulo');
    if (elTitulo) elTitulo.innerText = `Loja ${loja}`;
    if (document.getElementById('modalLojaTotal')) document.getElementById('modalLojaTotal').innerText = dados.total;
    if (document.getElementById('modalLojaPendentes')) document.getElementById('modalLojaPendentes').innerText = dados.pendentes;
    if (document.getElementById('modalLojaFechados')) document.getElementById('modalLojaFechados').innerText = dados.fechadosHoje;

    const listaContainer = document.getElementById('modalLojaListaChamados');
    if (listaContainer) {
        listaContainer.innerHTML = dados.chamados.map(c => `
            <div class="p-4 glass rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                <div class="flex justify-between items-center text-[10px]">
                    <span class="font-bold opacity-40">#${c["ID"] || c.id} - ${c["Criado em"] || c.data || '--'}</span>
                    <span class="font-bold uppercase ${String(c["Status"] || c.status).toLowerCase().includes('encerrado') ? 'text-emerald-500' : 'text-amber-500'}">
                        ● ${c["Status"] || c.status}
                    </span>
                </div>
                <p class="text-xs font-semibold">${c["Serviço"] || c.tipo || 'Serviço'}</p>
                <p class="text-[11px] opacity-60 leading-tight">${c["Descrição"] || c.descricao || ''}</p>
            </div>
        `).join('');
    }

    document.getElementById('modalHistoricoLoja')?.classList.remove('hidden');
}

function fecharModalHistorico() {
    document.getElementById('modalHistoricoLoja')?.classList.add('hidden');
}
async function salvarNoSupabase(chamadosFiltrados) {
    try {
        // 1. Marca todas as importações anteriores como antigas (is_atual = false)
        const { error: updateError } = await supabaseClient
            .from('chamados_historico')
            .update({ is_atual: false })
            .eq('is_atual', true);

        if (updateError) throw updateError;

        // 2. Prepara os novos dados marcando como atuais
        const dataHoje = new Date().toISOString();
        const registrosParaInserir = chamadosFiltrados.map(linha => {
            const chaveEng = Object.keys(linha).find(k => k.toLowerCase().includes('eng')) || 'Engenheiro';
            const chaveLoja = Object.keys(linha).find(k => k.toLowerCase().includes('loja')) || 'Loja';
            const chaveStatus = Object.keys(linha).find(k => k.toLowerCase().includes('status')) || 'Status';

            return {
                data_importacao: dataHoje,
                is_atual: true,
                engenheiro: linha[chaveEng] || '',
                loja: String(linha[chaveLoja] || '').trim(),
                status: linha[chaveStatus] || '',
                payload_json: linha // guarda os outros campos intactos
            };
        });

        // 3. Insere a nova planilha em lotes de 500 para não estourar o limite da API
        const TAMANHO_LOTE = 500;
        for (let i = 0; i < registrosParaInserir.length; i += TAMANHO_LOTE) {
            const lote = registrosParaInserir.slice(i, i + TAMANHO_LOTE);
            const { error: insertError } = await supabaseClient
                .from('chamados_historico')
                .insert(lote);

            if (insertError) throw insertError;
        }

        console.log("Sucesso ao sincronizar com o Supabase!");

    } catch (err) {
        console.error("Erro ao salvar no Supabase:", err);
        alert("Aviso: Os dados foram exibidos na tela, mas houve uma falha ao salvar o histórico no banco.");
    }
}
// --- MODAL DE DETALHES DO CHAMADO ---
let chamadoAtivoModal = null;

async function abrirModalDetalhesChamado(chamado) {
    chamadoAtivoModal = chamado;
    const id = chamado["ID"] || chamado.id;
    const loja = chamado["Loja"] || chamado.loja;

    // Preenche os dados básicos no Modal
    document.getElementById("modalChamadoId").innerText = id;
    document.getElementById("modalChamadoLoja").innerText = `Loja ${loja}`;
    document.getElementById("modalChamadoDesc").innerText = chamado["Descrição"] || chamado.descricao || "Sem descrição.";

    // Busca comentários gravados no Supabase
    await carregarComentariosModal(id);

    // Exibe o modal
    document.getElementById("modalDetalhesChamado")?.classList.remove("hidden");
}

// ============================================================================
// ABRIR RELATÓRIO DIRETO PELO CHAMADO
// ============================================================================

function abrirRelatorioDoChamadoAtivo() {

    if (!chamadoAtivoModal) {

        alert(
            "Nenhum chamado selecionado."
        );

        return;
    }


    // Guarda antes de fechar o modal
    const chamado =
        chamadoAtivoModal;


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


    // Fecha modal
    fecharModalDetalhesChamado();


    // ============================================================
    // ABRE RELATÓRIOS
    // ============================================================

    navigate("main");


    // ============================================================
    // PREENCHE Nº DO CHAMADO
    // ============================================================

    const inputChamado =
        document.getElementById(
            "chamado"
        );


    if (inputChamado) {

        inputChamado.value =
            numeroChamado;

    }


    // ============================================================
    // PREENCHE LOJA
    // ============================================================

    selecionarLojaRelatorio(
        lojaChamado
    );


    // Guarda referência
    window.chamadoRelatorioSelecionado =
        chamado;


    // Sobe para o começo do módulo
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    console.log(
        `Relatório aberto para chamado #${numeroChamado}`
    );

}

// ==========================================
// ABRIR OS DIRETO PELO DETALHE DO CHAMADO
// ==========================================
function abrirOSDoChamadoAtivo() {

    if (!chamadoAtivoModal) {
        alert("Nenhum chamado selecionado.");
        return;
    }

    // Guarda o chamado antes de fechar o modal,
    // porque fecharModalDetalhesChamado()
    // limpa a variável chamadoAtivoModal.
    const chamado = chamadoAtivoModal;

    // Fecha o modal da Central de Chamados
    fecharModalDetalhesChamado();

    // Abre o módulo de Ordens de Serviço
    navigate("os");

    // Coloca o chamado atual como resultado da busca da OS.
    // Assim podemos reaproveitar osSelecionarChamado()
    window.osResultadosAtuais = [chamado];

    // Seleciona automaticamente o chamado
    // e monta a OS com os dados dele.
    osSelecionarChamado(0);
}

function fecharModalDetalhesChamado() {
    document.getElementById("modalDetalhesChamado")?.classList.add("hidden");
    chamadoAtivoModal = null;
}

async function carregarComentariosModal(chamadoId) {
    const cont = document.getElementById("modalComentariosLista");
    if (!cont) return;
    cont.innerHTML = "<p class='text-[10px] opacity-40'>Carregando notas...</p>";

    try {
        const { data, error } = await supabaseClient
            .from('chamados_comentarios')
            .select('*')
            .eq('chamado_id', String(chamadoId))
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            cont.innerHTML = data.map(c => `
                <div class="text-xs bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                    <div class="flex justify-between font-semibold opacity-70 mb-1 text-[10px]">
                        <span>${c.autor || 'Operador'}</span>
                        <span>${new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p class="opacity-80">${c.texto}</p>
                </div>
            `).join('');
        } else {
            cont.innerHTML = "<p class='text-[10px] opacity-40 italic'>Nenhuma nota registrada.</p>";
        }
    } catch (err) {
        cont.innerHTML = "<p class='text-[10px] text-red-400'>Erro ao carregar observações.</p>";
    }
}

async function adicionarComentarioModal() {
    const input = document.getElementById("inputNovoComentario");
    const texto = input?.value.trim();
    if (!texto || !chamadoAtivoModal) return;

    const chamadoId = String(chamadoAtivoModal["ID"] || chamadoAtivoModal.id);

    try {
        const { error } = await supabaseClient
            .from('chamados_comentarios')
            .insert([{ chamado_id: chamadoId, autor: 'ADM', texto }]);

        if (error) throw error;

        input.value = "";
        await carregarComentariosModal(chamadoId);
    } catch (err) {
        alert("Erro ao salvar nota interna.");
    }
}

// 1. ATUALIZE A FUNÇÃO DE ABRIR O MODAL PARA CONTROLAR A VISIBILIDADE DOS BOTÕES
async function abrirModalDetalhesChamado(chamado) {
    chamadoAtivoModal = chamado;
    const id = chamado["ID"] || chamado.id;
    const loja = chamado["Loja"] || chamado.loja;
    const chaveStatus = Object.keys(chamado).find(k => k.toLowerCase() === 'status') || "Status";
    const statusAtual = String(chamado[chaveStatus] || "Pendente").trim();

    // Preenche dados básicos
    document.getElementById("modalChamadoId").innerText = id;
    document.getElementById("modalChamadoLoja").innerText = `Loja ${loja}`;
    document.getElementById("modalChamadoDesc").innerText = chamado["Descrição"] || chamado.descricao || "Sem descrição.";

    // Atualiza o Badge de Status
    const badge = document.getElementById("modalStatusBadge");
    if (badge) {
        badge.innerText = statusAtual;
        badge.className = statusAtual === "Fechar Chamado"
            ? "text-[10px] font-bold px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : "text-[10px] font-bold px-3 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30";
    }

    // Alterna os botões conforme o status atual
    const btnFechar = document.getElementById("btnFecharChamado");
    const btnReverter = document.getElementById("btnReverterChamado");

    if (statusAtual === "Fechar Chamado") {
        if (btnFechar) btnFechar.classList.add("hidden");
        if (btnReverter) btnReverter.classList.remove("hidden");
    } else {
        if (btnFechar) btnFechar.classList.remove("hidden");
        if (btnReverter) btnReverter.classList.add("hidden");
    }

    await carregarComentariosModal(id);
    document.getElementById("modalDetalhesChamado")?.classList.remove("hidden");
}

// VARIÁVEL GLOBAL PARA RETER O FILTRO DE STATUS SELECIONADO
window.filtroStatusAtivo = "todos"; // Opções: 'todos', 'pendentes', 'fechados_7dias', 'fechar_chamado'

// ALTERA O FILTRO DE STATUS SELECIONADO
function setFiltroStatus(tipoFiltro) {
    window.filtroStatusAtivo = tipoFiltro;

    // Atualiza o estilo visual dos botões de filtro se existirem
    document.querySelectorAll(".btn-filtro-status").forEach(btn => {
        if (btn.dataset.filtro === tipoFiltro) {
            btn.classList.add("bg-blue-600", "text-white");
            btn.classList.remove("bg-white/5", "opacity-70");
        } else {
            btn.classList.remove("bg-blue-600", "text-white");
            btn.classList.add("bg-white/5", "opacity-70");
        }
    });

    aplicarFiltrosEBusca();
}

// INICIALIZADOR DE EVENTOS (EXECUTAR NO WINDOW.ONLOAD OU APÓS CARREGAR A PÁGINA)
function inicializarEventosFiltroEBusca() {
    const inputBusca = document.getElementById("inputBuscaChamados") || document.getElementById("inputSearch");

    if (inputBusca) {
        // 'input' é disparado a cada letra digitada ou apagada
        inputBusca.addEventListener("input", () => {
            aplicarFiltrosEBusca();
        });
    }
}

// Registra os ouvintes assim que o DOM carregar
document.addEventListener("DOMContentLoaded", inicializarEventosFiltroEBusca);

// 2. FECHAR CHAMADO COM CONFIRMAÇÃO DE SEGURANÇA
// ENCERRA O CHAMADO E ATUALIZA A TELA IMEDIATAMENTE
async function encerrarChamadoAtivo() {
    if (!chamadoAtivoModal) return;

    const idAtivo = String(chamadoAtivoModal["ID"] || chamadoAtivoModal.id);

    const confirmou = confirm(`Tem certeza que deseja marcar o chamado #${idAtivo} como "Fechar Chamado"?`);
    if (!confirmou) return;

    const chaveStatus = Object.keys(chamadoAtivoModal).find(k => k.toLowerCase() === 'status') || "Status";

    // ISO String / Data padrão para garantir que o filtro de datas consiga comparar depois
    const hojeIso = new Date().toISOString();
    const hojePt = new Date().toLocaleDateString('pt-BR');

    // Altera no objeto do modal
    chamadoAtivoModal[chaveStatus] = "Fechar Chamado";
    chamadoAtivoModal["Encerrado em"] = hojePt;
    chamadoAtivoModal["data_encerramento_iso"] = hojeIso;

    // Altera no array global
    const itemGlobal = (window.chamadosAlbetan || []).find(c => String(c["ID"] || c.id) === idAtivo);
    if (itemGlobal) {
        itemGlobal[chaveStatus] = "Fechar Chamado";
        itemGlobal["Encerrado em"] = hojePt;
        itemGlobal["data_encerramento_iso"] = hojeIso;
    }

    // Registra nota interna
    try {
        await supabaseClient
            .from('chamados_comentarios')
            .insert([{
                chamado_id: idAtivo,
                autor: 'Gabriel',
                texto: 'Status alterado para "Fechar Chamado".'
            }]);
    } catch (err) {
        console.warn("Erro ao registrar no Supabase:", err);
    }

    // Re-renderiza o painel geral, cards e mapa
    aplicarFiltrosEBusca();
    if (typeof atualizarDashboards === "function") atualizarDashboards(window.chamadosAlbetan);
    if (typeof renderizarMapaLojas === "function") renderizarMapaLojas();

    fecharModalDetalhesChamado();
}

// REVERTE O STATUS DE VOLTA PARA PENDENTE
async function reverterStatusChamado() {
    if (!chamadoAtivoModal) return;

    const idAtivo = String(chamadoAtivoModal["ID"] || chamadoAtivoModal.id);

    const confirmou = confirm(`Deseja reverter o chamado #${idAtivo} de volta para "Pendente"?`);
    if (!confirmou) return;

    const chaveStatus = Object.keys(chamadoAtivoModal).find(k => k.toLowerCase() === 'status') || "Status";

    chamadoAtivoModal[chaveStatus] = "Pendente";
    delete chamadoAtivoModal["Encerrado em"];
    delete chamadoAtivoModal["data_encerramento_iso"];

    const itemGlobal = (window.chamadosAlbetan || []).find(c => String(c["ID"] || c.id) === idAtivo);
    if (itemGlobal) {
        itemGlobal[chaveStatus] = "Pendente";
        delete itemGlobal["Encerrado em"];
        delete itemGlobal["data_encerramento_iso"];
    }

    try {
        await supabaseClient
            .from('chamados_comentarios')
            .insert([{
                chamado_id: idAtivo,
                autor: 'Gabriel',
                texto: 'Reversão: Chamado restaurado para "Pendente".'
            }]);
    } catch (err) {
        console.warn("Erro ao registrar no Supabase:", err);
    }

    aplicarFiltrosEBusca();
    if (typeof atualizarDashboards === "function") atualizarDashboards(window.chamadosAlbetan);
    if (typeof renderizarMapaLojas === "function") renderizarMapaLojas();

    fecharModalDetalhesChamado();
}
// ==========================================
// CORREÇÕES SPRINT 7.1 — FILTROS, BUSCA, DUPLICADOS E PERSISTÊNCIA
// ==========================================

function obterIdChamado(chamado) {
    return normalizarTexto(
        chamado?.["ID"] ?? chamado?.id ?? chamado?.["Número do Chamado"] ?? chamado?.numero_chamado ?? ""
    );
}

function obterStatusChamado(chamado) {
    return normalizarTexto(chamado?.["Status"] ?? chamado?.status ?? chamado?.["STATUS"] ?? "pendente");
}

function construirContagemIds(lista = []) {
    return lista.reduce((acc, item) => {
        const id = obterIdChamado(item);
        if (id) acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});
}

function chamadoEhDuplicado(chamado, lista = window.chamadosAlbetan || []) {
    const id = obterIdChamado(chamado);
    if (!id) return false;
    const contagem = construirContagemIds(lista);
    return contagem[id] > 1;
}

function atualizarEstadoVisualFiltros() {
    document.querySelectorAll('#filterStatusChips .btn-chip').forEach(btn => {
        const ativo = btn.dataset.status === estadoFiltroStatus;
        btn.classList.toggle('active', ativo);
    });

    document.querySelectorAll('#filterPeriodoChips .btn-chip').forEach(btn => {
        const ativo = btn.dataset.periodo === estadoFiltroPeriodo;
        btn.classList.toggle('active', ativo);
    });
}

function setFiltroStatus(status) {
    estadoFiltroStatus = status || 'todos';
    window.filtroStatusAtivo = estadoFiltroStatus;
    atualizarEstadoVisualFiltros();
    aplicarFiltrosEspecificos();
}

function setFiltroPeriodo(periodo) {
    estadoFiltroPeriodo = periodo || 'todos';
    atualizarEstadoVisualFiltros();
    aplicarFiltrosEspecificos();
}

function filtrarAutoCompleteLojas(valor) {
    const lista = document.getElementById('autocompleteList');
    const termo = normalizarTexto(valor || '');
    const chamados = window.chamadosAlbetan || [];

    // A busca por loja acontece enquanto o usuário digita.
    aplicarFiltrosEspecificos();

    if (!lista || !termo) {
        lista?.classList.add('hidden');
        if (lista) lista.innerHTML = '';
        return;
    }

    const lojas = [...new Set(chamados
        .map(c => String(c["Loja"] ?? c.loja ?? '').trim())
        .filter(Boolean))]
        .filter(loja => normalizarTexto(loja).includes(termo))
        .slice(0, 10);

    if (!lojas.length) {
        lista.classList.add('hidden');
        lista.innerHTML = '';
        return;
    }

    lista.innerHTML = lojas.map(loja => `
        <button type="button" class="w-full text-left px-4 py-3 text-xs hover:bg-blue-500/10" data-loja="${loja}">
            Loja ${loja}
        </button>
    `).join('');

    lista.querySelectorAll('[data-loja]').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('inputLojaAuto');
            if (input) input.value = btn.dataset.loja;
            lista.classList.add('hidden');
            aplicarFiltrosEspecificos();
        });
    });

    lista.classList.remove('hidden');
}

function aplicarFiltrosEspecificos() {
    const base = window.chamadosAlbetan || [];
    const container = document.getElementById('listaChamadosContainer');
    const emptyState = document.getElementById('emptyStateChamados');

    if (!base.length) {
        if (container) container.innerHTML = '';
        emptyState?.classList.remove('hidden');
        atualizarEstadoVisualFiltros();
        return;
    }

    const inputLoja = document.getElementById('inputLojaAuto');
    const inputPesquisa = document.getElementById('inputPesquisaGeral') || document.getElementById('inputBuscaChamados');
    const termoLoja = normalizarTexto(inputLoja?.value || '');
    const termoGeral = normalizarTexto(inputPesquisa?.value || '');
    const contagemIds = construirContagemIds(base);

    let dados = [...base];

    if (estadoFiltroStatus === 'pendente') {
        dados = dados.filter(c => {
            const st = obterStatusChamado(c);
            return st.includes('pendente') || st.includes('aberto');
        });
    } else if (estadoFiltroStatus === 'fechado') {
        dados = dados.filter(c => {
            const st = obterStatusChamado(c);
            return st.includes('encerrado') || st.includes('fechado') || st.includes('fechar chamado');
        });
    } else if (estadoFiltroStatus === 'duplicado') {
        // Duplicidade exclusivamente por número/ID idêntico.
        dados = dados.filter(c => {
            const id = obterIdChamado(c);
            return Boolean(id && contagemIds[id] > 1);
        });
    }

    if (estadoFiltroPeriodo !== 'todos') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dados = dados.filter(c => {
            const raw = c["Data Abertura"] || c["Criado em"] || c["Data"] || c.data || c.data_abertura;
            if (!raw) return false;
            const data = new Date(raw);
            if (Number.isNaN(data.getTime())) return false;
            data.setHours(0, 0, 0, 0);
            const dias = Math.floor((hoje - data) / 86400000);
            if (estadoFiltroPeriodo === 'hoje') return dias === 0;
            if (estadoFiltroPeriodo === '7dias') return dias >= 0 && dias <= 7;
            if (estadoFiltroPeriodo === '30dias') return dias >= 0 && dias <= 30;
            return true;
        });
    }

    if (termoLoja) {
        dados = dados.filter(c => normalizarTexto(c["Loja"] ?? c.loja ?? '').includes(termoLoja));
    }

    if (termoGeral) {
        dados = dados.filter(c => {
            const campos = [
                c["ID"], c.id, c["Número do Chamado"], c.numero_chamado,
                c["Loja"], c.loja,
                c["Serviço"], c.servico,
                c["Descrição"], c.descricao
            ];
            return campos.some(valor => normalizarTexto(valor ?? '').includes(termoGeral));
        });
    }

    atualizarEstadoVisualFiltros();
    renderizarChamados(dados);
}

function aplicarFiltrosChamados() {
    aplicarFiltrosEspecificos();
}

function aplicarFiltrosEBusca() {
    aplicarFiltrosEspecificos();
}

function atualizarDashboards(lista) {
    const base = window.chamadosAlbetan || lista || [];
    const contagemIds = construirContagemIds(base);

    const total = base.length;
    const pendentes = base.filter(c => {
        const st = obterStatusChamado(c);
        return st.includes('pendente') || st.includes('aberto');
    }).length;
    const fechados = base.filter(c => {
        const st = obterStatusChamado(c);
        return st.includes('encerrado') || st.includes('fechado') || st.includes('fechar chamado');
    }).length;
    const duplicados = base.filter(c => {
        const id = obterIdChamado(c);
        return Boolean(id && contagemIds[id] > 1);
    }).length;

    const valores = { dashTotal: total, dashPendentes: pendentes, dashFechados: fechados, dashDuplicados: duplicados };
    Object.entries(valores).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = valor;
    });
}

async function persistirAlteracaoChamado(chamado) {
    const idChamado = obterIdChamado(chamado);
    if (!idChamado) throw new Error('Chamado sem ID não pode ser persistido.');

    // Atualiza o registro atual armazenado como JSON no histórico.
    const { data: historicos, error: selectError } = await supabaseClient
        .from('chamados_historico')
        .select('id,payload_json')
        .eq('is_atual', true);

    if (selectError) throw selectError;

    const registro = (historicos || []).find(row => obterIdChamado(row.payload_json || {}) === idChamado);
    if (!registro) throw new Error(`Registro atual do chamado ${idChamado} não encontrado no histórico.`);

    const { error: updateError } = await supabaseClient
        .from('chamados_historico')
        .update({
            payload_json: chamado,
            status: chamado["Status"] ?? chamado.status ?? ''
        })
        .eq('id', registro.id);

    if (updateError) throw updateError;
}

async function encerrarChamadoAtivo() {
    if (!chamadoAtivoModal) return;

    const idAtivo = obterIdChamado(chamadoAtivoModal);
    if (!confirm(`Tem certeza que deseja marcar o chamado #${idAtivo} como fechado?`)) return;

    const chaveStatus = Object.keys(chamadoAtivoModal).find(k => normalizarTexto(k) === 'status') || 'Status';
    const hoje = new Date();

    const statusExternoAtual = chamadoAtivoModal['Status Americanas'] || chamadoAtivoModal[chaveStatus] || 'Aberto';
    chamadoAtivoModal['Status Americanas'] = statusExternoAtual;
    chamadoAtivoModal['Status interno'] = 'Fechado';
    chamadoAtivoModal['Status de envio'] = 'Pendente de retorno';
    chamadoAtivoModal['Encerrado por'] = 'Gabriel';
    chamadoAtivoModal[chaveStatus] = 'Fechar Chamado';
    chamadoAtivoModal['Encerrado em'] = hoje.toLocaleDateString('pt-BR');
    chamadoAtivoModal['data_encerramento_iso'] = hoje.toISOString();

    // O find por ID mantém a mesma referência do array global.
    const itemGlobal = (window.chamadosAlbetan || []).find(c => obterIdChamado(c) === idAtivo);
    if (itemGlobal && itemGlobal !== chamadoAtivoModal) Object.assign(itemGlobal, chamadoAtivoModal);

    try {
        await persistirAlteracaoChamado(itemGlobal || chamadoAtivoModal);
        await supabaseClient.from('chamados_comentarios').insert([{
            chamado_id: idAtivo,
            autor: 'Gabriel',
            texto: 'Status alterado para "Fechar Chamado".'
        }]);
    } catch (err) {
        console.error('Erro ao persistir fechamento:', err);
        alert('O chamado foi atualizado na tela, mas não foi salvo no banco. Verifique as permissões da tabela chamados_historico.');
    }

    atualizarDashboards(window.chamadosAlbetan);
    aplicarFiltrosEspecificos();
    renderizarMapaLojas();
    fecharModalDetalhesChamado();
}

async function reverterStatusChamado() {
    if (!chamadoAtivoModal) return;

    const idAtivo = obterIdChamado(chamadoAtivoModal);
    if (!confirm(`Deseja reverter o chamado #${idAtivo} para pendente?`)) return;

    const chaveStatus = Object.keys(chamadoAtivoModal).find(k => normalizarTexto(k) === 'status') || 'Status';
    chamadoAtivoModal[chaveStatus] = 'Pendente';
    chamadoAtivoModal['Status interno'] = 'Pendente';
    chamadoAtivoModal['Status de envio'] = 'Não aplicável';
    delete chamadoAtivoModal['Encerrado em'];
    delete chamadoAtivoModal['data_encerramento_iso'];
    delete chamadoAtivoModal['Encerrado por'];
    delete chamadoAtivoModal['Reincidente'];
    delete chamadoAtivoModal['Reapareceu em'];
    delete chamadoAtivoModal['reapareceu_em_iso'];

    const itemGlobal = (window.chamadosAlbetan || []).find(c => obterIdChamado(c) === idAtivo);
    if (itemGlobal && itemGlobal !== chamadoAtivoModal) Object.assign(itemGlobal, chamadoAtivoModal);

    try {
        await persistirAlteracaoChamado(itemGlobal || chamadoAtivoModal);
        await supabaseClient.from('chamados_comentarios').insert([{
            chamado_id: idAtivo,
            autor: 'Gabriel',
            texto: 'Chamado revertido para "Pendente".'
        }]);
    } catch (err) {
        console.error('Erro ao persistir reversão:', err);
        alert('A reversão apareceu na tela, mas não foi salva no banco. Verifique as permissões da tabela chamados_historico.');
    }

    atualizarDashboards(window.chamadosAlbetan);
    aplicarFiltrosEspecificos();
    renderizarMapaLojas();
    fecharModalDetalhesChamado();
}

document.addEventListener('DOMContentLoaded', () => {
    const buscaGeral = document.getElementById('inputPesquisaGeral') || document.getElementById('inputBuscaChamados');
    const buscaLoja = document.getElementById('inputLojaAuto');

    // Evita depender apenas de atributos inline e garante busca instantânea.
    buscaGeral?.addEventListener('input', aplicarFiltrosEspecificos);
    buscaLoja?.addEventListener('input', aplicarFiltrosEspecificos);

    atualizarEstadoVisualFiltros();
});
// ============================================================================================================
// ============================================================================================================
// ============================================================================================================
// ============================================================================================================
//
//                                         AREIS PRO
//
//                                  MÓDULO DE ORDENS DE SERVIÇO
//                                   MANUTENÇÃO PREDIAL - V1
//
// ============================================================================================================
//
// ESTE BLOCO É RESPONSÁVEL POR TODA A PRIMEIRA IMPLEMENTAÇÃO DO MÓDULO DE ORDENS DE SERVIÇO.
//
// ELE FOI MANTIDO PROPOSITALMENTE DENTRO DO script.js NESTA PRIMEIRA VERSÃO PARA EVITAR UMA REFATORAÇÃO
// GRANDE DO SISTEMA ENQUANTO O NOVO MÓDULO AINDA ESTÁ SENDO DESENVOLVIDO.
//
// FUTURAMENTE ESTE BLOCO PODERÁ SER EXTRAÍDO PARA:
//
//      ordens-servico.js
//
// E AS FUNÇÕES DE PDF PODERÃO SER EXTRAÍDAS PARA:
//
//      os-pdf.js
//
// ------------------------------------------------------------------------------------------------------------
//
// REGRAS PRINCIPAIS DA ORDEM DE SERVIÇO:
//
// 1. TODA OS É ORIGINADA A PARTIR DE UM CHAMADO EXISTENTE.
//
// 2. O NÚMERO DA ORDEM DE SERVIÇO É EXATAMENTE O MESMO NÚMERO DO CHAMADO.
//
//      CHAMADO #4587
//             ↓
//         OS #4587
//
// 3. NÃO SERÁ CRIADA UMA NUMERAÇÃO PARALELA DE OS.
//
// 4. A BUSCA PODE SER REALIZADA POR:
//
//      - NÚMERO DA LOJA
//      - NOME DA LOJA
//      - NÚMERO DO CHAMADO
//
// 5. OS CHAMADOS UTILIZADOS NESTA PRIMEIRA VERSÃO VÊM DA VARIÁVEL:
//
//      window.chamadosAlbetan
//
// 6. OS DADOS DE LOJA UTILIZAM O OBJETO:
//
//      db.lojas
//
//    QUE JÁ É CARREGADO DA TABELA lojas DO SUPABASE PELO AREIS.
//
// 7. A DESCRIÇÃO DA ORDEM DE SERVIÇO NÃO DEVE COPIAR INFORMAÇÕES ANTERIORES À DESCRIÇÃO.
//
//    EXEMPLO:
//
//      Solicitante: João
//      Telefone: 999999
//      Setor: Cozinha
//      Descrição: Vazamento embaixo da pia.
//
//    A ORDEM DE SERVIÇO DEVE RECEBER:
//
//      Vazamento embaixo da pia.
//
// 8. CASO O CAMPO "Descrição" DO OBJETO DO CHAMADO JÁ VENHA SOMENTE COM O TEXTO DA DESCRIÇÃO,
//    ELE SERÁ UTILIZADO NORMALMENTE.
//
// 9. DEPOIS DE LOCALIZAR O CHAMADO O OPERADOR DEFINE:
//
//      - TIPO DA MANUTENÇÃO
//      - ESPECIALIDADE
//      - PRIORIDADE
//
// 10. A OS POSSUI DOIS CAMINHOS:
//
//      A) EXECUÇÃO DENTRO DO AREIS
//
//          IDENTIFICAÇÃO
//              ↓
//          INSPEÇÃO
//              ↓
//          EXECUÇÃO
//              ↓
//          MATERIAIS
//              ↓
//          EVIDÊNCIAS
//              ↓
//          ENCERRAMENTO
//
//      B) EXECUÇÃO EXTERNA
//
//          GERAR PDF
//              ↓
//          ENVIAR AO PRESTADOR
//              ↓
//          PRESTADOR EXECUTA FORA DO AREIS
//
// 11. NESTA PRIMEIRA VERSÃO OS DADOS PREENCHIDOS DA OS AINDA NÃO SERÃO GRAVADOS EM TABELAS
//     PRÓPRIAS DO SUPABASE.
//
// 12. QUANDO A ESTRUTURA ESTIVER VALIDADA, SERÃO CRIADAS AS TABELAS:
//
//      ordens_servico
//      os_checklist
//      os_materiais
//      os_fotos
//      os_assinaturas
//
// 13. O ENDEREÇO DA LOJA SERÁ INCLUÍDO QUANDO A PLANILHA COM OS ENDEREÇOS FOR IMPORTADA
//     PARA A TABELA lojas DO SUPABASE.
//
// ============================================================================================================
// ============================================================================================================
// ============================================================================================================



// ------------------------------------------------------------------------------------------------------------
// ESTADO GLOBAL DA OS
// ------------------------------------------------------------------------------------------------------------

let osAtual = null;

let osEtapaAtual = 1;

let osMateriais = [];

let osFotosAntes = [];

let osFotosDepois = [];



// ------------------------------------------------------------------------------------------------------------
// CHECKLIST PADRÃO
// ------------------------------------------------------------------------------------------------------------

// ============================================================================================================
// CHECKLIST PADRÃO DA ORDEM DE SERVIÇO
// BASEADO NO CHECKLIST DE LOJAS
// ============================================================================================================

const osChecklistPadrao = [

    // =========================================================================================
    // ÁREA 1
    // =========================================================================================

    {
        area: "1",
        titulo: "EQUIPAMENTOS DE COMBATE A INCÊNDIO",

        descricao:
            "Verificação de conformidade dos equipamentos e estruturas de prevenção e combate a incêndio.",

        itens: [

            {
                numero: "1.1",
                pergunta:
                    "Equipamento de combate a incêndio e rotas de fuga estão desobstruídos?",
                peso: 2
            },

            {
                numero: "1.2",
                pergunta:
                    "Há demarcação visível de incêndio no piso? (Apenas para casos em que efetivamente NÃO existe a demarcação)",
                peso: 1
            },

            {
                numero: "1.3",
                pergunta:
                    "Recargas de extintores estão dentro da validade?",
                peso: 2
            },

            {
                numero: "1.4",
                pergunta:
                    "Testes de mangueiras estão dentro da validade?",
                peso: 2
            },

            {
                numero: "1.5",
                pergunta:
                    "Bomba de incêndio está operando normalmente?",
                peso: 3
            },

            {
                numero: "1.6",
                pergunta:
                    "Central de Alarme em funcionamento?",
                peso: 2
            },

            {
                numero: "1.7",
                pergunta:
                    "Existe sinalização de emergência nas paredes (indicação de saída e de equipamentos de incêndio)?",
                peso: 1
            },

            {
                numero: "1.8",
                pergunta:
                    "Associados sabem como proceder caso ocorra um princípio de incêndio?",
                peso: 2
            },

            {
                numero: "1.9",
                pergunta:
                    "Possui AVCB dentro da validade?",
                peso: 3
            },

            {
                numero: "1.10",
                pergunta:
                    "As mangueiras são do tipo 2?",
                peso: 1
            }

        ]
    },


    // =========================================================================================
    // ÁREA 2
    // =========================================================================================

    {
        area: "2",
        titulo: "INSTALAÇÕES ELÉTRICAS",

        descricao:
            "Verificação de conformidade e estado de conservação das instalações elétricas das unidades.",

        itens: [

            {
                numero: "2.1",
                pergunta:
                    "Instalações estão desprovidas de improvisação (adaptadores, extensões e multiplicadores de tomada)?",
                peso: 3
            },

            {
                numero: "2.2",
                pergunta:
                    "Cabos elétricos encontram-se protegidos (dentro de calhas e eletrodutos)?",
                peso: 3
            },

            {
                numero: "2.3",
                pergunta:
                    "Quadros de energia estão sinalizados, desobstruídos e em perfeito estado de conservação?",
                peso: 3
            }

        ]
    },


    // =========================================================================================
    // ÁREA 3
    // =========================================================================================

    {
        area: "3",
        titulo: "SALÃO DE VENDAS, CHECK OUT, SALAS E RETAGUARDAS",

        descricao:
            "Verificação de conformidade e estado de conservação do Salão de Vendas, Check Out, Salas e Retaguardas.",

        itens: [

            {
                numero: "3.1",
                pergunta:
                    "Escadas e rampas possuem antiderrapantes?",
                peso: 2
            },

            {
                numero: "3.2",
                pergunta:
                    "As escadas possuem corrimãos? (Escadas internas com menos de 1,20 m de largura precisam de corrimão em apenas um lado. Já escadas externas de uso coletivo devem ter corrimão dos dois lados, independentemente da largura.)",
                peso: 2
            },

            {
                numero: "3.3",
                pergunta:
                    "As paredes não possuem infiltrações, rachaduras ou danos estruturais?",
                peso: 1
            },

            {
                numero: "3.4",
                pergunta:
                    "Corredores e vias de passagem estão desobstruídos?",
                peso: 1
            },

            {
                numero: "3.5",
                pergunta:
                    "Ambientes estão limpos e higienizados?",
                peso: 1
            },

            {
                numero: "3.6",
                pergunta:
                    "Ambientes foram dedetizados?",
                peso: 1
            },

            {
                numero: "3.7",
                pergunta:
                    "Elevador(es) estão em bom estado de uso (limpeza, iluminação, organização e de uso)?",
                peso: 2
            },

            {
                numero: "3.8",
                pergunta:
                    "Caixas possuem cadeiras com encosto para lombar e são ajustáveis?",
                peso: 1
            },

            {
                numero: "3.9",
                pergunta:
                    "Caixas possuem apoio para os pés?",
                peso: 1
            },

            {
                numero: "3.10",
                pergunta:
                    "As mercadorias estão armazenadas a uma distância superior a 50 cm das estruturas laterais (paredes) do prédio?",
                peso: 1
            },

            {
                numero: "3.11",
                pergunta:
                    "As mercadorias estão armazenadas sem contato direto com fios elétricos, painéis elétricos, tomadas e/ou assemelhados?",
                peso: 2
            },

            {
                numero: "3.12",
                pergunta:
                    "Arranjo físico do estoque está adequado para armazenamento de mercadorias?",
                peso: 1
            },

            {
                numero: "3.13",
                pergunta:
                    "A temperatura ambiente está adequada - conforto térmico?",
                peso: 1
            },

            {
                numero: "3.14",
                pergunta:
                    "A iluminação do ambiente está adequada?",
                peso: 1
            },

            {
                numero: "3.15",
                pergunta:
                    "O estoque está organizado?",
                peso: 2
            },

            {
                numero: "3.16",
                pergunta:
                    "Os PDVs e equipamento do Checkout estão em perfeito estado de conservação?",
                peso: 2
            },

            {
                numero: "3.17",
                pergunta:
                    "Monitores dos Checkouts têm regulagem de altura ou suporte de regulagem?",
                peso: 1
            }

        ]
    },


    // =========================================================================================
    // ÁREA 4
    // =========================================================================================

    {
        area: "4",
        titulo: "FERRAMENTAS, UTENSÍLIOS, MÁQUINAS E EPIs",

        descricao:
            "Verificação de conformidade e estado de conservação das ferramentas, utensílios, máquinas e EPIs.",

        itens: [

            {
                numero: "4.1",
                pergunta:
                    "Os utensílios para abertura de caixas (estiletes do tipo bico de pato ou retrátil) estão em boas condições de uso?",
                peso: 1
            },

            {
                numero: "4.2",
                pergunta:
                    "Prensas possuem sistemas de segurança em devido funcionamento?",
                peso: 3
            },

            {
                numero: "4.3",
                pergunta:
                    "As escadas móveis são adequadas?",
                peso: 2
            },

            {
                numero: "4.4",
                pergunta:
                    "Associados da área de manutenção utilizam adequadamente os EPI’s necessários às suas atividades?",
                peso: 3
            },

            {
                numero: "4.5",
                pergunta:
                    "Roltainers e carrinhos de cargas estão em bom estado de conservação?",
                peso: 2
            }

        ]
    },


    // =========================================================================================
    // ÁREA 5
    // =========================================================================================

    {
        area: "5",
        titulo: "SANITÁRIO / VESTIÁRIOS",

        descricao:
            "Verificação de conformidade e estado de conservação dos sanitários e vestiários.",

        itens: [

            {
                numero: "5.1",
                pergunta:
                    "Há quantidade de instalações sanitárias suficientes para o número de associados?",
                peso: 1
            },

            {
                numero: "5.2",
                pergunta:
                    "As instalações hidráulicas, mictórios, vasos sanitários e chuveiros estão em boas condições de uso?",
                peso: 2
            },

            {
                numero: "5.3",
                pergunta:
                    "Há segregação dos sanitários por sexo?",
                peso: 1
            },

            {
                numero: "5.4",
                pergunta:
                    "Há disponibilidade adequada de sabão, papel toalha e papel higiênico nos sanitários?",
                peso: 1
            },

            {
                numero: "5.5",
                pergunta:
                    "Lixeiras possuem tampas?",
                peso: 1
            },

            {
                numero: "5.6",
                pergunta:
                    "Apresentam boas condições de higiene, limpeza e organização?",
                peso: 1
            },

            {
                numero: "5.7",
                pergunta:
                    "Produtos de limpeza são armazenados em locais adequados?",
                peso: 1
            },

            {
                numero: "5.8",
                pergunta:
                    "Ambientes possuem iluminação adequada?",
                peso: 1
            },

            {
                numero: "5.9",
                pergunta:
                    "Ralos e caneletas possuem tampas e estão em bom estado de conservação?",
                peso: 1
            },

            {
                numero: "5.10",
                pergunta:
                    "Armários estão em boas condições de uso?",
                peso: 1
            },

            {
                numero: "5.11",
                pergunta:
                    "Os pertences dos associados encontram-se dentro dos armários?",
                peso: 1
            },

            {
                numero: "5.12",
                pergunta:
                    "Ambientes não apresentam infiltrações?",
                peso: 1
            },

            {
                numero: "5.13",
                pergunta:
                    "As cadeiras e/ou bancos estão em boas condições de uso?",
                peso: 1
            },

            {
                numero: "5.14",
                pergunta:
                    "As cabines para banho estão providas com porta que impeçam o devassamento?",
                peso: 1
            },

            {
                numero: "5.15",
                pergunta:
                    "Chuveiros dispõem de água quente e fria?",
                peso: 1
            },

            {
                numero: "5.16",
                pergunta:
                    "Nas cabines têm suportes para sabonetes e toalhas?",
                peso: 1
            },

            {
                numero: "5.17",
                pergunta:
                    "As cabines possuem dimensões de acordo com o código de obra local ou, na ausência desse, no mínimo 0,80m (oitenta centímetros) por 0,80m (oitenta centímetros)?",
                peso: 1
            }

        ]
    },


    // =========================================================================================
    // ÁREA 6
    // =========================================================================================

    {
        area: "6",
        titulo: "LOCAL PARA REFEIÇÕES",

        descricao:
            "Verificação de conformidade e estado de conservação do local para refeições.",

        itens: [

            {
                numero: "6.1",
                pergunta:
                    "O espaço está adequado para comportar a quantidade de funcionários da loja?",
                peso: 2
            },

            {
                numero: "6.2",
                pergunta:
                    "Há local para lavagem de utensílios usados na refeição?",
                peso: 2
            },

            {
                numero: "6.3",
                pergunta:
                    "Possui iluminação adequada?",
                peso: 1
            },

            {
                numero: "6.4",
                pergunta:
                    "Local é arejado e apresenta boas condições de conservação, limpeza e higiene?",
                peso: 2
            },

            {
                numero: "6.5",
                pergunta:
                    "Possui mesas e cadeiras em quantidades suficientes e em bom estado de conservação?",
                peso: 1
            },

            {
                numero: "6.6",
                pergunta:
                    "Há meios para conservação e aquecimento das refeições?",
                peso: 2
            },

            {
                numero: "6.7",
                pergunta:
                    "Há copos descartáveis disponíveis no local?",
                peso: 1
            },

            {
                numero: "6.8",
                pergunta:
                    "Existem bebedouros em quantidades suficientes (1 p/ cada grupo de 50) e estão higienizados?",
                peso: 2
            },

            {
                numero: "6.9",
                pergunta:
                    "A troca de filtros dos bebedouros obedece o prazo máximo de 6 meses?",
                peso: 2
            },

            {
                numero: "6.10",
                pergunta:
                    "Lixeiras estão em boas condições e possuem tampas?",
                peso: 1
            }

        ]
    },


    // =========================================================================================
    // ÁREA 7
    // =========================================================================================

    {
        area: "7",
        titulo: "INFORMAÇÕES ADICIONAIS",

        descricao: "",

        itens: [

            {
                numero: "7.1",
                pergunta:
                    "Foi realizado Diálogo de Segurança com a equipe da loja no dia da visita?",
                peso: 1
            },

            {
                numero: "7.2",
                pergunta:
                    "A loja não possui registro de acidentes típicos ocorridos neste ano?",
                peso: 1
            },

            {
                numero: "7.3",
                pergunta:
                    "Não há histórico de ações de órgãos públicos (como Sindicato, MPT, Vigilância Sanitária) passadas ou em andamento na loja?",
                peso: 1
            },

            {
                numero: "7.4",
                pergunta:
                    "No mural da loja está disponível o Fluxo de comunicação de acidentes e a Rota de segurança?",
                peso: 1
            }

        ]
    }

];

// ======================================================================
// TRANSFORMA AS ÁREAS DO CHECKLIST EM UMA LISTA ÚNICA
// ======================================================================

function osObterTodosItensChecklist() {

    const itens = [];

    osChecklistPadrao.forEach(area => {

        area.itens.forEach(item => {

            itens.push({
                ...item,

                area: area.area,

                areaTitulo: area.titulo,

                areaDescricao: area.descricao
            });

        });

    });

    return itens;
}

// ------------------------------------------------------------------------------------------------------------
// EXTRAIR APENAS A DESCRIÇÃO DO CHAMADO
// ------------------------------------------------------------------------------------------------------------

function osExtrairDescricao(chamado) {

    if (!chamado) return "";


    // Primeiro tenta pegar a coluna específica da planilha.

    let texto =
        chamado["Descrição"] ??
        chamado.descricao ??
        chamado["DESCRIÇÃO"] ??
        "";


    texto = String(texto || "").trim();


    if (!texto) return "";


    // Caso o próprio campo ainda contenha informações anteriores
    // à palavra "Descrição", descartamos tudo que vier antes.

    const match = texto.match(
        /descri[cç][aã]o\s*:?\s*([\s\S]*)/i
    );


    if (match && match[1]) {

        return match[1].trim();

    }


    // Se a coluna já possuir somente o texto da descrição,
    // utiliza diretamente.

    return texto;

}



// ------------------------------------------------------------------------------------------------------------
// OBTER NÚMERO DO CHAMADO
// ------------------------------------------------------------------------------------------------------------

function osObterNumeroChamado(chamado) {

    if (!chamado) return "";


    return String(

        chamado["ID"] ??
        chamado.id ??
        chamado["Número do Chamado"] ??
        chamado.numero_chamado ??
        ""

    ).trim();

}



// ------------------------------------------------------------------------------------------------------------
// OBTER LOJA DO CHAMADO
// ------------------------------------------------------------------------------------------------------------

function osObterLoja(chamado) {

    if (!chamado) return "";


    return String(

        chamado["Loja"] ??
        chamado.loja ??
        chamado["LOJA"] ??
        ""

    ).trim();

}



// ------------------------------------------------------------------------------------------------------------
// PESQUISA DA OS
// ------------------------------------------------------------------------------------------------------------

function osPesquisar() {

    const inputLoja =
        document.getElementById("osBuscaLoja");


    const inputChamado =
        document.getElementById("osBuscaChamado");


    const container =
        document.getElementById("osResultadosBusca");


    if (!container) return;


    const termoLoja =
        normalizarTexto(inputLoja?.value || "");


    const termoChamado =
        normalizarTexto(inputChamado?.value || "");


    if (!termoLoja && !termoChamado) {

        container.innerHTML = `

            <p class="text-xs opacity-40">

                Pesquise por loja ou número do chamado.

            </p>

        `;

        return;

    }



    const chamados =
        window.chamadosAlbetan || [];



    let resultados =
        chamados.filter(chamado => {


            const numero =
                normalizarTexto(
                    osObterNumeroChamado(chamado)
                );


            const loja =
                normalizarTexto(
                    osObterLoja(chamado)
                );


            const atendeLoja =
                !termoLoja ||
                loja.includes(termoLoja);


            const atendeChamado =
                !termoChamado ||
                numero.includes(termoChamado);


            return atendeLoja && atendeChamado;

        });



    resultados =
        resultados.slice(0, 20);



    if (!resultados.length) {

        container.innerHTML = `

            <div class="p-5 rounded-2xl bg-amber-500/10">

                <p class="text-xs font-semibold text-amber-500">

                    Nenhum chamado encontrado.

                </p>

            </div>

        `;

        return;

    }



    container.innerHTML =
        resultados.map((chamado, index) => {


            const numero =
                osObterNumeroChamado(chamado);


            const loja =
                osObterLoja(chamado);


            const descricao =
                osExtrairDescricao(chamado);


                
            return `

                <button
                    onclick="osSelecionarChamado(${index})"
                    data-os-resultado="${numero}"
                    class="w-full text-left p-5 rounded-2xl
                           border border-black/10 dark:border-white/10
                           hover:border-blue-500 transition-all">

                    <div class="flex justify-between gap-4">

                        <div>

                            <p class="text-sm font-semibold">

                                Chamado #${numero}

                            </p>

                            <p class="text-xs opacity-50 mt-1">

                                Loja ${loja}

                            </p>

                        </div>

                        <span class="text-blue-500 text-xs font-semibold">

                            Abrir OS →

                        </span>

                    </div>

                    <p class="text-xs opacity-60 mt-3 line-clamp-2">

                        ${descricao || "Sem descrição."}

                    </p>

                </button>

            `;

        }).join("");



    // Guardamos os resultados atuais porque o índice acima
    // corresponde ao resultado filtrado.

    window.osResultadosAtuais = resultados;

}



// ------------------------------------------------------------------------------------------------------------
// SELECIONAR CHAMADO
// ------------------------------------------------------------------------------------------------------------

function osSelecionarChamado(index) {

    const chamados =
        window.osResultadosAtuais || [];


    const chamado =
        chamados[index];


    if (!chamado) {

        alert("Chamado não encontrado.");

        return;

    }



    const numero =
        osObterNumeroChamado(chamado);


    const loja =
        osObterLoja(chamado);


    const descricao =
        osExtrairDescricao(chamado);



    // Procura dados complementares da loja
    // na tabela lojas que já foi carregada do Supabase.

    let dadosLoja =
        db.lojas.find(lojaBanco => {

            const codigoBanco =
                String(
                    lojaBanco.LOJA ?? ""
                )
                    .trim();

            const codigoChamado =
                String(
                    loja ?? ""
                )
                    .trim();

            return codigoBanco === codigoChamado;

        }) || null;

    console.log("LOJA DO CHAMADO:", loja);
    console.log("DADOS ENCONTRADOS DA LOJA:", dadosLoja);

    osAtual = {

        numero_os: numero,

        numero_chamado: numero,

        chamado: chamado,

        loja: loja,

        dados_loja: dadosLoja,

        // ==========================================
        // DADOS DA LOJA VINDOS DO SUPABASE
        // ==========================================

        loja_nome:
            dadosLoja?.NOME || "",

        endereco:
            dadosLoja?.["ENDEREÇO"] || "",

        cidade:
            dadosLoja?.CIDADE || "",

        uf:
            dadosLoja?.UF || "",

        cep:
            dadosLoja?.CEP || "",

        // ==========================================

        descricao_solicitante:
            descricao,

        tipo: "",

        servico: "",

        prioridade: "",

        diagnostico: "",

        servico_executar: "",

        servico_executado: "",

        pendencias: "",

        resultado: "",

        condicao_final: "",

        observacoes_finais: ""

    };



    document.getElementById("osNumeroTitulo").innerText =
        `OS #${numero}`;


    document.getElementById("osNumeroChamado").innerText =
        `#${numero}`;


    document.getElementById("osLoja").innerText =
        `Loja ${loja}`;


    document.getElementById("osDescricao").innerText =
        descricao || "Descrição não informada.";



    document
        .getElementById("osChamadoSelecionado")
        ?.classList.remove("hidden");



    document
        .getElementById("osExecucaoArea")
        ?.classList.add("hidden");



    document
        .getElementById("osChamadoSelecionado")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}



// ------------------------------------------------------------------------------------------------------------
// VALIDAR DADOS BÁSICOS
// ------------------------------------------------------------------------------------------------------------

function osValidarClassificacao() {

    if (!osAtual) {

        alert("Selecione um chamado.");

        return false;

    }



    const tipo =
        document.getElementById("osTipo")?.value;


    const servico =
        document.getElementById("osServico")?.value;

    const prioridade =
        document.getElementById("osPrioridade")?.value;



    if (!tipo) {

        alert("Selecione o tipo de manutenção.");

        return false;

    }


if (!servico) {

    alert("Selecione o serviço.");

    return false;
}


    if (!prioridade) {

        alert("Selecione a prioridade.");

        return false;

    }



    osAtual.tipo = tipo;

    osAtual.servico = servico;

    osAtual.prioridade = prioridade;


    return true;

}



// ------------------------------------------------------------------------------------------------------------
// EXECUTAR NO AREIS
// ------------------------------------------------------------------------------------------------------------

function osIniciarExecucaoInterna() {

    if (!osValidarClassificacao()) {

        return;

    }



    osEtapaAtual = 1;


    osRenderizarChecklist();


    osMostrarEtapa(1);



    document
        .getElementById("osExecucaoArea")
        ?.classList.remove("hidden");



    document
        .getElementById("osExecucaoArea")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}



// ------------------------------------------------------------------------------------------------------------
// CHECKLIST
// ------------------------------------------------------------------------------------------------------------

function osRenderizarChecklist() {

    const container =
        document.getElementById("osChecklist");


    if (!container) {
        return;
    }


    let html = "";

    let indiceGlobal = 0;


    osChecklistPadrao.forEach(area => {


        // ===============================================================
        // CABEÇALHO DA ÁREA
        // ===============================================================

        html += `

            <div class="mt-8 first:mt-0">

                <div
                    class="border-l-4 border-blue-500
                           pl-4 py-2 mb-4">

                    <p
                        class="text-[10px] uppercase
                               tracking-[0.20em]
                               font-bold text-blue-500">

                        Área ${area.area}

                    </p>


                    <h4
                        class="text-base font-semibold mt-1">

                        ${area.titulo}

                    </h4>


                    ${area.descricao

                ? `

                            <p
                                class="text-[10px]
                                       opacity-50 mt-1">

                                ${area.descricao}

                            </p>

                            `

                : ""
            }

                </div>

        `;


        // ===============================================================
        // ITENS DA ÁREA
        // ===============================================================

        area.itens.forEach(item => {


            const index =
                indiceGlobal;


            html += `

                <div
                    class="p-4 md:p-5 mb-3
                           rounded-2xl
                           border
                           border-black/10
                           dark:border-white/10">


                    <!-- PERGUNTA -->
                    <div
                        class="flex flex-col
                               md:flex-row
                               md:items-start
                               md:justify-between
                               gap-4">


                        <div class="flex-1">


                            <div
                                class="flex items-center gap-2 mb-2">


                                <span
                                    class="text-[10px]
                                           font-bold
                                           text-blue-500">

                                    ${item.numero}

                                </span>


                                <span
                                    class="text-[9px]
                                           opacity-30">

                                    Peso ${item.peso}

                                </span>


                                <span
                                    class="text-[9px]
                                           opacity-30">

                                    Obrigatório

                                </span>


                            </div>


                            <p
                                class="text-xs
                                       md:text-sm
                                       font-medium
                                       leading-relaxed">

                                ${item.pergunta}

                            </p>


                        </div>


                        <!-- RESPOSTAS -->
                        <div
                            class="flex gap-2
                                   shrink-0">


                            <!-- CONFORME -->

                            <label
                                class="cursor-pointer">

                                <input
                                    type="radio"
                                    class="hidden peer"
                                    name="os-check-${index}"
                                    value="C"

                                    onchange="
                                        osMostrarNC(${index}, false);
                                        osRenderizarFotos();
                                    ">


                                <span
                                    class="block
                                           px-4 py-2.5
                                           rounded-xl
                                           text-[10px]
                                           font-bold

                                           bg-emerald-500/10
                                           text-emerald-600

                                           peer-checked:bg-emerald-500
                                           peer-checked:text-white

                                           transition-all">

                                    SIM

                                </span>

                            </label>


                            <!-- NÃO CONFORME -->

                            <label
                                class="cursor-pointer">

                                <input
                                    type="radio"
                                    class="hidden peer"
                                    name="os-check-${index}"
                                    value="NC"

                                    onchange="
                                        osMostrarNC(${index}, true);
                                        osRenderizarFotos();
                                    ">


                                <span
                                    class="block
                                           px-4 py-2.5
                                           rounded-xl
                                           text-[10px]
                                           font-bold

                                           bg-red-500/10
                                           text-red-500

                                           peer-checked:bg-red-500
                                           peer-checked:text-white

                                           transition-all">

                                    NÃO

                                </span>

                            </label>


                            <!-- NÃO SE APLICA -->

                            <label
                                class="cursor-pointer">

                                <input
                                    type="radio"
                                    class="hidden peer"
                                    name="os-check-${index}"
                                    value="NA"

                                    onchange="
                                        osMostrarNC(${index}, false);
                                        osRenderizarFotos();
                                    ">


                                <span
                                    class="block
                                           px-4 py-2.5
                                           rounded-xl
                                           text-[10px]
                                           font-bold

                                           bg-purple-500/10
                                           text-purple-500

                                           peer-checked:bg-purple-500
                                           peer-checked:text-white

                                           transition-all">

                                    N/A

                                </span>

                            </label>


                        </div>

                    </div>



                    <!-- =================================================
                         ÁREA QUE APARECE QUANDO FOR NÃO CONFORME
                    ================================================== -->

                    <div
                        id="osNC-${index}"
                        class="hidden
                               mt-5
                               pt-5
                               border-t
                               border-red-500/10
                               space-y-4">


                        <div>

                            <label
                                class="text-[9px]
                                       font-bold
                                       uppercase
                                       opacity-40">

                                Descrição da não conformidade

                            </label>

<textarea
    id="osNCDesc-${index}"
    placeholder="Descreva o problema encontrado..."
    oninput="osRenderizarFotos()"
    class="w-full mt-2 p-3 rounded-xl
           bg-black/5 dark:bg-white/5
           text-xs min-h-[80px] resize-none"></textarea>                        </div>

                        <!-- FOTO DO LOCAL -->

                        <div>

                            <p
                                class="text-[9px]
                                       uppercase
                                       font-bold
                                       opacity-40
                                       mb-2">

                                Evidência fotográfica

                            </p>


                            <label
                                class="inline-flex
                                       items-center
                                       justify-center

                                       px-4
                                       py-3

                                       rounded-xl

                                       bg-blue-600
                                       text-white

                                       text-[10px]
                                       font-bold

                                       cursor-pointer">


                                + ADICIONAR FOTO


                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    class="hidden"

                                    onchange="
                                        osAdicionarFotoNC(
                                            this,
                                            ${index}
                                        )
                                    ">

                            </label>


                            <div
                                id="osNCFotos-${index}"

                                class="grid
                                       grid-cols-2
                                       md:grid-cols-4
                                       gap-3
                                       mt-3">
                            </div>

                        </div>


                        <!-- AÇÃO RECOMENDADA -->

                        <div>

                            <label
                                class="text-[9px]
                                       uppercase
                                       font-bold
                                       opacity-40">

                                Ação recomendada

                            </label>

<textarea
    id="osNCAcao-${index}"
    placeholder="Informe a ação recomendada..."
    class="w-full mt-2 p-3 rounded-xl
           bg-black/5 dark:bg-white/5
           text-xs min-h-[70px] resize-none"></textarea>
                        </div>

                    </div>


                </div>

            `;


            indiceGlobal++;

        });


        html += `
            </div>
        `;

    });


    container.innerHTML = html;

}



// ------------------------------------------------------------------------------------------------------------
// MOSTRAR CAMPO DE NÃO CONFORMIDADE
// ------------------------------------------------------------------------------------------------------------

function osMostrarNC(index, mostrar) {

    const elemento =
        document.getElementById(`osNC-${index}`);


    if (!elemento) return;


    elemento.classList.toggle(
        "hidden",
        !mostrar
    );

}



// ------------------------------------------------------------------------------------------------------------
// ETAPAS
// ------------------------------------------------------------------------------------------------------------

function osMostrarEtapa(numero) {

    osEtapaAtual = numero;



    document
        .querySelectorAll(".os-etapa")
        .forEach(elemento => {

            const etapa =
                Number(
                    elemento.dataset.etapa
                );


            elemento.classList.toggle(
                "hidden",
                etapa !== numero
            );

        });



    document
        .querySelectorAll(".os-step-indicator")
        .forEach(elemento => {

            const etapa =
                Number(
                    elemento.dataset.step
                );


            if (etapa === numero) {

                elemento.classList.add(
                    "bg-blue-600",
                    "text-white"
                );


                elemento.classList.remove(
                    "bg-black/5",
                    "dark:bg-white/5"
                );

            } else {

                elemento.classList.remove(
                    "bg-blue-600",
                    "text-white"
                );


                elemento.classList.add(
                    "bg-black/5",
                    "dark:bg-white/5"
                );

            }

        });



    const anterior =
        document.getElementById("osBtnAnterior");


    const proximo =
        document.getElementById("osBtnProximo");



    if (anterior) {

        anterior.style.visibility =
            numero === 1
                ? "hidden"
                : "visible";

    }



    if (proximo) {

        proximo.innerText =
            numero === 6
                ? "Finalizar OS"
                : "Salvar e continuar →";

    }

}



// ------------------------------------------------------------------------------------------------------------
// SALVAR ETAPA ATUAL EM MEMÓRIA
// ------------------------------------------------------------------------------------------------------------

function osSalvarEtapaAtual() {

    if (!osAtual) return;



    osAtual.tipo =
        document.getElementById("osTipo")?.value || "";


    osAtual.especialidade =
        document.getElementById("osEspecialidade")?.value || "";


    osAtual.prioridade =
        document.getElementById("osPrioridade")?.value || "";


    osAtual.diagnostico =
        document.getElementById("osDiagnostico")?.value || "";


    osAtual.servico_executar =
        document.getElementById("osServicoExecutar")?.value || "";


    osAtual.servico_executado =
        document.getElementById("osServicoExecutado")?.value || "";


    osAtual.pendencias =
        document.getElementById("osPendencias")?.value || "";


    osAtual.resultado =
        document.getElementById("osResultado")?.value || "";


    osAtual.condicao_final =
        document.getElementById("osCondicaoFinal")?.value || "";


    osAtual.observacoes_finais =
        document.getElementById("osObservacoesFinais")?.value || "";

}



// ------------------------------------------------------------------------------------------------------------
// PRÓXIMA ETAPA
// ------------------------------------------------------------------------------------------------------------

function osProximaEtapa() {

    osSalvarEtapaAtual();



    if (osEtapaAtual < 6) {

        osMostrarEtapa(
            osEtapaAtual + 1
        );

        return;

    }



    osFinalizar();

}



// ------------------------------------------------------------------------------------------------------------
// ETAPA ANTERIOR
// ------------------------------------------------------------------------------------------------------------

function osEtapaAnterior() {

    osSalvarEtapaAtual();



    if (osEtapaAtual > 1) {

        osMostrarEtapa(
            osEtapaAtual - 1
        );

    }

}



// ------------------------------------------------------------------------------------------------------------
// MATERIAIS
// ------------------------------------------------------------------------------------------------------------

function osAdicionarMaterial() {

    osMateriais.push({

        material: "",

        quantidade: "",

        unidade: ""

    });


    osRenderizarMateriais();

}



function osRenderizarMateriais() {

    const container =
        document.getElementById("osListaMateriais");


    if (!container) return;



    if (!osMateriais.length) {

        container.innerHTML = `

            <p class="text-xs opacity-40">

                Nenhum material adicionado.

            </p>

        `;

        return;

    }



    container.innerHTML =
        osMateriais.map(
            (material, index) => `

            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">

                <input
                    placeholder="Material"
                    value="${material.material}"
                    onchange="osMateriais[${index}].material=this.value"
                    class="p-3 rounded-xl
                           bg-black/5 dark:bg-white/5">


                <input
                    placeholder="Quantidade"
                    value="${material.quantidade}"
                    onchange="osMateriais[${index}].quantidade=this.value"
                    class="p-3 rounded-xl
                           bg-black/5 dark:bg-white/5">


                <input
                    placeholder="Unidade"
                    value="${material.unidade}"
                    onchange="osMateriais[${index}].unidade=this.value"
                    class="p-3 rounded-xl
                           bg-black/5 dark:bg-white/5">


                <button
                    onclick="osRemoverMaterial(${index})"
                    class="p-3 rounded-xl
                           bg-red-500/10
                           text-red-500
                           text-xs">

                    Remover

                </button>

            </div>

        `).join("");

}



function osRemoverMaterial(index) {

    osMateriais.splice(
        index,
        1
    );


    osRenderizarMateriais();

}

// ======================================================================
// FOTOS DE NÃO CONFORMIDADE DO CHECKLIST
// ======================================================================

let osFotosNaoConformidades = {};

function osAdicionarFotoNC(input, index) {

    if (!osFotosNaoConformidades[index]) {
        osFotosNaoConformidades[index] = [];
    }

    const arquivos = Array.from(input.files || []);

    arquivos.forEach(arquivo => {

        const reader = new FileReader();

        reader.onload = event => {

            osFotosNaoConformidades[index].push({
                src: event.target.result,
                nome: arquivo.name
            });

            osRenderizarFotosNC(index);
        };

        reader.readAsDataURL(arquivo);
    });

    input.value = "";
}


function osRenderizarFotosNC(index) {

    const container =
        document.getElementById(`osNCFotos-${index}`);

    if (!container) return;

    const fotos =
        osFotosNaoConformidades[index] || [];

    if (!fotos.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = fotos.map((foto, fotoIndex) => `
        <div class="relative">

            <img
                src="${foto.src}"
                class="w-full h-28 object-cover rounded-xl">

            <button
                type="button"
                onclick="osRemoverFotoNC(${index}, ${fotoIndex})"
                class="absolute top-2 right-2
                       w-7 h-7 rounded-full
                       bg-black/70 text-white
                       text-xs font-bold">
                ×
            </button>

        </div>
    `).join("");
}


function osRemoverFotoNC(index, fotoIndex) {

    if (!osFotosNaoConformidades[index]) return;

    osFotosNaoConformidades[index].splice(
        fotoIndex,
        1
    );

    osRenderizarFotosNC(index);
}

// ------------------------------------------------------------------------------------------------------------
// FOTOS
// ------------------------------------------------------------------------------------------------------------

function osAdicionarFotos(input, tipo) {

    const arquivos =
        Array.from(
            input.files || []
        );


    arquivos.forEach(arquivo => {

        const reader =
            new FileReader();


        reader.onload = event => {

            const foto = {

                src: event.target.result,

                legenda: ""

            };


            if (tipo === "antes") {

                osFotosAntes.push(foto);

            } else {

                osFotosDepois.push(foto);

            }


            osRenderizarFotos();

        };


        reader.readAsDataURL(
            arquivo
        );

    });

}



function osRenderizarFotos() {

    const antes =
        document.getElementById("osFotosAntes");


    const depois =
        document.getElementById("osFotosDepois");



    if (antes) {

        antes.innerHTML =
            osFotosAntes.map(
                foto => `

                <img
                    src="${foto.src}"
                    class="w-full h-28
                           object-cover
                           rounded-xl">

            `).join("");

    }



    if (depois) {

        depois.innerHTML =
            osFotosDepois.map(
                foto => `

                <img
                    src="${foto.src}"
                    class="w-full h-28
                           object-cover
                           rounded-xl">

            `).join("");

    }

}



// ------------------------------------------------------------------------------------------------------------
// GERAR OS PARA ENVIO EXTERNO
// ------------------------------------------------------------------------------------------------------------

async function osGerarParaEnvio() {

    if (!osValidarClassificacao()) {
        return;
    }

    try {

        await osGerarWordExterno();

    } catch (erro) {

        console.error(
            "Erro ao gerar Word da OS:",
            erro
        );

        alert(
            "Não foi possível gerar a OS em Word.\n\n" +
            (erro?.message || erro)
        );

    }
}
// ============================================================================================================
// ============================================================================================================
//                         GERADOR DE ORDEM DE SERVIÇO EXTERNA - WORD
//
// Este documento é utilizado quando a OS será executada FORA do AREIS.
//
// O AREIS preenche automaticamente:
//
// - Número da OS
// - Número do chamado
// - Código da loja
// - Nome da loja
// - Endereço
// - Cidade
// - UF
// - CEP
// - Descrição informada pelo solicitante
// - Tipo da manutenção
// - Especialidade
// - Prioridade
//
// O restante permanece em branco para preenchimento manual ou pelo Word:
//
// - Checklist
// - Observações
// - Diagnóstico
// - Execução
// - Materiais
// - Evidências fotográficas
// - Encerramento
// - Assinaturas
//
// ============================================================================================================
// ============================================================================================================


async function osGerarWordExterno() {

    if (!osAtual) {

        throw new Error(
            "Nenhuma Ordem de Serviço selecionada."
        );

    }


    if (!window.docx) {

        throw new Error(
            "Biblioteca DOCX não foi carregada."
        );

    }


    const {

        Document,
        Packer,
        Paragraph,
        TextRun,
        Table,
        TableRow,
        TableCell,
        WidthType,
        AlignmentType,
        BorderStyle,
        ShadingType,
        VerticalAlign,
        PageBreak

    } = window.docx;



    // =====================================================================
    // CONFIGURAÇÕES VISUAIS
    // =====================================================================

    const AZUL =
        "17365D";

    const AZUL_CLARO =
        "D9EAF7";

    const CINZA =
        "F5F7FA";

    const BORDA =
        "AAB3BC";


    const bordasTabela = {

        top: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        },

        bottom: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        },

        left: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        },

        right: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        },

        insideHorizontal: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        },

        insideVertical: {
            style: BorderStyle.SINGLE,
            size: 5,
            color: BORDA
        }

    };


    // =====================================================================
    // FUNÇÕES AUXILIARES
    // =====================================================================

    function texto(
        valor,
        opcoes = {}
    ) {

        return new TextRun({

            text:
                String(
                    valor ?? ""
                ),

            bold:
                opcoes.bold || false,

            size:
                opcoes.size || 18,

            color:
                opcoes.color || "222222"

        });

    }



    function paragrafo(
        valor,
        opcoes = {}
    ) {

        return new Paragraph({

            alignment:
                opcoes.alignment ||
                AlignmentType.LEFT,

            spacing: {
                before:
                    opcoes.before || 0,

                after:
                    opcoes.after || 0
            },

            children: [

                texto(
                    valor,
                    opcoes
                )

            ]

        });

    }



    function tituloSecao(
        numero,
        titulo
    ) {

        return new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        new TableCell({

                            shading: {
                                type:
                                    ShadingType.CLEAR,

                                fill:
                                    AZUL
                            },

                            margins: {
                                top: 100,
                                bottom: 100,
                                left: 120,
                                right: 120
                            },

                            children: [

                                new Paragraph({

                                    children: [

                                        new TextRun({

                                            text:
                                                `${numero}. ${titulo}`,

                                            bold: true,

                                            color:
                                                "FFFFFF",

                                            size: 20

                                        })

                                    ]

                                })

                            ]

                        })

                    ]

                })

            ]

        });

    }



    function celula(
        conteudo = "",
        opcoes = {}
    ) {

        return new TableCell({

            width:
                opcoes.width
                    ? {
                        size:
                            opcoes.width,

                        type:
                            WidthType.PERCENTAGE
                    }
                    : undefined,

            shading:
                opcoes.fill
                    ? {
                        type:
                            ShadingType.CLEAR,

                        fill:
                            opcoes.fill
                    }
                    : undefined,

            verticalAlign:
                VerticalAlign.CENTER,

            margins: {

                top:
                    opcoes.top ?? 100,

                bottom:
                    opcoes.bottom ?? 100,

                left:
                    100,

                right:
                    100

            },

            children: [

                new Paragraph({

                    children: [

                        new TextRun({

                            text:
                                String(
                                    conteudo ?? ""
                                ),

                            bold:
                                opcoes.bold || false,

                            size:
                                opcoes.size || 17

                        })

                    ]

                })

            ]

        });

    }



    function linhaEmBranco(
        alturaTexto =
            " "
    ) {

        return new TableRow({

            children: [

                celula(
                    alturaTexto,
                    {
                        top: 250,
                        bottom: 250
                    }
                )

            ]

        });

    }



    function marcarOpcao(
        valorSelecionado,
        valorOpcao,
        textoOpcao
    ) {

        const marcado =
            valorSelecionado ===
            valorOpcao;


        return `${marcado ? "☒" : "☐"} ${textoOpcao}`;

    }



    // =====================================================================
    // DADOS DO CABEÇALHO
    // =====================================================================

    const nomeLoja =

        osAtual.loja_nome
            ? `Loja ${osAtual.loja} - ${osAtual.loja_nome}`
            : `Loja ${osAtual.loja}`;


    const localizacao = [

        osAtual.endereco,

        [
            osAtual.cidade,
            osAtual.uf
        ]
            .filter(Boolean)
            .join(" - "),

        osAtual.cep
            ? `CEP ${osAtual.cep}`
            : ""

    ]
        .filter(Boolean)
        .join(" | ");



    // =====================================================================
    // CABEÇALHO
    // =====================================================================

    const cabecalho =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders: {

                top: {
                    style:
                        BorderStyle.NONE
                },

                bottom: {
                    style:
                        BorderStyle.NONE
                },

                left: {
                    style:
                        BorderStyle.NONE
                },

                right: {
                    style:
                        BorderStyle.NONE
                },

                insideHorizontal: {
                    style:
                        BorderStyle.NONE
                },

                insideVertical: {
                    style:
                        BorderStyle.NONE
                }

            },

            rows: [

                new TableRow({

                    children: [

                        new TableCell({

                            width: {
                                size: 50,
                                type: WidthType.PERCENTAGE
                            },

                            shading: {
                                type:
                                    ShadingType.CLEAR,

                                fill:
                                    AZUL
                            },

                            margins: {
                                top: 180,
                                bottom: 180,
                                left: 180,
                                right: 180
                            },

                            children: [

                                new Paragraph({

                                })

                            ]

                        }),


                        new TableCell({

                            width: {
                                size: 50,
                                type: WidthType.PERCENTAGE
                            },

                            shading: {
                                type:
                                    ShadingType.CLEAR,

                                fill:
                                    AZUL
                            },

                            margins: {
                                top: 140,
                                bottom: 140,
                                left: 100,
                                right: 180
                            },

                            children: [

                                new Paragraph({

                                    alignment:
                                        AlignmentType.RIGHT,

                                    children: [

                                        new TextRun({

                                            text:
                                                "ORDEM DE SERVIÇO",

                                            bold: true,

                                            color:
                                                "FFFFFF",

                                            size: 24

                                        })

                                    ]

                                }),


                                new Paragraph({

                                    alignment:
                                        AlignmentType.RIGHT,

                                    children: [

                                        new TextRun({

                                            text:
                                                "MANUTENÇÃO PREDIAL",

                                            color:
                                                "FFFFFF",

                                            size: 15

                                        })

                                    ]

                                }),


                                new Paragraph({

                                    alignment:
                                        AlignmentType.RIGHT,

                                    children: [

                                        new TextRun({

                                            text:
                                                `OS Nº ${osAtual.numero_os}`,

                                            bold: true,

                                            color:
                                                "FFFFFF",

                                            size: 16

                                        })

                                    ]

                                })

                            ]

                        })

                    ]

                })

            ]

        });



    // =====================================================================
    // BLOCO DA UNIDADE
    // =====================================================================

    const unidade =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            "UNIDADE",
                            {
                                width: 70,
                                bold: true,
                                size: 14,
                                fill: CINZA
                            }
                        ),

                        celula(
                            "CHAMADO",
                            {
                                width: 30,
                                bold: true,
                                size: 14,
                                fill: CINZA
                            }
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        new TableCell({

                            width: {
                                size: 70,
                                type: WidthType.PERCENTAGE
                            },

                            margins: {
                                top: 140,
                                bottom: 140,
                                left: 120,
                                right: 120
                            },

                            children: [

                                paragrafo(
                                    nomeLoja,
                                    {
                                        bold: true,
                                        size: 20
                                    }
                                ),

                                paragrafo(
                                    localizacao ||
                                    "Endereço não cadastrado",
                                    {
                                        size: 15,
                                        before: 70
                                    }
                                )

                            ]

                        }),


                        new TableCell({

                            width: {
                                size: 30,
                                type: WidthType.PERCENTAGE
                            },

                            margins: {
                                top: 140,
                                bottom: 140,
                                left: 120,
                                right: 120
                            },

                            children: [

                                paragrafo(
                                    `#${osAtual.numero_chamado}`,
                                    {
                                        bold: true,
                                        size: 20
                                    }
                                ),

                                paragrafo(
                                    `Emitido em ${new Date()
                                        .toLocaleDateString(
                                            "pt-BR"
                                        )
                                    }`,
                                    {
                                        size: 14,
                                        before: 70
                                    }
                                )

                            ]

                        })

                    ]

                })

            ]

        });



    // =====================================================================
    // CLASSIFICAÇÃO
    // =====================================================================

    const classificacao =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            "Tipo",
                            {
                                width: 25,
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        ),

                        celula(

                            [
                                marcarOpcao(
                                    osAtual.tipo,
                                    "Preventiva",
                                    "Preventiva"
                                ),

                                marcarOpcao(
                                    osAtual.tipo,
                                    "Corretiva",
                                    "Corretiva"
                                ),

                                marcarOpcao(
                                    osAtual.tipo,
                                    "Inspeção",
                                    "Inspeção"
                                ),

                                marcarOpcao(
                                    osAtual.tipo,
                                    "Emergencial",
                                    "Emergencial"
                                ),

                                marcarOpcao(
                                    osAtual.tipo,
                                    "Melhoria",
                                    "Melhoria"
                                )

                            ].join("     "),

                            {
                                width: 75
                            }
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Prioridade",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        ),

                        celula(

                            [
                                marcarOpcao(
                                    osAtual.prioridade,
                                    "Baixa",
                                    "Baixa"
                                ),

                                marcarOpcao(
                                    osAtual.prioridade,
                                    "Média",
                                    "Média"
                                ),

                                marcarOpcao(
                                    osAtual.prioridade,
                                    "Alta",
                                    "Alta"
                                ),

                                marcarOpcao(
                                    osAtual.prioridade,
                                    "Crítica",
                                    "Crítica"
                                )

                            ].join("     ")

                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Especialidade",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        ),

                        celula(
                            osAtual.especialidade ||
                            "________________________"
                        )

                    ]

                })

            ]

        });



    // =====================================================================
    // DESCRIÇÃO DO CHAMADO
    // =====================================================================

    const descricaoSolicitante =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            "Descrição informada pelo solicitante",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )

                    ]

                }),

                new TableRow({

                    children: [

                        new TableCell({

                            margins: {
                                top: 160,
                                bottom: 260,
                                left: 120,
                                right: 120
                            },

                            children: [

                                paragrafo(
                                    osAtual.descricao_solicitante ||
                                    " "
                                )

                            ]

                        })

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Diagnóstico inicial / condição encontrada",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )

                    ]

                }),

                linhaEmBranco(),
                linhaEmBranco()

            ]

        });



    // =====================================================================
    // CHECKLIST COMPLETO
    // =====================================================================

    const linhasChecklist = [

        new TableRow({

            tableHeader: true,

            children: [

                celula(
                    "Item de inspeção",
                    {
                        width: 70,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "C",
                    {
                        width: 7,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "NC",
                    {
                        width: 7,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "N/A",
                    {
                        width: 8,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "Observações",
                    {
                        width: 18,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                )

            ]

        })

    ];



    osChecklistPadrao.forEach(
        area => {


            linhasChecklist.push(

                new TableRow({

                    children: [

                        new TableCell({

                            columnSpan: 5,

                            shading: {
                                type:
                                    ShadingType.CLEAR,

                                fill:
                                    "EEF3F8"
                            },

                            margins: {
                                top: 100,
                                bottom: 100,
                                left: 100,
                                right: 100
                            },

                            children: [

                                new Paragraph({

                                    children: [

                                        new TextRun({

                                            text:
                                                `ÁREA ${area.area} - ${area.titulo}`,

                                            bold: true,

                                            size: 17,

                                            color:
                                                AZUL

                                        })

                                    ]

                                })

                            ]

                        })

                    ]

                })

            );


            area.itens.forEach(
                item => {


                    linhasChecklist.push(

                        new TableRow({

                            children: [

                                celula(
                                    `${item.numero} ${item.pergunta}`,
                                    {
                                        width: 60,
                                        size: 15
                                    }
                                ),

                                celula(
                                    "☐",
                                    {
                                        width: 7,
                                        size: 18
                                    }
                                ),

                                celula(
                                    "☐",
                                    {
                                        width: 7,
                                        size: 18
                                    }
                                ),

                                celula(
                                    "☐",
                                    {
                                        width: 8,
                                        size: 18
                                    }
                                ),

                                celula(
                                    "",
                                    {
                                        width: 18
                                    }
                                )

                            ]

                        })

                    );

                }
            );

        }
    );



    const checklistTabela =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows:
                linhasChecklist

        });



    // =====================================================================
    // EXECUÇÃO
    // =====================================================================

    const execucao =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({
                    children: [
                        celula(
                            "Serviço a executar / ação recomendada",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )
                    ]
                }),

                linhaEmBranco(),
                linhaEmBranco(),
                linhaEmBranco(),


                new TableRow({
                    children: [
                        celula(
                            "Serviço efetivamente executado",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )
                    ]
                }),

                linhaEmBranco(),
                linhaEmBranco(),
                linhaEmBranco(),


                new TableRow({
                    children: [
                        celula(
                            "Pendências / recomendações",
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )
                    ]
                }),

                linhaEmBranco(),
                linhaEmBranco()

            ]

        });



    // =====================================================================
    // MATERIAIS
    // =====================================================================

    const linhasMateriais = [

        new TableRow({

            children: [

                celula(
                    "Qtd.",
                    {
                        width: 10,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "Un.",
                    {
                        width: 10,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "Material / Peça / Recurso",
                    {
                        width: 55,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                ),

                celula(
                    "Observação",
                    {
                        width: 25,
                        bold: true,
                        fill:
                            AZUL_CLARO
                    }
                )

            ]

        })

    ];


    for (
        let i = 0;
        i < 8;
        i++
    ) {

        linhasMateriais.push(

            new TableRow({

                children: [

                    celula(" "),
                    celula(" "),
                    celula(" "),
                    celula(" ")

                ]

            })

        );

    }



    const materiais =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows:
                linhasMateriais

        });



    // =====================================================================
    // CONTROLE DE EXECUÇÃO
    // =====================================================================

    const controle =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            "Técnico / Equipe",
                            {
                                width: 20,
                                bold: true
                            }
                        ),

                        celula(
                            "",
                            {
                                width: 30
                            }
                        ),

                        celula(
                            "Responsável",
                            {
                                width: 20,
                                bold: true
                            }
                        ),

                        celula(
                            "",
                            {
                                width: 30
                            }
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Início",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "____/____/______    ____:____"
                        ),

                        celula(
                            "Término",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "____/____/______    ____:____"
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Área isolada?",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "☐ Sim     ☐ Não     ☐ N/A"
                        ),

                        celula(
                            "Teste funcional?",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "☐ Aprovado     ☐ Reprovado     ☐ N/A"
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Necessita retorno?",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "☐ Não     ☐ Sim"
                        ),

                        celula(
                            "Data prevista",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "____/____/______"
                        )

                    ]

                })

            ]

        });



    // =====================================================================
    // FOTOS
    // =====================================================================

    function blocoFoto(
        titulo
    ) {

        return new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            titulo,
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        ),

                        celula(
                            titulo.replace(
                                "01",
                                "02"
                            ),
                            {
                                bold: true,
                                fill:
                                    AZUL_CLARO
                            }
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "\n\n\n\n\n\n\n"
                        ),

                        celula(
                            "\n\n\n\n\n\n\n"
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Legenda / observação:\n\n"
                        ),

                        celula(
                            "Legenda / observação:\n\n"
                        )

                    ]

                })

            ]

        });

    }



    // =====================================================================
    // ENCERRAMENTO
    // =====================================================================

    const encerramento =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        celula(
                            "Resultado",
                            {
                                width: 25,
                                bold: true
                            }
                        ),

                        celula(
                            "☐ Serviço concluído     ☐ Parcialmente concluído     ☐ Pendente     ☐ Não executado",
                            {
                                width: 75
                            }
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Condição final",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "☐ Liberado para uso     ☐ Liberado com ressalvas     ☐ Interditado / requer ação"
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        celula(
                            "Motivo de pendência / ressalva",
                            {
                                bold: true
                            }
                        ),

                        celula(
                            "\n\n"
                        )

                    ]

                })

            ]

        });



    // =====================================================================
    // ASSINATURAS
    // =====================================================================

    function assinatura(
        titulo
    ) {

        return new TableCell({

            width: {
                size: 50,
                type: WidthType.PERCENTAGE
            },

            margins: {
                top: 350,
                bottom: 200,
                left: 120,
                right: 120
            },

            children: [

                paragrafo(
                    "\n\n"
                ),

                paragrafo(
                    "____________________________________"
                ),

                paragrafo(
                    titulo,
                    {
                        bold: true,
                        size: 16
                    }
                ),

                paragrafo(
                    "Nome: _______________________________",
                    {
                        size: 15,
                        before: 80
                    }
                ),

                paragrafo(
                    "Data: ____/____/______   Hora: ____:____",
                    {
                        size: 15,
                        before: 60
                    }
                )

            ]

        });

    }



    const assinaturas =

        new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            borders:
                bordasTabela,

            rows: [

                new TableRow({

                    children: [

                        assinatura(
                            "Técnico / Executor"
                        ),

                        assinatura(
                            "Responsável / Solicitante"
                        )

                    ]

                }),


                new TableRow({

                    children: [

                        assinatura(
                            "Supervisor / Fiscal"
                        ),

                        assinatura(
                            "Gerente / Aprovação Final"
                        )

                    ]

                })

            ]

        });



    // =====================================================================
    // MONTAGEM FINAL DO DOCUMENTO
    // =====================================================================

    const documento =

        new Document({

            sections: [

                {

                    properties: {

                        page: {

                            margin: {

                                top: 700,

                                right: 700,

                                bottom: 700,

                                left: 700

                            }

                        }

                    },

                    children: [

                        cabecalho,

                        new Paragraph({
                            spacing: {
                                after: 160
                            }
                        }),

                        unidade,

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "1",
                            "IDENTIFICAÇÃO E CLASSIFICAÇÃO"
                        ),

                        classificacao,

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),

                        descricaoSolicitante,


                        new Paragraph({
                            children: [
                                new PageBreak()
                            ]
                        }),


                        tituloSecao(
                            "2",
                            "CHECKLIST DE INSPEÇÃO"
                        ),

                        new Paragraph({
                            children: [

                                new TextRun({

                                    text:
                                        "Legenda: C = Conforme | NC = Não Conforme | N/A = Não se aplica.",

                                    size: 15,

                                    color:
                                        "666666"

                                })

                            ],

                            spacing: {
                                after: 120
                            }
                        }),

                        checklistTabela,


                        new Paragraph({
                            children: [
                                new PageBreak()
                            ]
                        }),


                        tituloSecao(
                            "3",
                            "PLANO E EXECUÇÃO DO SERVIÇO"
                        ),

                        execucao,

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "4",
                            "MATERIAIS, PEÇAS E RECURSOS UTILIZADOS"
                        ),

                        materiais,

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "5",
                            "CONTROLE DE EXECUÇÃO"
                        ),

                        controle,


                        new Paragraph({
                            children: [
                                new PageBreak()
                            ]
                        }),


                        tituloSecao(
                            "6",
                            "REGISTRO FOTOGRÁFICO - ANTES"
                        ),

                        blocoFoto(
                            "FOTO 01"
                        ),

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "7",
                            "REGISTRO FOTOGRÁFICO - DEPOIS"
                        ),

                        blocoFoto(
                            "FOTO 03"
                        ),


                        new Paragraph({
                            children: [
                                new PageBreak()
                            ]
                        }),


                        tituloSecao(
                            "8",
                            "ENCERRAMENTO E ACEITE"
                        ),

                        encerramento,

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "9",
                            "OBSERVAÇÕES FINAIS"
                        ),

                        new Table({

                            width: {
                                size: 100,
                                type:
                                    WidthType.PERCENTAGE
                            },

                            borders:
                                bordasTabela,

                            rows: [

                                linhaEmBranco(),
                                linhaEmBranco(),
                                linhaEmBranco()

                            ]

                        }),

                        new Paragraph({
                            spacing: {
                                after: 180
                            }
                        }),


                        tituloSecao(
                            "10",
                            "ASSINATURAS"
                        ),

                        assinaturas

                    ]

                }

            ]

        });



    // =====================================================================
    // GERAR ARQUIVO
    // =====================================================================

    const blob =
        await Packer.toBlob(
            documento
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `OS_${osAtual.numero_os}_PARA_EXECUCAO.docx`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },

        1500
    );

}


// ------------------------------------------------------------------------------------------------------------
// FINALIZAR OS INTERNA
// ------------------------------------------------------------------------------------------------------------

function osFinalizar() {

    osSalvarEtapaAtual();

    if (!osAtual) {
        alert("Nenhuma OS ativa.");
        return;
    }

    osAbrirPreviewFinal();
}

// ============================================================================================================
// ============================================================================================================
//                              PREVIEW + ASSINATURA + PDF FINAL DA OS
//
// ESTE BLOCO É RESPONSÁVEL PELO ENCERRAMENTO DA ORDEM DE SERVIÇO.
//
// FLUXO:
//
//      FINALIZAR OS
//          ↓
//      GERAR PDF
//          ↓
//      ABRIR PREVIEW
//          ↓
//      RESPONSÁVEL DA LOJA CONFERE
//          ↓
//      INFORMA O NOME
//          ↓
//      ASSINA DIGITALMENTE
//          ↓
//      BAIXAR PDF FINAL
//
// NÃO REMOVER ESTE BLOCO.
// FUTURAMENTE ELE PODERÁ SER SEPARADO PARA os-pdf.js
//
// ============================================================================================================
// ============================================================================================================


let osAssinaturaCanvas = null;
let osAssinaturaCtx = null;

let osAssinando = false;

let osAssinaturaRealizada = false;


// ============================================================================================================
// INICIALIZAR CANVAS DA ASSINATURA
// ============================================================================================================

function osIniciarCanvasAssinatura() {

    osAssinaturaCanvas =
        document.getElementById("osAssinaturaCanvas");

    if (!osAssinaturaCanvas) {
        console.error("Canvas da assinatura da OS não encontrado.");
        return;
    }


    osAssinaturaCtx =
        osAssinaturaCanvas.getContext("2d");


    osAssinaturaCtx.strokeStyle = "#000000";

    osAssinaturaCtx.lineWidth = 4;

    osAssinaturaCtx.lineCap = "round";

    osAssinaturaCtx.lineJoin = "round";


    // Impede adicionar os eventos mais de uma vez.

    if (
        osAssinaturaCanvas.dataset.iniciado === "1"
    ) {
        return;
    }


    osAssinaturaCanvas.dataset.iniciado = "1";


    function obterPosicao(event) {

        const rect =
            osAssinaturaCanvas.getBoundingClientRect();


        const ponto =
            event.touches &&
                event.touches.length
                ? event.touches[0]
                : event;


        return {

            x:
                (ponto.clientX - rect.left) *
                (
                    osAssinaturaCanvas.width /
                    rect.width
                ),

            y:
                (ponto.clientY - rect.top) *
                (
                    osAssinaturaCanvas.height /
                    rect.height
                )

        };

    }


    function iniciar(event) {

        event.preventDefault();


        osAssinando = true;


        const pos =
            obterPosicao(event);


        osAssinaturaCtx.beginPath();


        osAssinaturaCtx.moveTo(
            pos.x,
            pos.y
        );

    }


    function desenhar(event) {

        if (!osAssinando) {
            return;
        }


        event.preventDefault();


        const pos =
            obterPosicao(event);


        osAssinaturaCtx.lineTo(
            pos.x,
            pos.y
        );


        osAssinaturaCtx.stroke();


        osAssinaturaRealizada = true;

    }


    function finalizar() {

        osAssinando = false;


        if (osAssinaturaCtx) {

            osAssinaturaCtx.closePath();

        }

    }


    // MOUSE

    osAssinaturaCanvas.addEventListener(
        "mousedown",
        iniciar
    );


    osAssinaturaCanvas.addEventListener(
        "mousemove",
        desenhar
    );


    osAssinaturaCanvas.addEventListener(
        "mouseup",
        finalizar
    );


    osAssinaturaCanvas.addEventListener(
        "mouseleave",
        finalizar
    );


    // CELULAR / TABLET

    osAssinaturaCanvas.addEventListener(
        "touchstart",
        iniciar,
        {
            passive: false
        }
    );


    osAssinaturaCanvas.addEventListener(
        "touchmove",
        desenhar,
        {
            passive: false
        }
    );


    osAssinaturaCanvas.addEventListener(
        "touchend",
        finalizar
    );

}


// ============================================================================================================
// LIMPAR ASSINATURA
// ============================================================================================================

function osLimparAssinatura() {

    if (
        osAssinaturaCanvas &&
        osAssinaturaCtx
    ) {

        osAssinaturaCtx.clearRect(

            0,

            0,

            osAssinaturaCanvas.width,

            osAssinaturaCanvas.height

        );

    }


    osAssinaturaRealizada = false;

    osAssinando = false;

}


// ============================================================================================================
// COLETAR CHECKLIST DA OS
// ============================================================================================================

function osColetarChecklist() {

    const itens =
        osObterTodosItensChecklist();


    return itens.map(
        (item, index) => {


            const selecionado =

                document.querySelector(

                    `input[name="os-check-${index}"]:checked`

                );


            const descricao =

                document.getElementById(
                    `osNCDesc-${index}`
                )?.value?.trim() || "";


            const acao =

                document.getElementById(
                    `osNCAcao-${index}`
                )?.value?.trim() || "";


            return {

                numero:
                    item.numero,

                pergunta:
                    item.pergunta,

                peso:
                    item.peso,

                area:
                    item.area,

                areaTitulo:
                    item.areaTitulo,

                resultado:
                    selecionado?.value || "",

                descricao:
                    descricao,

                acao:
                    acao,

                fotos:
                    osFotosNaoConformidades[index] || []

            };

        }
    );

}


// ============================================================================================================
// GERAR DOCUMENTO DA OS
// ============================================================================================================

function osGerarDocumento(
    modo = "preview"
) {

    if (!osAtual) {

        throw new Error(
            "Nenhuma OS ativa."
        );

    }


    osSalvarEtapaAtual();


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        throw new Error(
            "jsPDF não carregado."
        );

    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF({

            orientation: "portrait",

            unit: "mm",

            format: "a4"

        });


    const margem = 15;

    const largura = 180;

    let y = 18;


    // =====================================================================
    // NOVA PÁGINA AUTOMÁTICA
    // =====================================================================

    function novaPaginaSePreciso(
        altura = 20
    ) {

        if (
            y + altura > 280
        ) {

            doc.addPage();

            y = 18;

        }

    }


    // =====================================================================
    // TÍTULO DAS SEÇÕES
    // =====================================================================

    function tituloSecao(
        titulo
    ) {

        novaPaginaSePreciso(14);


        doc.setFillColor(
            23,
            54,
            93
        );


        doc.rect(
            margem,
            y,
            largura,
            8,
            "F"
        );


        doc.setTextColor(
            255,
            255,
            255
        );


        doc.setFont(
            "helvetica",
            "bold"
        );


        doc.setFontSize(10);


        doc.text(
            titulo,
            margem + 3,
            y + 5.4
        );


        doc.setTextColor(
            0,
            0,
            0
        );


        y += 12;

    }


    // =====================================================================
    // CAMPOS DE TEXTO
    // =====================================================================

    function textoCampo(
        titulo,
        valor
    ) {

        novaPaginaSePreciso(18);


        doc.setFont(
            "helvetica",
            "bold"
        );


        doc.setFontSize(9);


        doc.text(
            titulo,
            margem,
            y
        );


        y += 5;


        doc.setFont(
            "helvetica",
            "normal"
        );


        const linhas =
            doc.splitTextToSize(

                String(
                    valor || "-"
                ),

                largura

            );


        doc.text(
            linhas,
            margem,
            y
        );


        y += Math.max(

            8,

            linhas.length * 4.4 + 3

        );

    }


    // =====================================================================
    // CABEÇALHO
    // =====================================================================

    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(16);


    doc.text(

        "ORDEM DE SERVIÇO - MANUTENÇÃO PREDIAL",

        105,

        y,

        {
            align: "center"
        }

    );


    y += 12;

    // =====================================================================
    // CABEÇALHO DA ORDEM DE SERVIÇO
    // =====================================================================

    const azulAREIS = [23, 54, 93];


    // faixa superior
    doc.setFillColor(...azulAREIS);

    doc.rect(
        0,
        0,
        210,
        27,
        "F"
    );


    // marca
    doc.setTextColor(
        255,
        255,
        255
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(17);

    doc.text(
        " ",
        margem,
        11
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(10);

    doc.text(
        " ",
        34,
        11
    );


    // título
    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(13);

    doc.text(
        "ORDEM DE SERVIÇO",
        195,
        10,
        {
            align: "right"
        }
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(8);

    doc.text(
        "MANUTENÇÃO PREDIAL",
        195,
        16,
        {
            align: "right"
        }
    );


    // Número da OS
    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(9);

    doc.text(
        `OS Nº ${osAtual.numero_os}`,
        195,
        22,
        {
            align: "right"
        }
    );


    // volta para texto preto
    doc.setTextColor(
        0,
        0,
        0
    );


    y = 35;


    // =====================================================================
    // BLOCO DE IDENTIFICAÇÃO DA LOJA
    // =====================================================================

    doc.setFillColor(
        245,
        247,
        250
    );

    doc.roundedRect(
        margem,
        y,
        largura,
        32,
        3,
        3,
        "F"
    );


    // coluna esquerda
    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(7);

    doc.setTextColor(
        100,
        100,
        100
    );

    doc.text(
        "UNIDADE",
        margem + 5,
        y + 7
    );


    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(11);

    doc.setTextColor(
        20,
        20,
        20
    );


    const nomeLojaCabecalho =
        osAtual.loja_nome
            ? `Loja ${osAtual.loja} - ${osAtual.loja_nome}`
            : `Loja ${osAtual.loja}`;


    doc.text(
        nomeLojaCabecalho,
        margem + 5,
        y + 14
    );


    // endereço
    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(8);


    const enderecoCompleto = [

        osAtual.endereco,

        [
            osAtual.cidade,
            osAtual.uf
        ]
            .filter(Boolean)
            .join(" - "),

        osAtual.cep
            ? `CEP ${osAtual.cep}`
            : ""

    ]
        .filter(Boolean)
        .join(" | ");


    const linhasEndereco =
        doc.splitTextToSize(
            enderecoCompleto || "Endereço não cadastrado",
            112
        );


    doc.text(
        linhasEndereco,
        margem + 5,
        y + 21
    );


    // divisor vertical
    doc.setDrawColor(
        215,
        220,
        225
    );

    doc.line(
        145,
        y + 5,
        145,
        y + 27
    );


    // coluna direita
    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(7);

    doc.setTextColor(
        100,
        100,
        100
    );

    doc.text(
        "CHAMADO",
        151,
        y + 7
    );


    doc.setTextColor(
        20,
        20,
        20
    );

    doc.setFontSize(11);

    doc.text(
        `#${osAtual.numero_chamado}`,
        151,
        y + 14
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(7.5);

    doc.setTextColor(
        90,
        90,
        90
    );

    doc.text(
        `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
        151,
        y + 22
    );


    doc.setTextColor(
        0,
        0,
        0
    );


    y += 40;


    textoCampo(

        "Descrição informada pelo solicitante:",

        osAtual.descricao_solicitante

    );


    doc.setFont(
        "helvetica",
        "normal"
    );


    doc.setFontSize(9);


    const classificacao =
        `Tipo: ${osAtual.tipo || "-"} | ` +
        `Especialidade: ${osAtual.especialidade || "-"} | ` +
        `Prioridade: ${osAtual.prioridade || "-"}`;


    const linhasClassificacao =
        doc.splitTextToSize(
            classificacao,
            largura
        );


    doc.text(
        linhasClassificacao,
        margem,
        y
    );


    y +=
        linhasClassificacao.length * 5 + 5;


    textoCampo(

        "Diagnóstico inicial:",

        osAtual.diagnostico

    );


    // =====================================================================
    // 2 - CHECKLIST
    // =====================================================================

    tituloSecao(
        "2. CHECKLIST DE INSPEÇÃO"
    );


    const checklist =
        osColetarChecklist();


    // =====================================================================
    // CHECKLIST - MOSTRA SOMENTE ITENS RESPONDIDOS
    // =====================================================================

    const checklistRespondido =
        checklist.filter(item => item.resultado);


    // Se ninguém respondeu nenhum item
    if (!checklistRespondido.length) {

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(9);

        doc.text(
            "Nenhum item de inspeção foi registrado nesta OS.",
            margem,
            y
        );

        y += 10;

    }


    // Agrupa os itens respondidos por área
    const areasRespondidas = {};


    checklistRespondido.forEach(item => {

        if (!areasRespondidas[item.area]) {

            areasRespondidas[item.area] = {
                titulo: item.areaTitulo,
                itens: []
            };

        }

        areasRespondidas[item.area].itens.push(item);

    });


    // =====================================================================
    // DESENHA SOMENTE AS ÁREAS QUE TIVERAM ALGUMA RESPOSTA
    // =====================================================================

    Object.entries(areasRespondidas).forEach(
        ([numeroArea, area]) => {


            novaPaginaSePreciso(18);


            // -------------------------------------------------------------
            // CABEÇALHO DA ÁREA
            // -------------------------------------------------------------

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(9);

            doc.setTextColor(
                23,
                54,
                93
            );


            const tituloArea =
                `${numeroArea}. ${area.titulo}`;


            const linhasArea =
                doc.splitTextToSize(
                    tituloArea,
                    largura
                );


            doc.text(
                linhasArea,
                margem,
                y
            );


            y +=
                linhasArea.length * 4.5 +
                3;


            doc.setTextColor(
                0,
                0,
                0
            );


            // -------------------------------------------------------------
            // ITENS RESPONDIDOS
            // -------------------------------------------------------------

            area.itens.forEach(item => {


                novaPaginaSePreciso(15);


                let resultadoTexto = "";


                if (item.resultado === "C") {

                    resultadoTexto =
                        "CONFORME";

                }


                else if (item.resultado === "NC") {

                    resultadoTexto =
                        "NÃO CONFORME";
                    if (
                        item.fotos &&
                        item.fotos.length
                    ) {

                        doc.setFont(
                            "helvetica",
                            "bold"
                        );

                        doc.setFontSize(8);

                        doc.setTextColor(
                            23,
                            54,
                            93
                        );

                        doc.text(
                            `Imagens: item ${item.numero}`,
                            margem + 3,
                            y
                        );

                        doc.setTextColor(
                            0,
                            0,
                            0
                        );

                        y += 5;
                    }
                }


                else if (item.resultado === "NA") {

                    resultadoTexto =
                        "N/A";

                }


                // Não deveria acontecer porque já filtramos,
                // mas serve como proteção.
                else {

                    return;

                }


                // ---------------------------------------------------------
                // NÚMERO + PERGUNTA
                // ---------------------------------------------------------

                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(8.5);


                const textoItem =

                    `${item.numero} ${item.pergunta} - ${resultadoTexto}`;


                const linhasItem =
                    doc.splitTextToSize(
                        textoItem,
                        largura
                    );


                doc.text(
                    linhasItem,
                    margem,
                    y
                );


                y +=
                    linhasItem.length *
                    4.3 +
                    2;


                // ---------------------------------------------------------
                // NÃO CONFORMIDADE
                // ---------------------------------------------------------

                if (
                    item.resultado === "NC"
                ) {


                    if (item.descricao) {


                        doc.setFont(
                            "helvetica",
                            "normal"
                        );


                        doc.setFontSize(8);


                        const descricaoNC =
                            doc.splitTextToSize(

                                `Descrição: ${item.descricao}`,

                                largura - 5

                            );


                        doc.text(

                            descricaoNC,

                            margem + 3,

                            y

                        );


                        y +=
                            descricaoNC.length *
                            4 +
                            2;

                    }


                    if (item.acao) {


                        doc.setFont(
                            "helvetica",
                            "normal"
                        );


                        const acaoNC =
                            doc.splitTextToSize(

                                `Ação recomendada: ${item.acao}`,

                                largura - 5

                            );


                        doc.text(

                            acaoNC,

                            margem + 3,

                            y

                        );


                        y +=
                            acaoNC.length *
                            4 +
                            2;

                    }

                }


                y += 3;

            });


            y += 4;

        }
    );


    y += 4;


    // =====================================================================
    // 3 - EXECUÇÃO
    // =====================================================================

    tituloSecao(
        "3. EXECUÇÃO"
    );


    textoCampo(

        "Serviço a executar:",

        osAtual.servico_executar

    );


    textoCampo(

        "Serviço executado:",

        osAtual.servico_executado

    );


    textoCampo(

        "Pendências:",

        osAtual.pendencias

    );


    // =====================================================================
    // 4 - MATERIAIS
    // =====================================================================

    tituloSecao(
        "4. MATERIAIS UTILIZADOS"
    );


    if (
        !osMateriais.length
    ) {

        textoCampo(

            "Materiais:",

            "Nenhum material informado."

        );

    }

    else {


        osMateriais.forEach(
            (material, index) => {


                novaPaginaSePreciso(8);


                doc.setFont(
                    "helvetica",
                    "normal"
                );


                doc.setFontSize(9);


                const linhaMaterial =

                    `${index + 1}. ` +

                    `${material.material || "-"} | ` +

                    `Qtd.: ${material.quantidade || "-"} | ` +

                    `Un.: ${material.unidade || "-"}`;


                doc.text(

                    linhaMaterial,

                    margem,

                    y

                );


                y += 6;

            }
        );

    }


    y += 4;


    // =====================================================================
    // 5 - EVIDÊNCIAS
    // =====================================================================

    tituloSecao(
        "5. EVIDÊNCIAS FOTOGRÁFICAS"
    );


    function inserirFotos(
        lista,
        titulo
    ) {

        if (
            !lista ||
            !lista.length
        ) {

            return;

        }


        novaPaginaSePreciso(15);


        doc.setFont(
            "helvetica",
            "bold"
        );


        doc.setFontSize(9);


        doc.text(
            titulo,
            margem,
            y
        );


        y += 6;


        let coluna = 0;


        lista.forEach(
            (foto, index) => {


                novaPaginaSePreciso(48);


                const x =
                    coluna === 0
                        ? margem
                        : 108;


                try {

                    doc.addImage(

                        foto.src,

                        "JPEG",

                        x,

                        y,

                        82,

                        42,

                        undefined,

                        "FAST"

                    );

                }

                catch (erro) {

                    console.warn(

                        "Não foi possível inserir foto:",

                        erro

                    );

                }


                coluna++;


                if (
                    coluna === 2 ||
                    index === lista.length - 1
                ) {

                    coluna = 0;

                    y += 48;

                }

            }
        );

    }

    // =====================================================================
    // EVIDÊNCIAS DAS NÃO CONFORMIDADES
    // =====================================================================

    const checklistComFotos =
        osColetarChecklist()
            .filter(item =>
                item.resultado === "NC" &&
                item.fotos &&
                item.fotos.length
            );


    checklistComFotos.forEach(item => {

        novaPaginaSePreciso(25);


        // -------------------------------------------------------------
        // ITEM
        // -------------------------------------------------------------

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(9);

        doc.setTextColor(
            23,
            54,
            93
        );


        const tituloItem =
            `ITEM ${item.numero} - ${item.pergunta}`;


        const linhasTitulo =
            doc.splitTextToSize(
                tituloItem,
                largura
            );


        doc.text(
            linhasTitulo,
            margem,
            y
        );


        y +=
            linhasTitulo.length * 4.5 +
            4;


        doc.setTextColor(
            0,
            0,
            0
        );


        // -------------------------------------------------------------
        // FOTOS EM 2 COLUNAS
        // -------------------------------------------------------------

        let coluna = 0;


        item.fotos.forEach(
            (foto, index) => {


                novaPaginaSePreciso(52);


                const x =
                    coluna === 0
                        ? margem
                        : 108;


                try {

                    doc.addImage(
                        foto.src,
                        "JPEG",
                        x,
                        y,
                        82,
                        46,
                        undefined,
                        "FAST"
                    );

                }
                catch (erro) {

                    console.warn(
                        `Erro ao inserir imagem do item ${item.numero}:`,
                        erro
                    );

                }


                coluna++;


                if (
                    coluna === 2 ||
                    index === item.fotos.length - 1
                ) {

                    coluna = 0;

                    y += 51;

                }

            }
        );


        // -------------------------------------------------------------
        // DESCRIÇÃO DO ITEM ABAIXO DAS FOTOS
        // -------------------------------------------------------------

        if (item.descricao) {

            novaPaginaSePreciso(15);

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(8);

            doc.text(
                "Descrição:",
                margem,
                y
            );

            y += 4;


            doc.setFont(
                "helvetica",
                "normal"
            );


            const linhasDescricao =
                doc.splitTextToSize(
                    item.descricao,
                    largura
                );


            doc.text(
                linhasDescricao,
                margem,
                y
            );


            y +=
                linhasDescricao.length * 4 +
                5;

        }


        // -------------------------------------------------------------
        // AÇÃO RECOMENDADA
        // -------------------------------------------------------------

        if (item.acao) {

            novaPaginaSePreciso(15);

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.text(
                "Ação recomendada:",
                margem,
                y
            );

            y += 4;


            doc.setFont(
                "helvetica",
                "normal"
            );


            const linhasAcao =
                doc.splitTextToSize(
                    item.acao,
                    largura
                );


            doc.text(
                linhasAcao,
                margem,
                y
            );


            y +=
                linhasAcao.length * 4 +
                5;

        }


        y += 7;

    });

    inserirFotos(

        osFotosAntes,

        "ANTES"

    );


    inserirFotos(

        osFotosDepois,

        "DEPOIS"

    );


    // =====================================================================
    // 6 - ENCERRAMENTO
    // =====================================================================

    tituloSecao(
        "6. ENCERRAMENTO"
    );


    textoCampo(

        "Resultado:",

        osAtual.resultado

    );


    textoCampo(

        "Condição final:",

        osAtual.condicao_final

    );


    textoCampo(

        "Observações finais:",

        osAtual.observacoes_finais

    );


    // =====================================================================
    // 7 - ASSINATURA
    // SOMENTE NO PDF FINAL
    // =====================================================================

    if (
        modo === "final"
    ) {


        novaPaginaSePreciso(60);


        tituloSecao(

            "7. ACEITE DO RESPONSÁVEL DA LOJA"

        );


        const nomeResponsavel =

            document
                .getElementById(
                    "osNomeResponsavelLoja"
                )
                ?.value
                ?.trim() || "";


        doc.setFont(
            "helvetica",
            "normal"
        );


        doc.setFontSize(9);


        doc.text(

            `Responsável: ${nomeResponsavel}`,

            margem,

            y

        );


        y += 7;


        if (
            osAssinaturaCanvas &&
            osAssinaturaRealizada
        ) {


            const assinatura =

                osAssinaturaCanvas
                    .toDataURL(
                        "image/png"
                    );


            doc.addImage(

                assinatura,

                "PNG",

                margem,

                y,

                75,

                22

            );


            y += 25;

        }


        doc.setDrawColor(80);


        doc.line(

            margem,

            y,

            90,

            y

        );


        y += 5;


        doc.setFontSize(8);


        doc.text(

            "Assinatura do Responsável da Loja",

            margem,

            y

        );


        const dataHora =

            new Date()
                .toLocaleString(
                    "pt-BR"
                );


        doc.text(

            `Data/Hora: ${dataHora}`,

            115,

            y

        );

    }


    return doc;

}


// ============================================================================================================
// ABRIR PREVIEW DA OS
// ============================================================================================================

async function osAbrirPreviewFinal() {

    try {


        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            alert(
                "Biblioteca de PDF não encontrada."
            );

            return;

        }


        const modal =

            document.getElementById(
                "modalPreviewOS"
            );


        const paginasContainer =

            document.getElementById(
                "previewOSPaginas"
            );


        if (
            !modal ||
            !paginasContainer
        ) {

            alert(
                "Erro no preview da OS:\n\n" +
                (erro?.message || erro)
            );

            return;

        }


        document
            .getElementById(
                "osPreviewNumero"
            )
            .innerText =
            `OS #${osAtual.numero_os}`;


        modal.classList.remove(
            "hidden"
        );


        osIniciarCanvasAssinatura();


        paginasContainer.innerHTML = `

            <div style="
                padding:40px;
                text-align:center;
                color:#777;
                font-family:Arial,sans-serif;
            ">

                Gerando pré-visualização da OS...

            </div>

        `;


        const doc =
            osGerarDocumento(
                "preview"
            );


        const blob =
            doc.output(
                "blob"
            );


        const arrayBuffer =
            await blob.arrayBuffer();


        const pdf =
            await pdfjsLib
                .getDocument({

                    data: arrayBuffer

                })
                .promise;


        paginasContainer.innerHTML =
            "";


        // =================================================================
        // MOSTRAR TODAS AS PÁGINAS
        // =================================================================

        for (

            let numeroPagina = 1;

            numeroPagina <= pdf.numPages;

            numeroPagina++

        ) {


            const pagina =
                await pdf.getPage(
                    numeroPagina
                );


            const viewportOriginal =
                pagina.getViewport({

                    scale: 1

                });


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


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.style.width =
                "100%";


            wrapper.style.maxWidth =
                `${viewport.width}px`;


            wrapper.style.background =
                "#ffffff";


            wrapper.style.borderRadius =
                "8px";


            wrapper.style.overflow =
                "hidden";


            wrapper.style.boxShadow =
                "0 2px 10px rgba(0,0,0,0.12)";


            const canvas =
                document.createElement(
                    "canvas"
                );


            const context =
                canvas.getContext(
                    "2d"
                );


            const pixelRatio =
                window.devicePixelRatio ||
                1;


            canvas.width =

                Math.floor(

                    viewport.width *
                    pixelRatio

                );


            canvas.height =

                Math.floor(

                    viewport.height *
                    pixelRatio

                );


            canvas.style.width =
                `${viewport.width}px`;


            canvas.style.height =
                `${viewport.height}px`;


            const indicador =
                document.createElement(
                    "div"
                );


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


            wrapper.appendChild(
                canvas
            );


            wrapper.appendChild(
                indicador
            );


            paginasContainer.appendChild(
                wrapper
            );


            await pagina.render({

                canvasContext:
                    context,

                viewport:
                    viewport,

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

    }

    catch (erro) {


        console.error(

            "Erro ao abrir preview da OS:",

            erro

        );


        alert(

            "Não foi possível gerar a pré-visualização da OS."

        );

    }

}


// ============================================================================================================
// FECHAR PREVIEW
// ============================================================================================================

function osFecharPreview() {

    const modal =

        document.getElementById(
            "modalPreviewOS"
        );


    const paginasContainer =

        document.getElementById(
            "previewOSPaginas"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    if (paginasContainer) {

        paginasContainer.innerHTML =
            "";

    }

}


// ============================================================================================================
// BAIXAR PDF FINAL
// ============================================================================================================

async function osBaixarPdfFinal() {

    const botao =

        document.getElementById(
            "btnBaixarOSFinal"
        );


    try {


        if (!osAtual) {

            alert(
                "Nenhuma OS ativa."
            );

            return;

        }


        // ================================================================
        // VALIDAR NOME
        // ================================================================

        const nomeResponsavel =

            document
                .getElementById(
                    "osNomeResponsavelLoja"
                )
                ?.value
                ?.trim();


        if (!nomeResponsavel) {

            alert(
                "Informe o nome do responsável da loja."
            );

            return;

        }


        // ================================================================
        // VALIDAR ASSINATURA
        // ================================================================

        if (
            !osAssinaturaRealizada
        ) {

            alert(
                "A assinatura do responsável da loja é obrigatória."
            );

            return;

        }


        if (botao) {

            botao.disabled =
                true;


            botao.innerText =
                "GERANDO PDF...";


            botao.style.opacity =
                "0.6";

        }


        // ================================================================
        // GERAR PDF COM ASSINATURA
        // ================================================================

        const doc =

            osGerarDocumento(
                "final"
            );


        // ================================================================
        // DOWNLOAD
        // ================================================================

        doc.save(

            `OS_${osAtual.numero_os}.pdf`

        );


        // ================================================================
        // ALTERAR STATUS
        // ================================================================

        const status =

            document.getElementById(
                "osStatus"
            );


        if (status) {


            status.innerText =
                "CONCLUÍDA";


            status.className =

                "px-4 py-2 rounded-full " +

                "text-[10px] font-bold " +

                "bg-emerald-500/10 " +

                "text-emerald-500";

        }


        console.log(

            "OS FINALIZADA:",

            {

                ...osAtual,

                responsavel_loja:
                    nomeResponsavel,

                materiais:
                    osMateriais,

                fotos_antes:
                    osFotosAntes,

                fotos_depois:
                    osFotosDepois,

                checklist:
                    osColetarChecklist()

            }

        );


        alert(

            `OS #${osAtual.numero_os} gerada com sucesso.`

        );


        osFecharPreview();

    }

    catch (erro) {


        console.error(

            "Erro ao gerar PDF final da OS:",

            erro

        );

        alert(
            "Erro ao gerar PDF final:\n\n" +
            (erro?.message || erro)
        );

    }

    finally {


        if (botao) {


            botao.disabled =
                false;


            botao.innerText =
                "BAIXAR PDF FINAL";


            botao.style.opacity =
                "1";

        }

    }

}


// ============================================================================================================
// ============================================================================================================
// ============================================================================================================
//                                      FIM DO MÓDULO DE OS
// ============================================================================================================

// ============================================================================
// LOJAS E PRESTADORES
// ============================================================================
//
// Este módulo possui uma fonte de dados própria.
//
// Relatórios, OS e fotos continuam usando `db.lojas`.
// Esta tela consulta somente `lojas_enderecos_temp`.
//
// Se a estrutura da tabela mudar no Supabase, os principais pontos para
// manutenção são:
// - carregarLojasPrestadores(): consulta os registros;
// - renderizarTabelaLojas(): define quais colunas aparecem;
// - copiarLojasSelecionadas(): define o formato copiado para o e-mail.
//
// Dessa forma, alterações neste módulo não interferem nos outros recursos.
// ============================================================================

let lojasFiltroSelecionadas = new Set();
let lojasFiltradasAtuais = [];


// ============================================================================
// CARREGAMENTO DAS LOJAS
// ============================================================================
//
// Busca os registros usados exclusivamente nesta tela.
// A função é chamada quando o usuário abre "Lojas e Prestadores" pela Home.
// ============================================================================

async function carregarLojasPrestadores() {

    try {

        const { data, error } = await supabaseClient
            .from("lojas_enderecos_temp")
            .select("*");


        if (error) {

            console.error(
                "Erro ao carregar lojas_enderecos_temp:",
                error
            );

            lojasEnderecosTemp = [];

            renderizarTabelaLojas();

            return;
        }


        lojasEnderecosTemp =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Lojas carregadas em Lojas e Prestadores:",
            lojasEnderecosTemp.length
        );


        renderizarTabelaLojas();


    } catch (error) {

        console.error(
            "Erro inesperado ao carregar lojas_enderecos_temp:",
            error
        );


        lojasEnderecosTemp = [];

        renderizarTabelaLojas();

    }

}


// ============================================================================
// ABAS DO MÓDULO
// ============================================================================
//
// Atualmente apenas Lojas está disponível.
// A estrutura de Prestadores permanece pronta para receber o cadastro depois.
// ============================================================================

function abrirAbaCadastros(aba) {

    const abaLojas =
        document.getElementById("cadastrosAbaLojas");

    const abaPrestadores =
        document.getElementById("cadastrosAbaPrestadores");

    const btnLojas =
        document.getElementById("btnAbaLojas");

    const btnPrestadores =
        document.getElementById("btnAbaPrestadores");


    if (aba === "lojas") {

        abaLojas?.classList.remove("hidden");

        abaPrestadores?.classList.add("hidden");


        if (btnLojas) {

            btnLojas.className =
                "px-5 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold";

        }


        if (btnPrestadores) {

            btnPrestadores.className =
                "px-5 py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-bold opacity-60";

        }


        renderizarTabelaLojas();


    } else {

        abaLojas?.classList.add("hidden");

        abaPrestadores?.classList.remove("hidden");


        if (btnPrestadores) {

            btnPrestadores.className =
                "px-5 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold";

        }


        if (btnLojas) {

            btnLojas.className =
                "px-5 py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-bold opacity-60";

        }

    }

}


// ============================================================================
// TABELA DE LOJAS
// ============================================================================
//
// Monta a tabela com os registros de `lojas_enderecos_temp`.
// Nenhuma informação de `db.lojas` é utilizada aqui.
// ============================================================================

function renderizarTabelaLojas() {

    const tbody =
        document.getElementById("tabelaLojasBody");


    if (!tbody) {
        return;
    }


let lojas =
    Array.isArray(lojasEnderecosTemp)
        ? [...lojasEnderecosTemp]
        : [];

    // Quando existe um filtro, mantém somente as lojas marcadas.
    if (lojasFiltroSelecionadas.size > 0) {

        lojas =
            lojas.filter(loja => {

                const codigo =
                    String(
                        loja.LOJA ?? ""
                    ).trim();


                return lojasFiltroSelecionadas.has(
                    codigo
                );

            });

    }


    // Ordena numericamente quando o código da loja é um número.
    // Caso não seja, mantém uma ordenação alfabética normal.
    lojas.sort((a, b) => {

        const aNum =
            Number(a.LOJA);

        const bNum =
            Number(b.LOJA);


        if (
            !Number.isNaN(aNum) &&
            !Number.isNaN(bNum)
        ) {

            return aNum - bNum;

        }


        return String(a.LOJA ?? "")
            .localeCompare(
                String(b.LOJA ?? ""),
                "pt-BR"
            );

    });


    // Guarda exatamente o que está aparecendo na tabela.
    // Esta mesma lista será usada pelo botão "Copiar seleção".
    lojasFiltradasAtuais =
        lojas;


    if (!lojas.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="
                        border
                        border-black/20
                        px-4
                        py-10
                        text-center
                        opacity-50
                    "
                >
                    Nenhuma loja encontrada.
                </td>

            </tr>

        `;


        atualizarContadorLojas();

        return;

    }


    tbody.innerHTML =
        lojas
            .map(loja => {

                const codigo =
                    escaparHtml(
                        loja.LOJA ?? ""
                    );


                const nome =
                    escaparHtml(
                        loja.NOME ?? ""
                    );


                const uf =
                    escaparHtml(
                        loja.UF ?? ""
                    );


                const endereco =
                    escaparHtml(
                        loja["ENDEREÇO"] ??
                        loja.ENDERECO ??
                        ""
                    );


                const cidade =
                    escaparHtml(
                        loja.CIDADE ?? ""
                    );


                const cep =
                    escaparHtml(
                        loja.CEP ?? ""
                    );


                return `

                    <tr class="bg-white text-black hover:bg-gray-50">

                        <td class="border border-black/25 px-3 py-3 font-medium">
                            ${codigo}
                        </td>

                        <td class="border border-black/25 px-3 py-3">
                            ${nome}
                        </td>

                        <td class="border border-black/25 px-3 py-3 text-center">
                            ${uf}
                        </td>

                        <td class="border border-black/25 px-3 py-3">
                            ${endereco}
                        </td>

                        <td class="border border-black/25 px-3 py-3">
                            ${cidade}
                        </td>

                        <td class="border border-black/25 px-3 py-3 text-center">
                            ${cep}
                        </td>

                    </tr>

                `;

            })
            .join("");


    atualizarContadorLojas();

}


// ============================================================================
// FILTRO DA COLUNA LOJA
// ============================================================================

function toggleFiltroLojas(event) {

    event?.stopPropagation();


    const filtro =
        document.getElementById(
            "filtroLojasDropdown"
        );


    if (!filtro) {
        return;
    }


    const fechado =
        filtro.classList.contains("hidden");


    if (fechado) {

        renderizarOpcoesFiltroLojas();

        filtro.classList.remove("hidden");

    } else {

        filtro.classList.add("hidden");

    }

}


// ============================================================================
// OPÇÕES DO FILTRO
// ============================================================================
//
// A caixa de pesquisa serve apenas para localizar lojas dentro do menu.
// A tabela só é alterada quando o usuário confirma o filtro.
// ============================================================================

function renderizarOpcoesFiltroLojas() {

    const container =
        document.getElementById(
            "filtroLojasOpcoes"
        );


    if (!container) {
        return;
    }


    const pesquisa =
        String(
            document.getElementById(
                "filtroLojaPesquisa"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const lojas =
        (lojasEnderecosTemp || [])

            .map(loja =>
                String(
                    loja.LOJA ?? ""
                ).trim()
            )

            .filter(Boolean)

            // Evita mostrar o mesmo código duas vezes no filtro.
            .filter(
                (codigo, index, array) =>
                    array.indexOf(codigo) === index
            )

            .filter(codigo =>
                codigo
                    .toLowerCase()
                    .includes(pesquisa)
            )

            .sort((a, b) => {

                const aNum = Number(a);
                const bNum = Number(b);


                if (
                    !Number.isNaN(aNum) &&
                    !Number.isNaN(bNum)
                ) {

                    return aNum - bNum;

                }


                return a.localeCompare(
                    b,
                    "pt-BR"
                );

            });


    container.innerHTML =
        lojas
            .map(codigo => {

                const checked =
                    lojasFiltroSelecionadas.has(codigo)
                        ? "checked"
                        : "";


                return `

                    <label
                        class="
                            flex
                            items-center
                            gap-2
                            px-2
                            py-1.5
                            hover:bg-gray-100
                            cursor-pointer
                        "
                    >

                        <input
                            type="checkbox"
                            value="${escaparHtml(codigo)}"
                            ${checked}
                            onchange="
                                alternarLojaFiltro(
                                    '${escaparAtributoJS(codigo)}',
                                    this.checked
                                )
                            "
                        >

                        <span class="text-xs">
                            ${escaparHtml(codigo)}
                        </span>

                    </label>

                `;

            })
            .join("");


    atualizarCheckboxSelecionarTudo();

}


// ============================================================================
// MARCAR OU DESMARCAR UMA LOJA
// ============================================================================

function alternarLojaFiltro(
    codigo,
    marcado
) {

    codigo =
        String(codigo || "")
            .trim();


    if (!codigo) {
        return;
    }


    if (marcado) {

        lojasFiltroSelecionadas.add(
            codigo
        );

    } else {

        lojasFiltroSelecionadas.delete(
            codigo
        );

    }


    atualizarCheckboxSelecionarTudo();

}


// ============================================================================
// SELECIONAR TODAS AS LOJAS VISÍVEIS NO FILTRO
// ============================================================================

function marcarTodasLojasFiltro(
    marcado
) {

    const pesquisa =
        String(
            document.getElementById(
                "filtroLojaPesquisa"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const codigos =
        (lojasEnderecosTemp || [])

            .map(loja =>
                String(
                    loja.LOJA ?? ""
                ).trim()
            )

            .filter(Boolean)

            .filter(codigo =>
                codigo
                    .toLowerCase()
                    .includes(pesquisa)
            );


    codigos.forEach(codigo => {

        if (marcado) {

            lojasFiltroSelecionadas.add(
                codigo
            );

        } else {

            lojasFiltroSelecionadas.delete(
                codigo
            );

        }

    });


    renderizarOpcoesFiltroLojas();

}


// ============================================================================
// ESTADO DO "SELECIONAR TODAS"
// ============================================================================

function atualizarCheckboxSelecionarTudo() {

    const checkbox =
        document.getElementById(
            "filtroSelecionarTodas"
        );


    if (!checkbox) {
        return;
    }


    const pesquisa =
        String(
            document.getElementById(
                "filtroLojaPesquisa"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const visiveis =
        (lojasEnderecosTemp || [])

            .map(loja =>
                String(
                    loja.LOJA ?? ""
                ).trim()
            )

            .filter(Boolean)

            .filter(codigo =>
                codigo
                    .toLowerCase()
                    .includes(pesquisa)
            );


    checkbox.checked =
        visiveis.length > 0 &&
        visiveis.every(codigo =>
            lojasFiltroSelecionadas.has(
                codigo
            )
        );

}


// ============================================================================
// APLICAR FILTRO
// ============================================================================

function aplicarFiltroLojas() {

    document
        .getElementById(
            "filtroLojasDropdown"
        )
        ?.classList
        .add("hidden");


    renderizarTabelaLojas();

}


// ============================================================================
// LIMPAR FILTRO
// ============================================================================

function limparFiltroLojas() {

    lojasFiltroSelecionadas.clear();


    const pesquisa =
        document.getElementById(
            "filtroLojaPesquisa"
        );


    if (pesquisa) {

        pesquisa.value = "";

    }


    renderizarOpcoesFiltroLojas();

    renderizarTabelaLojas();

}


// ============================================================================
// CONTADOR DA TABELA
// ============================================================================

function atualizarContadorLojas() {

    const elemento =
        document.getElementById(
            "contadorLojasSelecionadas"
        );


    if (!elemento) {
        return;
    }


    if (
        lojasFiltroSelecionadas.size === 0
    ) {

        elemento.innerText =
            `${lojasEnderecosTemp.length} loja(s) exibida(s)`;

        return;

    }


    elemento.innerText =
        `${lojasFiltroSelecionadas.size} loja(s) selecionada(s)`;

}


// ============================================================================
// COPIAR LOJAS PARA E-MAIL
// ============================================================================
//
// Copia dois formatos ao mesmo tempo:
//
// HTML  -> Outlook/Gmail recebe a tabela formatada.
// Texto -> usado como alternativa caso o navegador não aceite HTML.
//
// O conteúdo copiado corresponde exatamente às linhas exibidas na tabela.
// ============================================================================

async function copiarLojasSelecionadas() {

    const lojas =
        lojasFiltradasAtuais || [];


    if (!lojas.length) {

        alert(
            "Nenhuma loja disponível para copiar."
        );

        return;

    }


    const linhasHtml =
        lojas
            .map(loja => `

                <tr>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(loja.LOJA ?? "")}
                    </td>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(loja.NOME ?? "")}
                    </td>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(loja.UF ?? "")}
                    </td>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(
                            loja["ENDEREÇO"] ??
                            loja.ENDERECO ??
                            ""
                        )}
                    </td>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(loja.CIDADE ?? "")}
                    </td>

                    <td style="border:1px solid #555;padding:8px;">
                        ${escaparHtml(loja.CEP ?? "")}
                    </td>

                </tr>

            `)
            .join("");


    const html = `

        <table style="
            border-collapse:collapse;
            font-family:Arial,sans-serif;
            font-size:12px;
        ">

            <thead>

                <tr style="
                    background:#a6a6a6;
                    color:#000000;
                    font-weight:bold;
                ">

                    <th style="border:1px solid #555;padding:8px;">
                        LOJA
                    </th>

                    <th style="border:1px solid #555;padding:8px;">
                        NOME
                    </th>

                    <th style="border:1px solid #555;padding:8px;">
                        UF
                    </th>

                    <th style="border:1px solid #555;padding:8px;">
                        ENDEREÇO
                    </th>

                    <th style="border:1px solid #555;padding:8px;">
                        CIDADE
                    </th>

                    <th style="border:1px solid #555;padding:8px;">
                        CEP
                    </th>

                </tr>

            </thead>

            <tbody>
                ${linhasHtml}
            </tbody>

        </table>

    `;


    const texto = [

        "LOJA\tNOME\tUF\tENDEREÇO\tCIDADE\tCEP",

        ...lojas.map(loja => [

            loja.LOJA ?? "",

            loja.NOME ?? "",

            loja.UF ?? "",

            loja["ENDEREÇO"] ??
            loja.ENDERECO ??
            "",

            loja.CIDADE ?? "",

            loja.CEP ?? ""

        ].join("\t"))

    ].join("\n");


    try {

        if (
            navigator.clipboard &&
            window.ClipboardItem
        ) {

            const item =
                new ClipboardItem({

                    "text/html":
                        new Blob(
                            [html],
                            {
                                type: "text/html"
                            }
                        ),

                    "text/plain":
                        new Blob(
                            [texto],
                            {
                                type: "text/plain"
                            }
                        )

                });


            await navigator.clipboard.write(
                [item]
            );


            alert(
                `${lojas.length} loja(s) copiadas.\n\nCopiado para área de transferência.`
            );


            return;

        }


        await navigator.clipboard.writeText(
            texto
        );


        alert(
            `${lojas.length} loja(s) copiadas.`
        );


    } catch (error) {

        console.error(
            "Erro ao copiar lojas:",
            error
        );


        copiarTabelaLojasFallback(
            html
        );

    }

}


// ============================================================================
// CÓPIA ALTERNATIVA
// ============================================================================
//
// Alguns navegadores bloqueiam ClipboardItem.
// Nesse caso é criado temporariamente um elemento fora da tela,
// copiado e removido logo em seguida.
// ============================================================================

function copiarTabelaLojasFallback(
    html
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.contentEditable =
        "true";


    elemento.style.position =
        "fixed";


    elemento.style.left =
        "-99999px";


    elemento.innerHTML =
        html;


    document.body.appendChild(
        elemento
    );


    const range =
        document.createRange();


    range.selectNodeContents(
        elemento
    );


    const selecao =
        window.getSelection();


    selecao.removeAllRanges();

    selecao.addRange(
        range
    );


    document.execCommand(
        "copy"
    );


    selecao.removeAllRanges();

    elemento.remove();


    alert(
        "Tabela copiada."
    );

}


// ============================================================================
// SEGURANÇA DOS DADOS EXIBIDOS
// ============================================================================
//
// Valores vindos do Supabase passam por estas funções antes de entrar no HTML.
// Isso também evita que caracteres especiais quebrem a tabela ou o filtro.
// ============================================================================

function escaparHtml(valor) {

    return String(
        valor ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escaparAtributoJS(valor) {

    return String(
        valor ?? ""
    )
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");

}


// ============================================================================
// FECHAR FILTRO AO CLICAR FORA
// ============================================================================

document.addEventListener(
    "click",
    event => {

        const filtro =
            document.getElementById(
                "filtroLojasDropdown"
            );


        if (
            filtro &&
            !filtro.contains(event.target)
        ) {

            const clicouBotaoFiltro =
                event.target.closest(
                    "[onclick*='toggleFiltroLojas']"
                );


            if (!clicouBotaoFiltro) {

                filtro.classList.add(
                    "hidden"
                );

            }

        }

    }
);
// ============================================================================
// MÓDULO DE FATURAMENTO — AREISPRO
// ============================================================================

const fatState = {
    mes: null,
    servicos: [],
    parcelas: [],
    lotes: [],
    itensLote: [],
    regras: [],
    lojas: [],
    inicializado: false,
    loteSelecao: new Set()
};

function fatNorm(v = '') {
    return String(v ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fatMoney(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fatMonthStart(value) {
    const raw = String(value || '').slice(0, 7);
    return raw ? `${raw}-01` : null;
}

function fatMonthKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fatAddMonths(yyyyMm, offset) {
    const [y, m] = yyyyMm.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return fatMonthKey(d);
}

function fatNomeMes(yyyyMm) {
    const [y, m] = yyyyMm.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const nome = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function fatMesEhPassado(yyyyMm) {
    return yyyyMm < fatMonthKey(new Date());
}

function fatGet(obj, ...keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }
    return '';
}

function fatClassificarServico(nome) {
    const n = fatNorm(nome);
    const regras = (fatState.regras || []).filter(r => r.ativo !== false);
    const exata = regras.find(r => n === fatNorm(r.servico_normalizado) || n === fatNorm(r.servico_nome));
    if (exata) return exata.tipo_padrao;
    const parcial = regras
        .filter(r => n.includes(fatNorm(r.servico_normalizado)) || fatNorm(r.servico_normalizado).includes(n))
        .sort((a,b) => fatNorm(b.servico_normalizado).length - fatNorm(a.servico_normalizado).length)[0];
    return parcial?.tipo_padrao || null;
}

async function initFaturamentoModule() {
    fatMontarMeses();
    if (!fatState.mes) fatState.mes = fatMonthKey(new Date());
    const select = document.getElementById('fatMesFiltro');
    if (select) select.value = fatState.mes;

    await fatCarregarTudo();
    await fatSincronizarChamados(false);
    await fatCarregarTudo();
    fatRender();
    fatState.inicializado = true;
}

function fatMontarMeses() {
    const sel = document.getElementById('fatMesFiltro');
    if (!sel || sel.options.length) return;
    const atual = fatMonthKey(new Date());
    const meses = [];
    for (let i = -24; i <= 12; i++) meses.push(fatAddMonths(atual, i));
    sel.innerHTML = meses.reverse().map(m => `<option value="${m}">${fatNomeMes(m)}</option>`).join('');
    sel.value = atual;
    fatState.mes = atual;
}

async function fatCarregarTudo() {
    const [serv, parc, lot, itens, regras, lojas] = await Promise.all([
        supabaseClient.from('faturamento_servicos').select('*').order('criado_em', { ascending: false }),
        supabaseClient.from('faturamento_parcelas').select('*').order('competencia', { ascending: true }),
        supabaseClient.from('faturamento_lotes').select('*').order('criado_em', { ascending: false }),
        supabaseClient.from('faturamento_lote_itens').select('*'),
        supabaseClient.from('faturamento_regras').select('*').eq('ativo', true),
        supabaseClient.from('lojas_enderecos_temp').select('*')
    ]);

    for (const r of [serv, parc, lot, itens, regras]) {
        if (r.error) console.warn('Faturamento: consulta parcial:', r.error.message);
    }
    fatState.servicos = serv.data || [];
    fatState.parcelas = parc.data || [];
    fatState.lotes = lot.data || [];
    fatState.itensLote = itens.data || [];
    fatState.regras = regras.data || [];
    fatState.lojas = lojas.data || [];
}

async function fatSincronizarChamados(mostrarMensagem = false) {
    let chamados = Array.isArray(window.chamadosAlbetan) ? window.chamadosAlbetan : [];

    if (!chamados.length) {
        try {
            const { data, error } = await supabaseClient
                .from('chamados_historico')
                .select('payload_json')
                .eq('is_atual', true);
            if (!error) chamados = (data || []).map(x => x.payload_json || {});
        } catch (_) {}
    }

    const existentes = new Set(
        (fatState.servicos || [])
            .filter(s => s.chamado_id)
            .map(s => String(s.chamado_id).trim())
    );

    const novos = [];
    for (const c of chamados) {
        const id = String(fatGet(c, 'ID', 'id', 'Número do Chamado', 'numero_chamado')).trim();
        if (!id || existentes.has(id)) continue;

        const interno = fatNorm(fatGet(c, 'Status interno', 'status_interno'));
        const status = fatNorm(fatGet(c, 'Status', 'status', 'STATUS'));
        const fechado = interno.includes('fechado') || status.includes('fechar chamado') || status.includes('fechado') || Boolean(fatGet(c, 'Encerrado em', 'data_encerramento_iso'));
        if (!fechado) continue;

        const servico = String(fatGet(c, 'Serviço', 'Servico', 'servico', 'Tipo de Serviço', 'Categoria') || 'SERVIÇO').trim();
        const tipo = fatClassificarServico(servico);
        novos.push({
            chamado_id: id,
            origem: 'chamado',
            servico,
            relatorio_url: String(fatGet(c, 'Link Relatório', 'link_relatorio', 'Relatório', 'relatorio_url') || ''),
            loja: String(fatGet(c, 'Loja', 'loja') || '').trim(),
            fornecedor: String(fatGet(c, 'Prestador', 'prestador', 'Fornecedor', 'fornecedor') || '').trim(),
            descricao_servico: String(fatGet(c, 'Descrição', 'descricao') || '').trim(),
            tipo_padrao: tipo,
            tipo_faturamento: tipo,
            payload_origem: c
        });
    }

    if (novos.length) {
        const { data: criados, error } = await supabaseClient.from('faturamento_servicos').insert(novos).select('id');
        if (error) {
            console.error('Erro ao sincronizar chamados no faturamento:', error);
            if (mostrarMensagem) alert('Não foi possível sincronizar os chamados. Execute primeiro o SQL do módulo de faturamento.');
            return;
        }
        // A parcela zero é só um marcador de carteira: deixa o chamado visível para ser preparado.
        // Ao informar o valor e salvar, ela é substituída pela parcela real (ou pelas parcelas futuras).
        if (criados?.length) {
            await supabaseClient.from('faturamento_parcelas').insert(criados.map(x => ({
                servico_id: x.id, numero_parcela: 1, total_parcelas: 1,
                competencia: `${fatState.mes || fatMonthKey(new Date())}-01`, valor: 0, situacao: 'disponivel'
            })));
        }
        if (mostrarMensagem) alert(`${novos.length} chamado(s) concluído(s) entraram na carteira de faturamento.`);
    } else if (mostrarMensagem) {
        alert('Nenhum chamado concluído novo para sincronizar.');
    }
}

function fatTrocarMes() {
    fatState.mes = document.getElementById('fatMesFiltro')?.value || fatMonthKey(new Date());
    fatRender();
}

function fatServicoPorId(id) {
    return fatState.servicos.find(s => s.id === id);
}

function fatParcelasVisiveis() {
    const mes = fatState.mes || fatMonthKey(new Date());
    const tipo = document.getElementById('fatTipoFiltro')?.value || 'TODOS';
    const busca = fatNorm(document.getElementById('fatBusca')?.value || '');
    const passado = fatMesEhPassado(mes);

    return fatState.parcelas.filter(p => {
        const s = fatServicoPorId(p.servico_id);
        if (!s) return false;
        const competencia = String(p.competencia || '').slice(0, 7);
        const lote = p.lote_id ? fatState.lotes.find(l => l.id === p.lote_id) : null;
        const mesFaturado = lote ? String(lote.competencia || '').slice(0, 7) : '';

        // Mês passado é fotografia: somente o que foi efetivamente faturado nele.
        if (passado) {
            if (p.situacao !== 'faturada' || mesFaturado !== mes) return false;
        } else {
            // Mês atual/futuro: parcelas vencidas/atuais ainda não faturadas + faturadas no mês.
            const disponivel = p.situacao !== 'faturada' && p.situacao !== 'cancelada' && competencia <= mes;
            const faturadaMes = p.situacao === 'faturada' && mesFaturado === mes;
            if (!disponivel && !faturadaMes) return false;
        }

        const st = s.tipo_faturamento || s.tipo_padrao || '';
        if (tipo !== 'TODOS' && st !== tipo) return false;
        if (busca) {
            const hay = fatNorm([s.chamado_id, s.loja, s.servico, s.fornecedor, s.descricao_servico].join(' '));
            if (!hay.includes(busca)) return false;
        }
        return true;
    });
}

function fatPendenciasServico(s) {
    const p = [];
    if (!s.valor_total || Number(s.valor_total) <= 0) p.push('valor');
    if (!s.descricao_servico) p.push('descrição');
    if (!s.tipo_faturamento) p.push('MCC/CCL');
    if (!s.relatorio_url && s.origem === 'chamado') p.push('relatório');
    if (!s.loja) p.push('loja');
    return p;
}

function fatRender() {
    const tbody = document.getElementById('fatTabelaBody');
    if (!tbody) return;
    const rows = fatParcelasVisiveis();
    const mes = fatState.mes || fatMonthKey(new Date());

    tbody.innerHTML = rows.length ? rows.map(p => {
        const s = fatServicoPorId(p.servico_id) || {};
        const pend = fatPendenciasServico(s);
        const tipo = s.tipo_faturamento || s.tipo_padrao || '--';
        const status = p.situacao === 'faturada' ? 'Faturado' : (pend.length ? `Pendente: ${pend.join(', ')}` : (String(p.competencia).slice(0,7) > fatMonthKey(new Date()) ? 'Stand-by' : 'Disponível'));
        return `<tr class="border-t border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
            <td class="p-4 font-semibold">${s.chamado_id || 'AVULSO'}</td>
            <td class="p-4 max-w-[220px]">${s.servico || '--'}</td>
            <td class="p-4">${s.loja || '--'}</td>
            <td class="p-4"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${tipo === 'MCC' ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'}">${tipo}</span></td>
            <td class="p-4">${p.numero_parcela}/${p.total_parcelas}<br><span class="opacity-40">${String(p.competencia).slice(0,7)}</span></td>
            <td class="p-4">${s.relatorio_url ? `<a class="text-blue-600 font-bold" href="${s.relatorio_url}" target="_blank">Abrir ↗</a>` : '<span class="opacity-35">—</span>'}</td>
            <td class="p-4">${s.fornecedor || '--'}</td>
            <td class="p-4 text-right font-semibold">${fatMoney(p.valor)}</td>
            <td class="p-4"><span class="text-[10px] font-semibold ${p.situacao === 'faturada' ? 'text-emerald-600' : pend.length ? 'text-amber-600' : ''}">${status}</span></td>
            <td class="p-4 text-right"><button onclick="fatEditarServico('${s.id}')" class="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 font-bold">Editar</button></td>
        </tr>`;
    }).join('') : `<tr><td colspan="10" class="p-10 text-center opacity-40">Nenhum item para ${fatNomeMes(mes)}.</td></tr>`;

    fatRenderKPIs();
    fatRenderLotes();
}

function fatRenderKPIs() {
    const mes = fatState.mes || fatMonthKey(new Date());
    const lotesMes = fatState.lotes.filter(l => String(l.competencia).slice(0,7) === mes && l.status === 'fechado');
    const mcc = lotesMes.filter(l => l.tipo === 'MCC').reduce((a,l)=>a+Number(l.total_selecionado||0),0);
    const ccl = lotesMes.filter(l => l.tipo === 'CCL').reduce((a,l)=>a+Number(l.total_selecionado||0),0);
    const disponiveis = fatState.parcelas.filter(p => {
        if (p.situacao === 'faturada' || p.situacao === 'cancelada') return false;
        if (String(p.competencia).slice(0,7) > mes) return false;
        const s = fatServicoPorId(p.servico_id);
        return s && !fatPendenciasServico(s).length;
    });
    const disp = disponiveis.reduce((a,p)=>a+Number(p.valor||0),0);
    const pend = fatState.servicos.filter(s => fatPendenciasServico(s).length).length;

    const set = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
    set('fatKpiDisponivel', fatMoney(disp)); set('fatKpiMcc', fatMoney(mcc)); set('fatKpiCcl', fatMoney(ccl)); set('fatKpiTotal', fatMoney(mcc+ccl)); set('fatKpiPendencias', String(pend));
    set('fatResumoMes', `${fatNomeMes(mes)} · ${fatParcelasVisiveis().length} item(ns) exibido(s)`);
}

function fatRenderLotes() {
    const box = document.getElementById('fatLotesLista');
    if (!box) return;
    const mes = fatState.mes || fatMonthKey(new Date());
    const lotes = fatState.lotes.filter(l => String(l.competencia).slice(0,7) === mes && l.status !== 'cancelado');
    box.innerHTML = lotes.length ? lotes.map(l => `
      <div class="rounded-2xl border border-black/10 dark:border-white/10 p-4">
        <div class="flex items-start justify-between gap-3"><div><span class="text-[10px] font-bold px-2 py-1 rounded-full bg-black/5 dark:bg-white/5">${l.tipo}</span><p class="font-semibold mt-3">${fatMoney(l.total_selecionado)}</p><p class="text-[10px] opacity-45 mt-1">Verba ${fatMoney(l.verba)} · ${new Date(l.criado_em).toLocaleString('pt-BR')}</p></div>
        <div class="flex gap-1"><button onclick="fatCopiarEmail('${l.id}')" class="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 text-[10px] font-bold">Copiar e-mail</button><button onclick="fatExportarLote('${l.id}')" class="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Excel</button></div></div>
      </div>`).join('') : '<p class="col-span-full p-5 text-sm opacity-40">Nenhum lote fechado neste mês.</p>';
}

function fatNovoAvulso() {
    fatAbrirServicoModal({ origem: 'avulso', tipo_faturamento: 'CCL', tipo_padrao: 'CCL', loja: '', servico: '' });
}

function fatEditarServico(id) {
    const s = fatServicoPorId(id);
    if (s) fatAbrirServicoModal(s);
}

function fatAbrirServicoModal(s) {
    const set = (id,v='') => { const e=document.getElementById(id); if(e)e.value=v ?? ''; };
    set('fatServicoId', s.id || ''); set('fatCampoChamado', s.chamado_id || ''); set('fatCampoLoja', s.loja || ''); set('fatCampoServico', s.servico || '');
    set('fatCampoTipo', s.tipo_faturamento || s.tipo_padrao || 'CCL'); set('fatCampoFornecedor', s.fornecedor || ''); set('fatCampoCnpj', s.cnpj || ''); set('fatCampoCod', s.cod || '');
    set('fatCampoValor', s.valor_total || ''); set('fatCampoMaterial', s.valor_material || 0); set('fatCampoNf', s.nf || ''); set('fatCampoConta', s.conta_contabil || ''); set('fatCampoStatus', s.status_faturamento || ''); set('fatCampoRelatorio', s.relatorio_url || ''); set('fatCampoDescricao', s.descricao_servico || '');
    const cb=document.getElementById('fatCampoParcelado'); if(cb) cb.checked=Boolean(s.parcelado);
    set('fatCampoQtdParcelas', s.qtd_parcelas || 2);
    set('fatCampoPrimeiraCompetencia', fatState.mes || fatMonthKey(new Date()));
    fatAlternarParcelamento();
    const title=document.getElementById('fatServicoTitulo'); if(title) title.textContent=s.id ? `Preparar ${s.chamado_id ? 'chamado #'+s.chamado_id : 'serviço avulso'}` : 'Novo serviço';
    document.getElementById('fatServicoModal')?.classList.remove('hidden');
}

function fatFecharServicoModal() { document.getElementById('fatServicoModal')?.classList.add('hidden'); }
function fatAlternarParcelamento() { document.getElementById('fatParcelamentoBox')?.classList.toggle('hidden', !document.getElementById('fatCampoParcelado')?.checked); }

async function fatSalvarServico() {
    const get = id => document.getElementById(id)?.value?.trim() || '';
    const id = get('fatServicoId');
    const valor = Number(get('fatCampoValor') || 0);
    const parcelado = Boolean(document.getElementById('fatCampoParcelado')?.checked);
    const qtd = parcelado ? Math.max(2, Number(get('fatCampoQtdParcelas') || 2)) : 1;
    const competenciaInicial = get('fatCampoPrimeiraCompetencia') || fatState.mes || fatMonthKey(new Date());
    const servicoNome = get('fatCampoServico');
    const autoTipo = fatClassificarServico(servicoNome);
    const tipoEscolhido = get('fatCampoTipo') || autoTipo || 'CCL';

    if (!get('fatCampoLoja') || !servicoNome) return alert('Informe Loja e Serviço.');
    if (valor <= 0) return alert('Informe o valor total do serviço.');

    const payload = {
        chamado_id: get('fatCampoChamado') || null,
        origem: get('fatCampoChamado') ? 'chamado' : 'avulso',
        loja: get('fatCampoLoja'), servico: servicoNome, relatorio_url: get('fatCampoRelatorio') || null,
        tipo_padrao: autoTipo || tipoEscolhido, tipo_faturamento: tipoEscolhido,
        classificacao_manual: Boolean(autoTipo && autoTipo !== tipoEscolhido),
        fornecedor: get('fatCampoFornecedor') || null, cnpj: get('fatCampoCnpj') || null, cod: get('fatCampoCod') || null,
        valor_total: valor, valor_material: Number(get('fatCampoMaterial') || 0), descricao_servico: get('fatCampoDescricao') || null,
        nf: get('fatCampoNf') || null, conta_contabil: get('fatCampoConta') || null, status_faturamento: get('fatCampoStatus') || null,
        parcelado, qtd_parcelas: qtd
    };

    let servicoId = id;
    if (id) {
        const { error } = await supabaseClient.from('faturamento_servicos').update(payload).eq('id', id);
        if (error) return alert(`Erro ao salvar serviço: ${error.message}`);
    } else {
        const { data, error } = await supabaseClient.from('faturamento_servicos').insert([payload]).select('id').single();
        if (error) return alert(`Erro ao criar serviço: ${error.message}`);
        servicoId = data.id;
    }

    const existentes = fatState.parcelas.filter(p => p.servico_id === servicoId);
    if (existentes.some(p => p.situacao === 'faturada')) {
        // Não reestrutura parcelas já faturadas.
        if (!existentes.length) return;
    } else {
        await supabaseClient.from('faturamento_parcelas').delete().eq('servico_id', servicoId);
        const base = Math.floor((valor / qtd) * 100) / 100;
        const parcelas = [];
        let acumulado = 0;
        for (let i = 0; i < qtd; i++) {
            const v = i === qtd - 1 ? Number((valor - acumulado).toFixed(2)) : base;
            acumulado += v;
            const comp = fatAddMonths(competenciaInicial, i);
            parcelas.push({ servico_id: servicoId, numero_parcela: i+1, total_parcelas: qtd, competencia: `${comp}-01`, valor: v, situacao: comp <= fatMonthKey(new Date()) ? 'disponivel' : 'standby' });
        }
        const { error } = await supabaseClient.from('faturamento_parcelas').insert(parcelas);
        if (error) return alert(`Serviço salvo, mas houve erro ao criar parcelas: ${error.message}`);
    }

    await supabaseClient.from('faturamento_historico').insert([{ servico_id: servicoId, evento: id ? 'servico_atualizado' : 'servico_criado', detalhes: { parcelado, qtd, competenciaInicial }, autor: 'AREISPRO' }]);
    fatFecharServicoModal();
    await fatCarregarTudo();
    fatRender();
}

function fatAbrirNovoLote() {
    const mes = fatState.mes || fatMonthKey(new Date());
    if (fatMesEhPassado(mes)) return alert('Para segurança, novos lotes só podem ser criados no mês atual ou futuro.');
    fatState.loteSelecao.clear();
    const comp=document.getElementById('fatLoteCompetencia'); if(comp) comp.value=mes;
    const verba=document.getElementById('fatLoteVerba'); if(verba) verba.value='';
    const tipoFiltro=document.getElementById('fatTipoFiltro')?.value; const tipo=document.getElementById('fatLoteTipo'); if(tipo && ['MCC','CCL'].includes(tipoFiltro)) tipo.value=tipoFiltro;
    fatRenderSelecionaveis(); fatAtualizarResumoLote();
    document.getElementById('fatLoteModal')?.classList.remove('hidden');
}

function fatFecharLoteModal(){ document.getElementById('fatLoteModal')?.classList.add('hidden'); fatState.loteSelecao.clear(); }

function fatParcelasElegiveis(tipo, mes) {
    return fatState.parcelas.filter(p => {
        if (p.situacao === 'faturada' || p.situacao === 'cancelada') return false;
        if (String(p.competencia).slice(0,7) > mes) return false;
        const s = fatServicoPorId(p.servico_id);
        return s && (s.tipo_faturamento || s.tipo_padrao) === tipo && !fatPendenciasServico(s).length;
    });
}

function fatRenderSelecionaveis() {
    const tipo=document.getElementById('fatLoteTipo')?.value || 'MCC';
    const mes=document.getElementById('fatLoteCompetencia')?.value || fatState.mes || fatMonthKey(new Date());
    const box=document.getElementById('fatSelecionaveis'); if(!box)return;
    const itens=fatParcelasElegiveis(tipo,mes);
    box.innerHTML=itens.length?itens.map(p=>{const s=fatServicoPorId(p.servico_id)||{};return `<label class="flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer"><input type="checkbox" data-fat-parcela="${p.id}" onchange="fatToggleParcela('${p.id}', this.checked)" ${fatState.loteSelecao.has(p.id)?'checked':''}><div class="flex-1 min-w-0"><p class="text-xs font-semibold">${s.chamado_id || 'AVULSO'} · Loja ${s.loja} · ${s.servico}</p><p class="text-[10px] opacity-45 mt-1">Parcela ${p.numero_parcela}/${p.total_parcelas} · ${s.fornecedor || 'Fornecedor não informado'}</p></div><strong class="text-xs">${fatMoney(p.valor)}</strong></label>`}).join(''):'<p class="p-8 text-center text-xs opacity-40">Nenhum serviço pronto para este tipo/competência.</p>';
    fatAtualizarResumoLote();
}

function fatToggleParcela(id, checked) {
    const verba=Number(document.getElementById('fatLoteVerba')?.value || 0);
    if (checked) {
        const p=fatState.parcelas.find(x=>x.id===id);
        const atual=[...fatState.loteSelecao].reduce((a,pid)=>a+Number(fatState.parcelas.find(x=>x.id===pid)?.valor||0),0);
        if (verba > 0 && atual + Number(p?.valor||0) > verba + 0.0001) {
            document.querySelector(`[data-fat-parcela="${id}"]`).checked=false;
            alert(`Este serviço ultrapassa a verba em ${fatMoney(atual + Number(p?.valor||0) - verba)}.`);
            return;
        }
        fatState.loteSelecao.add(id);
    } else fatState.loteSelecao.delete(id);
    fatAtualizarResumoLote();
}

function fatAtualizarResumoLote() {
    const verba=Number(document.getElementById('fatLoteVerba')?.value || 0);
    const total=[...fatState.loteSelecao].reduce((a,id)=>a+Number(fatState.parcelas.find(p=>p.id===id)?.valor||0),0);
    const dif=verba-total;
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    set('fatResumoVerba',fatMoney(verba)); set('fatResumoSelecionado',fatMoney(total)); set('fatResumoDiferenca',fatMoney(dif)); set('fatLoteContador',`${fatState.loteSelecao.size} selecionado(s)`);
    const aviso=document.getElementById('fatLoteAviso');
    if(aviso){
        if(!verba) aviso.textContent='Digite o valor da verba para validar o fechamento.';
        else if(total < verba) aviso.textContent=`Atenção: ainda faltam ${fatMoney(verba-total)} para atingir a verba.`;
        else if(Math.abs(total-verba)<0.005) aviso.textContent='Verba fechada ✓';
        else aviso.textContent='Valor acima da verba — remova itens.';
    }
}

async function fatConfirmarLote() {
    const tipo=document.getElementById('fatLoteTipo')?.value || 'MCC';
    const competencia=document.getElementById('fatLoteCompetencia')?.value || fatState.mes;
    const verba=Number(document.getElementById('fatLoteVerba')?.value || 0);
    const parcelas=[...fatState.loteSelecao].map(id=>fatState.parcelas.find(p=>p.id===id)).filter(Boolean);
    const total=parcelas.reduce((a,p)=>a+Number(p.valor||0),0);
    if(verba<=0) return alert('Digite o valor da verba.');
    if(!parcelas.length) return alert('Selecione pelo menos um serviço.');
    if(total>verba+0.0001) return alert('O total selecionado ultrapassa a verba.');
    if(total<verba && !confirm(`O lote ficará ${fatMoney(verba-total)} abaixo da verba. Deseja faturar mesmo assim?`)) return;

    const {data:lote,error:loteError}=await supabaseClient.from('faturamento_lotes').insert([{tipo,competencia:`${competencia}-01`,verba,total_selecionado:total,status:'fechado',criado_por:'AREISPRO',fechado_em:new Date().toISOString()}]).select('*').single();
    if(loteError) return alert(`Erro ao criar lote: ${loteError.message}`);

    const itens=parcelas.map(p=>{const s=fatServicoPorId(p.servico_id)||{};return {lote_id:lote.id,parcela_id:p.id,servico_id:p.servico_id,valor:Number(p.valor||0),snapshot:{...s,parcela:{...p},tipo_faturado:tipo,competencia_faturamento:competencia}}});
    const {error:itemError}=await supabaseClient.from('faturamento_lote_itens').insert(itens);
    if(itemError) return alert(`Lote criado, mas erro ao registrar itens: ${itemError.message}`);

    const ids=parcelas.map(p=>p.id);
    const {error:parcError}=await supabaseClient.from('faturamento_parcelas').update({situacao:'faturada',lote_id:lote.id,faturado_em:new Date().toISOString()}).in('id',ids);
    if(parcError) return alert(`Itens registrados, mas erro ao fechar parcelas: ${parcError.message}`);

    await supabaseClient.from('faturamento_historico').insert(parcelas.map(p=>({servico_id:p.servico_id,lote_id:lote.id,evento:'parcela_faturada',detalhes:{parcela_id:p.id,valor:p.valor,tipo,competencia},autor:'AREISPRO'})));
    fatFecharLoteModal();
    await fatCarregarTudo(); fatRender();
    if(confirm('Faturamento confirmado. Deseja copiar o corpo do e-mail agora?')) fatCopiarEmail(lote.id);
}

function fatItensDoLote(loteId) {
    return fatState.itensLote.filter(i=>i.lote_id===loteId);
}

function fatLojaCadastro(codigo) {
    const c=String(codigo||'').trim();
    const endereco = (fatState.lojas||[]).find(l=>String(l.LOJA ?? l.loja ?? '').trim()===c) || {};
    const base = (db?.lojas||[]).find(l=>String(l.LOJA ?? l.loja ?? '').trim()===c) || {};
    return {...base, ...endereco};
}

function fatLinhasSnapshot(itens) {
    return itens.map(i=>{
        const snap=i.snapshot||{};
        const p=snap.parcela||{};
        return {
            ID:snap.chamado_id||'', SERVIÇOS:snap.servico||'', RELATÓRIO:snap.relatorio_url||'', COD:snap.cod||'', CNPJ:snap.cnpj||'', FORNECEDOR:snap.fornecedor||'', LOJA:snap.loja||'',
            'VALOR R$':Number(i.valor||p.valor||0), 'VALOR MATERIAL':Number(snap.valor_material||0), 'DESCRIÇÕES DE SERVIÇOS':snap.descricao_servico||'', NF:snap.nf||'', 'CONTA CONTÁBIL':snap.conta_contabil||'', STATUS:snap.status_faturamento||''
        };
    });
}

async function fatCopiarEmail(loteId) {
    const lote=fatState.lotes.find(l=>l.id===loteId); const itens=fatItensDoLote(loteId); if(!lote||!itens.length)return alert('Lote sem itens.');
    const linhas=fatLinhasSnapshot(itens);
    const lojas=[...new Set(linhas.map(x=>String(x.LOJA)).filter(Boolean))].map(codigo=>fatLojaCadastro(codigo));

    const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const intro=`Prezados,<br><br>Segue abaixo relação de serviços para faturamento <b>${lote.tipo}</b> referente a <b>${fatNomeMes(String(lote.competencia).slice(0,7))}</b>.<br><br>`;
    const tabela=`<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${['CNPJ','FORNECEDOR','LOJA','VALOR R$','DESCRIÇÕES DE SERVIÇOS','NF'].map(h=>`<th style="border:1px solid #999;padding:6px;background:#eee">${h}</th>`).join('')}</tr></thead><tbody>${linhas.map(r=>`<tr><td style="border:1px solid #999;padding:6px">${esc(r.CNPJ)}</td><td style="border:1px solid #999;padding:6px">${esc(r.FORNECEDOR)}</td><td style="border:1px solid #999;padding:6px">${esc(r.LOJA)}</td><td style="border:1px solid #999;padding:6px">${esc(fatMoney(r['VALOR R$']))}</td><td style="border:1px solid #999;padding:6px">${esc(r['DESCRIÇÕES DE SERVIÇOS'])}</td><td style="border:1px solid #999;padding:6px">${esc(r.NF)}</td></tr>`).join('')}</tbody></table>`;
    const dados=`<br><br><b>Dados para faturamento</b><br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${['LOJA','UF','CNPJ AMERICANAS','LOGRADOURO','MUNICÍPIO','CEP'].map(h=>`<th style="border:1px solid #999;padding:6px;background:#eee">${h}</th>`).join('')}</tr></thead><tbody>${lojas.map(l=>`<tr><td style="border:1px solid #999;padding:6px">${esc(l.LOJA??l.loja??'')}</td><td style="border:1px solid #999;padding:6px">${esc(l.UF??l.uf??'')}</td><td style="border:1px solid #999;padding:6px">${esc(l.CNPJ??l.cnpj??l['CNPJ AMERICANAS']??'')}</td><td style="border:1px solid #999;padding:6px">${esc(l.LOGRADOURO??l.logradouro??l['ENDEREÇO']??l.ENDERECO??l.endereco??'')}</td><td style="border:1px solid #999;padding:6px">${esc(l.MUNICIPIO??l.municipio??l.CIDADE??l.cidade??'')}</td><td style="border:1px solid #999;padding:6px">${esc(l.CEP??l.cep??'')}</td></tr>`).join('')}</tbody></table>`;
    const html=intro+tabela+dados;
    const texto=`Prezados,\n\nSegue relação de serviços para faturamento ${lote.tipo} - ${fatNomeMes(String(lote.competencia).slice(0,7))}.\n\n`+linhas.map(r=>`${r.LOJA}\t${fatMoney(r['VALOR R$'])}\t${r['DESCRIÇÕES DE SERVIÇOS']}`).join('\n');
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([texto],{type:'text/plain'})})]);
        } else await navigator.clipboard.writeText(texto);
        alert('Corpo do e-mail copiado. É só colar no Gmail ou Outlook.');
    } catch(e) { console.error(e); alert('Não foi possível copiar automaticamente. Verifique a permissão da área de transferência.'); }
}

function fatCriarSheet(rows) {
    const headers=['ID','SERVIÇOS','RELATÓRIO','COD','CNPJ','FORNECEDOR','LOJA','VALOR R$','VALOR MATERIAL','DESCRIÇÕES DE SERVIÇOS','NF','CONTA CONTÁBIL','STATUS'];
    const ws=XLSX.utils.json_to_sheet(rows,{header:headers});
    ws['!cols']=[{wch:14},{wch:24},{wch:36},{wch:12},{wch:20},{wch:18},{wch:10},{wch:14},{wch:16},{wch:50},{wch:16},{wch:20},{wch:30}];
    for(let r=2;r<=rows.length+1;r++){ if(ws[`H${r}`])ws[`H${r}`].z='R$ #,##0.00'; if(ws[`I${r}`])ws[`I${r}`].z='R$ #,##0.00'; }
    return ws;
}

function fatExportarLote(loteId) {
    const lote=fatState.lotes.find(l=>l.id===loteId); const rows=fatLinhasSnapshot(fatItensDoLote(loteId)); if(!lote||!rows.length)return alert('Lote sem itens.');
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,fatCriarSheet(rows),`${lote.tipo} ${String(lote.competencia).slice(0,7)}`.slice(0,31));
    XLSX.writeFile(wb,`AREISPRO_FATURAMENTO_${lote.tipo}_${String(lote.competencia).slice(0,7)}.xlsx`);
}

function fatExportarMes() {
    const mes=fatState.mes||fatMonthKey(new Date());
    const lotes=fatState.lotes.filter(l=>String(l.competencia).slice(0,7)===mes&&l.status==='fechado');
    const itens=lotes.flatMap(l=>fatItensDoLote(l.id));
    const rows=fatLinhasSnapshot(itens);
    const mcc=rows.filter((r,idx)=>{const snap=itens[idx]?.snapshot||{};return (snap.tipo_faturado||snap.tipo_faturamento||snap.tipo_padrao)==='MCC'});
    const ccl=rows.filter((r,idx)=>{const snap=itens[idx]?.snapshot||{};return (snap.tipo_faturado||snap.tipo_faturamento||snap.tipo_padrao)==='CCL'});
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,fatCriarSheet(mcc),`MCC ${mes}`.slice(0,31));
    XLSX.utils.book_append_sheet(wb,fatCriarSheet(ccl),`CCL ${mes}`.slice(0,31));
    XLSX.writeFile(wb,`AREISPRO_FATURAMENTO_COMPLETO_${mes}.xlsx`);
}

