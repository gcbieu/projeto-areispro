let db = {
  lojas: [],
  prestadores: [],
};

let anexos = [
  {
    id: Date.now(),
    titulo: "ANEXO 1",
    obs: "",
    fotosAntes: [],
    fotosDepois: [],
  },
];

let logos = {
  prestador: null,

  americanas:
    "https://ujwfggunvzsonnsjuvpl.supabase.co/storage/v1/object/public/logos-prestadores/americanas.png",

  americanasSA:
    "https://ujwfggunvzsonnsjuvpl.supabase.co/storage/v1/object/public/logos-prestadores/AMERICANAS%20SA.png",
};

let fotosObrigatorias = {
  fachada: null,
  marquise: null,
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
      event.touches && event.touches.length ? event.touches[0] : event;

    return {
      x: (ponto.clientX - rect.left) * (assinaturaCanvas.width / rect.width),

      y: (ponto.clientY - rect.top) * (assinaturaCanvas.height / rect.height),
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

  assinaturaCanvas.addEventListener("mousedown", iniciar);

  assinaturaCanvas.addEventListener("mousemove", desenhar);

  assinaturaCanvas.addEventListener("mouseup", finalizar);

  assinaturaCanvas.addEventListener("mouseleave", finalizar);

  // ======================================
  // CELULAR / TABLET
  // ======================================

  assinaturaCanvas.addEventListener("touchstart", iniciar, {
    passive: false,
  });

  assinaturaCanvas.addEventListener("touchmove", desenhar, {
    passive: false,
  });

  assinaturaCanvas.addEventListener("touchend", finalizar);
}

// ==========================================
// CARREGAMENTO INICIAL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  iniciarCanvasAssinatura();
});

// ==========================================
// LIMPAR ASSINATURA
// ==========================================

function limparAssinatura() {
  if (assinaturaCanvas && assinaturaCtx) {
    assinaturaCtx.clearRect(
      0,
      0,
      assinaturaCanvas.width,
      assinaturaCanvas.height,
    );
  }

  // Sempre volta para "sem assinatura"
  assinaturaRealizada = false;
  assinando = false;
}

// ============================================================================
// SALVAR RELATÓRIO NO SUPABASE E VINCULAR AO CHAMADO
// ============================================================================

async function salvarRelatorioNoChamado(pdfBlob) {
const parametros =
    new URLSearchParams(window.location.search);

const tipoRelatorio =
    parametros.get("modelo") || "fornecedor";

const isVistoria =
    tipoRelatorio === "vistoria";


const numeroChamado = String(
    document.getElementById("chamado")?.value || ""
).trim();

const temChamado = numeroChamado !== "";

  // ============================================================
  // LOCALIZA O CHAMADO CARREGADO NA CENTRAL
  // ============================================================

  const chamadoEncontrado = (window.chamadosAlbetan || []).find((chamado) => {
    const id =
      chamado["ID"] ??
      chamado["Id"] ??
      chamado["id"] ??
      chamado["Chamado"] ??
      chamado["Número do Chamado"];

    return String(id || "").trim() === numeroChamado;
  });

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

let nomeArquivo;

if (isVistoria) {

    const lojaSelect =
        document.getElementById("lojaSelect");

    const loja =
        lojaSelect?.value || "LOJA";

    const dataServico =
        document.getElementById("dataServico")?.value ||
        new Date().toISOString().split("T")[0];

    // Limpa caracteres que podem dar problema no caminho
    const lojaArquivo =
        loja
            .replace(/[^a-zA-Z0-9À-ÿ_-]/g, "_")
            .replace(/_+/g, "_");

const idVistoria =
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

nomeArquivo =
    `VISTORIAS/${lojaArquivo}/${dataServico}/AREISPRO_VISTORIA_${lojaArquivo}_${dataServico}_${idVistoria}.pdf`;

} else if (temChamado) {

    // ========================================================
    // FOTOGRÁFICO COM CHAMADO
    // ========================================================

    nomeArquivo =
        `${numeroChamado}/AREISPRO_${numeroChamado}.pdf`;

} else {

    // ========================================================
    // FOTOGRÁFICO SEM CHAMADO
    // ========================================================

    const lojaSelect =
        document.getElementById("lojaSelect");

    const loja =
        lojaSelect?.value || "LOJA";

    const dataServico =
        document.getElementById("dataServico")?.value ||
        new Date().toISOString().split("T")[0];

    const lojaArquivo =
        String(loja)
            .replace(/[^a-zA-Z0-9À-ÿ_-]/g, "_")
            .replace(/_+/g, "_");

    const idRelatorio =
        `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    nomeArquivo =
        `FOTOGRAFICOS/${lojaArquivo}/${dataServico}/AREISPRO_FOTOGRAFICO_${lojaArquivo}_${dataServico}_${idRelatorio}.pdf`;
}

  // ============================================================
  // ENVIA PARA O STORAGE
  // ============================================================

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("relatorios")
    .upload(nomeArquivo, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Erro ao enviar relatório:", uploadError);

    throw uploadError;
  }

  // ============================================================
  // PEGA A URL DO RELATÓRIO
  // ============================================================

  const { data: urlData } = supabaseClient.storage
    .from("relatorios")
    .getPublicUrl(nomeArquivo);

  const urlRelatorio = urlData?.publicUrl;

  if (!urlRelatorio) {
    throw new Error("Não foi possível gerar o link do relatório.");
  }

  // ============================================================
  // ADICIONA O LINK AO CHAMADO
  // ============================================================
if (!isVistoria && temChamado) {

  if (chamadoEncontrado) {
    chamadoEncontrado["Link Relatório"] = urlRelatorio;

    chamadoEncontrado["Relatório gerado em"] = agora.toLocaleString("pt-BR");

    await persistirAlteracaoChamado(chamadoEncontrado);

    console.log("Relatório vinculado ao chamado:", numeroChamado, urlRelatorio);
  } else {
    console.warn(
      `Chamado #${numeroChamado} não encontrado na memória. O relatório será salvo normalmente no histórico.`,
    );
  }

    // ============================================================
    // ATUALIZA TAMBÉM A MEMÓRIA DO FATURAMENTO
    // ============================================================

    const { error: erroFaturamento } =
        await supabaseClient
            .from("faturamento_servicos")
            .update({
                relatorio_url: urlRelatorio
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

}
  
  // ============================================================
  // REGISTRA O RELATÓRIO NO HISTÓRICO
  // ============================================================

  const lojaSelect = document.getElementById("lojaSelect");

  const lojaNome =
    lojaSelect?.options[lojaSelect.selectedIndex]?.textContent?.trim() || "";

const prestadorSelect =
    document.getElementById("prestador");

const prestadorNome =
    prestadorSelect
        ? prestadorSelect.options[prestadorSelect.selectedIndex]
            ?.textContent
            ?.trim() || ""
        : "";
        
  const dataServico = document.getElementById("dataServico")?.value || null;

  // ============================================================
  // DADOS EDITÁVEIS DO RELATÓRIO
  // ============================================================

  const dadosRelatorio = {
chamado: temChamado
    ? numeroChamado
    : null,

    loja: lojaSelect?.value || "",

    prestador: prestadorSelect?.value || "",

    dataServico: dataServico,

    objetivo:
    document.getElementById("objetivoRelatorio")?.value?.trim() || "",

observacao:
    document.getElementById("observacaoRelatorio")?.value?.trim() || "",

conclusao:
    document.getElementById("conclusaoRelatorio")?.value?.trim() || "",

    fotosObrigatorias: {
      fachada: fotosObrigatorias.fachada || null,
      marquise: fotosObrigatorias.marquise || null,
    },

    anexos: anexos.map((anexo) => ({
      titulo: anexo.titulo,
      obs: anexo.obs || "",

      fotosAntes: (anexo.fotosAntes || []).map((foto) => ({
        src: foto.src,
        desc: foto.desc || "",
      })),

      fotosDepois: (anexo.fotosDepois || []).map((foto) => ({
        src: foto.src,
        desc: foto.desc || "",
      })),
    })),
  };

  const idRelatorioEdicao = parametros.get("editar");

const dadosSalvar = {
chamado_id: temChamado
    ? numeroChamado
    : null,

    loja: lojaNome,

    prestador: isVistoria
        ? ""
        : prestadorNome,

    tipo_relatorio: tipoRelatorio,
    data_servico: dataServico,
    arquivo_url: urlRelatorio,
    nome_arquivo: nomeArquivo,
    dados_relatorio: dadosRelatorio
};

  let erroHistorico;

  if (idRelatorioEdicao) {
    console.log("ATUALIZANDO RELATÓRIO:", idRelatorioEdicao);

    console.log("FORNECEDOR QUE SERÁ SALVO:", prestadorNome);

    console.log("DADOS QUE SERÃO SALVOS:", dadosSalvar);

    // ======================================
    // EDITANDO: ATUALIZA O MESMO RELATÓRIO
    // ======================================

    const { error } = await supabaseClient
      .from("relatorios")
      .update(dadosSalvar)
      .eq("id", idRelatorioEdicao);

    erroHistorico = error;
  } else {
    // ======================================
    // NOVO: CRIA UM NOVO RELATÓRIO
    // ======================================

    const { error } = await supabaseClient
      .from("relatorios")
      .insert(dadosSalvar);

    erroHistorico = error;
  }

  if (erroHistorico) {
    console.error("Erro ao registrar relatório no histórico:", erroHistorico);
  } else {
    console.log("Relatório registrado no histórico com sucesso.");
  }

  return urlRelatorio;
}

// FUNÇÃO PARA BUSCAR AS LOJAS NO SUPABASE
async function carregarLojas() {
  try {
    console.log("A procurar lojas no Supabase...");
    const { data, error } = await supabaseClient.from("lojas").select("*");

    if (error) {
      console.error("Erro ao buscar lojas:", error.message);
      return;
    }

    if (data && data.length > 0) {
      // Guarda as lojas vindas do banco de dados
      db.lojas = data;
      console.log("Lojas carregadas com sucesso do Supabase:", db.lojas);
    } else {
      console.warn("A tabela 'lojas' retornou vazia do Supabase.");
    }
  } catch (err) {
    console.error("Erro inesperado ao carregar lojas:", err);
  }
}

// FUNÇÃO PARA ATUALIZAR AS FOTOS DO STORAGE COM BASE NA LOJA SELECIONADA
function atualizarFotosObrigatorias() {
  const selectLoja = document.getElementById("lojaSelect");

  if (!selectLoja || !selectLoja.value) {
    return;
  }

  const nomeLojaSelecionada = selectLoja.value;

  const dadosLoja = db.lojas.find(
    (l) => String(l.LOJA).trim() === String(nomeLojaSelecionada).trim(),
  );

  if (dadosLoja) {
    fotosObrigatorias.fachada = dadosLoja["Foto Fachada"] || null;

    fotosObrigatorias.marquise = dadosLoja["Foto Marquise"] || null;

    console.log("URLs das fotos carregadas para esta loja:", fotosObrigatorias);

    atualizarPreviewInterface("fachada");

    atualizarPreviewInterface("marquise");
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
      elementoPrev.innerHTML = `<input type="file" onchange="handleSingleUpload(this, '${key}')" class="absolute inset-0 opacity-0 cursor-pointer"><span class="text-[10px] opacity-40 font-bold uppercase">Figura ${key === "fachada" ? "1" : "2"} – ${key}</span>`;
    }
  }
}

async function carregarPrestadoresDoBanco() {
  // Relatórios como Vistoria não possuem prestador.
  // Nesse caso, não há nada para carregar.
  const select = document.getElementById("prestador");

  if (!select) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("prestadores")
      .select("nome, logo_url");

    if (error) throw error;

    if (data && data.length > 0) {
      select.innerHTML = data
        .map(
          (p) =>
            `<option value="${p.nome}" data-logo="${p.logo_url}">${p.nome}</option>`,
        )
        .join("");

      // Ativa a logo do primeiro prestador
      await atualizarLogoAutomatica();
    }
  } catch (error) {
    console.error("Erro no Supabase:", error.message);
  }
}

async function atualizarLogoAutomatica() {
    const select = document.getElementById("prestador");

    // Vistoria não possui campo de prestador
    if (!select) {
        return;
    }

    const opcao = select.options[select.selectedIndex];

    if (!opcao) {
        logos.prestador = null;
        return;
    }

    const url = opcao.getAttribute("data-logo");

    // ATUALIZA IMEDIATAMENTE O ESTADO
    logos.prestador = url || null;

    if (!url) {
        return;
    }

    // Apenas garante que a imagem esteja carregada
    // antes de continuar quando a função for aguardada.
    await new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = resolve;
        img.onerror = reject;

        img.src = url;
    });
}

if (localStorage.getItem("are_theme") === "dark")
  document.documentElement.classList.add("dark");

// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
// --- SISTEMA DE GESTÃO DE DADOS ---
function renderDB() {
  console.log("Executando renderDB(). Status atual de db.lojas:", db.lojas);

  // Salva no localStorage para manter o cache local atualizado
  localStorage.setItem("are_lojas", JSON.stringify(db.lojas));

  const selectLoja = document.getElementById("lojaSelect");

  if (selectLoja) {
    if (db.lojas && db.lojas.length > 0) {
      // Popula o select mapeando a coluna LOJA de cada objeto do Supabase
      selectLoja.innerHTML = db.lojas
        .map((loja) => {
          const numero = String(loja.LOJA ?? "").trim();

          const nome = String(loja.NOME ?? "").trim();

          const uf = String(loja.UF ?? "").trim();

          let texto = `#${numero}`;

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
  const storeListEl = document.getElementById("storeList");
  if (storeListEl && db.lojas && db.lojas.length > 0) {
    storeListEl.innerHTML = db.lojas
      .map(
        (l, i) =>
          `<div class="flex justify-between p-3 glass rounded-xl text-xs font-medium"><span>${l.LOJA}</span><button onclick="db.lojas.splice(${i},1);renderDB()" class="text-red-500 font-bold">×</button></div>`,
      )
      .join("");
  }

  // Dispara a função para buscar as fotos da primeira loja que ficou selecionada por padrão
  atualizarFotosObrigatorias();
}
document
  .getElementById("lojaSelect")
  ?.addEventListener("change", atualizarFotosObrigatorias);

function addStore() {
  const v = document.getElementById("newStore").value.toUpperCase();
  if (v) {
    db.lojas.push(v);
    document.getElementById("newStore").value = "";
    renderDB();
  }
}
function addProv() {
  const v = document.getElementById("newProv").value.toUpperCase();
  if (v) {
    db.fornecedores.push(v);
    document.getElementById("newProv").value = "";
    renderDB();
  }
}

// --- LOGICA DE IMAGENS ---
async function handleSingleUpload(input, key) {
  if (input.files[0]) {
    fotosObrigatorias[key] = await comprimirImagem(input.files[0]);
    document.getElementById(`prev-${key}`).innerHTML =
      `<div class="delete-btn" onclick="removeObrigatoria('${key}')">×</div><img src="${fotosObrigatorias[key]}" class="w-full h-full object-cover rounded-xl">`;
  }
}

async function handleFotosAnexo(input, anexoId, tipo) {
  const anexo = anexos.find((a) => a.id === anexoId);
  for (const file of Array.from(input.files)) {
    const src = await comprimirImagem(file);
    anexo[`fotos${tipo}`].push({ src, desc: "" });
  }
  renderAnexos();
}

// COMPRESSÃO PARA NÃO TRAVAR O CELULAR
function comprimirImagem(file) {
  return new Promise((r) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        r(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  });
}

function renderAnexos() {
  const parametros = new URLSearchParams(window.location.search);

  const isVistoria = parametros.get("modelo") === "vistoria";

  const cont = document.getElementById("anexosContainer");
  cont.innerHTML = "";
  anexos.forEach((anexo, idx) => {
    const div = document.createElement("div");
    div.className =
      "glass rounded-3xl p-6 mb-6 border-l-4 " +
      (idx % 2 === 0 ? "border-red-500" : "border-green-500");
    if (isVistoria) {
      div.innerHTML = `
                <div class="flex justify-between items-center mb-5">

                    <h3 class="text-[10px] font-black opacity-40 uppercase tracking-widest">
                        ${anexo.titulo}
                    </h3>

                    ${
                      idx > 0
                        ? `
                        <button
                            onclick="removeAnexo(${anexo.id})"
                            class="text-red-500 text-xs font-bold">
                            EXCLUIR ANEXO
                        </button>
                    `
                        : ""
                    }

                </div>

                <!-- Por enquanto permanece aqui.
                     No próximo passo vira o seletor de áreas. -->
                <textarea
                    placeholder="Área / elemento vistoriado..."
                    onchange="updateAnexoObs(${anexo.id}, this.value)"
                    class="w-full p-3 input-ios text-xs mb-5 h-16 resize-none"
                >${anexo.obs || ""}</textarea>


                <!-- FOTOS DE VISTORIA -->
                <div>

                    <p class="text-[9px] font-black uppercase opacity-50 mb-2">
                        Fotos de Vistoria
                    </p>

                    <input
                        type="file"
                        multiple
                        onchange="handleFotosAnexo(this, ${anexo.id}, 'Antes')"
                        class="text-[10px] mb-5">


                    <!-- DUAS FOTOS POR LINHA -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                        ${(anexo.fotosAntes || [])
                          .map(
                            (f, fi) => `

                            <div class="relative">

                                <img
                                    src="${f.src}"
                                    onclick="abrirEditorFoto(${anexo.id}, ${fi}, 'Antes')"
                                    class="w-full h-56 object-cover rounded-2xl cursor-pointer">

                                <textarea
                                    placeholder="Descrição da foto..."
                                    onchange="updateFotoDesc(${anexo.id}, ${fi}, 'Antes', this.value)"
                                    class="w-full mt-2 p-3 text-[10px] input-ios rounded-xl h-16 resize-none"
                                >${f.desc || ""}</textarea>

                                <div
                                    class="delete-btn"
                                    onclick="removeFotoAnexo(${anexo.id}, ${fi}, 'Antes')">
                                    ×
                                </div>

                            </div>

                        `,
                          )
                          .join("")}

                    </div>

                </div>
            `;
    } else {
      div.innerHTML = `            
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-[10px] font-black opacity-40 uppercase tracking-widest">${anexo.titulo}</h3>
                ${idx > 0 ? `<button onclick="removeAnexo(${anexo.id})" class="text-red-500 text-xs font-bold">EXCLUIR ANEXO</button>` : ""}
            </div>
            <textarea placeholder="Observação geral deste anexo..." onchange="updateAnexoObs(${anexo.id}, this.value)" class="w-full p-3 input-ios text-xs mb-4 h-16 resize-none">${anexo.obs}</textarea>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
<p class="text-[9px] font-black text-red-500 uppercase mb-2">Antes</p>
        <input type="file" multiple onchange="handleFotosAnexo(this, ${anexo.id}, 'Antes')" class="text-[10px] mb-3">
        <div class="grid grid-cols-2 gap-2">
            ${(anexo.fotosAntes || [])
              .map(
                (f, fi) => `
                <div class="relative">
                    <img
    src="${f.src}"
    onclick="abrirEditorFoto(${anexo.id}, ${fi}, 'Antes')"
    class="w-full h-24 object-cover rounded-xl cursor-pointer">
    
                    <textarea 
                        placeholder="Insira uma Descrição..." 
                        onchange="updateFotoDesc(${anexo.id}, ${fi}, 'Antes', this.value)" 
                        class="w-full mt-1 p-1 text-[8px] bg-white/20 rounded h-10 border-none resize-none"
                    >${f.desc || ""}</textarea>
                    <div class="delete-btn" onclick="removeFotoAnexo(${anexo.id}, ${fi}, 'Antes')">×</div>
                </div>
            `,
              )
              .join("")}
        </div>
    </div>

    <div>
        <p class="text-[9px] font-black text-green-500 uppercase mb-2">Depois</p>
        <input type="file" multiple onchange="handleFotosAnexo(this, ${anexo.id}, 'Depois')" class="text-[10px] mb-3">
        <div class="grid grid-cols-2 gap-2">
            ${(anexo.fotosDepois || [])
              .map(
                (f, fi) => `
                <div class="relative">
                    <img
    src="${f.src}"
    onclick="abrirEditorFoto(${anexo.id}, ${fi}, 'Depois')"
    class="w-full h-24 object-cover rounded-xl cursor-pointer">

                    <textarea 
                        placeholder="Insira uma Descrição..." 
                        onchange="updateFotoDesc(${anexo.id}, ${fi}, 'Depois', this.value)" 
                        class="w-full mt-1 p-1 text-[8px] bg-white/20 rounded h-10 border-none resize-none"
                    >${f.desc || ""}</textarea>
                    <div class="delete-btn" onclick="removeFotoAnexo(${anexo.id}, ${fi}, 'Depois')">×</div>
                </div>
            `,
              )
              .join("")}
        </div>
    </div>
</div>
</div>`;
    }

    cont.appendChild(div);
  });
}

// --- FUNÇÕES DE AUXÍLIO ---

function addNovoAnexo() {
  anexos.push({
    id: Date.now(),
    titulo: `ANEXO ${anexos.length + 1}`,
    obs: "",
    fotosAntes: [],
    fotosDepois: [],
  });
  renderAnexos();
}
function removeAnexo(id) {
  if (anexos.length > 1) {
    anexos = anexos.filter((a) => a.id !== id);
    renderAnexos();
  }
}
function updateAnexoObs(id, val) {
  const a = anexos.find((x) => x.id === id);
  if (a) a.obs = val;
}
function updateFotoDesc(id, fIdx, tipo, val) {
  const a = anexos.find((x) => x.id === id);
  if (a) a[`fotos${tipo}`][fIdx].desc = val;
}
function removeFotoAnexo(id, fIdx, tipo) {
  const a = anexos.find((x) => x.id === id);
  a[`fotos${tipo}`].splice(fIdx, 1);
  renderAnexos();
}
function removeObrigatoria(key) {
  fotosObrigatorias[key] = null;
  document.getElementById(`prev-${key}`).innerHTML =
    `<input type="file" onchange="handleSingleUpload(this, '${key}')" class="absolute inset-0 opacity-0 cursor-pointer"><span class="text-[10px] opacity-40 font-bold uppercase">Figura ${key === "fachada" ? "1" : "2"} – ${key}</span>`;
}
async function saveLogo(input, key) {
  if (input.files[0]) logos[key] = await comprimirImagem(input.files[0]);
}

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
  const input = document.getElementById("chamado");

  const container = document.getElementById("resultadosChamadoRelatorio");

  if (!input || !container) {
    return;
  }

  const termo = String(input.value || "")
    .trim()
    .toLowerCase();

  // ============================================================
  // BASE DE CHAMADOS
  // ============================================================

  const chamados = window.chamadosAlbetan || [];

  // Se ainda não digitou nada
  if (!termo) {
    container.classList.add("hidden");

    container.innerHTML = "";

    return;
  }

  // ============================================================
  // FILTRA
  // ============================================================

  const encontrados = chamados
    .filter((chamado) => {
      const id =
        chamado["ID"] ??
        chamado["Id"] ??
        chamado["id"] ??
        chamado["Chamado"] ??
        chamado["Número do Chamado"] ??
        "";

      const loja = chamado["Loja"] ?? chamado["loja"] ?? "";

      const servico = chamado["Serviço"] ?? chamado["servico"] ?? "";

      return (
        String(id).toLowerCase().includes(termo) ||
        String(loja).toLowerCase().includes(termo) ||
        String(servico).toLowerCase().includes(termo)
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

  container.innerHTML = encontrados
    .map((chamado, index) => {
      const id =
        chamado["ID"] ??
        chamado["Id"] ??
        chamado["id"] ??
        chamado["Chamado"] ??
        chamado["Número do Chamado"] ??
        "--";

      const loja = chamado["Loja"] ?? chamado["loja"] ?? "--";

      const servico =
        chamado["Serviço"] ?? chamado["servico"] ?? "Serviço não informado";

      const descricao = chamado["Descrição"] ?? chamado["descricao"] ?? "";

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
  window.resultadosRelatorioAtuais = encontrados;

  container.classList.remove("hidden");
}

// ============================================================================
// SELECIONAR CHAMADO PARA O RELATÓRIO
// ============================================================================

function selecionarChamadoRelatorio(index) {
  const chamado = window.resultadosRelatorioAtuais?.[index];

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

  const lojaChamado = chamado["Loja"] ?? chamado["loja"] ?? "";

  // ============================================================
  // Nº DO CHAMADO
  // ============================================================

  const inputChamado = document.getElementById("chamado");

  if (inputChamado) {
    inputChamado.value = numeroChamado;
  }

  // ============================================================
  // LOJA AUTOMÁTICA
  // ============================================================

  selecionarLojaRelatorio(lojaChamado);

  // ============================================================
  // FECHA RESULTADOS
  // ============================================================

  const resultados = document.getElementById("resultadosChamadoRelatorio");

  if (resultados) {
    resultados.classList.add("hidden");
  }

  // ============================================================
  // GUARDA CHAMADO SELECIONADO
  // ============================================================

  window.chamadoRelatorioSelecionado = chamado;

  console.log("Chamado selecionado para relatório:", chamado);
}

// ============================================================================
// SELECIONA A LOJA CORRESPONDENTE AO CHAMADO
// ============================================================================

function selecionarLojaRelatorio(lojaChamado) {
  const select = document.getElementById("lojaSelect");

  if (!select || !lojaChamado) {
    return;
  }

  const lojaProcurada = String(lojaChamado).trim().toLowerCase();

  // Tenta encontrar pelo VALUE ou pelo texto
  const opcao = Array.from(select.options).find((option) => {
    const valor = String(option.value || "")
      .trim()
      .toLowerCase();

    const texto = String(option.textContent || "")
      .trim()
      .toLowerCase();

    return (
      valor === lojaProcurada ||
      texto === lojaProcurada ||
      valor.startsWith(lojaProcurada + " ") ||
      texto.startsWith(lojaProcurada + " ")
    );
  });

  if (!opcao) {
    console.warn("Loja do chamado não encontrada no select:", lojaChamado);

    return;
  }

  select.value = opcao.value;

  // Atualiza Fachada / Marquise
  atualizarFotosObrigatorias();
}

// ============================================================
// CARREGAR RELATÓRIO PARA EDIÇÃO
// ============================================================

async function carregarRelatorioParaEdicao() {
  const parametros = new URLSearchParams(window.location.search);

  const idRelatorio = parametros.get("editar");

  // Se não entrou pelo botão EDITAR,
  // continua sendo um relatório novo normalmente.
  if (!idRelatorio) {
    return;
  }

  console.log("Carregando relatório para edição:", idRelatorio);

  const { data, error } = await supabaseClient
    .from("relatorios")
    .select("*")
    .eq("id", idRelatorio)
    .single();

  if (error) {
    console.error("Erro ao carregar relatório para edição:", error);

    alert("Não foi possível carregar o relatório para edição.");

    return;
  }

  if (!data?.dados_relatorio) {
    console.error("Relatório não possui dados editáveis:", data);

    alert("Este relatório não possui dados editáveis.");

    return;
  }

  const dados = data.dados_relatorio;

const campoObjetivo =
    document.getElementById("objetivoRelatorio");

const campoObservacao =
    document.getElementById("observacaoRelatorio");

const campoConclusao =
    document.getElementById("conclusaoRelatorio");


if (campoObjetivo) {
    campoObjetivo.value =
        dados?.objetivo || "";
}

if (campoObservacao) {
    campoObservacao.value =
        dados?.observacao || "";
}

if (campoConclusao) {
    campoConclusao.value =
        dados?.conclusao || "";
}

  // ======================================
  // CHAMADO
  // ======================================

  const campoChamado = document.getElementById("chamado");

  if (campoChamado) {
    campoChamado.value = dados.chamado || "";
  }

  // ======================================
  // LOJA
  // ======================================

  const lojaSelect = document.getElementById("lojaSelect");

  if (lojaSelect && dados.loja) {
    lojaSelect.value = dados.loja;
  }

  // ======================================
  // PRESTADOR
  // ======================================

  const prestadorSelect = document.getElementById("prestador");

if (prestadorSelect && dados.prestador) {
    prestadorSelect.value = dados.prestador;

    await atualizarLogoAutomatica();
}

  // ======================================
  // DATA
  // ======================================

  const dataServico = document.getElementById("dataServico");

  if (dataServico) {
    dataServico.value = dados.dataServico || "";
  }

  // ======================================
  // FACHADA / MARQUISE
  // ======================================

  if (dados.fotosObrigatorias) {
    fotosObrigatorias.fachada = dados.fotosObrigatorias.fachada || null;

    fotosObrigatorias.marquise = dados.fotosObrigatorias.marquise || null;

    atualizarPreviewInterface("fachada");
    atualizarPreviewInterface("marquise");
  }

  // ======================================
  // ANEXOS / FOTOS / DESCRIÇÕES
  // ======================================

  if (Array.isArray(dados.anexos) && dados.anexos.length) {
    anexos = dados.anexos.map((anexo, index) => ({
      id: Date.now() + index,

      titulo: anexo.titulo || `ANEXO ${index + 1}`,

      obs: anexo.obs || "",

      fotosAntes: anexo.fotosAntes || [],

      fotosDepois: anexo.fotosDepois || [],
    }));

    renderAnexos();
  }

  console.log("✏️ Relatório carregado para edição:", data);
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
    await carregarRelatorioParaEdicao();

    console.log("Relatórios carregados:", {
      lojas: db.lojas.length,
      prestadores: document.getElementById("prestador")?.options.length || 0,
    });
  } catch (error) {
    console.error("Erro ao inicializar Relatórios:", error);
  }
}

initRelatoriosModule();

document.getElementById("btnVisualizarRelatorio");

// ============================================================
// EDITOR DE IMAGEM
// ============================================================

let editorFotoAtual = null;

let editorCanvas = null;
let editorCtx = null;
let editorImagemOriginal = null;

let ferramentaEditor = "desenho";

let desenhandoEditor = false;
let inicioEditorX = 0;
let inicioEditorY = 0;
let estadoAntesDaForma = null;

let historicoEditor = [];
let futuroEditor = [];

// ============================================================
// ABRIR EDITOR
// ============================================================

function abrirEditorFoto(anexoId, indiceFoto, tipo) {
  const anexo = anexos.find((item) => item.id === anexoId);

  if (!anexo) return;

  const foto = anexo[`fotos${tipo}`]?.[indiceFoto];

  if (!foto) return;

  editorFotoAtual = {
    anexoId,
    indiceFoto,
    tipo,
  };

  const editor = document.getElementById("editorImagem");

  editorCanvas = document.getElementById("canvasEditorImagem");

  if (!editor || !editorCanvas) {
    console.error("Editor de imagem não encontrado no HTML.");
    return;
  }

  editorCtx = editorCanvas.getContext("2d");

  editor.classList.remove("hidden");

  const img = new Image();

  img.onload = function () {
    editorImagemOriginal = img;

    // Limite de trabalho para não explodir a memória
    const maxLargura = 1600;
    const maxAltura = 1200;

    let largura = img.width;
    let altura = img.height;

    const proporcao = Math.min(maxLargura / largura, maxAltura / altura, 1);

    largura = Math.round(largura * proporcao);
    altura = Math.round(altura * proporcao);

    editorCanvas.width = largura;
    editorCanvas.height = altura;

    editorCtx.drawImage(img, 0, 0, largura, altura);

    historicoEditor = [];
    futuroEditor = [];

    salvarEstadoEditor();

    selecionarFerramenta("desenho");
  };

  img.src = foto.src;
}

// ============================================================
// FECHAR EDITOR
// ============================================================

function fecharEditorImagem() {
  const editor = document.getElementById("editorImagem");

  if (editor) {
    editor.classList.add("hidden");
  }

  editorFotoAtual = null;

  historicoEditor = [];
  futuroEditor = [];
}

// ============================================================
// SELECIONAR FERRAMENTA
// ============================================================

function selecionarFerramenta(nome) {
  ferramentaEditor = nome;

  document.querySelectorAll(".editor-tool").forEach((botao) => {
    botao.classList.remove("ativo");
  });

  const mapa = {
    desenho: "ferramentaDesenho",

    circulo: "ferramentaCirculo",

    seta: "ferramentaSeta",

    recorte: "ferramentaRecorte",
  };

  const botao = document.getElementById(mapa[nome]);

  if (botao) {
    botao.classList.add("ativo");
  }
}

// ============================================================
// POSIÇÃO DO MOUSE NO CANVAS
// ============================================================

function pegarPosicaoEditor(event) {
  const rect = editorCanvas.getBoundingClientRect();

  const scaleX = editorCanvas.width / rect.width;

  const scaleY = editorCanvas.height / rect.height;

  let clientX;
  let clientY;

  if (event.touches?.length) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,

    y: (clientY - rect.top) * scaleY,
  };
}

// ============================================================
// SALVAR ESTADO NO HISTÓRICO
// ============================================================

function salvarEstadoEditor() {
  if (!editorCanvas) return;

  historicoEditor.push(editorCanvas.toDataURL("image/jpeg", 0.92));

  // evita guardar estados infinitos
  if (historicoEditor.length > 30) {
    historicoEditor.shift();
  }

  futuroEditor = [];
}

// ============================================================
// RESTAURAR UM ESTADO
// ============================================================

function restaurarEstadoEditor(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = function () {
      editorCanvas.width = img.width;
      editorCanvas.height = img.height;

      editorCtx = editorCanvas.getContext("2d");

      editorCtx.drawImage(img, 0, 0);

      resolve();
    };

    img.src = src;
  });
}

// ============================================================
// DESFAZER
// ============================================================

async function desfazerEditor() {
  if (historicoEditor.length <= 1) {
    return;
  }

  const atual = historicoEditor.pop();

  futuroEditor.push(atual);

  const anterior = historicoEditor[historicoEditor.length - 1];

  await restaurarEstadoEditor(anterior);
}

// ============================================================
// REFAZER
// ============================================================

async function refazerEditor() {
  if (futuroEditor.length === 0) {
    return;
  }

  const estado = futuroEditor.pop();

  historicoEditor.push(estado);

  await restaurarEstadoEditor(estado);
}

// ============================================================
// COMEÇAR DESENHO
// ============================================================

function iniciarDesenhoEditor(event) {
  if (!editorCanvas) return;

  event.preventDefault();

  const pos = pegarPosicaoEditor(event);

  inicioEditorX = pos.x;
  inicioEditorY = pos.y;

  desenhandoEditor = true;

  // ========================================================
  // DESENHO LIVRE
  // ========================================================

  if (ferramentaEditor === "desenho") {
    editorCtx.beginPath();

    editorCtx.moveTo(pos.x, pos.y);

    editorCtx.strokeStyle = "#ff0000";

    editorCtx.lineWidth = Math.max(4, editorCanvas.width / 250);

    editorCtx.lineCap = "round";
    editorCtx.lineJoin = "round";

    return;
  }

  // ========================================================
  // CÍRCULO / SETA / RECORTE
  // Guarda a imagem antes de começar a forma.
  // Assim conseguimos mostrar o preview enquanto arrasta.
  // ========================================================

  estadoAntesDaForma = editorCtx.getImageData(
    0,
    0,
    editorCanvas.width,
    editorCanvas.height,
  );
}

// ============================================================
// MOVIMENTO
// ============================================================

function moverDesenhoEditor(event) {
  if (!desenhandoEditor) return;

  event.preventDefault();

  const pos = pegarPosicaoEditor(event);

  // ========================================================
  // DESENHO LIVRE
  // ========================================================

  if (ferramentaEditor === "desenho") {
    editorCtx.lineTo(pos.x, pos.y);

    editorCtx.stroke();

    return;
  }

  // Sem estado anterior não temos como gerar preview
  if (!estadoAntesDaForma) return;

  // Apaga SOMENTE o preview anterior.
  // A foto e as marcações já salvas permanecem.
  editorCtx.putImageData(estadoAntesDaForma, 0, 0);

  // ========================================================
  // PREVIEW DO CÍRCULO
  // ========================================================

  if (ferramentaEditor === "circulo") {
    desenharCirculoEditor(inicioEditorX, inicioEditorY, pos.x, pos.y);

    return;
  }

  // ========================================================
  // PREVIEW DA SETA
  // ========================================================

  if (ferramentaEditor === "seta") {
    desenharSetaEditor(inicioEditorX, inicioEditorY, pos.x, pos.y);

    return;
  }

  // ========================================================
  // PREVIEW DO RECORTE
  // ========================================================

  if (ferramentaEditor === "recorte") {
    desenharPreviewRecorte(inicioEditorX, inicioEditorY, pos.x, pos.y);
  }
}

// ============================================================
// FINALIZAR DESENHO
// ============================================================

function finalizarDesenhoEditor(event) {
  if (!desenhandoEditor) return;

  event.preventDefault();

  desenhandoEditor = false;

  // ========================================================
  // DESENHO LIVRE
  // ========================================================

  if (ferramentaEditor === "desenho") {
    editorCtx.closePath();

    salvarEstadoEditor();

    return;
  }

  const pos = pegarPosicaoEditor(event);

  // ========================================================
  // CÍRCULO
  // O preview que está na tela vira definitivo.
  // ========================================================

  if (ferramentaEditor === "circulo") {
    if (estadoAntesDaForma) {
      editorCtx.putImageData(estadoAntesDaForma, 0, 0);
    }

    desenharCirculoEditor(inicioEditorX, inicioEditorY, pos.x, pos.y);

    estadoAntesDaForma = null;

    salvarEstadoEditor();

    return;
  }

  // ========================================================
  // SETA
  // ========================================================

  if (ferramentaEditor === "seta") {
    if (estadoAntesDaForma) {
      editorCtx.putImageData(estadoAntesDaForma, 0, 0);
    }

    desenharSetaEditor(inicioEditorX, inicioEditorY, pos.x, pos.y);

    estadoAntesDaForma = null;

    salvarEstadoEditor();

    return;
  }

  // ========================================================
  // RECORTE
  // Remove o tracejado antes de realmente recortar.
  // ========================================================

  if (ferramentaEditor === "recorte") {
    if (estadoAntesDaForma) {
      editorCtx.putImageData(estadoAntesDaForma, 0, 0);
    }

    estadoAntesDaForma = null;

    recortarEditor(inicioEditorX, inicioEditorY, pos.x, pos.y);
  }
}

// ============================================================
// CÍRCULO
// ============================================================

function desenharCirculoEditor(x1, y1, x2, y2) {
  const centroX = (x1 + x2) / 2;

  const centroY = (y1 + y2) / 2;

  const raioX = Math.abs(x2 - x1) / 2;

  const raioY = Math.abs(y2 - y1) / 2;

  editorCtx.beginPath();

  editorCtx.ellipse(centroX, centroY, raioX, raioY, 0, 0, Math.PI * 2);

  editorCtx.strokeStyle = "#ff0000";

  editorCtx.lineWidth = Math.max(4, editorCanvas.width / 250);

  editorCtx.stroke();

  editorCtx.closePath();
}

// ============================================================
// SETA
// ============================================================

function desenharSetaEditor(x1, y1, x2, y2) {
  const angulo = Math.atan2(y2 - y1, x2 - x1);

  const tamanho = Math.max(18, editorCanvas.width / 35);

  editorCtx.beginPath();

  editorCtx.moveTo(x1, y1);

  editorCtx.lineTo(x2, y2);

  editorCtx.moveTo(x2, y2);

  editorCtx.lineTo(
    x2 - tamanho * Math.cos(angulo - Math.PI / 6),
    y2 - tamanho * Math.sin(angulo - Math.PI / 6),
  );

  editorCtx.moveTo(x2, y2);

  editorCtx.lineTo(
    x2 - tamanho * Math.cos(angulo + Math.PI / 6),
    y2 - tamanho * Math.sin(angulo + Math.PI / 6),
  );

  editorCtx.strokeStyle = "#ff0000";

  editorCtx.lineWidth = Math.max(4, editorCanvas.width / 250);

  editorCtx.lineCap = "round";
  editorCtx.lineJoin = "round";

  editorCtx.stroke();

  editorCtx.closePath();
}

// ============================================================
// PREVIEW DO RECORTE
// ============================================================

function desenharPreviewRecorte(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);

  const largura = Math.abs(x2 - x1);
  const altura = Math.abs(y2 - y1);

  editorCtx.save();

  // Linha branca por baixo para aparecer
  // tanto em fotos claras quanto escuras
  editorCtx.strokeStyle = "white";

  editorCtx.lineWidth = Math.max(3, editorCanvas.width / 400);

  editorCtx.setLineDash([12, 8]);

  editorCtx.strokeRect(x, y, largura, altura);

  // Segunda linha preta deslocada
  // dá aparência de seleção de editor
  editorCtx.strokeStyle = "black";

  editorCtx.lineDashOffset = 10;

  editorCtx.strokeRect(x, y, largura, altura);

  editorCtx.restore();
}

// ============================================================
// RECORTAR
// ============================================================

function recortarEditor(x1, y1, x2, y2) {
  const x = Math.round(Math.min(x1, x2));

  const y = Math.round(Math.min(y1, y2));

  const largura = Math.round(Math.abs(x2 - x1));

  const altura = Math.round(Math.abs(y2 - y1));

  // Impede clique acidental de virar recorte
  if (largura < 30 || altura < 30) {
    return;
  }

  const dados = editorCtx.getImageData(x, y, largura, altura);

  editorCanvas.width = largura;
  editorCanvas.height = altura;

  editorCtx = editorCanvas.getContext("2d");

  editorCtx.putImageData(dados, 0, 0);

  salvarEstadoEditor();
}

// ============================================================
// LIMPAR MARCAÇÕES
// ============================================================

async function limparEditorImagem() {
  if (historicoEditor.length === 0) {
    return;
  }

  const original = historicoEditor[0];

  historicoEditor = [original];

  futuroEditor = [];

  await restaurarEstadoEditor(original);
}

// ============================================================
// SALVAR FOTO EDITADA
// ============================================================

function salvarEditorImagem() {
  if (!editorFotoAtual || !editorCanvas) {
    return;
  }

  const anexo = anexos.find((item) => item.id === editorFotoAtual.anexoId);

  if (!anexo) return;

  const foto =
    anexo[`fotos${editorFotoAtual.tipo}`]?.[editorFotoAtual.indiceFoto];

  if (!foto) return;

  // substitui a imagem pela versão editada
  foto.src = editorCanvas.toDataURL("image/jpeg", 0.9);

  fecharEditorImagem();

  renderAnexos();
}

// ============================================================
// EVENTOS DO EDITOR
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvasEditorImagem");

  // ----------------------------
  // FERRAMENTAS
  // ----------------------------

  document
    .getElementById("ferramentaDesenho")
    ?.addEventListener("click", () => selecionarFerramenta("desenho"));

  document
    .getElementById("ferramentaCirculo")
    ?.addEventListener("click", () => selecionarFerramenta("circulo"));

  document
    .getElementById("ferramentaSeta")
    ?.addEventListener("click", () => selecionarFerramenta("seta"));

  document
    .getElementById("ferramentaRecorte")
    ?.addEventListener("click", () => selecionarFerramenta("recorte"));

  // ----------------------------
  // CONTROLES
  // ----------------------------

  document
    .getElementById("btnDesfazer")
    ?.addEventListener("click", desfazerEditor);

  document
    .getElementById("btnRefazer")
    ?.addEventListener("click", refazerEditor);

  document
    .getElementById("btnLimparEditor")
    ?.addEventListener("click", limparEditorImagem);

  document
    .getElementById("btnSalvarEditor")
    ?.addEventListener("click", salvarEditorImagem);

  document
    .getElementById("btnFecharEditor")
    ?.addEventListener("click", fecharEditorImagem);

  // ----------------------------
  // MOUSE
  // ----------------------------

  canvas?.addEventListener("mousedown", iniciarDesenhoEditor);

  canvas?.addEventListener("mousemove", moverDesenhoEditor);

  window.addEventListener("mouseup", finalizarDesenhoEditor);

  // ----------------------------
  // TOUCH
  // ----------------------------

  canvas?.addEventListener("touchstart", iniciarDesenhoEditor, {
    passive: false,
  });

  canvas?.addEventListener("touchmove", moverDesenhoEditor, {
    passive: false,
  });

  canvas?.addEventListener(
    "touchend",
    function (event) {
      if (!desenhandoEditor) {
        return;
      }

      // touchend não possui touches[0],
      // então usamos a última posição conhecida.

      event.preventDefault();

      desenhandoEditor = false;

      if (ferramentaEditor === "desenho") {
        editorCtx.closePath();

        salvarEstadoEditor();
      }
    },
    {
      passive: false,
    },
  );
});

// ============================================================
// COMBOBOX PESQUISÁVEL - LOJAS
// ============================================================

const lojaSelect = document.getElementById("lojaSelect");
const lojaBusca = document.getElementById("lojaBusca");
const lojaOpcoes = document.getElementById("lojaOpcoes");
const comboLoja = document.getElementById("comboLoja");


function mostrarLojas(filtro = "") {

    if (!lojaSelect || !lojaOpcoes) return;

    const termo = filtro.trim().toLowerCase();

    lojaOpcoes.innerHTML = "";

    const opcoes = Array.from(lojaSelect.options)
        .filter(opcao => {

            if (!opcao.value) return false;

            return opcao.textContent
                .toLowerCase()
                .includes(termo);

        });


    opcoes.forEach(opcao => {

        const item = document.createElement("div");

        item.textContent = opcao.textContent.trim();

        item.className =
            "px-4 py-3 cursor-pointer hover:bg-gray-100 text-sm";


        item.addEventListener("click", () => {

            // Atualiza o SELECT ORIGINAL
            lojaSelect.value = opcao.value;

            // Mostra o nome no campo
            lojaBusca.value = opcao.textContent.trim();

            // Fecha a lista
            lojaOpcoes.classList.add("hidden");

            // Dispara o change original
            lojaSelect.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );

        });


        lojaOpcoes.appendChild(item);

    });


    if (opcoes.length > 0) {

        lojaOpcoes.classList.remove("hidden");

    } else {

        lojaOpcoes.innerHTML =
            `<div class="px-4 py-3 text-sm text-gray-500">
                Nenhuma loja encontrada
             </div>`;

        lojaOpcoes.classList.remove("hidden");

    }

}

lojaBusca?.addEventListener("focus", () => {

    mostrarLojas("");

    lojaBusca.select();

});

// DIGITOU = FILTRA
lojaBusca?.addEventListener("input", () => {

    mostrarLojas(lojaBusca.value);

});


// CLICOU FORA = FECHA
document.addEventListener("click", event => {

    if (
        comboLoja &&
        !comboLoja.contains(event.target)
    ) {

        lojaOpcoes?.classList.add("hidden");

    }

});