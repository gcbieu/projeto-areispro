// =====================================================
// ELEMENTOS DA HOME
// =====================================================

const tipoRelatorio = document.getElementById("tipoRelatorio");
const btnCriarRelatorio = document.getElementById("btnCriarRelatorio");

const pesquisaRelatorio = document.getElementById("pesquisaRelatorio");
const filtroTipo = document.getElementById("filtroTipo");
const filtroData = document.getElementById("filtroData");
const listaRelatorios = document.getElementById("listaRelatorios");


// =====================================================
// ROTAS DOS MODELOS DE RELATÓRIO
// =====================================================

const rotasRelatorios = {

    fornecedor:
        "relatoriofornecedores.html?modelo=fornecedor",

    vistoria:
        "relatoriovistoria.html?modelo=vistoria"

};


// =====================================================
// ABRIR NOVO RELATÓRIO
// =====================================================

btnCriarRelatorio.addEventListener("click", function () {

    const modelo = tipoRelatorio.value;

    if (!modelo) {

        alert("Selecione um modelo de relatório.");
        return;

    }

    const pagina = rotasRelatorios[modelo];

    if (!pagina) {

        alert("Modelo de relatório inválido.");
        return;

    }

    window.location.href = pagina;

});


// =====================================================
// HISTÓRICO DE RELATÓRIOS - SUPABASE
// =====================================================

let relatoriosHistorico = [];


// =====================================================
// CARREGAR HISTÓRICO
// =====================================================

async function carregarHistorico() {

    listaRelatorios.innerHTML = `
        <div class="text-center py-12">
            <p class="text-sm opacity-40">
                Carregando relatórios...
            </p>
        </div>
    `;

    const { data, error } =
        await supabaseClient
            .from("relatorios")
            .select("*")
            .order("criado_em", {
                ascending: false
            });

    if (error) {

        console.error(
            "Erro ao carregar histórico:",
            error
        );

        listaRelatorios.innerHTML = `
            <div class="text-center py-12">
                <p class="text-sm text-red-500">
                    Não foi possível carregar o histórico.
                </p>
            </div>
        `;

        return;
    }

    relatoriosHistorico = data || [];

    aplicarFiltros();
}


// =====================================================
// FILTROS
// =====================================================

function aplicarFiltros() {

    const pesquisa =
        pesquisaRelatorio.value
            .trim()
            .toLowerCase();

    const tipo =
        filtroTipo.value;

    const data =
        filtroData.value;


    const filtrados =
        relatoriosHistorico.filter(relatorio => {

            const texto =
                [
                    relatorio.loja,
                    relatorio.prestador,
                    relatorio.chamado_id,
                    relatorio.nome_arquivo
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


            const correspondePesquisa =
                !pesquisa ||
                texto.includes(pesquisa);


            const correspondeTipo =
                !tipo ||
                relatorio.tipo_relatorio === tipo;


            const correspondeData =
                !data ||
                relatorio.data_servico === data;


            return (
                correspondePesquisa &&
                correspondeTipo &&
                correspondeData
            );

        });


    mostrarRelatorios(filtrados);
}


// =====================================================
// MOSTRAR RELATÓRIOS
// =====================================================

function mostrarRelatorios(relatorios) {

    listaRelatorios.innerHTML = "";


    if (!relatorios.length) {

        listaRelatorios.innerHTML = `
            <div class="text-center py-12">

                <p class="text-sm font-semibold opacity-50">
                    Nenhum relatório encontrado
                </p>

                <p class="text-xs opacity-30 mt-2">
                    Os relatórios gerados aparecerão aqui.
                </p>

            </div>
        `;

        return;
    }


    relatorios.forEach(relatorio => {

        const card =
            document.createElement("div");


        card.className = `
            py-5
            border-b
            border-black/10
            dark:border-white/10
            flex
            flex-col
            md:flex-row
            md:items-center
            justify-between
            gap-4
        `;


        const nomeTipo =
            relatorio.tipo_relatorio === "vistoria"
                ? "Relatório de Vistoria"
                : "Relatório Fotográfico";


        let dataFormatada = "Sem data";

        if (relatorio.data_servico) {

            const partes =
                relatorio.data_servico.split("-");

            dataFormatada =
                `${partes[2]}/${partes[1]}/${partes[0]}`;
        }


        card.innerHTML = `

            <div>

                <p class="text-sm font-semibold">
                    ${relatorio.loja || "Loja não informada"}
                </p>

                <div class="
                    flex
                    flex-wrap
                    gap-3
                    mt-2
                    text-[10px]
                    uppercase
                    tracking-wider
                    opacity-40
                    font-bold
                ">

                    <span>
                        ${nomeTipo}
                    </span>

                    <span>
                        ${dataFormatada}
                    </span>

                    ${relatorio.chamado_id
                ? `<span>Chamado ${relatorio.chamado_id}</span>`
                : ""
            }

                    ${relatorio.prestador
                ? `<span>${relatorio.prestador}</span>`
                : ""
            }

                </div>

            </div>


            <div class="flex flex-wrap gap-2">

                <button
                    class="btn-visualizar
                    px-4 py-2
                    bg-gray-500/10
                    rounded-xl
                    text-[10px]
                    font-bold">

                    VISUALIZAR

                </button>


                <button
                    class="btn-editar
                    px-4 py-2
                    bg-gray-500/10
                    rounded-xl
                    text-[10px]
                    font-bold">

                    EDITAR

                </button>


                <button
                    class="btn-excluir
                    px-4 py-2
                    bg-red-500/10
                    text-red-500
                    rounded-xl
                    text-[10px]
                    font-bold">

                    EXCLUIR

                </button>

            </div>
        `;


        // VISUALIZAR PDF
        card
            .querySelector(".btn-visualizar")
            .addEventListener("click", () => {

                if (!relatorio.arquivo_url) {

                    alert(
                        "Este relatório não possui PDF."
                    );

                    return;
                }

                window.open(
                    `${relatorio.arquivo_url}?v=${Date.now()}`,
                    "_blank"
                );

            });


        // EDITAR
        card
            .querySelector(".btn-editar")
            .addEventListener("click", () => {

                const pagina =
                    relatorio.tipo_relatorio === "vistoria"
                        ? "relatoriovistoria.html"
                        : "relatoriofornecedores.html";


                window.location.href =
                    `${pagina}?modelo=${relatorio.tipo_relatorio}&editar=${relatorio.id}`;

            });


        // EXCLUIR
        card
            .querySelector(".btn-excluir")
            .addEventListener("click", async () => {

                const confirmar =
                    confirm(
                        "Deseja realmente excluir este relatório do histórico?"
                    );


                if (!confirmar) return;


                const { error } =
                    await supabaseClient
                        .from("relatorios")
                        .delete()
                        .eq(
                            "id",
                            relatorio.id
                        );


                if (error) {

                    console.error(
                        "Erro ao excluir relatório:",
                        error
                    );

                    alert(
                        "Não foi possível excluir o relatório."
                    );

                    return;
                }


                await carregarHistorico();

            });


        listaRelatorios.appendChild(card);

    });

}


// =====================================================
// EVENTOS DOS FILTROS
// =====================================================

pesquisaRelatorio.addEventListener(
    "input",
    aplicarFiltros
);

filtroTipo.addEventListener(
    "change",
    aplicarFiltros
);

filtroData.addEventListener(
    "change",
    aplicarFiltros
);


// =====================================================
// CARREGA AO ABRIR A HOME
// =====================================================

carregarHistorico();