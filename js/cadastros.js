// ============================================================
// AREIS PRO
// CADASTROS — LOJAS E PRESTADORES
// ============================================================
//
// Responsável pela interface de consulta e gerenciamento
// de lojas e prestadores.
//
// Atualmente esta tela utiliza principalmente a tabela:
//
//     lojas_enderecos_temp
//
// A próxima evolução deste módulo será permitir:
//
// - cadastrar;
// - editar;
// - excluir;
// - persistir diretamente no Supabase.
//
// Nesta etapa nenhuma estrutura do banco será alterada.
// ============================================================

let lojasFiltroSelecionadas = new Set();
let lojasFiltradasAtuais = [];
let prestadoresCadastro = [];
let tiposServicoCadastro = [];
let prestadorDetalhesAtual = null;
let prestadorDocumentosAtual =
    [];

// ============================================================================
// CARREGAMENTO DAS LOJAS
// ============================================================================
//
// Busca os registros usados exclusivamente nesta tela.
// A função é chamada quando o usuário abre "Lojas e Prestadores" pela Home.
// ============================================================================
// ============================================================================
// SERVIÇOS DISPONÍVEIS NO CADASTRO DE PRESTADORES
// ============================================================================
//
// A lista vem da mesma tabela "tipos_servico" usada pela OS.
// Dessa forma o nome do serviço nunca precisa ser digitado manualmente.
// ============================================================================

async function carregarServicosPrestador(
    selecionados = []
) {

    const container =
        document.getElementById(
            "prestadorServicosLista"
        );


    if (!container) {
        return;
    }


    try {

        // Se a lista ainda não foi carregada,
        // consulta diretamente o Supabase.
        if (
            !Array.isArray(tiposServicoCadastro) ||
            !tiposServicoCadastro.length
        ) {

            const { data, error } =
                await supabaseClient
                    .from("tipos_servico")
                    .select(
                        "id, nome, conta_contabil, ativo"
                    )
                    .eq(
                        "ativo",
                        true
                    )
                    .order(
                        "nome",
                        {
                            ascending: true
                        }
                    );


            if (error) {
                throw error;
            }


            tiposServicoCadastro =
                Array.isArray(data)
                    ? data
                    : [];

        }


        const normalizar =
            valor =>
                String(valor ?? "")
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                    .trim()
                    .toUpperCase();


        const selecionadosNormalizados =
            selecionados.map(
                item =>
                    normalizar(item)
            );


        const servicosAtivos =
            tiposServicoCadastro
                .filter(
                    item =>
                        item.ativo !== false
                );


        if (!servicosAtivos.length) {

            container.innerHTML = `
                <p class="text-xs opacity-40 p-3">
                    Nenhum serviço ativo cadastrado.
                </p>
            `;

            atualizarContadorServicosPrestador();

            return;

        }


        container.innerHTML =
            servicosAtivos
                .map(
                    servico => {

                        const nome =
                            String(
                                servico.nome || ""
                            );

                        const marcado =
                            selecionadosNormalizados
                                .includes(
                                    normalizar(nome)
                                );


                        return `

                            <label
                                class="
                                    flex
                                    items-center
                                    gap-3
                                    p-3
                                    rounded-xl
                                    bg-black/[0.03]
                                    dark:bg-white/[0.04]
                                    hover:bg-black/[0.06]
                                    dark:hover:bg-white/[0.08]
                                    cursor-pointer
                                "
                            >

                                <input
                                    type="checkbox"
                                    class="prestador-servico-checkbox"
                                    value="${escaparHtml(nome)}"
                                    ${
                                        marcado
                                            ? "checked"
                                            : ""
                                    }
                                    onchange="atualizarContadorServicosPrestador()"
                                >

                                <div class="min-w-0">

                                    <p class="
                                        text-[10px]
                                        font-semibold
                                    ">
                                        ${escaparHtml(nome)}
                                    </p>

                                    ${
                                        servico.conta_contabil
                                            ? `
                                                <p class="
                                                    text-[8px]
                                                    opacity-40
                                                    mt-1
                                                ">
                                                    ${escaparHtml(servico.conta_contabil)}
                                                </p>
                                            `
                                            : ""
                                    }

                                </div>

                            </label>

                        `;

                    }
                )
                .join("");


        atualizarContadorServicosPrestador();


    } catch (error) {

        console.error(
            "Erro ao carregar serviços do prestador:",
            error
        );


        container.innerHTML = `
            <p class="text-xs text-red-500 p-3">
                Não foi possível carregar os serviços.
            </p>
        `;

    }

}
function atualizarContadorServicosPrestador() {

    const selecionados =
        document.querySelectorAll(
            ".prestador-servico-checkbox:checked"
        );


    const contador =
        document.getElementById(
            "contadorServicosPrestador"
        );


    if (contador) {

        contador.innerText =
            `${selecionados.length} selecionado(s)`;

    }

}
function obterServicosSelecionadosPrestador() {

    return Array.from(
        document.querySelectorAll(
            ".prestador-servico-checkbox:checked"
        )
    )
        .map(
            checkbox =>
                checkbox.value
                    .trim()
        )
        .filter(Boolean);

}
async function carregarLojasPrestadores() {

    try {

const { data, error } = await supabaseClient
    .from("lojas")
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
    "Lojas carregadas da tabela oficial:",
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

        const abaPrestadores =
        document.getElementById("cadastrosAbaPrestadores");

    const abaLojas =
        document.getElementById("cadastrosAbaLojas");

    const abaServicos =
        document.getElementById("cadastrosAbaServicos");

            const btnPrestadores =
        document.getElementById("btnAbaPrestadores");

    const btnLojas =
        document.getElementById("btnAbaLojas");

    const btnServicos =
        document.getElementById("btnAbaServicos");


    // Esconde todas
    abaLojas?.classList.add("hidden");
    abaPrestadores?.classList.add("hidden");
    abaServicos?.classList.add("hidden");


    // Estado visual padrão
    const classeInativa =
        "px-5 py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-bold opacity-60";

    const classeAtiva =
        "px-5 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold";


    if (btnLojas) {
        btnLojas.className = classeInativa;
    }

    if (btnPrestadores) {
        btnPrestadores.className = classeInativa;
    }

    if (btnServicos) {
        btnServicos.className = classeInativa;
    }


    // LOJAS
    if (aba === "lojas") {

        abaLojas?.classList.remove("hidden");

        if (btnLojas) {
            btnLojas.className = classeAtiva;
        }

        renderizarTabelaLojas();

        return;

    }

    // PRESTADORES
    if (aba === "prestadores") {

        abaPrestadores?.classList.remove("hidden");

        if (btnPrestadores) {
            btnPrestadores.className = classeAtiva;
        }

        carregarPrestadoresCadastro();

        return;

    }

    // TIPOS DE SERVIÇO
    if (aba === "servicos") {

        abaServicos?.classList.remove("hidden");

        if (btnServicos) {
            btnServicos.className = classeAtiva;
        }

        carregarTiposServico();

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
    lojasFiltradasAtuais =
        lojas;


    if (!lojas.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
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


                const numeroLoja =
                    escaparAtributoJS(
                        loja.LOJA ?? ""
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

                        <td
                            class="
                                border
                                border-black/25
                                px-3 py-3
                                text-center
                                whitespace-nowrap
                            "
                        >

                            <button
                                onclick="editarLojaCadastro('${numeroLoja}')"
                                class="
                                    px-3 py-2
                                    rounded-xl
                                    bg-black/5
                                    text-[9px]
                                    font-bold
                                    mr-1
                                "
                            >
                                EDITAR
                            </button>

                            <button
                                onclick="excluirLojaCadastro('${numeroLoja}')"
                                class="
                                    px-3 py-2
                                    rounded-xl
                                    bg-red-500/10
                                    text-red-500
                                    text-[9px]
                                    font-bold
                                "
                            >
                                EXCLUIR
                            </button>

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
// AREIS PRO
// CADASTRO DE PRESTADORES
// ============================================================================
//
// Este bloco administra os prestadores diretamente no Supabase.
//
// Fluxo:
//
// Supabase
//    ↓
// carregarPrestadoresCadastro()
//    ↓
// prestadoresCadastro
//    ↓
// renderizarPrestadores()
//
// O mesmo cadastro é utilizado posteriormente pelos outros módulos,
// evitando listas diferentes de prestadores espalhadas pelo sistema.
// ============================================================================


// ============================================================================
// CARREGAR PRESTADORES
// ============================================================================

async function carregarPrestadoresCadastro() {

    const lista =
        document.getElementById("listaPrestadores");

    if (lista) {

        lista.innerHTML = `
            <div class="glass rounded-[28px] p-6 text-sm opacity-50">
                Carregando prestadores...
            </div>
        `;

    }


    try {

        const { data, error } =
            await supabaseClient
                .from("prestadores")
                .select("*")
                .order("nome", {
                    ascending: true
                });


        if (error) {
            throw error;
        }


        prestadoresCadastro =
            Array.isArray(data)
                ? data
                : [];


        renderizarPrestadores();


    } catch (error) {

        console.error(
            "Erro ao carregar prestadores:",
            error
        );


        if (lista) {

            lista.innerHTML = `
                <div class="
                    col-span-full
                    glass rounded-[28px]
                    p-6
                    text-sm
                    text-red-500
                ">
                    Não foi possível carregar os prestadores.
                </div>
            `;

        }

    }

}


// ============================================================================
// RENDERIZAR PRESTADORES
// ============================================================================
function escaparAtributoJSPrestador(valor) {

    return String(valor ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");

}

function renderizarPrestadores() {

    const container =
        document.getElementById(
            "listaPrestadores"
        );

    const contador =
        document.getElementById(
            "contadorPrestadores"
        );

    const busca =
        String(
            document.getElementById(
                "buscaPrestadores"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    if (!container) {
        return;
    }


    const lista =
        prestadoresCadastro.filter(
            prestador => {

                const servicos =
                    Array.isArray(prestador.servicos)
                        ? prestador.servicos.join(" ")
                        : String(
                            prestador.servicos || ""
                        );


                const texto = [
                    prestador.nome,
                    prestador.razao_social,
                    prestador.cnpj,
                    prestador.codigo,
                    prestador.telefone,
                    prestador.email,
                    servicos
                ]
                    .join(" ")
                    .toLowerCase();


                return (
                    !busca ||
                    texto.includes(busca)
                );

            }
        );


    if (contador) {

        contador.innerText =
            `${prestadoresCadastro.length} prestador(es) cadastrado(s)`;

    }


    if (!lista.length) {

        container.innerHTML = `
            <div class="
                col-span-full
                glass
                rounded-[28px]
                p-8
                text-center
            ">

                <p class="text-sm font-semibold">
                    Nenhum prestador encontrado
                </p>

                <p class="text-xs opacity-40 mt-2">
                    Cadastre um novo prestador ou ajuste sua pesquisa.
                </p>

            </div>
        `;

        return;

    }


    container.innerHTML =
        lista
            .map(
                prestador => {

                    const servicos =
                        Array.isArray(prestador.servicos)
                            ? prestador.servicos
                            : [];


                    const status =
                        prestador.ativo !== false;


                return `

                    <div
onclick="
    abrirPrestadorDetalhesPorNome(
        '${escaparAtributoJSPrestador(
            prestador.nome
        )}'
    )
"                        class="
                            glass
                            rounded-[28px]
                            p-6
                            relative

                            cursor-pointer
                            transition-all
                            duration-200

                            hover:-translate-y-1
                            hover:shadow-xl
                        "
                    >

                            <div class="
                                flex
                                items-start
                                justify-between
                                gap-4
                            ">

                                <div class="
                                    flex
                                    items-center
                                    gap-4
                                    min-w-0
                                ">

                                    <div class="
                                        w-14 h-14
                                        rounded-2xl
                                        bg-black/5
                                        dark:bg-white/5
                                        overflow-hidden
                                        flex items-center justify-center
                                        flex-shrink-0
                                    ">

                                        ${
                                            prestador.logo_url

                                                ? `
                                                    <img
                                                        src="${prestador.logo_url}"
                                                        class="
                                                            w-full h-full
                                                            object-contain
                                                            p-1
                                                        "
                                                    >
                                                `

                                                : `
                                                    <span class="
                                                        text-sm
                                                        font-bold
                                                        opacity-30
                                                    ">
                                                        ${
                                                            String(
                                                                prestador.nome ||
                                                                "P"
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()
                                                        }
                                                    </span>
                                                `
                                        }

                                    </div>


                                    <div class="min-w-0">

                                        <p class="
                                            text-sm
                                            font-semibold
                                            truncate
                                        ">
                                            ${prestador.nome || "Sem nome"}
                                        </p>

                                        <p class="
                                            text-[10px]
                                            opacity-40
                                            truncate
                                            mt-1
                                        ">
                                            ${
                                                prestador.cnpj ||
                                                "CNPJ não informado"
                                            }
                                        </p>

                                    </div>

                                </div>


                                <span class="
                                    px-3 py-1
                                    rounded-full
                                    text-[9px]
                                    font-bold

                                    ${
                                        status

                                            ? "bg-emerald-500/10 text-emerald-500"

                                            : "bg-red-500/10 text-red-500"
                                    }
                                ">

                                    ${
                                        status
                                            ? "ATIVO"
                                            : "INATIVO"
                                    }

                                </span>

                            </div>


                            <div class="
                                grid
                                grid-cols-2
                                gap-3
                                mt-6
                                text-[10px]
                            ">

                                <div>

                                    <p class="
                                        uppercase
                                        font-bold
                                        opacity-30
                                    ">
                                        Código
                                    </p>

                                    <p class="mt-1">
                                        ${prestador.codigo || "--"}
                                    </p>

                                </div>


                                <div>

                                    <p class="
                                        uppercase
                                        font-bold
                                        opacity-30
                                    ">
                                        Telefone
                                    </p>

                                    <p class="mt-1">
                                        ${prestador.telefone || "--"}
                                    </p>

                                </div>

                            </div>


                            ${
                                servicos.length

                                    ? `
                                        <div class="
                                            flex
                                            flex-wrap
                                            gap-2
                                            mt-5
                                        ">

                                            ${
                                                servicos
                                                    .map(
                                                        servico => `
                                                            <span class="
                                                                px-2 py-1
                                                                rounded-full
                                                                bg-blue-500/10
                                                                text-blue-500
                                                                text-[9px]
                                                                font-semibold
                                                            ">
                                                                ${servico}
                                                            </span>
                                                        `
                                                    )
                                                    .join("")
                                            }

                                        </div>
                                    `

                                    : ""
                            }


                            <div class="
                                flex
                                gap-2
                                mt-6
                                pt-4
                                border-t
                                border-black/5
                                dark:border-white/5
                            ">

<button
    type="button"
    onclick="
        event.stopPropagation();

        editarPrestador(
            '${escaparAtributoJSPrestador(
                prestador.nome
            )}'
        );
    "
    class="
        flex-1
        px-4 py-2
        rounded-xl
        bg-black/5
        dark:bg-white/10
        text-[10px]
        font-bold
    "
>
    EDITAR
</button>

<button
    type="button"
    onclick="
        event.stopPropagation();

        excluirPrestador(
            '${escaparAtributoJSPrestador(
                prestador.nome
            )}'
        );
    "
    class="
        px-4 py-2
        rounded-xl
        bg-red-500/10
        text-red-500
        text-[10px]
        font-bold
    "
>
    EXCLUIR
</button>
                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}

// ============================================================================
// ABRIR DETALHES DO PRESTADOR PELO NOME
//
// O cadastro atual já utiliza o nome como referência.
// Depois podemos migrar tudo para UUID.
// ============================================================================

function abrirPrestadorDetalhesPorNome(
    nomePrestador
) {

    const prestador =
        prestadoresCadastro.find(
            item =>
                String(
                    item.nome ||
                    ""
                )
                    .trim()
                    .toLowerCase()
                ===
                String(
                    nomePrestador ||
                    ""
                )
                    .trim()
                    .toLowerCase()
        );


    console.log(
        "PRESTADOR CLICADO:",
        prestador
    );


    if (!prestador) {

        alert(
            "Prestador não encontrado."
        );

        return;

    }


    abrirPrestadorDetalhes(
        prestador
    );

}

// ============================================================================
// ABRIR DETALHES DO PRESTADOR PELO ID
// ============================================================================

function abrirPrestadorDetalhesPorId(
    prestadorId
) {

    console.log(
        "CARD CLICADO:",
        prestadorId
    );


    const prestador =
        prestadoresCadastro.find(
            item =>
                String(item.id) ===
                String(prestadorId)
        );


    console.log(
        "PRESTADOR ENCONTRADO:",
        prestador
    );


    if (!prestador) {

        console.error(
            "Prestador não encontrado:",
            prestadorId
        );

        alert(
            "Não foi possível localizar este prestador."
        );

        return;

    }


    abrirPrestadorDetalhes(
        prestador
    );

}

// ============================================================================
// ABRIR PÁGINA DE DETALHES DO PRESTADOR
// ============================================================================
//
// O card envia apenas o ID.
//
// O objeto completo é recuperado de prestadoresCadastro.
// Isso evita colocar JSON inteiro dentro do onclick do HTML.
// ============================================================================

console.log(
    "PRESTADORES:",
    prestadoresCadastro.map(p => ({
        id: p.id,
        nome: p.nome
    }))
);

function abrirPrestadorDetalhesPorId(
    prestadorId
) {

    const prestador =
        prestadoresCadastro.find(
            item =>
                String(item.id) ===
                String(prestadorId)
        );


    if (!prestador) {

        console.error(
            "Prestador não encontrado:",
            prestadorId
        );

        alert(
            "Não foi possível localizar os dados deste prestador."
        );

        return;

    }


    abrirPrestadorDetalhes(
        prestador
    );

}

// ============================================================================
// ABRIR MODAL
// ============================================================================

async function abrirModalPrestador() {

    limparFormularioPrestador();


    document
        .getElementById(
            "tituloModalPrestador"
        )
        .innerText =
        "Novo Prestador";


    await carregarServicosPrestador(
        []
    );


    document
        .getElementById(
            "modalPrestador"
        )
        ?.classList
        .remove("hidden");

}


// ============================================================================
// FECHAR MODAL
// ============================================================================

function fecharModalPrestador() {

    document
        .getElementById("modalPrestador")
        ?.classList
        .add("hidden");

}


// ============================================================================
// LIMPAR FORMULÁRIO
// ============================================================================

function limparFormularioPrestador() {

const campos = [

    "prestadorIdEdicao",
    "prestadorNome",
    "prestadorRazaoSocial",
    "prestadorCnpj",
    "prestadorCodigo",
    "prestadorTelefone",
    "prestadorEmail"

];

    campos.forEach(
        id => {

            const elemento =
                document.getElementById(id);

            if (elemento) {
                elemento.value = "";
            }

        }
    );


    const ativo =
        document.getElementById(
            "prestadorAtivo"
        );

    if (ativo) {
        ativo.checked = true;
    }


    const logo =
        document.getElementById(
            "prestadorLogo"
        );

    if (logo) {
        logo.value = "";
    }


    const preview =
        document.getElementById(
            "prestadorLogoAtual"
        );

    if (preview) {

        preview.innerHTML = "";

        preview.classList.add(
            "hidden"
        );

    }

const listaServicos =
    document.getElementById(
        "prestadorServicosLista"
    );


if (listaServicos) {

    listaServicos.innerHTML = `
        <p class="text-xs opacity-40 p-3">
            Carregando serviços...
        </p>
    `;

}


atualizarContadorServicosPrestador();
}


// ============================================================================
// EDITAR
// ============================================================================

async function editarPrestador(nomeOriginal) {
    const prestador =
        prestadoresCadastro.find(
            item =>
                String(item.nome) ===
                String(nomeOriginal)
        );


    if (!prestador) {

        alert(
            "Prestador não encontrado."
        );

        return;

    }


    // Guarda o NOME ORIGINAL.
    // Ele será usado para localizar o registro no Supabase
    // mesmo que o usuário altere o nome durante a edição.
    document
        .getElementById("prestadorIdEdicao")
        .value =
        prestador.nome;


    document
        .getElementById("prestadorNome")
        .value =
        prestador.nome || "";


    document
        .getElementById("prestadorRazaoSocial")
        .value =
        prestador.razao_social || "";


    document
        .getElementById("prestadorCnpj")
        .value =
        prestador.cnpj || "";


    document
        .getElementById("prestadorCodigo")
        .value =
        prestador.codigo || "";


    document
        .getElementById("prestadorTelefone")
        .value =
        prestador.telefone || "";


    document
        .getElementById("prestadorEmail")
        .value =
        prestador.email || "";
    let servicosAtuais = [];


if (
    Array.isArray(
        prestador.servicos
    )
) {

    servicosAtuais =
        prestador.servicos;

}

else if (
    typeof prestador.servicos ===
    "string"
) {

    servicosAtuais =
        prestador.servicos
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

}


await carregarServicosPrestador(
    servicosAtuais
);
    document
        .getElementById("prestadorAtivo")
        .checked =
        prestador.ativo !== false;


    const preview =
        document.getElementById(
            "prestadorLogoAtual"
        );


    if (
        preview &&
        prestador.logo_url
    ) {

        preview.innerHTML = `
            <div class="
                p-3
                rounded-2xl
                bg-black/5
                dark:bg-white/5
            ">
                <img
                    src="${prestador.logo_url}"
                    class="
                        max-h-20
                        max-w-[200px]
                        object-contain
                    "
                >
            </div>
        `;

        preview.classList.remove(
            "hidden"
        );

    } else if (preview) {

        preview.innerHTML = "";

        preview.classList.add(
            "hidden"
        );

    }


    document
        .getElementById(
            "tituloModalPrestador"
        )
        .innerText =
        "Editar Prestador";


    document
        .getElementById(
            "modalPrestador"
        )
        ?.classList
        .remove("hidden");

}


// ============================================================================
// UPLOAD DA LOGO
// ============================================================================

async function enviarLogoPrestador(
    arquivo,
    nomePrestador
) {

    if (!arquivo) {
        return null;
    }


    const extensao =
        arquivo.name
            .split(".")
            .pop()
            .toLowerCase();


    const nomeSeguro =
        String(nomePrestador)
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


    const caminho =
        `prestadores/${nomeSeguro}-${Date.now()}.${extensao}`;


    const { error } =
        await supabaseClient
            .storage
            .from("logos-prestadores")
            .upload(
                caminho,
                arquivo,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );


    if (error) {
        throw error;
    }


    const { data } =
        supabaseClient
            .storage
            .from("logos-prestadores")
            .getPublicUrl(caminho);


    return (
        data?.publicUrl ||
        null
    );

}


// ============================================================================
// SALVAR
// ============================================================================
async function salvarPrestador() {

    const botao =
        document.getElementById("btnSalvarPrestador");

    const nomeOriginal =
        document
            .getElementById("prestadorIdEdicao")
            ?.value
            ?.trim() || "";

    const nome =
        document
            .getElementById("prestadorNome")
            ?.value
            ?.trim() || "";


    if (!nome) {

        alert("Informe o nome do prestador.");

        return;
    }


    try {

        // =====================================================
        // BLOQUEIA BOTÃO
        // =====================================================

        if (botao) {

            botao.disabled = true;
            botao.innerText = "SALVANDO...";
            botao.style.opacity = "0.6";

        }


        // =====================================================
        // LOGO ATUAL
        // =====================================================

        let logoUrl = null;


        // Se estiver editando, preserva a logo já existente.
        if (nomeOriginal) {

            const existente =
                prestadoresCadastro.find(
                    prestador =>
                        String(prestador.nome) ===
                        String(nomeOriginal)
                );

            logoUrl =
                existente?.logo_url || null;

        }


        // =====================================================
        // NOVA LOGO
        // =====================================================

        const arquivoLogo =
            document
                .getElementById("prestadorLogo")
                ?.files?.[0];


        if (arquivoLogo) {

            logoUrl =
                await enviarLogoPrestador(
                    arquivoLogo,
                    nome
                );

        }


        // =====================================================
        // SERVIÇOS
        // =====================================================

const servicos =
    obterServicosSelecionadosPrestador();

        // =====================================================
        // PAYLOAD
        // IMPORTANTE:
        // FICA FORA DO IF DE EDIÇÃO
        // =====================================================

        const payload = {

            nome: nome,

            razao_social:
                document
                    .getElementById("prestadorRazaoSocial")
                    ?.value
                    ?.trim() || null,

            cnpj:
                document
                    .getElementById("prestadorCnpj")
                    ?.value
                    ?.trim() || null,

            codigo:
                document
                    .getElementById("prestadorCodigo")
                    ?.value
                    ?.trim() || null,

            telefone:
                document
                    .getElementById("prestadorTelefone")
                    ?.value
                    ?.trim() || null,

            email:
                document
                    .getElementById("prestadorEmail")
                    ?.value
                    ?.trim() || null,

            logo_url:
                logoUrl,

            servicos:
                servicos,

            ativo:
                document
                    .getElementById("prestadorAtivo")
                    ?.checked ?? true,

            atualizado_em:
                new Date().toISOString()

        };


        // =====================================================
        // EDITAR PRESTADOR
        // =====================================================

        if (nomeOriginal) {

            const { error } =
                await supabaseClient
                    .from("prestadores")
                    .update(payload)
                    .eq("nome", nomeOriginal);


            if (error) {
                throw error;
            }

        }


        // =====================================================
        // NOVO PRESTADOR
        // =====================================================

        else {

            const { error } =
                await supabaseClient
                    .from("prestadores")
                    .insert([payload]);


            if (error) {
                throw error;
            }

        }


        // =====================================================
        // ATUALIZA O AREIS
        // =====================================================

        fecharModalPrestador();

        await carregarPrestadoresCadastro();


        // Atualiza também o select do módulo Relatórios.
        if (
            typeof carregarPrestadoresDoBanco === "function"
        ) {

            await carregarPrestadoresDoBanco();

        }


        alert(
            nomeOriginal
                ? "Prestador atualizado com sucesso."
                : "Prestador cadastrado com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao salvar prestador:",
            error
        );

        alert(
            "Não foi possível salvar o prestador.\n\n" +
            (error?.message || error)
        );


    } finally {

        if (botao) {

            botao.disabled = false;
            botao.innerText = "SALVAR";
            botao.style.opacity = "1";

        }

    }

}

// ============================================================================
// EXCLUIR
// ============================================================================

async function excluirPrestador(nome) {

    const prestador =
        prestadoresCadastro.find(
            item =>
                String(item.nome) ===
                String(nome)
        );


    if (!prestador) {

        alert(
            "Prestador não encontrado."
        );

        return;

    }


    const confirmou =
        confirm(
            `Deseja realmente excluir o prestador "${prestador.nome}"?`
        );


    if (!confirmou) {
        return;
    }


    try {

        const { error } =
            await supabaseClient
                .from("prestadores")
                .delete()
                .eq(
                    "nome",
                    prestador.nome
                );


        if (error) {
            throw error;
        }


        await carregarPrestadoresCadastro();


        // Atualiza imediatamente o select
        // utilizado no módulo de Relatórios.
        if (
            typeof carregarPrestadoresDoBanco ===
            "function"
        ) {

            await carregarPrestadoresDoBanco();

        }


        alert(
            "Prestador excluído com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao excluir prestador:",
            error
        );


        alert(
            "Não foi possível excluir o prestador.\n\n" +
            (
                error?.message ||
                error
            )
        );

    }

}
// ============================================================================
// AREIS PRO
// CRUD DE LOJAS
// ============================================================================


// ============================================================================
// ABRIR MODAL - NOVA LOJA
// ============================================================================

function abrirModalLoja() {

    limparFormularioLoja();


    const titulo =
        document.getElementById(
            "tituloModalLoja"
        );


    if (titulo) {
        titulo.innerText = "Nova Loja";
    }


    document
        .getElementById("modalLoja")
        ?.classList
        .remove("hidden");

}


// ============================================================================
// FECHAR MODAL
// ============================================================================

function fecharModalLoja() {

    document
        .getElementById("modalLoja")
        ?.classList
        .add("hidden");

}


// ============================================================================
// LIMPAR FORMULÁRIO
// ============================================================================

function limparFormularioLoja() {

    const ids = [

        "lojaNumeroOriginal",
        "cadLojaNumero",
        "cadLojaNome",
        "cadLojaUf",
        "cadLojaEndereco",
        "cadLojaCidade",
        "cadLojaCep"

    ];


    ids.forEach(id => {

        const campo =
            document.getElementById(id);

        if (campo) {
            campo.value = "";
        }

    });

}


// ============================================================================
// EDITAR LOJA
// ============================================================================

function editarLojaCadastro(numeroLoja) {

    const loja =
        (lojasEnderecosTemp || [])
            .find(
                item =>
                    String(item.LOJA ?? "").trim() ===
                    String(numeroLoja ?? "").trim()
            );


    if (!loja) {

        alert(
            "Loja não encontrada."
        );

        return;

    }


    // Guarda o número original.
    // Isso permite inclusive alterar o número durante a edição.
    document
        .getElementById("lojaNumeroOriginal")
        .value =
        loja.LOJA || "";


    document
        .getElementById("cadLojaNumero")
        .value =
        loja.LOJA || "";


    document
        .getElementById("cadLojaNome")
        .value =
        loja.NOME || "";


    document
        .getElementById("cadLojaUf")
        .value =
        loja.UF || "";


    document
        .getElementById("cadLojaEndereco")
        .value =
        loja["ENDEREÇO"] || "";


    document
        .getElementById("cadLojaCidade")
        .value =
        loja.CIDADE || "";


    document
        .getElementById("cadLojaCep")
        .value =
        loja.CEP || "";


    const titulo =
        document.getElementById(
            "tituloModalLoja"
        );


    if (titulo) {
        titulo.innerText = "Editar Loja";
    }


    document
        .getElementById("modalLoja")
        ?.classList
        .remove("hidden");

}


// ============================================================================
// SALVAR LOJA
// ============================================================================

async function salvarLojaCadastro() {

    const botao =
        document.getElementById(
            "btnSalvarLoja"
        );


    const numeroOriginal =
        document
            .getElementById(
                "lojaNumeroOriginal"
            )
            ?.value
            ?.trim() || "";


    const numero =
        document
            .getElementById(
                "cadLojaNumero"
            )
            ?.value
            ?.trim() || "";


    if (!numero) {

        alert(
            "Informe o número da loja."
        );

        return;

    }


    try {

        if (botao) {

            botao.disabled = true;
            botao.innerText = "SALVANDO...";
            botao.style.opacity = "0.6";

        }


        const payload = {

            "LOJA":
                numero,

            "NOME":
                document
                    .getElementById(
                        "cadLojaNome"
                    )
                    ?.value
                    ?.trim()
                    ?.toUpperCase() || null,

            "UF":
                document
                    .getElementById(
                        "cadLojaUf"
                    )
                    ?.value
                    ?.trim()
                    ?.toUpperCase() || null,

            "ENDEREÇO":
                document
                    .getElementById(
                        "cadLojaEndereco"
                    )
                    ?.value
                    ?.trim()
                    ?.toUpperCase() || null,

            "CIDADE":
                document
                    .getElementById(
                        "cadLojaCidade"
                    )
                    ?.value
                    ?.trim()
                    ?.toUpperCase() || null,

            "CEP":
                document
                    .getElementById(
                        "cadLojaCep"
                    )
                    ?.value
                    ?.trim() || null

        };


        // =====================================================
        // EDITAR
        // =====================================================

        if (numeroOriginal) {

            const { error } =
                await supabaseClient
                    .from("lojas")
                    .update(payload)
                    .eq(
                        "LOJA",
                        numeroOriginal
                    );


            if (error) {
                throw error;
            }

        }


        // =====================================================
        // NOVA LOJA
        // =====================================================

        else {

            const { error } =
                await supabaseClient
                    .from(
                        "lojas_enderecos_temp"
                    )
                    .insert([
                        payload
                    ]);


            if (error) {
                throw error;
            }

        }


        fecharModalLoja();


        // Atualiza a tabela do módulo
        await carregarLojasPrestadores();


        alert(
            numeroOriginal
                ? "Loja atualizada com sucesso."
                : "Loja cadastrada com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao salvar loja:",
            error
        );


        alert(
            "Não foi possível salvar a loja.\n\n" +
            (
                error?.message ||
                error
            )
        );


    } finally {

        if (botao) {

            botao.disabled = false;
            botao.innerText = "SALVAR";
            botao.style.opacity = "1";

        }

    }

}


// ============================================================================
// EXCLUIR LOJA
// ============================================================================

async function excluirLojaCadastro(
    numeroLoja
) {

    const loja =
        (lojasEnderecosTemp || [])
            .find(
                item =>
                    String(item.LOJA ?? "").trim() ===
                    String(numeroLoja ?? "").trim()
            );


    if (!loja) {

        alert(
            "Loja não encontrada."
        );

        return;

    }


    const confirmou =
        confirm(
            `Deseja realmente excluir a loja ${loja.LOJA} - ${loja.NOME || ""}?`
        );


    if (!confirmou) {
        return;
    }


    try {

        const { error } =
            await supabaseClient
                .from("lojas")
                .delete()
                .eq(
                    "LOJA",
                    loja.LOJA
                );


        if (error) {
            throw error;
        }


        lojasFiltroSelecionadas.delete(
            String(loja.LOJA)
        );


        await carregarLojasPrestadores();


        alert(
            "Loja excluída com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao excluir loja:",
            error
        );


        alert(
            "Não foi possível excluir a loja.\n\n" +
            (
                error?.message ||
                error
            )
        );

    }

}
// ============================================================================
// TIPOS DE SERVIÇO
// ============================================================================

async function carregarTiposServico() {

    try {

        const { data, error } =
            await supabaseClient
                .from("tipos_servico")
                .select("*")
                .order("nome", {
                    ascending: true
                });


        if (error) {
            throw error;
        }


        tiposServicoCadastro =
            data || [];


        renderizarTiposServico();


    } catch (error) {

        console.error(
            "Erro ao carregar tipos de serviço:",
            error
        );

        alert(
            "Não foi possível carregar os tipos de serviço."
        );

    }

}


// ============================================================================
// RENDER
// ============================================================================

function renderizarTiposServico() {

    const tbody =
        document.getElementById(
            "tabelaTiposServicoBody"
        );

    const contador =
        document.getElementById(
            "contadorTiposServico"
        );

    const busca =
        String(
            document.getElementById(
                "buscaTiposServico"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    if (!tbody) {
        return;
    }


    const lista =
        tiposServicoCadastro.filter(
            item => {

                const texto =
                    [
                        item.nome,
                        item.conta_contabil
                    ]
                        .join(" ")
                        .toLowerCase();


                return (
                    !busca ||
                    texto.includes(busca)
                );

            }
        );


    if (contador) {

        contador.innerText =
            `${tiposServicoCadastro.length} serviço(s) cadastrado(s)`;

    }


    if (!lista.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="
                        px-4 py-10
                        text-center
                        opacity-40
                    "
                >
                    Nenhum tipo de serviço encontrado.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        lista
            .map(item => {

                const conta =
                    item.conta_contabil || "--";

                const ativo =
                    item.ativo !== false;


                return `

                    <tr
                        class="
                            border-t
                            border-black/5
                            dark:border-white/5
                        "
                    >

                        <td class="px-4 py-4 font-semibold">
                            ${escaparHtml(item.nome || "")}
                        </td>


                        <td class="px-4 py-4 text-center">

                            <span class="
                                px-3 py-1
                                rounded-full
                                text-[10px]
                                font-bold
                                ${
                                    conta === "MCC"
                                        ? "bg-blue-500/10 text-blue-600"
                                        : conta === "CCL"
                                            ? "bg-violet-500/10 text-violet-600"
                                            : "bg-black/5 opacity-40"
                                }
                            ">

                                ${conta}

                            </span>

                        </td>


                        <td class="px-4 py-4 text-center">

                            <span class="
                                px-3 py-1
                                rounded-full
                                text-[9px]
                                font-bold
                                ${
                                    ativo
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-red-500/10 text-red-500"
                                }
                            ">

                                ${
                                    ativo
                                        ? "ATIVO"
                                        : "INATIVO"
                                }

                            </span>

                        </td>


                        <td class="px-4 py-4 text-center whitespace-nowrap">

                            <button
                                onclick="editarTipoServico('${item.id}')"
                                class="
                                    px-3 py-2
                                    rounded-xl
                                    bg-black/5
                                    dark:bg-white/10
                                    text-[9px]
                                    font-bold
                                    mr-1
                                "
                            >
                                EDITAR
                            </button>


                            <button
                                onclick="excluirTipoServico('${item.id}')"
                                class="
                                    px-3 py-2
                                    rounded-xl
                                    bg-red-500/10
                                    text-red-500
                                    text-[9px]
                                    font-bold
                                "
                            >
                                EXCLUIR
                            </button>

                        </td>

                    </tr>

                `;

            })
            .join("");

}


// ============================================================================
// NOVO
// ============================================================================

function abrirModalTipoServico() {

    document
        .getElementById("tipoServicoIdEdicao")
        .value = "";

    document
        .getElementById("tipoServicoNome")
        .value = "";

    document
        .getElementById("tipoServicoConta")
        .value = "";

    document
        .getElementById("tipoServicoAtivo")
        .checked = true;


    document
        .getElementById("tituloModalTipoServico")
        .innerText =
        "Novo Serviço";


    document
        .getElementById("modalTipoServico")
        ?.classList
        .remove("hidden");

}


// ============================================================================
// FECHAR
// ============================================================================

function fecharModalTipoServico() {

    document
        .getElementById("modalTipoServico")
        ?.classList
        .add("hidden");

}

async function excluirDocumentoPrestador() {

    if (
        !documentoPrestadorEdicaoAtual?.id
    ) {

        alert(
            "Documento inválido."
        );

        return;

    }


    const confirmar =
        confirm(
            "Deseja realmente excluir este documento?\n\n" +
            "Essa ação removerá o documento do histórico."
        );


    if (!confirmar) {
        return;
    }


    try {

        const documento =
            documentoPrestadorEdicaoAtual;


        // ========================================================
        // EXCLUI REGISTRO DO BANCO
        // ========================================================

        const {
            error
        } =
            await supabaseClient
                .from(
                    "prestadores_documentos"
                )
                .delete()
                .eq(
                    "id",
                    documento.id
                );


        if (error) {
            throw error;
        }


        fecharDetalhesDocumentoPrestador();


        await carregarDocumentosPrestador();


        alert(
            "Documento excluído com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao excluir documento:",
            error
        );


        alert(
            "Não foi possível excluir o documento.\n\n" +
            (
                error?.message ||
                error
            )
        );

    }

}

// ============================================================================
// EDITAR
// ============================================================================

function editarTipoServico(id) {

    const item =
        tiposServicoCadastro.find(
            servico =>
                String(servico.id) ===
                String(id)
        );


    if (!item) {

        alert(
            "Tipo de serviço não encontrado."
        );

        return;

    }


    document
        .getElementById("tipoServicoIdEdicao")
        .value =
        item.id;


    document
        .getElementById("tipoServicoNome")
        .value =
        item.nome || "";


    document
        .getElementById("tipoServicoConta")
        .value =
        item.conta_contabil || "";


    document
        .getElementById("tipoServicoAtivo")
        .checked =
        item.ativo !== false;


    document
        .getElementById("tituloModalTipoServico")
        .innerText =
        "Editar Serviço";


    document
        .getElementById("modalTipoServico")
        ?.classList
        .remove("hidden");

}


// ============================================================================
// SALVAR
// ============================================================================

async function salvarTipoServico() {

    const botao =
        document.getElementById(
            "btnSalvarTipoServico"
        );

    const id =
        document
            .getElementById(
                "tipoServicoIdEdicao"
            )
            ?.value
            ?.trim() || "";


    const nome =
        document
            .getElementById(
                "tipoServicoNome"
            )
            ?.value
            ?.trim()
            ?.toUpperCase() || "";


    if (!nome) {

        alert(
            "Informe o nome do serviço."
        );

        return;

    }


    try {

        if (botao) {

            botao.disabled = true;
            botao.innerText = "SALVANDO...";
            botao.style.opacity = "0.6";

        }


        const payload = {

            nome: nome,

            conta_contabil:
                document
                    .getElementById(
                        "tipoServicoConta"
                    )
                    ?.value || null,

            ativo:
                document
                    .getElementById(
                        "tipoServicoAtivo"
                    )
                    ?.checked ?? true,

            atualizado_em:
                new Date()
                    .toISOString()

        };


        if (id) {

            const { error } =
                await supabaseClient
                    .from("tipos_servico")
                    .update(payload)
                    .eq("id", id);


            if (error) {
                throw error;
            }

        } else {

            const { error } =
                await supabaseClient
                    .from("tipos_servico")
                    .insert([
                        payload
                    ]);


            if (error) {
                throw error;
            }

        }


        fecharModalTipoServico();

        await carregarTiposServico();


        alert(
            id
                ? "Serviço atualizado com sucesso."
                : "Serviço cadastrado com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao salvar tipo de serviço:",
            error
        );


        alert(
            "Não foi possível salvar o serviço.\n\n" +
            (
                error?.message ||
                error
            )
        );


    } finally {

        if (botao) {

            botao.disabled = false;
            botao.innerText = "SALVAR";
            botao.style.opacity = "1";

        }

    }

}


// ============================================================================
// EXCLUIR
// ============================================================================

async function excluirTipoServico(id) {

    const item =
        tiposServicoCadastro.find(
            servico =>
                String(servico.id) ===
                String(id)
        );


    if (!item) {
        return;
    }


    const confirmou =
        confirm(
            `Deseja realmente excluir o serviço "${item.nome}"?`
        );


    if (!confirmou) {
        return;
    }


    try {

        const { error } =
            await supabaseClient
                .from("tipos_servico")
                .delete()
                .eq("id", id);


        if (error) {
            throw error;
        }


        await carregarTiposServico();


        alert(
            "Serviço excluído com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao excluir tipo de serviço:",
            error
        );


        alert(
            "Não foi possível excluir o serviço.\n\n" +
            (
                error?.message ||
                error
            )
        );

    }

}

async function abrirPrestadorDetalhes(
    prestador
) {

    prestadorDetalhesAtual =
        prestador;


    // ========================================================
    // ESCONDE OUTRAS VIEWS
    // ========================================================

const viewsParaEsconder = [

    "homeView",
    "osView",
    "chamadosView",
    "mainView",
    "faturamentoView",
    "cadastrosView",
    "converterView",
    "configView"

];


viewsParaEsconder.forEach(
    id => {

        document
            .getElementById(id)
            ?.classList
            .add(
                "hidden-view"
            );

    }
);

    document
        .getElementById(
            "prestadorDetalhesView"
        )
        ?.classList
        .remove(
            "hidden-view"
        );


    // ========================================================
    // DADOS DO PRESTADOR
    // ========================================================

    const set =
        (
            id,
            valor
        ) => {

            // ========================================================
// LOGO DO PRESTADOR
// ========================================================

const logo =
    document.getElementById(
        "prestadorDetalhesLogo"
    );

const fallback =
    document.getElementById(
        "prestadorDetalhesLogoFallback"
    );


const logoUrl =
    String(
        prestador.logo_url ||
        ""
    ).trim();


console.log(
    "LOGO DO PRESTADOR:",
    prestador.nome,
    logoUrl
);


if (logoUrl) {

    if (logo) {

        logo.src =
            logoUrl;

        logo.classList.remove(
            "hidden"
        );

    }


    if (fallback) {

        fallback.classList.add(
            "hidden"
        );

    }

} else {

    if (logo) {

        logo.removeAttribute(
            "src"
        );

        logo.classList.add(
            "hidden"
        );

    }


    if (fallback) {

        fallback.textContent =
            String(
                prestador.nome ||
                "P"
            )
                .charAt(0)
                .toUpperCase();

        fallback.classList.remove(
            "hidden"
        );

    }

}

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    valor || "—";

            }

        };

document.getElementById(
    "prestadorDetalhesEndereco"
).textContent =
    prestador.endereco ||
    prestador.logradouro ||
    "Endereço não informado";


document.getElementById(
    "prestadorDetalhesMunicipio"
).textContent =
    [
        prestador.municipio ||
        prestador.cidade,

        prestador.uf ||
        prestador.estado
    ]
        .filter(Boolean)
        .join(" - ") ||
    "Município não informado";


document.getElementById(
    "prestadorDetalhesCep"
).textContent =
    prestador.cep
        ? `CEP ${prestador.cep}`
        : "CEP não informado";

    set(
        "prestadorDetalhesNome",
        prestador.nome
    );


    set(
        "prestadorDetalhesRazao",
        prestador.razao_social
    );


    set(
        "prestadorDetalhesCnpj",
        prestador.cnpj
    );


set(
    "prestadorDetalhesCodigo",
    prestador.codigo ||
    prestador.cod
);

    set(
        "prestadorDetalhesTelefone",
        prestador.telefone
    );


    set(
        "prestadorDetalhesEmail",
        prestador.email
    );


    // ========================================================
    // SERVIÇOS
    // ========================================================

    const boxServicos =
        document.getElementById(
            "prestadorDetalhesServicos"
        );


    if (boxServicos) {

        const servicos =
            Array.isArray(
                prestador.servicos
            )
                ? prestador.servicos
                : [];


        boxServicos.innerHTML =
            servicos.length

                ? servicos
                    .map(
                        servico => `

                            <span class="
                                px-3
                                py-2
                                rounded-full
                                bg-black/5
                                dark:bg-white/10
                                text-[10px]
                                font-semibold
                            ">
                                ${servico}
                            </span>

                        `
                    )
                    .join("")

                : `

                    <span class="text-xs opacity-40">
                        Nenhum serviço vinculado.
                    </span>

                `;

    }


    await carregarDocumentosPrestador();

}
function voltarParaPrestadores() {

    document
        .getElementById(
            "prestadorDetalhesView"
        )
        ?.classList
        .add(
            "hidden-view"
        );


    document
        .getElementById(
            "cadastrosView"
        )
        ?.classList
        .remove(
            "hidden-view"
        );


    if (
        typeof abrirAbaCadastros ===
        "function"
    ) {

        abrirAbaCadastros(
            "prestadores"
        );

    }

}

async function carregarDocumentosPrestador() {

    if (
        !prestadorDetalhesAtual
    ) {
        return;
    }


    if (
        !prestadorDetalhesAtual?.id
    ) {

        console.warn(
            "Prestador sem ID:",
            prestadorDetalhesAtual
        );


        prestadorDocumentosAtual = [];


        renderizarFiltroLojasPrestador();

        renderizarDocumentosPrestador();


        return;

    }


    try {

        const { data, error } =
            await supabaseClient
                .from(
                    "prestadores_documentos"
                )
                .select("*")
                .eq(
                    "prestador_id",
                    prestadorDetalhesAtual.id
                )
                .order(
                    "data_documento",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        prestadorDocumentosAtual =
            data || [];


        renderizarFiltroLojasPrestador();

        renderizarDocumentosPrestador();


    } catch (error) {

        console.error(
            "Erro ao carregar documentos do prestador:",
            error
        );

    }

}

function renderizarFiltroLojasPrestador() {

    const select =
        document.getElementById(
            "prestadorDocFiltroLoja"
        );


    if (!select) {
        return;
    }


    const valorAtual =
        select.value;


    const lojas =
        [
            ...new Set(
                prestadorDocumentosAtual
                    .map(
                        doc =>
                            String(
                                doc.loja ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR",
                        {
                            numeric: true
                        }
                    )
            );


    select.innerHTML = `

        <option value="">
            Todas as lojas
        </option>

        ${
            lojas
                .map(
                    loja => `

                        <option value="${loja}">
                            Loja ${loja}
                        </option>

                    `
                )
                .join("")
        }

    `;


    select.value =
        valorAtual;

}
function renderizarDocumentosPrestador() {

    const tbody =
        document.getElementById(
            "prestadorDocumentosBody"
        );


    if (!tbody) {
        return;
    }


    const loja =
        document.getElementById(
            "prestadorDocFiltroLoja"
        )?.value || "";


    const tipo =
        document.getElementById(
            "prestadorDocFiltroTipo"
        )?.value || "";


    const manutencao =
        document.getElementById(
            "prestadorDocFiltroManutencao"
        )?.value || "";


    const periodo =
        document.getElementById(
            "prestadorDocFiltroPeriodo"
        )?.value || "";


    const busca =
        String(
            document.getElementById(
                "prestadorDocBusca"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    let documentos =
        [...prestadorDocumentosAtual];


    if (loja) {

        documentos =
            documentos.filter(
                doc =>
                    String(
                        doc.loja
                    ) === loja
            );

    }


    if (tipo) {

        documentos =
            documentos.filter(
                doc =>
                    doc.tipo_documento ===
                    tipo
            );

    }


    if (manutencao) {

        documentos =
            documentos.filter(
                doc =>
                    doc.tipo_manutencao ===
                    manutencao
            );

    }


    if (periodo) {

        documentos =
            documentos.filter(
                doc =>
                    String(
                        doc.data_documento ||
                        ""
                    ).slice(
                        0,
                        7
                    ) === periodo
            );

    }


    if (busca) {

        documentos =
            documentos.filter(
                doc =>
                    String(
                        doc.numero_documento ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            busca
                        )
            );

    }


    if (!documentos.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="
                        p-10
                        text-center
                        opacity-40
                    "
                >
                    Nenhum documento encontrado.
                </td>

            </tr>

        `;

        return;

    }


    const nomeTipo =
        tipo => {

            if (
                tipo === "NOTA_FISCAL"
            ) {
                return "Nota Fiscal";
            }

            if (
                tipo === "RELATORIO"
            ) {
                return "Relatório";
            }

            if (
                tipo === "OS"
            ) {
                return "OS";
            }

            return tipo || "—";

        };


    const nomeManutencao =
        tipo => {

            const mapa = {

                PREVENTIVA:
                    "Preventiva",

                CORRETIVA:
                    "Corretiva",

                PREVENTIVA_CORRETIVA:
                    "Preventiva / Corretiva",

                INSTALACAO:
                    "Instalação",

                OUTROS:
                    "Outros"

            };


            return mapa[tipo] ||
                "—";

        };

        const nomeCompletoLoja =
    codigoLoja => {

        const codigo =
            String(
                codigoLoja ||
                ""
            ).trim();


        if (!codigo) {
            return "—";
        }


        const cadastro =
            (lojasEnderecosTemp || [])
                .find(
                    loja =>
                        String(
                            loja.LOJA ??
                            loja.loja ??
                            ""
                        ).trim() ===
                        codigo
                );


        if (!cadastro) {

            return codigo;

        }


        const nome =
            String(
                cadastro.NOME ??
                cadastro.nome ??
                ""
            ).trim();


        const uf =
            String(
                cadastro.UF ??
                cadastro.uf ??
                ""
            ).trim();


        return [
            codigo,
            nome,
            uf
        ]
            .filter(Boolean)
            .join(" - ");

    };

    tbody.innerHTML =
        documentos
            .map(
                doc => `

<tr
    onclick="
        abrirDetalhesDocumentoPrestador(
            '${doc.id}'
        )
    "
    class="
        border-t
        border-black/5
        dark:border-white/5

        cursor-pointer
        hover:bg-black/[0.03]
        dark:hover:bg-white/[0.03]
        transition
    "
>
                        <td class="p-3 whitespace-nowrap">
                            ${
                                doc.data_documento
                                    ? new Date(
                                        doc.data_documento +
                                        "T12:00:00"
                                    )
                                        .toLocaleDateString(
                                            "pt-BR"
                                        )
                                    : "—"
                            }
                        </td>


<td class="p-3 font-semibold">
    ${escaparHtml(
        nomeCompletoLoja(
            doc.loja
        )
    )}
</td>
                        <td class="p-3">
                            ${nomeTipo(
                                doc.tipo_documento
                            )}
                        </td>


                        <td class="p-3">
                            ${nomeManutencao(
                                doc.tipo_manutencao
                            )}
                        </td>


                        <td class="p-3">
                            ${
                                doc.numero_documento ||
                                "—"
                            }
                        </td>


                        <td class="p-3 whitespace-nowrap">
                            ${
                                doc.valor != null

                                    ? Number(
                                        doc.valor
                                    )
                                        .toLocaleString(
                                            "pt-BR",
                                            {
                                                style:
                                                    "currency",
                                                currency:
                                                    "BRL"
                                            }
                                        )

                                    : "—"
                            }
                        </td>


                        <td class="p-3">

<a
    href="${doc.arquivo_url}"
    target="_blank"
    rel="noopener noreferrer"
    onclick="event.stopPropagation()"
    class="
        font-semibold
        underline
        underline-offset-2
    "
>
    Ver PDF ↗
</a>
                        </td>

                    </tr>

                `
            )
            .join("");

}
// ============================================================================
// DOCUMENTOS DO PRESTADOR
// UPLOAD MANUAL
// ============================================================================


async function abrirModalDocumentoPrestador() {
    if (!prestadorDetalhesAtual) {

        alert(
            "Nenhum prestador selecionado."
        );

        return;

    }


    if (!prestadorDetalhesAtual.id) {

        alert(
            "Este prestador ainda não possui um ID válido.\n\nAtualize a página e tente novamente."
        );

        return;

    }


    // ========================================================
    // LIMPA O FORMULÁRIO
    // ========================================================

    const ids = [

        "documentoPrestadorTipo",
        "documentoPrestadorManutencao",
        "documentoPrestadorServico",
        "documentoPrestadorNumero",
        "documentoPrestadorData",
        "documentoPrestadorCompetencia",
        "documentoPrestadorValor",
        "documentoPrestadorDescricao",
        "documentoPrestadorArquivo"

    ];


    ids.forEach(
        id => {

            const elemento =
                document.getElementById(id);

            if (!elemento) {
                return;
            }


            if (
                elemento.type === "file"
            ) {

                elemento.value = "";

            } else {

                elemento.value = "";

            }

        }
    );


    // ========================================================
    // NOME DO PRESTADOR
    // ========================================================

    const nome =
        document.getElementById(
            "documentoPrestadorNome"
        );


    if (nome) {

        nome.textContent =
            prestadorDetalhesAtual.nome ||
            "";

    }


    // ========================================================
    // CARREGA LOJAS
    // ========================================================

    carregarLojasModalDocumentoPrestador();


    // ========================================================
    // CARREGA SERVIÇOS
    // ========================================================

    await carregarServicosModalDocumentoPrestador();

    atualizarCamposDocumentoPrestador();

    document
        .getElementById(
            "modalDocumentoPrestador"
        )
        ?.classList
        .remove(
            "hidden"
        );

}



function fecharModalDocumentoPrestador() {

    document
        .getElementById(
            "modalDocumentoPrestador"
        )
        ?.classList
        .add(
            "hidden"
        );

}



// ============================================================================
// LOJAS DO MODAL
// ============================================================================

function carregarLojasModalDocumentoPrestador() {

    const select =
        document.getElementById(
            "documentoPrestadorLoja"
        );


    if (!select) {
        return;
    }


    const lojas =
        Array.isArray(
            lojasEnderecosTemp
        )
            ? [...lojasEnderecosTemp]
            : [];


    lojas.sort(
        (a, b) => {

            return String(
                a.LOJA ??
                a.loja ??
                ""
            )
                .localeCompare(
                    String(
                        b.LOJA ??
                        b.loja ??
                        ""
                    ),
                    "pt-BR",
                    {
                        numeric: true
                    }
                );

        }
    );


    select.innerHTML = `

        <option value="">
            Selecione a loja
        </option>

        ${
            lojas
                .map(
                    loja => {

                        const codigo =
                            String(
                                loja.LOJA ??
                                loja.loja ??
                                ""
                            ).trim();


                        const nome =
                            String(
                                loja.NOME ??
                                loja.nome ??
                                ""
                            ).trim();


                        const uf =
                            String(
                                loja.UF ??
                                loja.uf ??
                                ""
                            ).trim();


                        let titulo =
                            codigo;


                        if (nome) {

                            titulo +=
                                ` - ${nome}`;

                        }


                        if (uf) {

                            titulo +=
                                ` - ${uf}`;

                        }


                        return `

                            <option value="${escaparHtml(codigo)}">
                                ${escaparHtml(titulo)}
                            </option>

                        `;

                    }
                )
                .join("")
        }

    `;

}



// ============================================================================
// SERVIÇOS DO MODAL
// ============================================================================

async function carregarServicosModalDocumentoPrestador() {

    const select =
        document.getElementById(
            "documentoPrestadorServico"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            Carregando serviços...
        </option>

    `;


    try {

        // ========================================================
        // SE A LISTA AINDA NÃO FOI CARREGADA,
        // BUSCA DIRETAMENTE NO SUPABASE
        // ========================================================

        if (
            !Array.isArray(
                tiposServicoCadastro
            ) ||
            !tiposServicoCadastro.length
        ) {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "tipos_servico"
                    )
                    .select(
                        "id, nome, conta_contabil, ativo"
                    )
                    .eq(
                        "ativo",
                        true
                    )
                    .order(
                        "nome",
                        {
                            ascending: true
                        }
                    );


            if (error) {
                throw error;
            }


            tiposServicoCadastro =
                Array.isArray(data)
                    ? data
                    : [];

        }


        // ========================================================
        // MONTA O SELECT
        // ========================================================

        const servicos =
            tiposServicoCadastro
                .filter(
                    item =>
                        item.ativo !== false
                );


        if (!servicos.length) {

            select.innerHTML = `

                <option value="">
                    Nenhum serviço cadastrado
                </option>

            `;

            return;

        }


        select.innerHTML = `

            <option value="">
                Selecione o serviço
            </option>

            ${
                servicos
                    .map(
                        item => `

                            <option
                                value="${escaparHtml(
                                    item.nome ||
                                    ""
                                )}"
                            >
                                ${escaparHtml(
                                    item.nome ||
                                    ""
                                )}
                            </option>

                        `
                    )
                    .join("")
            }

        `;


    } catch (error) {

        console.error(
            "Erro ao carregar serviços no documento:",
            error
        );


        select.innerHTML = `

            <option value="">
                Erro ao carregar serviços
            </option>

        `;

    }

}

// ============================================================================
// MOSTRA CAMPOS ESPECÍFICOS DE NOTA FISCAL
// ============================================================================

function atualizarCamposDocumentoPrestador() {

    const tipo =
        document.getElementById(
            "documentoPrestadorTipo"
        )?.value || "";


    const competencia =
        document.getElementById(
            "documentoPrestadorCompetenciaBox"
        );


    const valor =
        document.getElementById(
            "documentoPrestadorValorBox"
        );


    const ehNota =
        tipo ===
        "NOTA_FISCAL";


    competencia
        ?.classList
        .toggle(
            "hidden",
            !ehNota
        );


    valor
        ?.classList
        .toggle(
            "hidden",
            !ehNota
        );

}



// ============================================================================
// NOME SEGURO PARA PASTAS / ARQUIVOS
// ============================================================================

function documentoPrestadorSlug(
    valor
) {

    return String(
        valor ??
        ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-zA-Z0-9._-]+/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        )
        .replace(
            /^-|-$|\s/g,
            ""
        )
        .toUpperCase();

}



// ============================================================================
// SALVAR DOCUMENTO
// ============================================================================

async function salvarDocumentoPrestador() {

    if (
        !prestadorDetalhesAtual?.id
    ) {

        alert(
            "Prestador sem ID válido."
        );

        return;

    }


    const loja =
        document
            .getElementById(
                "documentoPrestadorLoja"
            )
            ?.value
            ?.trim() || "";


    const tipo =
        document
            .getElementById(
                "documentoPrestadorTipo"
            )
            ?.value || "";


    const manutencao =
        document
            .getElementById(
                "documentoPrestadorManutencao"
            )
            ?.value || null;


    const servico =
        document
            .getElementById(
                "documentoPrestadorServico"
            )
            ?.value || null;


    const numero =
        document
            .getElementById(
                "documentoPrestadorNumero"
            )
            ?.value
            ?.trim() || null;


    const data =
        document
            .getElementById(
                "documentoPrestadorData"
            )
            ?.value || null;


    const competencia =
        document
            .getElementById(
                "documentoPrestadorCompetencia"
            )
            ?.value || null;


    const valorDigitado =
        document
            .getElementById(
                "documentoPrestadorValor"
            )
            ?.value;


    const descricao =
        document
            .getElementById(
                "documentoPrestadorDescricao"
            )
            ?.value
            ?.trim() || null;


    const inputArquivo =
        document.getElementById(
            "documentoPrestadorArquivo"
        );


    const arquivos =
        Array.from(
            inputArquivo?.files || []
        );


    if (!loja) {

        alert(
            "Selecione a loja."
        );

        return;

    }


    if (!tipo) {

        alert(
            "Selecione o tipo de documento."
        );

        return;

    }


    if (!arquivos.length) {

        alert(
            "Selecione pelo menos um arquivo PDF."
        );

        return;

    }


    const botao =
        document.getElementById(
            "btnSalvarDocumentoPrestador"
        );


    try {

        if (botao) {

            botao.disabled =
                true;

            botao.textContent =
                `ENVIANDO 0/${arquivos.length}...`;

            botao.style.opacity =
                "0.6";

        }


        const prestadorPasta =
            documentoPrestadorSlug(
                prestadorDetalhesAtual.nome ||
                "PRESTADOR"
            );


        const tipoPasta =
            tipo === "NOTA_FISCAL"

                ? "NOTAS-FISCAIS"

                : tipo === "RELATORIO"

                    ? "RELATORIOS"

                    : "OS-PMOC";


        let enviados =
            0;


        const erros =
            [];


        // ====================================================
        // ENVIA UM ARQUIVO POR VEZ
        // ====================================================

        for (
            const arquivo
            of arquivos
        ) {

            try {

                const nomeArquivo =
                    documentoPrestadorSlug(
                        arquivo.name
                    );


                const caminho =

                    `${prestadorPasta}/` +
                    `${documentoPrestadorSlug(loja)}/` +
                    `${tipoPasta}/` +
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 8)}-${nomeArquivo}`;


                // ================================================
                // UPLOAD NO STORAGE
                // ================================================

                const {
                    error: uploadError
                } =
                    await supabaseClient
                        .storage
                        .from(
                            "prestadores-documentos"
                        )
                        .upload(
                            caminho,
                            arquivo,
                            {
                                cacheControl:
                                    "3600",

                                upsert:
                                    false,

                                contentType:
                                    arquivo.type ||
                                    "application/pdf"
                            }
                        );


                if (uploadError) {

                    throw uploadError;

                }


                // ================================================
                // URL PÚBLICA
                // ================================================

                const {
                    data: publicUrlData
                } =
                    supabaseClient
                        .storage
                        .from(
                            "prestadores-documentos"
                        )
                        .getPublicUrl(
                            caminho
                        );


                const arquivoUrl =
                    publicUrlData
                        ?.publicUrl;


                if (!arquivoUrl) {

                    throw new Error(
                        "Não foi possível gerar a URL do arquivo."
                    );

                }


                // ================================================
                // TENTA IDENTIFICAR NÚMERO PELO NOME DO ARQUIVO
                //
                // Ex.:
                // NF9105 - L5255 - CORRETIVA.pdf
                // ================================================

                let numeroDocumento =
                    numero;


                if (
                    !numeroDocumento &&
                    tipo === "NOTA_FISCAL"
                ) {

                    const matchNF =
                        arquivo.name.match(
                            /NF\s*[-_]?\s*(\d+)/i
                        );


                    if (matchNF) {

                        numeroDocumento =
                            matchNF[1];

                    }

                }


                // ================================================
                // REGISTRO NO BANCO
                // ================================================

                const payload = {

                    prestador_id:
                        prestadorDetalhesAtual.id,

                    loja:
                        loja,

                    tipo_documento:
                        tipo,

                    tipo_manutencao:
                        manutencao,

                    servico:
                        servico,

                    numero_documento:
                        numeroDocumento,

                    data_documento:
                        data,

                    competencia:
                        tipo === "NOTA_FISCAL"
                            ? competencia
                            : null,

                    valor:
                        tipo === "NOTA_FISCAL" &&
                        valorDigitado

                            ? Number(
                                valorDigitado
                            )

                            : null,

                    descricao:
                        descricao,

                    arquivo_url:
                        arquivoUrl,

                    arquivo_nome:
                        arquivo.name,

                    origem:
                        "MANUAL",

                    atualizado_em:
                        new Date()
                            .toISOString()

                };


                const {
                    error: insertError
                } =
                    await supabaseClient
                        .from(
                            "prestadores_documentos"
                        )
                        .insert([
                            payload
                        ]);


                if (insertError) {

                    throw insertError;

                }


                enviados++;


                if (botao) {

                    botao.textContent =
                        `ENVIANDO ${enviados}/${arquivos.length}...`;

                }


            } catch (erroArquivo) {

                console.error(
                    "Erro ao enviar arquivo:",
                    arquivo.name,
                    erroArquivo
                );


                erros.push(
                    `${arquivo.name}: ${
                        erroArquivo?.message ||
                        erroArquivo
                    }`
                );

            }

        }


        await carregarDocumentosPrestador();


        // ====================================================
        // RESULTADO FINAL
        // ====================================================

        if (
            enviados === arquivos.length
        ) {

            fecharModalDocumentoPrestador();


            alert(
                `${enviados} documento(s) adicionado(s) com sucesso.`
            );


            return;

        }


        if (
            enviados > 0
        ) {

            fecharModalDocumentoPrestador();


            alert(
                `${enviados} documento(s) foram adicionados.\n\n` +
                `${erros.length} arquivo(s) apresentaram erro.`
            );


            console.warn(
                "Arquivos com erro:",
                erros
            );


            return;

        }


        throw new Error(
            "Nenhum arquivo foi enviado."
        );


    } catch (error) {

        console.error(
            "Erro ao adicionar documentos:",
            error
        );


        alert(
            "Não foi possível adicionar os documentos.\n\n" +
            (
                error?.message ||
                error
            )
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;

            botao.textContent =
                "SALVAR DOCUMENTO";

            botao.style.opacity =
                "1";

        }

    }

}

let documentoPrestadorEdicaoAtual =
    null;


function abrirDetalhesDocumentoPrestador(
    documentoId
) {

    const doc =
        prestadorDocumentosAtual.find(
            item =>
                String(item.id) ===
                String(documentoId)
        );


    if (!doc) {

        alert(
            "Documento não encontrado."
        );

        return;

    }


    documentoPrestadorEdicaoAtual =
        doc;


    const set =
        (
            id,
            valor
        ) => {

            const elemento =
                document.getElementById(id);

            if (elemento) {

                elemento.value =
                    valor ?? "";

            }

        };
const selectLoja =
    document.getElementById(
        "detalhesDocumentoLoja"
    );


if (selectLoja) {

    const lojas =
        Array.isArray(lojasEnderecosTemp)
            ? [...lojasEnderecosTemp]
            : [];


    lojas.sort(
        (a, b) =>
            String(a.LOJA ?? "")
                .localeCompare(
                    String(b.LOJA ?? ""),
                    "pt-BR",
                    {
                        numeric: true
                    }
                )
    );


selectLoja.innerHTML =
    lojas
        .map(
            loja => {

                const codigo =
                    String(
                        loja.LOJA ??
                        ""
                    ).trim();


                const nome =
                    String(
                        loja.NOME ??
                        ""
                    ).trim();


                const uf =
                    String(
                        loja.UF ??
                        ""
                    ).trim();


                return `

                    <option value="${escaparHtml(codigo)}">
                        ${escaparHtml(
                            `${codigo} - ${nome || "SEM NOME"} - ${uf || "--"}`
                        )}
                    </option>

                `;

            }
        )
        .join("");
}

    set(
        "detalhesDocumentoId",
        doc.id
    );

    set(
        "detalhesDocumentoLoja",
        doc.loja
    );

    set(
        "detalhesDocumentoTipo",
        doc.tipo_documento
    );

    set(
        "detalhesDocumentoManutencao",
        doc.tipo_manutencao
    );

    set(
        "detalhesDocumentoServico",
        doc.servico
    );

    set(
        "detalhesDocumentoNumero",
        doc.numero_documento
    );

    set(
        "detalhesDocumentoData",
        doc.data_documento
    );

    set(
        "detalhesDocumentoCompetencia",
        doc.competencia
    );

    set(
        "detalhesDocumentoValor",
        doc.valor
    );

    set(
        "detalhesDocumentoDescricao",
        doc.descricao
    );


    const titulo =
        document.getElementById(
            "detalhesDocumentoTitulo"
        );


    if (titulo) {

        const tipos = {

            NOTA_FISCAL:
                "Nota Fiscal",

            RELATORIO:
                "Relatório",

            OS:
                "OS"

        };


        titulo.textContent =
            tipos[
                doc.tipo_documento
            ] || "Documento";

    }


    const link =
        document.getElementById(
            "detalhesDocumentoArquivo"
        );


    if (link) {

        link.href =
            doc.arquivo_url ||
            "#";

    }


    desativarEdicaoDocumentoPrestador();


    document
        .getElementById(
            "modalDetalhesDocumentoPrestador"
        )
        ?.classList
        .remove(
            "hidden"
        );

}



function fecharDetalhesDocumentoPrestador() {

    document
        .getElementById(
            "modalDetalhesDocumentoPrestador"
        )
        ?.classList
        .add(
            "hidden"
        );


    documentoPrestadorEdicaoAtual =
        null;

}



function ativarEdicaoDocumentoPrestador() {

    const campos = [

        "detalhesDocumentoLoja",
        "detalhesDocumentoTipo",
        "detalhesDocumentoManutencao",
        "detalhesDocumentoServico",
        "detalhesDocumentoNumero",
        "detalhesDocumentoData",
        "detalhesDocumentoCompetencia",
        "detalhesDocumentoValor",
        "detalhesDocumentoDescricao"

    ];


    campos.forEach(
        id => {

            const elemento =
                document.getElementById(id);


            if (elemento) {

                elemento.disabled =
                    false;

            }

        }
    );


    document
        .getElementById(
            "btnEditarDocumentoPrestador"
        )
        ?.classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "btnSalvarEdicaoDocumentoPrestador"
        )
        ?.classList
        .remove(
            "hidden"
        );

}



function desativarEdicaoDocumentoPrestador() {

const campos = [

    "detalhesDocumentoLoja",
    "detalhesDocumentoTipo",
    "detalhesDocumentoManutencao",
    "detalhesDocumentoServico",
    "detalhesDocumentoNumero",
    "detalhesDocumentoData",
    "detalhesDocumentoCompetencia",
    "detalhesDocumentoValor",
    "detalhesDocumentoDescricao"

];

    campos.forEach(
        id => {

            const elemento =
                document.getElementById(id);

            if (elemento) {

                elemento.disabled =
                    true;

            }

        }
    );


    document
        .getElementById(
            "btnEditarDocumentoPrestador"
        )
        ?.classList
        .remove(
            "hidden"
        );


    document
        .getElementById(
            "btnSalvarEdicaoDocumentoPrestador"
        )
        ?.classList
        .add(
            "hidden"
        );

}



async function salvarEdicaoDocumentoPrestador() {

    if (
        !documentoPrestadorEdicaoAtual?.id
    ) {

        alert(
            "Documento inválido."
        );

        return;

    }


    const valorCampo =
        document.getElementById(
            "detalhesDocumentoValor"
        )?.value;


    const payload = {

        loja:
    document
        .getElementById(
            "detalhesDocumentoLoja"
        )
        ?.value
        ?.trim() || "",
        tipo_documento:
            document.getElementById(
                "detalhesDocumentoTipo"
            )?.value,

        tipo_manutencao:
            document.getElementById(
                "detalhesDocumentoManutencao"
            )?.value || null,

        servico:
            document.getElementById(
                "detalhesDocumentoServico"
            )?.value?.trim() || null,

        numero_documento:
            document.getElementById(
                "detalhesDocumentoNumero"
            )?.value?.trim() || null,

        data_documento:
            document.getElementById(
                "detalhesDocumentoData"
            )?.value || null,

        competencia:
            document.getElementById(
                "detalhesDocumentoCompetencia"
            )?.value || null,

        valor:
            valorCampo
                ? Number(valorCampo)
                : null,

        descricao:
            document.getElementById(
                "detalhesDocumentoDescricao"
            )?.value?.trim() || null,

        atualizado_em:
            new Date()
                .toISOString()

    };


    const botao =
        document.getElementById(
            "btnSalvarEdicaoDocumentoPrestador"
        );


    try {

        if (botao) {

            botao.disabled =
                true;

            botao.textContent =
                "SALVANDO...";

        }


        const {
            error
        } =
            await supabaseClient
                .from(
                    "prestadores_documentos"
                )
                .update(
                    payload
                )
                .eq(
                    "id",
                    documentoPrestadorEdicaoAtual.id
                );


        if (error) {
            throw error;
        }


        await carregarDocumentosPrestador();


        const atualizado =
            prestadorDocumentosAtual.find(
                item =>
                    String(item.id) ===
                    String(
                        documentoPrestadorEdicaoAtual.id
                    )
            );


        if (atualizado) {

            documentoPrestadorEdicaoAtual =
                atualizado;

        }


        fecharDetalhesDocumentoPrestador();


        alert(
            "Documento atualizado com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao editar documento:",
            error
        );


        alert(
            "Não foi possível atualizar o documento.\n\n" +
            (
                error?.message ||
                error
            )
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;

            botao.textContent =
                "SALVAR ALTERAÇÕES";

        }

    }

}