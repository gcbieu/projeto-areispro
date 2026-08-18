// ============================================================
// AREIS PRO
// FATURAMENTO
// ============================================================
//
// Responsável por:
// - carteira de serviços;
// - MCC / CCL;
// - parcelas;
// - lotes;
// - regras;
// - competência mensal;
// - sincronização de chamados concluídos;
// - exportações do faturamento.
//
// Este módulo utiliza tabelas próprias no Supabase.
//
// Nesta etapa somente o código foi separado.
// A regra financeira permanece inalterada.
// ============================================================
let fatTiposServico = [];
// ============================================================
// TIPOS DE SERVIÇO DO FATURAMENTO
// ============================================================

async function fatCarregarTiposServico() {

    try {

        const { data, error } =
            await supabaseClient
                .from("tipos_servico")
                .select(
                    "id, nome, conta_contabil, ativo"
                )
                .eq("ativo", true)
                .order("nome", {
                    ascending: true
                });


        if (error) {
            throw error;
        }


        fatTiposServico =
            Array.isArray(data)
                ? data
                : [];


        fatPopularSelectServicos();


    } catch (error) {

        console.error(
            "Erro ao carregar tipos de serviço no faturamento:",
            error
        );

    }

}
function fatPopularSelectServicos(
    valorSelecionado = ""
) {

    const select =
        document.getElementById(
            "fatCampoServico"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            Selecione o serviço
        </option>

        ${fatTiposServico
            .map(servico => `

                    <option
                        value="${servico.nome}"
                        data-conta="${servico.conta_contabil || ""}"
                    >
                        ${servico.nome}
                    </option>

                `)
            .join("")
        }

    `;


    if (valorSelecionado) {

        select.value =
            valorSelecionado;

    }


    fatAtualizarDadosServico();

}
function fatAtualizarDadosServico() {

    const select =
        document.getElementById(
            "fatCampoServico"
        );

    const campoTipo =
        document.getElementById(
            "fatCampoTipo"
        );


    if (
        !select ||
        !campoTipo
    ) {
        return;
    }


    const opcao =
        select.options[
        select.selectedIndex
        ];


    const conta =
        opcao?.dataset?.conta || "";


    campoTipo.value =
        conta;

}
document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (
            typeof fatCarregarTiposServico ===
            "function"
        ) {

            await fatCarregarTiposServico();

        }

    }
);
const fatLojasSelecionadas =
    new Set();

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
        .sort((a, b) => fatNorm(b.servico_normalizado).length - fatNorm(a.servico_normalizado).length)[0];
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
supabaseClient
    .from("lojas")
    .select("*")    ]);

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

// ============================================================================
// SINCRONIZAÇÃO DE CHAMADOS FECHADOS COM A MEMÓRIA DO FATURAMENTO
// ============================================================================
//
// REGRA:
//
// 1. faturamento_servicos é a memória oficial.
// 2. Chamados servem apenas para:
//      - inserir chamados fechados que ainda não existem;
//      - atualizar o link do relatório quando ele surgir.
// 3. Nunca sobrescrevemos informações financeiras já preenchidas.
//
// ============================================================================

async function fatSincronizarChamados(
    mostrarMensagem = false
) {

    try {

        // ========================================================
        // BUSCA A MEMÓRIA ATUAL DO FATURAMENTO
        // ========================================================

        const { data: memoria, error: erroMemoria } =
            await supabaseClient
                .from("faturamento_servicos")
                .select(
                    "id, chamado_id, relatorio_url"
                );


        if (erroMemoria) {
            throw erroMemoria;
        }


        const porChamado =
            new Map();


        for (const registro of memoria || []) {

            const chamadoId =
                String(
                    registro.chamado_id || ""
                ).trim();


            if (chamadoId) {

                porChamado.set(
                    chamadoId,
                    registro
                );

            }

        }


        // ========================================================
        // BUSCA OS CHAMADOS ATUAIS
        // ========================================================

        let chamados =
            Array.isArray(
                window.chamadosAlbetan
            )
                ? window.chamadosAlbetan
                : [];


        // Caso a Central ainda não esteja carregada,
        // usa a memória de chamados do Supabase.
        if (!chamados.length) {

            const { data, error } =
                await supabaseClient
                    .from(
                        "chamados_historico"
                    )
                    .select(
                        "payload_json"
                    )
                    .eq(
                        "is_atual",
                        true
                    );


            if (!error) {

                chamados =
                    (data || [])
                        .map(
                            item =>
                                item.payload_json || {}
                        );

            }

        }


        const novos = [];
        const atualizacoesRelatorio = [];


        // ========================================================
        // ANALISA OS CHAMADOS
        // ========================================================

        for (const chamado of chamados) {

            const chamadoId =
                String(
                    fatGet(
                        chamado,
                        "ID",
                        "Id",
                        "id",
                        "Número do Chamado",
                        "numero_chamado"
                    ) || ""
                ).trim();


            if (!chamadoId) {
                continue;
            }


            const statusInterno =
                fatNorm(
                    fatGet(
                        chamado,
                        "Status interno",
                        "status_interno"
                    )
                );


            const statusExterno =
                fatNorm(
                    fatGet(
                        chamado,
                        "Status",
                        "status",
                        "STATUS"
                    )
                );


            const fechado =
                statusInterno.includes(
                    "fechado"
                )
                ||
                statusInterno.includes(
                    "encerrado"
                )
                ||
                statusExterno.includes(
                    "fechado"
                )
                ||
                statusExterno.includes(
                    "fechar chamado"
                )
                ||
                Boolean(
                    fatGet(
                        chamado,
                        "Encerrado em",
                        "data_encerramento_iso"
                    )
                );


            // Somente chamado fechado entra no faturamento.
            if (!fechado) {
                continue;
            }


            const relatorioUrl =
                String(
                    fatGet(
                        chamado,
                        "Link Relatório",
                        "link_relatorio",
                        "Relatório",
                        "relatorio_url"
                    ) || ""
                ).trim();


            const existente =
                porChamado.get(
                    chamadoId
                );


            // ====================================================
            // CHAMADO JÁ ESTÁ NA MEMÓRIA
            // ====================================================

            if (existente) {

                // A única atualização automática permitida
                // é o link do relatório.
                if (
                    relatorioUrl &&
                    relatorioUrl !==
                        String(
                            existente.relatorio_url || ""
                        ).trim()
                ) {

                    atualizacoesRelatorio.push({
                        id:
                            existente.id,

                        relatorio_url:
                            relatorioUrl
                    });

                }


                continue;

            }


            // ====================================================
            // NOVO CHAMADO FECHADO
            // ====================================================

            const servico =
                String(
                    fatGet(
                        chamado,
                        "Serviço",
                        "Servico",
                        "servico",
                        "Tipo de Serviço",
                        "Categoria"
                    ) ||
                    "SERVIÇO NÃO INFORMADO"
                ).trim();


            const conta =
                fatClassificarServico(
                    servico
                );


            novos.push({

                chamado_id:
                    chamadoId,

                origem:
                    "chamado",

                servico:
                    servico,

                relatorio_url:
                    relatorioUrl || null,

                loja:
                    String(
                        fatGet(
                            chamado,
                            "Loja",
                            "loja"
                        ) || ""
                    ).trim(),

                fornecedor:
                    String(
                        fatGet(
                            chamado,
                            "Prestador",
                            "prestador",
                            "Fornecedor",
                            "fornecedor"
                        ) || ""
                    ).trim() || null,

                descricao_servico:
                    String(
                        fatGet(
                            chamado,
                            "Descrição",
                            "descricao"
                        ) || ""
                    ).trim() || null,

                conta_contabil:
                    conta || null,

                tipo_padrao:
                    conta || null,

                tipo_faturamento:
                    conta || null,

                competencia:
                    null,

                status_faturamento:
                    "AGUARDANDO PREPARAÇÃO",

                payload_origem:
                    chamado

            });

        }


        // ========================================================
        // INSERE SOMENTE NOVOS
        // ========================================================

        if (novos.length) {

            const { error } =
                await supabaseClient
                    .from(
                        "faturamento_servicos"
                    )
                    .insert(
                        novos
                    );


            if (error) {
                throw error;
            }

        }


        // ========================================================
        // ATUALIZA SOMENTE LINKS DE RELATÓRIO
        // ========================================================

        for (
            const atualizacao
            of atualizacoesRelatorio
        ) {

            const { error } =
                await supabaseClient
                    .from(
                        "faturamento_servicos"
                    )
                    .update({

                        relatorio_url:
                            atualizacao.relatorio_url

                    })
                    .eq(
                        "id",
                        atualizacao.id
                    );


            if (error) {

                console.warn(
                    "Não foi possível atualizar relatório do faturamento:",
                    error
                );

            }

        }


        console.log(
            "Faturamento sincronizado:",
            {
                novos:
                    novos.length,

                relatoriosAtualizados:
                    atualizacoesRelatorio.length
            }
        );


        if (mostrarMensagem) {

            alert(
                `${novos.length} chamado(s) novo(s) enviado(s) ao faturamento.\n` +
                `${atualizacoesRelatorio.length} relatório(s) atualizado(s).`
            );

        }


    } catch (error) {

        console.error(
            "Erro ao sincronizar memória do faturamento:",
            error
        );


        if (mostrarMensagem) {

            alert(
                "Não foi possível sincronizar os chamados com o faturamento.\n\n" +
                (
                    error?.message ||
                    error
                )
            );

        }

    }

}

function fatTrocarMes() {

    fatState.mes =
        document.getElementById(
            "fatMesFiltro"
        )?.value ||
        fatMonthKey(
            new Date()
        );


    fatState.loteSelecao.clear();


    const selecionarTodos =
        document.getElementById(
            "fatSelecionarTodosCarteira"
        );


    if (selecionarTodos) {

        selecionarTodos.checked =
            false;

    }


    fatAtualizarBotaoFaturar();

    fatRender();

}

function fatServicoPorId(id) {
    return fatState.servicos.find(s => s.id === id);
}

function fatParcelasVisiveis() {

    const mes =
        fatState.mes ||
        fatMonthKey(
            new Date()
        );


    const tipo =
        document.getElementById(
            "fatTipoFiltro"
        )?.value ||
        "TODOS";


    const busca =
        fatNorm(
            document.getElementById(
                "fatBusca"
            )?.value ||
            ""
        );


    const passado =
        fatMesEhPassado(
            mes
        );


    return fatState.parcelas.filter(
        parcela => {


            // ========================================================
            // PRIMEIRO BUSCA O SERVIÇO
            // ========================================================

            const servico =
                fatServicoPorId(
                    parcela.servico_id
                );


            if (!servico) {
                return false;
            }


            // ========================================================
            // FILTRO DE LOJAS
            // ========================================================

            if (
                fatLojasSelecionadas.size > 0
            ) {

                const loja =
                    String(
                        servico.loja ||
                        ""
                    ).trim();


                if (
                    !fatLojasSelecionadas.has(
                        loja
                    )
                ) {

                    return false;

                }

            }


            // ========================================================
            // COMPETÊNCIA
            // ========================================================

            const competencia =
                String(
                    parcela.competencia ||
                    ""
                ).slice(
                    0,
                    7
                );


            const lote =
                parcela.lote_id
                    ? fatState.lotes.find(
                        item =>
                            item.id ===
                            parcela.lote_id
                    )
                    : null;


            const mesFaturado =
                lote
                    ? String(
                        lote.competencia ||
                        ""
                    ).slice(
                        0,
                        7
                    )
                    : "";


            // ========================================================
            // MÊS PASSADO
            //
            // Mostra somente o que realmente foi faturado naquele mês.
            // ========================================================

            if (passado) {

                if (
                    parcela.situacao !==
                        "faturada" ||
                    mesFaturado !== mes
                ) {

                    return false;

                }

            }


            // ========================================================
            // MÊS ATUAL / FUTURO
            // ========================================================

            else {

                const disponivel =
                    parcela.situacao !==
                        "faturada" &&
                    parcela.situacao !==
                        "cancelada" &&
                    competencia <= mes;


                const faturadaMes =
                    parcela.situacao ===
                        "faturada" &&
                    mesFaturado === mes;


                if (
                    !disponivel &&
                    !faturadaMes
                ) {

                    return false;

                }

            }


            // ========================================================
            // FILTRO MCC / CCL
            // ========================================================

            const conta =
                String(
                    servico.conta_contabil ||
                    servico.tipo_faturamento ||
                    servico.tipo_padrao ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            if (
                tipo !== "TODOS" &&
                conta !== tipo
            ) {

                return false;

            }


            // ========================================================
            // BUSCA ANTIGA
            //
            // Continua funcionando caso ainda exista fatBusca no HTML.
            // ========================================================

            if (busca) {

                const texto =
                    fatNorm(
                        [
                            servico.chamado_id,
                            servico.loja,
                            servico.servico,
                            servico.fornecedor,
                            servico.descricao_servico
                        ].join(" ")
                    );


                if (
                    !texto.includes(
                        busca
                    )
                ) {

                    return false;

                }

            }


            return true;

        }
    );

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

// ============================================================================
// RENDERIZAÇÃO DA CARTEIRA DE FATURAMENTO
// ============================================================================
//
// A carteira segue a estrutura oficial da planilha:
//
// ID
// SERVIÇOS
// RELATÓRIO
// COD
// CNPJ
// FORNECEDOR
// LOJA
// VALOR R$
// VALOR MATERIAL R$
// DESCRIÇÕES DE SERVIÇOS
// NF
// CONTA CONTÁBIL
// COMPETÊNCIA
//
// A primeira coluna é apenas para seleção.
// A última coluna contém a ação de edição.
// ============================================================================

// ============================================================================
// FILTRO DE LOJAS - ESTILO EXCEL
// ============================================================================

function fatToggleFiltroLojas() {

    const menu =
        document.getElementById(
            "fatFiltroLojaMenu"
        );

    if (!menu) {
        return;
    }

    const vaiAbrir =
        menu.classList.contains(
            "hidden"
        );

    menu.classList.toggle(
        "hidden"
    );

    if (vaiAbrir) {
        fatRenderFiltroLojas();
    }

}



function fatObterLojasDoMes() {

    const lojas =
        new Map();


    const mes =
        fatState.mes ||
        fatMonthKey(
            new Date()
        );


    const tipo =
        document.getElementById(
            "fatTipoFiltro"
        )?.value ||
        "TODOS";


    // ============================================================
    // PERCORRE AS PARCELAS QUE PODEM APARECER NA CARTEIRA
    // ============================================================

    for (
        const parcela
        of fatState.parcelas || []
    ) {

        const servico =
            fatServicoPorId(
                parcela.servico_id
            );


        if (!servico) {
            continue;
        }


        const competencia =
            String(
                parcela.competencia ||
                ""
            ).slice(
                0,
                7
            );


        const lote =
            parcela.lote_id

                ? fatState.lotes.find(
                    item =>
                        item.id ===
                        parcela.lote_id
                )

                : null;


        const mesFaturado =
            lote

                ? String(
                    lote.competencia ||
                    ""
                ).slice(
                    0,
                    7
                )

                : "";


        const passado =
            fatMesEhPassado(
                mes
            );


        // ========================================================
        // MESMA REGRA DA CARTEIRA
        // ========================================================

        if (passado) {

            if (
                parcela.situacao !==
                    "faturada" ||
                mesFaturado !== mes
            ) {

                continue;

            }

        } else {

            const disponivel =
                parcela.situacao !==
                    "faturada" &&
                parcela.situacao !==
                    "cancelada" &&
                competencia <= mes;


            const faturadaMes =
                parcela.situacao ===
                    "faturada" &&
                mesFaturado === mes;


            if (
                !disponivel &&
                !faturadaMes
            ) {

                continue;

            }

        }


        // ========================================================
        // RESPEITA MCC / CCL
        // ========================================================

        const conta =
            String(
                servico.conta_contabil ||
                servico.tipo_faturamento ||
                servico.tipo_padrao ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            tipo !== "TODOS" &&
            conta !== tipo
        ) {

            continue;

        }


        // ========================================================
        // ADICIONA SOMENTE A LOJA QUE REALMENTE EXISTE NA CARTEIRA
        // ========================================================

        const codigo =
            String(
                servico.loja ||
                ""
            ).trim();


        if (!codigo) {
            continue;
        }


        const cadastro =
            (fatState.lojas || [])
                .find(
                    loja =>
                        String(
                            loja.LOJA ??
                            loja.loja ??
                            ""
                        ).trim() ===
                        codigo
                ) || {};


        lojas.set(
            codigo,
            {
                codigo,

                nome:
                    String(
                        cadastro.NOME ??
                        cadastro.nome ??
                        ""
                    ).trim(),

                uf:
                    String(
                        cadastro.UF ??
                        cadastro.uf ??
                        ""
                    ).trim()
            }
        );

    }


    return [...lojas.values()]
        .sort(
            (a, b) =>
                a.codigo.localeCompare(
                    b.codigo,
                    "pt-BR",
                    {
                        numeric: true
                    }
                )
        );

}



function fatRenderFiltroLojas() {

    const lista =
        document.getElementById(
            "fatFiltroLojaLista"
        );


    if (!lista) {
        return;
    }


    const busca =
        String(
            document.getElementById(
                "fatFiltroLojaBusca"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    let lojas =
        fatObterLojasDoMes();


    // ============================================================
    // BUSCA POR:
    // - número da loja
    // - nome
    // - UF
    // ============================================================

    if (busca) {

        lojas =
            lojas.filter(
                loja => {

                    const texto =
                        `${loja.codigo} ${loja.nome} ${loja.uf}`
                            .toLowerCase();


                    return texto.includes(
                        busca
                    );

                }
            );

    }


    if (!lojas.length) {

        lista.innerHTML = `

            <p
                class="
                    p-4
                    text-center
                    text-xs
                    opacity-40
                "
            >
                Nenhuma loja encontrada.
            </p>

        `;

        return;

    }


    lista.innerHTML =
        lojas
            .map(
                loja => {

                    const codigo =
                        fatEscapeFiltro(
                            loja.codigo
                        );


                    const nome =
                        fatEscapeFiltro(
                            loja.nome
                        );


                    const uf =
                        fatEscapeFiltro(
                            loja.uf
                        );


                    let descricao =
                        codigo;


                    if (nome) {

                        descricao +=
                            ` - ${nome}`;

                    }


                    if (uf) {

                        descricao +=
                            ` - ${uf}`;

                    }


                    return `

                        <label
                            class="
                                flex
                                items-center
                                gap-3
                                px-3 py-2
                                rounded-xl
                                hover:bg-black/5
                                dark:hover:bg-white/5
                                cursor-pointer
                            "
                        >

                            <input
                                type="checkbox"
                                class="fat-filtro-loja-check"
                                value="${codigo}"

                                ${
                                    fatLojasSelecionadas.has(
                                        loja.codigo
                                    )
                                        ? "checked"
                                        : ""
                                }
                            >


                            <span
                                class="
                                    text-xs
                                    font-medium
                                    min-w-0
                                    truncate
                                "
                                title="${descricao}"
                            >

                                ${descricao}

                            </span>

                        </label>

                    `;

                }
            )
            .join("");

}



function fatEscapeFiltro(
    valor
) {

    return String(
        valor ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}



function fatAplicarFiltroLojas() {

    fatLojasSelecionadas.clear();


    document
        .querySelectorAll(
            ".fat-filtro-loja-check:checked"
        )
        .forEach(
            checkbox => {

                fatLojasSelecionadas.add(
                    checkbox.value
                );

            }
        );


    fatAtualizarTextoFiltroLojas();


    document
        .getElementById(
            "fatFiltroLojaMenu"
        )
        ?.classList
        .add(
            "hidden"
        );


    fatRender();

}



function fatSelecionarTodasLojas() {

    document
        .querySelectorAll(
            ".fat-filtro-loja-check"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    true;

            }
        );

}



function fatLimparFiltroLojas() {

    fatLojasSelecionadas.clear();


    document
        .querySelectorAll(
            ".fat-filtro-loja-check"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    false;

            }
        );


    fatAtualizarTextoFiltroLojas();

    fatRender();

}



function fatAtualizarTextoFiltroLojas() {

    const texto =
        document.getElementById(
            "fatFiltroLojaTexto"
        );


    if (!texto) {
        return;
    }


    const quantidade =
        fatLojasSelecionadas.size;


    if (!quantidade) {

        texto.textContent =
            "Todas as lojas";

        return;

    }


    if (quantidade === 1) {

        texto.textContent =
            [...fatLojasSelecionadas][0];

        return;

    }


    texto.textContent =
        `${quantidade} lojas selecionadas`;

}

function fatRender() {

    const tbody =
        document.getElementById(
            "fatTabelaBody"
        );

    if (!tbody) {
        return;
    }

    const rows =
        fatParcelasVisiveis();

    const esc =
        valor =>
            String(valor ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");

    // Atualiza os valores dos cards superiores.
    fatRenderKPIs();


    // ========================================================
    // SEM REGISTROS
    // ========================================================

    if (!rows.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="16"
                    class="
                        p-10
                        text-center
                        opacity-40
                    "
                >
                    Nenhum serviço encontrado para este mês.
                </td>

            </tr>

        `;

        fatAtualizarResumoCarteira(
            rows
        );

        return;
    }


    // ========================================================
    // MONTA AS LINHAS DA CARTEIRA
    //
    // ORDEM:
    //
    // checkbox
    // ID
    // SERVIÇO
    // LOJA
    // DESCRIÇÃO
    // VALOR
    // VALOR MATERIAL
    // FORNECEDOR
    // CNPJ
    // COD
    // RELATÓRIO
    // NF
    // CONTA CONTÁBIL
    // COMPETÊNCIA
    // STATUS
    // EDITAR
    // ========================================================

    tbody.innerHTML =
        rows
            .map(parcela => {

                const servico =
                    fatServicoPorId(
                        parcela.servico_id
                    ) || {};


                const competencia =
                    String(
                        servico.competencia ||
                        parcela.competencia ||
                        ""
                    ).slice(
                        0,
                        7
                    );


                const conta =
                    String(
                        servico.conta_contabil ||
                        servico.tipo_faturamento ||
                        servico.tipo_padrao ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                // ====================================================
                // RELATÓRIO
                // ====================================================

                const relatorio =
                    String(
                        servico.relatorio_url ||
                        ""
                    ).trim();


                const relatorioEhLink =
                    /^https?:\/\//i.test(
                        relatorio
                    );


                let relatorioHtml = `

                    <span class="opacity-35">
                        —
                    </span>

                `;


                if (relatorio) {

                    if (relatorioEhLink) {

                        relatorioHtml = `

                            <a
                                href="${esc(relatorio)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="
                                    font-semibold
                                    underline
                                    underline-offset-2
                                    hover:opacity-60
                                    whitespace-nowrap
                                "
                            >
                                ABRIR ↗
                            </a>

                        `;

                    } else {

                        relatorioHtml = `

                            <span
                                title="${esc(relatorio)}"
                                class="
                                    block
                                    max-w-[150px]
                                    truncate
                                "
                            >
                                ${esc(relatorio)}
                            </span>

                        `;

                    }

                }


                // ====================================================
                // COR DA CONTA CONTÁBIL
                // ====================================================

                const classeConta =
                    conta === "MCC"

                        ? "bg-blue-500/10 text-blue-600"

                        : conta === "CCL"

                            ? "bg-violet-500/10 text-violet-600"

                            : "bg-black/5 dark:bg-white/5 opacity-50";


                const status =
                    String(
                        servico.status_faturamento ||
                        parcela.situacao ||
                        ""
                    ).trim();


                return `

                    <tr
                        class="
                            border-t
                            border-black/5
                            dark:border-white/5
                            hover:bg-black/[0.02]
                            dark:hover:bg-white/[0.02]
                            align-top
                        "
                    >


                        <!-- =========================================
                             SELEÇÃO
                        ========================================== -->

                        <td class="px-3 py-3 text-center">

                            <input
                                type="checkbox"
                                class="fat-checkbox-carteira"
                                data-fat-parcela="${parcela.id}"

                                onchange="
                                    fatSelecionarItemCarteira(
                                        '${parcela.id}',
                                        this.checked
                                    )
                                "

                                ${
                                    fatState.loteSelecao.has(
                                        parcela.id
                                    )
                                        ? "checked"
                                        : ""
                                }
                            >

                        </td>


                        <!-- =========================================
                             ID
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                font-semibold
                                whitespace-nowrap
                            "
                        >

                            ${
                                esc(
                                    servico.chamado_id ||
                                    ""
                                ) ||

                                '<span class="opacity-30">—</span>'
                            }

                        </td>


                        <!-- =========================================
                             SERVIÇO
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                min-w-[150px]
                                max-w-[180px]
                                font-medium
                            "
                        >

                            ${
                                esc(
                                    servico.servico ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             LOJA
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                font-semibold
                                whitespace-nowrap
                            "
                        >

                            ${
                                esc(
                                    servico.loja ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             DESCRIÇÃO
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                min-w-[260px]
                                max-w-[320px]
                            "
                        >

                            <div
                                class="
                                    line-clamp-2
                                    leading-relaxed
                                "

                                title="${esc(
                                    servico.descricao_servico ||
                                    ""
                                )}"
                            >

                                ${
                                    esc(
                                        servico.descricao_servico ||
                                        ""
                                    ) ||

                                    '<span class="opacity-30">—</span>'
                                }

                            </div>

                        </td>


                        <!-- =========================================
                             VALOR
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                text-right
                                whitespace-nowrap
                                font-semibold
                            "
                        >

                            ${fatMoney(
                                Number(
                                    parcela.valor ??
                                    servico.valor_total ??
                                    0
                                )
                            )}

                        </td>


                        <!-- =========================================
                             VALOR MATERIAL
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                text-right
                                whitespace-nowrap
                            "
                        >

                            ${fatMoney(
                                Number(
                                    servico.valor_material ||
                                    0
                                )
                            )}

                        </td>


                        <!-- =========================================
                             FORNECEDOR
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                min-w-[150px]
                                max-w-[180px]
                                whitespace-normal
                                break-words
                                leading-relaxed
                            "
                        >

                            ${
                                esc(
                                    servico.fornecedor ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             CNPJ
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            ${
                                esc(
                                    servico.cnpj ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             COD
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            ${
                                esc(
                                    servico.cod ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             RELATÓRIO
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                min-w-[120px]
                                max-w-[150px]
                            "
                        >

                            ${relatorioHtml}

                        </td>


                        <!-- =========================================
                             NF
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            ${
                                esc(
                                    servico.nf ||
                                    ""
                                ) ||
                                "—"
                            }

                        </td>


                        <!-- =========================================
                             CONTA CONTÁBIL
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            <span
                                class="
                                    inline-flex
                                    px-2 py-1
                                    rounded-full
                                    text-[9px]
                                    font-bold
                                    ${classeConta}
                                "
                            >

                                ${
                                    esc(
                                        conta ||
                                        ""
                                    ) ||
                                    "—"
                                }

                            </span>

                        </td>


                        <!-- =========================================
                             COMPETÊNCIA
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            ${
                                competencia

                                    ? fatNomeMes(
                                        competencia
                                    )

                                    : "—"
                            }

                        </td>


                        <!-- =========================================
                             STATUS
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                min-w-[120px]
                            "
                        >

                            <span
                                class="
                                    inline-flex
                                    px-2 py-1
                                    rounded-full
                                    bg-black/5
                                    dark:bg-white/10
                                    text-[9px]
                                    font-semibold
                                    whitespace-nowrap
                                "
                            >

                                ${
                                    esc(
                                        status ||
                                        ""
                                    ) ||
                                    "—"
                                }

                            </span>

                        </td>


                        <!-- =========================================
                             EDITAR
                        ========================================== -->

                        <td
                            class="
                                px-3 py-3
                                whitespace-nowrap
                            "
                        >

                            <button
                                type="button"

                                onclick="
                                    fatAbrirServicoModal(
                                        fatServicoPorId(
                                            '${servico.id}'
                                        )
                                    )
                                "

                                class="
                                    px-3 py-2
                                    rounded-xl
                                    bg-black/5
                                    dark:bg-white/10
                                    text-[10px]
                                    font-semibold
                                    hover:opacity-60
                                "
                            >

                                Editar

                            </button>

                        </td>


                    </tr>

                `;

            })

            .join("");


    fatAtualizarResumoCarteira(
        rows
    );

}


// ============================================================================
// SELEÇÃO DE ITENS DIRETAMENTE NA CARTEIRA
// ============================================================================

function fatSelecionarItemCarteira(
    parcelaId,
    marcado
) {

    if (marcado) {

        fatState.loteSelecao.add(
            parcelaId
        );

    } else {

        fatState.loteSelecao.delete(
            parcelaId
        );

    }


    fatAtualizarBotaoFaturar();

}

function fatAtualizarBotaoFaturar() {

    const botao =
        document.getElementById(
            "btnFaturarSelecionados"
        );


    if (!botao) {
        return;
    }


    const total =
        fatState.loteSelecao.size;


    if (!total) {

        botao.innerText =
            "Faturar";

        return;

    }


    botao.innerText =
        `Faturar (${total})`;

}

function fatAtualizarResumoCarteira(
    rows
) {

    const resumo =
        document.getElementById(
            "fatResumoMes"
        );


    if (!resumo) {
        return;
    }


    const mes =
        fatState.mes ||
        fatMonthKey(
            new Date()
        );


    resumo.innerText =
        `${fatNomeMes(mes)} · ${rows.length} item(ns) exibido(s)`;

}

function fatSelecionarTodosCarteira(
    marcado
) {

    const rows =
        fatParcelasVisiveis();


    for (const parcela of rows) {

        if (marcado) {

            fatState.loteSelecao.add(
                parcela.id
            );

        } else {

            fatState.loteSelecao.delete(
                parcela.id
            );

        }

    }


    document
        .querySelectorAll(
            ".fat-checkbox-carteira"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    marcado;

            }
        );


    fatAtualizarBotaoFaturar();

}

function fatPrepararCardsKPIs() {

    // ============================================================
    // REAPROVEITA OS 5 CARDS QUE JÁ EXISTEM NO HTML
    //
    // Antes:
    // Disponível
    // Faturado MCC
    // Faturado CCL
    // Total no mês
    // Pendências
    //
    // Agora:
    // Valor Total
    // Valor MCC
    // Valor CCL
    // Valor Material MCC
    // Valor Material CCL
    //
    // Assim não precisamos alterar os IDs do HTML.
    // ============================================================

    const configuracoes = [

        {
            id: "fatKpiDisponivel",
            titulo: "VALOR TOTAL"
        },

        {
            id: "fatKpiMcc",
            titulo: "VALOR MCC"
        },

        {
            id: "fatKpiCcl",
            titulo: "VALOR CCL"
        },

        {
            id: "fatKpiTotal",
            titulo: "VALOR MATERIAL MCC"
        },

        {
            id: "fatKpiPendencias",
            titulo: "VALOR MATERIAL CCL"
        }

    ];


    configuracoes.forEach(
        item => {

            const valor =
                document.getElementById(
                    item.id
                );


            if (!valor) {
                return;
            }


            const card =
                valor.parentElement;


            if (!card) {
                return;
            }


            const titulo =
                card.querySelector(
                    "p"
                );


            if (
                titulo &&
                titulo !== valor
            ) {

                titulo.textContent =
                    item.titulo;

            }

        }
    );

}

function fatLimparSelecaoCarteira() {

    fatState.loteSelecao.clear();


    document
        .querySelectorAll(
            ".fat-checkbox-carteira"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    false;

            }
        );


    const selecionarTodos =
        document.getElementById(
            "fatSelecionarTodosCarteira"
        );


    if (selecionarTodos) {

        selecionarTodos.checked =
            false;

    }


    fatAtualizarBotaoFaturar();

}

function fatTrocarTipoFiltro() {

    // Quando troca MCC / CCL,
    // qualquer seleção antiga deixa de valer.
    fatLimparSelecaoCarteira();


    // Também limpa filtro de lojas antigo.
    fatLojasSelecionadas.clear();


    fatAtualizarTextoFiltroLojas();


    fatRender();

}

function fatRenderKPIs() {

    const rows =
        fatParcelasVisiveis();


    let valorTotal = 0;
    let valorMcc = 0;
    let valorCcl = 0;

    let materialMcc = 0;
    let materialCcl = 0;


    // ============================================================
    // SOMA SOMENTE O QUE ESTÁ VISÍVEL NA CARTEIRA
    // ============================================================

    for (
        const parcela
        of rows
    ) {

        const servico =
            fatServicoPorId(
                parcela.servico_id
            );


        if (!servico) {
            continue;
        }


        const conta =
            String(
                servico.conta_contabil ||
                servico.tipo_faturamento ||
                servico.tipo_padrao ||
                ""
            )
                .trim()
                .toUpperCase();


        const valor =
            Number(
                parcela.valor ??
                servico.valor_total ??
                0
            );


        const material =
            Number(
                servico.valor_material ??
                0
            );


        // TOTAL SEMPRE É A SOMA DE TUDO QUE ESTÁ VISÍVEL
        valorTotal += valor;


        if (
            conta === "MCC"
        ) {

            valorMcc += valor;

            materialMcc +=
                material;

        }


        if (
            conta === "CCL"
        ) {

            valorCcl += valor;

            materialCcl +=
                material;

        }

    }


    const set =
        (
            id,
            valor
        ) => {

            const elemento =
                document.getElementById(
                    id
                );


            if (!elemento) {
                return;
            }


            elemento.textContent =
                fatMoney(
                    valor
                );

        };


    // ============================================================
    // IDS NOVOS DO HTML
    // ============================================================

    set(
        "fatKpiTotalGeral",
        valorTotal
    );


    set(
        "fatKpiMcc",
        valorMcc
    );


    set(
        "fatKpiCcl",
        valorCcl
    );


    set(
        "fatKpiMaterialMcc",
        materialMcc
    );


    set(
        "fatKpiMaterialCcl",
        materialCcl
    );


    const mes =
        fatState.mes ||
        fatMonthKey(
            new Date()
        );


    const resumo =
        document.getElementById(
            "fatResumoMes"
        );


    if (resumo) {

        resumo.textContent =
            `${fatNomeMes(mes)} · ${rows.length} item(ns) exibido(s)`;

    }

}

function fatRenderLotes() {
    const box = document.getElementById('fatLotesLista');
    if (!box) return;
    const mes = fatState.mes || fatMonthKey(new Date());
    const lotes = fatState.lotes.filter(l => String(l.competencia).slice(0, 7) === mes && l.status !== 'cancelado');
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

    const set =
        (id, valor = "") => {

            const elemento =
                document.getElementById(id);

            if (elemento) {
                elemento.value =
                    valor ?? "";
            }

        };


    set(
        "fatServicoId",
        s.id || ""
    );

    set(
        "fatCampoChamado",
        s.chamado_id || ""
    );

    set(
        "fatCampoLoja",
        s.loja || ""
    );


    // Atualiza primeiro a lista de serviços
    fatPopularSelectServicos(
        s.servico || ""
    );


    set(
        "fatCampoTipo",
        s.tipo_faturamento ||
        s.tipo_padrao ||
        ""
    );

    set(
        "fatCampoFornecedor",
        s.fornecedor || ""
    );

    set(
        "fatCampoCnpj",
        s.cnpj || ""
    );

    set(
        "fatCampoCod",
        s.cod || ""
    );

    set(
        "fatCampoValor",
        s.valor_total || ""
    );

    set(
        "fatCampoMaterial",
        s.valor_material || 0
    );

    set(
        "fatCampoNf",
        s.nf || ""
    );

    set(
        "fatCampoStatus",
        s.status_faturamento || ""
    );

    set(
        "fatCampoRelatorio",
        s.relatorio_url || ""
    );

    set(
        "fatCampoDescricao",
        s.descricao_servico || ""
    );


    const cb =
        document.getElementById(
            "fatCampoParcelado"
        );

    if (cb) {

        cb.checked =
            Boolean(
                s.parcelado
            );

    }


    set(
        "fatCampoQtdParcelas",
        s.qtd_parcelas || 2
    );

    set(
        "fatCampoPrimeiraCompetencia",
        fatState.mes ||
        fatMonthKey(
            new Date()
        )
    );


    fatAlternarParcelamento();


    const title =
        document.getElementById(
            "fatServicoTitulo"
        );


    if (title) {

        title.textContent =
            s.id
                ? `Preparar ${s.chamado_id
                    ? "chamado #" +
                    s.chamado_id
                    : "serviço avulso"
                }`
                : "Novo serviço";

    }


    document
        .getElementById(
            "fatServicoModal"
        )
        ?.classList
        .remove("hidden");

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
const cadastroServico =
    fatTiposServico.find(
        item =>
            String(
                item.nome || ""
            ).trim() ===
            servicoNome
    );


const autoTipo =
    cadastroServico
        ?.conta_contabil ||
    fatClassificarServico(
        servicoNome
    ) ||
    "";    
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

        nf:
            get("fatCampoNf") || null,

        conta_contabil:
            tipoEscolhido || null,

        status_faturamento:
            get("fatCampoStatus") || null,
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
            parcelas.push({ servico_id: servicoId, numero_parcela: i + 1, total_parcelas: qtd, competencia: `${comp}-01`, valor: v, situacao: comp <= fatMonthKey(new Date()) ? 'disponivel' : 'standby' });
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

    const mes =
        fatState.mes ||
        fatMonthKey(
            new Date()
        );


    // ========================================================
    // PRECISA EXISTIR SELEÇÃO NA CARTEIRA
    // ========================================================

    if (
        !fatState.loteSelecao.size
    ) {

        alert(
            "Selecione pelo menos um serviço na carteira para faturar."
        );

        return;

    }


    // ========================================================
    // NÃO PERMITE FATURAR MÊS PASSADO
    // ========================================================

    if (
        fatMesEhPassado(
            mes
        )
    ) {

        alert(
            "Para segurança, novos lotes só podem ser criados no mês atual ou futuro."
        );

        return;

    }


    // IMPORTANTE:
    // NÃO LIMPAR loteSelecao AQUI.
    //
    // Antes existia:
    //
    // fatState.loteSelecao.clear();
    //
    // Isso apagava exatamente os itens
    // marcados na carteira.


    const comp =
        document.getElementById(
            "fatLoteCompetencia"
        );


    if (comp) {

        comp.value =
            mes;

    }


    const verba =
        document.getElementById(
            "fatLoteVerba"
        );


    if (verba) {

        verba.value =
            "";

    }


    // ========================================================
    // DESCOBRE MCC / CCL DOS ITENS SELECIONADOS
    // ========================================================

    const tiposSelecionados =
        new Set();


    for (
        const parcelaId
        of fatState.loteSelecao
    ) {

        const parcela =
            fatState.parcelas.find(
                item =>
                    item.id ===
                    parcelaId
            );


        if (!parcela) {
            continue;
        }


        const servico =
            fatServicoPorId(
                parcela.servico_id
            );


const tipo =
    String(
        servico?.conta_contabil ||
        servico?.tipo_faturamento ||
        servico?.tipo_padrao ||
        ""
    )
        .trim()
        .toUpperCase();
        if (
            tipo === "MCC" ||
            tipo === "CCL"
        ) {

            tiposSelecionados.add(
                tipo
            );

        }

    }


    // ========================================================
    // UM LOTE NÃO DEVE MISTURAR MCC E CCL
    // ========================================================

    if (
        tiposSelecionados.size > 1
    ) {

        alert(
            "Os itens selecionados possuem MCC e CCL juntos.\n\n" +
            "Para faturar, selecione somente itens MCC ou somente itens CCL por vez."
        );

        return;

    }


    const tipoSelecionado =
        [...tiposSelecionados][0];


    const campoTipo =
        document.getElementById(
            "fatLoteTipo"
        );


    if (
        campoTipo &&
        tipoSelecionado
    ) {

        campoTipo.value =
            tipoSelecionado;

    }


    // ========================================================
    // MOSTRA SOMENTE OS ITENS QUE JÁ FORAM MARCADOS
    // ========================================================

    fatRenderSelecionadosDoLote();

    fatAtualizarResumoLote();


    document
        .getElementById(
            "fatLoteModal"
        )
        ?.classList
        .remove(
            "hidden"
        );

}

function fatRenderSelecionadosDoLote() {

    const box =
        document.getElementById(
            "fatSelecionaveis"
        );


    if (!box) {
        return;
    }


    const itens = [];


    for (
        const parcelaId
        of fatState.loteSelecao
    ) {

        const parcela =
            fatState.parcelas.find(
                item =>
                    item.id ===
                    parcelaId
            );


        if (!parcela) {
            continue;
        }


        const servico =
            fatServicoPorId(
                parcela.servico_id
            );


        if (!servico) {
            continue;
        }


        itens.push({
            parcela,
            servico
        });

    }


    if (!itens.length) {

        box.innerHTML = `

            <p class="
                p-8
                text-center
                text-xs
                opacity-40
            ">
                Nenhum serviço selecionado.
            </p>

        `;

        return;

    }


    box.innerHTML =
        itens
            .map(
                item => {

                    const parcela =
                        item.parcela;

                    const servico =
                        item.servico;


                    return `

                        <div
                            class="
                                flex
                                items-center
                                gap-3
                                p-4
                                border-b
                                border-black/5
                                dark:border-white/5
                            "
                        >

                            <div class="flex-1 min-w-0">

                                <p class="
                                    text-xs
                                    font-semibold
                                ">
                                    ${
                                        servico.chamado_id ||
                                        "AVULSO"
                                    }
                                    · Loja ${
                                        servico.loja ||
                                        "—"
                                    }
                                    · ${
                                        servico.servico ||
                                        "—"
                                    }
                                </p>


                                <p class="
                                    text-[10px]
                                    opacity-45
                                    mt-1
                                ">
                                    ${
                                        servico.fornecedor ||
                                        "Fornecedor não informado"
                                    }
                                </p>

                            </div>


                            <strong class="
                                text-xs
                                whitespace-nowrap
                            ">

                                ${fatMoney(
                                    Number(
                                        servico.valor_total ||
                                        parcela.valor ||
                                        0
                                    )
                                )}

                            </strong>

                        </div>

                    `;

                }
            )
            .join("");

}

function fatFecharLoteModal() { document.getElementById('fatLoteModal')?.classList.add('hidden'); fatState.loteSelecao.clear(); }

function fatParcelasElegiveis(tipo, mes) {
    return fatState.parcelas.filter(p => {
        if (p.situacao === 'faturada' || p.situacao === 'cancelada') return false;
        if (String(p.competencia).slice(0, 7) > mes) return false;
        const s = fatServicoPorId(p.servico_id);
const conta =
    String(
        s.conta_contabil ||
        s.tipo_faturamento ||
        s.tipo_padrao ||
        ""
    )
        .trim()
        .toUpperCase();


return (
    s &&
    conta === tipo &&
    !fatPendenciasServico(s).length
);
    });
}

function fatRenderSelecionaveis() {
    const tipo = document.getElementById('fatLoteTipo')?.value || 'MCC';
    const mes = document.getElementById('fatLoteCompetencia')?.value || fatState.mes || fatMonthKey(new Date());
    const box = document.getElementById('fatSelecionaveis'); if (!box) return;
    const itens = fatParcelasElegiveis(tipo, mes);
    box.innerHTML = itens.length ? itens.map(p => { const s = fatServicoPorId(p.servico_id) || {}; return `<label class="flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer"><input type="checkbox" data-fat-parcela="${p.id}" onchange="fatToggleParcela('${p.id}', this.checked)" ${fatState.loteSelecao.has(p.id) ? 'checked' : ''}><div class="flex-1 min-w-0"><p class="text-xs font-semibold">${s.chamado_id || 'AVULSO'} · Loja ${s.loja} · ${s.servico}</p><p class="text-[10px] opacity-45 mt-1">Parcela ${p.numero_parcela}/${p.total_parcelas} · ${s.fornecedor || 'Fornecedor não informado'}</p></div><strong class="text-xs">${fatMoney(p.valor)}</strong></label>` }).join('') : '<p class="p-8 text-center text-xs opacity-40">Nenhum serviço pronto para este tipo/competência.</p>';
    fatAtualizarResumoLote();
}

function fatToggleParcela(id, checked) {
    const verba = Number(document.getElementById('fatLoteVerba')?.value || 0);
    if (checked) {
        const p = fatState.parcelas.find(x => x.id === id);
        const atual = [...fatState.loteSelecao].reduce((a, pid) => a + Number(fatState.parcelas.find(x => x.id === pid)?.valor || 0), 0);
        if (verba > 0 && atual + Number(p?.valor || 0) > verba + 0.0001) {
            document.querySelector(`[data-fat-parcela="${id}"]`).checked = false;
            alert(`Este serviço ultrapassa a verba em ${fatMoney(atual + Number(p?.valor || 0) - verba)}.`);
            return;
        }
        fatState.loteSelecao.add(id);
    } else fatState.loteSelecao.delete(id);
    fatAtualizarResumoLote();
}

function fatAtualizarResumoLote() {
    const verba = Number(document.getElementById('fatLoteVerba')?.value || 0);
    const total = [...fatState.loteSelecao].reduce((a, id) => a + Number(fatState.parcelas.find(p => p.id === id)?.valor || 0), 0);
    const dif = verba - total;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v };
    set('fatResumoVerba', fatMoney(verba)); set('fatResumoSelecionado', fatMoney(total)); set('fatResumoDiferenca', fatMoney(dif)); set('fatLoteContador', `${fatState.loteSelecao.size} selecionado(s)`);
    const aviso = document.getElementById('fatLoteAviso');
    if (aviso) {
        if (!verba) aviso.textContent = 'Digite o valor da verba para validar o fechamento.';
        else if (total < verba) aviso.textContent = `Atenção: ainda faltam ${fatMoney(verba - total)} para atingir a verba.`;
        else if (Math.abs(total - verba) < 0.005) aviso.textContent = 'Verba fechada ✓';
        else aviso.textContent = 'Valor acima da verba — remova itens.';
    }
}

async function fatConfirmarLote() {
    const tipo = document.getElementById('fatLoteTipo')?.value || 'MCC';
    const competencia = document.getElementById('fatLoteCompetencia')?.value || fatState.mes;
    const verba = Number(document.getElementById('fatLoteVerba')?.value || 0);
    const parcelas = [...fatState.loteSelecao].map(id => fatState.parcelas.find(p => p.id === id)).filter(Boolean);
    const total = parcelas.reduce((a, p) => a + Number(p.valor || 0), 0);
    if (verba <= 0) return alert('Digite o valor da verba.');
    if (!parcelas.length) return alert('Selecione pelo menos um serviço.');
    if (total > verba + 0.0001) return alert('O total selecionado ultrapassa a verba.');
    if (total < verba && !confirm(`O lote ficará ${fatMoney(verba - total)} abaixo da verba. Deseja faturar mesmo assim?`)) return;

    const { data: lote, error: loteError } = await supabaseClient.from('faturamento_lotes').insert([{ tipo, competencia: `${competencia}-01`, verba, total_selecionado: total, status: 'fechado', criado_por: 'AREISPRO', fechado_em: new Date().toISOString() }]).select('*').single();
    if (loteError) return alert(`Erro ao criar lote: ${loteError.message}`);

    const itens = parcelas.map(p => { const s = fatServicoPorId(p.servico_id) || {}; return { lote_id: lote.id, parcela_id: p.id, servico_id: p.servico_id, valor: Number(p.valor || 0), snapshot: { ...s, parcela: { ...p }, tipo_faturado: tipo, competencia_faturamento: competencia } } });
    const { error: itemError } = await supabaseClient.from('faturamento_lote_itens').insert(itens);
    if (itemError) return alert(`Lote criado, mas erro ao registrar itens: ${itemError.message}`);

    const ids = parcelas.map(p => p.id);
    const { error: parcError } = await supabaseClient.from('faturamento_parcelas').update({ situacao: 'faturada', lote_id: lote.id, faturado_em: new Date().toISOString() }).in('id', ids);
    if (parcError) return alert(`Itens registrados, mas erro ao fechar parcelas: ${parcError.message}`);

    await supabaseClient.from('faturamento_historico').insert(parcelas.map(p => ({ servico_id: p.servico_id, lote_id: lote.id, evento: 'parcela_faturada', detalhes: { parcela_id: p.id, valor: p.valor, tipo, competencia }, autor: 'AREISPRO' })));
    fatFecharLoteModal();
    await fatCarregarTudo(); fatRender();
    if (confirm('Faturamento confirmado. Deseja copiar o corpo do e-mail agora?')) fatCopiarEmail(lote.id);
}

function fatItensDoLote(loteId) {
    return fatState.itensLote.filter(i => i.lote_id === loteId);
}

function fatLojaCadastro(codigo) {
    const c = String(codigo || '').trim();
    const endereco = (fatState.lojas || []).find(l => String(l.LOJA ?? l.loja ?? '').trim() === c) || {};
    const base = (db?.lojas || []).find(l => String(l.LOJA ?? l.loja ?? '').trim() === c) || {};
    return { ...base, ...endereco };
}

function fatLinhasSnapshot(itens) {
    return itens.map(i => {
        const snap = i.snapshot || {};
        const p = snap.parcela || {};
        return {
            ID: snap.chamado_id || '', SERVIÇOS: snap.servico || '', RELATÓRIO: snap.relatorio_url || '', COD: snap.cod || '', CNPJ: snap.cnpj || '', FORNECEDOR: snap.fornecedor || '', LOJA: snap.loja || '',
            'VALOR R$': Number(i.valor || p.valor || 0), 'VALOR MATERIAL': Number(snap.valor_material || 0), 'DESCRIÇÕES DE SERVIÇOS': snap.descricao_servico || '', NF: snap.nf || '', 'CONTA CONTÁBIL': snap.conta_contabil || '', STATUS: snap.status_faturamento || ''
        };
    });
}

async function fatCopiarEmail(loteId) {
    const lote = fatState.lotes.find(l => l.id === loteId); const itens = fatItensDoLote(loteId); if (!lote || !itens.length) return alert('Lote sem itens.');
    const linhas = fatLinhasSnapshot(itens);
    const lojas = [...new Set(linhas.map(x => String(x.LOJA)).filter(Boolean))].map(codigo => fatLojaCadastro(codigo));

    const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const intro = `Prezados,<br><br>Segue abaixo relação de serviços para faturamento <b>${lote.tipo}</b> referente a <b>${fatNomeMes(String(lote.competencia).slice(0, 7))}</b>.<br><br>`;
    const tabela = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${['CNPJ', 'FORNECEDOR', 'LOJA', 'VALOR R$', 'DESCRIÇÕES DE SERVIÇOS', 'NF'].map(h => `<th style="border:1px solid #999;padding:6px;background:#eee">${h}</th>`).join('')}</tr></thead><tbody>${linhas.map(r => `<tr><td style="border:1px solid #999;padding:6px">${esc(r.CNPJ)}</td><td style="border:1px solid #999;padding:6px">${esc(r.FORNECEDOR)}</td><td style="border:1px solid #999;padding:6px">${esc(r.LOJA)}</td><td style="border:1px solid #999;padding:6px">${esc(fatMoney(r['VALOR R$']))}</td><td style="border:1px solid #999;padding:6px">${esc(r['DESCRIÇÕES DE SERVIÇOS'])}</td><td style="border:1px solid #999;padding:6px">${esc(r.NF)}</td></tr>`).join('')}</tbody></table>`;
    const dados = `<br><br><b>Dados para faturamento</b><br><br><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${['LOJA', 'UF', 'CNPJ AMERICANAS', 'LOGRADOURO', 'MUNICÍPIO', 'CEP'].map(h => `<th style="border:1px solid #999;padding:6px;background:#eee">${h}</th>`).join('')}</tr></thead><tbody>${lojas.map(l => `<tr><td style="border:1px solid #999;padding:6px">${esc(l.LOJA ?? l.loja ?? '')}</td><td style="border:1px solid #999;padding:6px">${esc(l.UF ?? l.uf ?? '')}</td><td style="border:1px solid #999;padding:6px">${esc(l.CNPJ ?? l.cnpj ?? l['CNPJ AMERICANAS'] ?? '')}</td><td style="border:1px solid #999;padding:6px">${esc(l.LOGRADOURO ?? l.logradouro ?? l['ENDEREÇO'] ?? l.ENDERECO ?? l.endereco ?? '')}</td><td style="border:1px solid #999;padding:6px">${esc(l.MUNICIPIO ?? l.municipio ?? l.CIDADE ?? l.cidade ?? '')}</td><td style="border:1px solid #999;padding:6px">${esc(l.CEP ?? l.cep ?? '')}</td></tr>`).join('')}</tbody></table>`;
    const html = intro + tabela + dados;
    const texto = `Prezados,\n\nSegue relação de serviços para faturamento ${lote.tipo} - ${fatNomeMes(String(lote.competencia).slice(0, 7))}.\n\n` + linhas.map(r => `${r.LOJA}\t${fatMoney(r['VALOR R$'])}\t${r['DESCRIÇÕES DE SERVIÇOS']}`).join('\n');
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })]);
        } else await navigator.clipboard.writeText(texto);
        alert('Corpo do e-mail copiado. É só colar no Gmail ou Outlook.');
    } catch (e) { console.error(e); alert('Não foi possível copiar automaticamente. Verifique a permissão da área de transferência.'); }
}

function fatCriarSheet(rows) {
    const headers = ['ID', 'SERVIÇOS', 'RELATÓRIO', 'COD', 'CNPJ', 'FORNECEDOR', 'LOJA', 'VALOR R$', 'VALOR MATERIAL', 'DESCRIÇÕES DE SERVIÇOS', 'NF', 'CONTA CONTÁBIL', 'STATUS'];
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 36 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 50 }, { wch: 16 }, { wch: 20 }, { wch: 30 }];
    for (let r = 2; r <= rows.length + 1; r++) { if (ws[`H${r}`]) ws[`H${r}`].z = 'R$ #,##0.00'; if (ws[`I${r}`]) ws[`I${r}`].z = 'R$ #,##0.00'; }
    return ws;
}

function fatExportarLote(loteId) {
    const lote = fatState.lotes.find(l => l.id === loteId); const rows = fatLinhasSnapshot(fatItensDoLote(loteId)); if (!lote || !rows.length) return alert('Lote sem itens.');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, fatCriarSheet(rows), `${lote.tipo} ${String(lote.competencia).slice(0, 7)}`.slice(0, 31));
    XLSX.writeFile(wb, `AREISPRO_FATURAMENTO_${lote.tipo}_${String(lote.competencia).slice(0, 7)}.xlsx`);
}

function fatExportarMes() {
    const mes = fatState.mes || fatMonthKey(new Date());
    const lotes = fatState.lotes.filter(l => String(l.competencia).slice(0, 7) === mes && l.status === 'fechado');
    const itens = lotes.flatMap(l => fatItensDoLote(l.id));
    const rows = fatLinhasSnapshot(itens);
    const mcc = rows.filter((r, idx) => { const snap = itens[idx]?.snapshot || {}; return (snap.tipo_faturado || snap.tipo_faturamento || snap.tipo_padrao) === 'MCC' });
    const ccl = rows.filter((r, idx) => { const snap = itens[idx]?.snapshot || {}; return (snap.tipo_faturado || snap.tipo_faturamento || snap.tipo_padrao) === 'CCL' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, fatCriarSheet(mcc), `MCC ${mes}`.slice(0, 31));
    XLSX.utils.book_append_sheet(wb, fatCriarSheet(ccl), `CCL ${mes}`.slice(0, 31));
    XLSX.writeFile(wb, `AREISPRO_FATURAMENTO_COMPLETO_${mes}.xlsx`);
}