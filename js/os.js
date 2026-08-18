// ============================================================
// AREIS PRO
// ORDENS DE SERVIÇO
// ============================================================
//
// Responsável pelo fluxo de Ordens de Serviço:
//
// Chamado
//    ↓
// OS
//    ↓
// Identificação
//    ↓
// Inspeção
//    ↓
// Execução
//    ↓
// Materiais
//    ↓
// Evidências
//    ↓
// Encerramento
//
// Regra principal:
// o número da OS continua sendo o mesmo número do chamado.
//
// Nesta etapa somente o arquivo foi separado.
// Nenhuma regra funcional foi alterada.
// ============================================================

// ------------------------------------------------------------------------------------------------------------
// ESTADO GLOBAL DA OS
// ------------------------------------------------------------------------------------------------------------

let osAtual = null;

let osEtapaAtual = 1;

let osMateriais = [];

let osFotosAntes = [];

let osFotosDepois = [];

let osTiposServico = [];

let osPrestadores = [];

// ============================================================
// CARREGAR TIPOS DE SERVIÇO DO SUPABASE
// ============================================================
//
// A OS não mantém mais uma lista fixa no HTML.
//
// Os serviços disponíveis vêm do cadastro:
//     public.tipos_servico
//
// Somente serviços ativos aparecem no select.
// ============================================================

async function osCarregarTiposServico() {

    const select =
        document.getElementById(
            "osServico"
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


        osTiposServico =
            Array.isArray(data)
                ? data
                : [];


        if (!osTiposServico.length) {

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
                osTiposServico
                    .map(servico => {

                        const nome =
                            escaparHtmlOS(
                                servico.nome || ""
                            );

                        const conta =
                            escaparHtmlOS(
                                servico.conta_contabil || ""
                            );


                        return `
                            <option
                                value="${nome}"
                                data-conta="${conta}"
                            >
                                ${nome}
                            </option>
                        `;

                    })
                    .join("")
            }

        `;


        console.log(
            "Tipos de serviço carregados na OS:",
            osTiposServico
        );


    } catch (error) {

        console.error(
            "Erro ao carregar tipos de serviço na OS:",
            error
        );


        select.innerHTML = `
            <option value="">
                Erro ao carregar serviços
            </option>
        `;

    }

}

// ============================================================
// CARREGAR PRESTADORES PARA A OS
// ============================================================

async function osCarregarPrestadores() {

    try {

        const { data, error } =
            await supabaseClient
                .from("prestadores")
                .select(
                    "nome, razao_social, cnpj, codigo, telefone, email, servicos, ativo"
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


        osPrestadores =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Prestadores carregados para OS:",
            osPrestadores
        );


        // Se ainda não existe serviço escolhido,
        // deixa o select aguardando.
        osFiltrarPrestadoresPorServico();


    } catch (error) {

        console.error(
            "Erro ao carregar prestadores na OS:",
            error
        );


        const select =
            document.getElementById(
                "osPrestador"
            );


        if (select) {

            select.innerHTML = `
                <option value="">
                    Erro ao carregar prestadores
                </option>
            `;

        }

    }

}

// ============================================================
// FILTRAR PRESTADORES PELO SERVIÇO DA OS
// ============================================================

function osFiltrarPrestadoresPorServico() {

    const selectServico =
        document.getElementById(
            "osServico"
        );

    const selectPrestador =
        document.getElementById(
            "osPrestador"
        );

    const ajuda =
        document.getElementById(
            "osPrestadorAjuda"
        );


    if (!selectPrestador) {
        return;
    }


    const servicoSelecionado =
        String(
            selectServico?.value || ""
        ).trim();


    // Nenhum serviço selecionado.
    if (!servicoSelecionado) {

        selectPrestador.innerHTML = `
            <option value="">
                Selecione primeiro o serviço
            </option>
        `;


        if (ajuda) {

            ajuda.innerText =
                "Os prestadores serão filtrados pelo serviço selecionado.";

        }


        return;

    }


    // ========================================================
    // NORMALIZA TEXTO
    // ========================================================

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


    const servicoNormalizado =
        normalizar(
            servicoSelecionado
        );


    // ========================================================
    // FILTRA PRESTADORES
    // ========================================================
    console.log(
    "SERVIÇO ESCOLHIDO:",
    servicoSelecionado
);

console.log(
    "PRESTADORES DISPONÍVEIS:",
    osPrestadores.map(
        p => ({
            nome: p.nome,
            servicos: p.servicos
        })
    )
);

    const encontrados =
        osPrestadores.filter(
            prestador => {

                if (
                    prestador.ativo === false
                ) {
                    return false;
                }


let servicos = [];


// Se o Supabase devolver como array
if (
    Array.isArray(
        prestador.servicos
    )
) {

    servicos =
        prestador.servicos;

}


// Se algum cadastro antigo estiver como texto
else if (
    typeof prestador.servicos ===
    "string"
) {

    servicos =
        prestador.servicos
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

}

return servicos.some(
    servico => {

        const servicoPrestador =
            normalizar(servico);


        return (
            servicoPrestador ===
                servicoNormalizado
            ||
            servicoPrestador.includes(
                servicoNormalizado
            )
            ||
            servicoNormalizado.includes(
                servicoPrestador
            )
        );

    }
);
            }
        );


    // ========================================================
    // NENHUM PRESTADOR CONFIGURADO
    // ========================================================

    if (!encontrados.length) {

        selectPrestador.innerHTML = `
            <option value="">
                Nenhum prestador vinculado
            </option>
        `;


        if (ajuda) {

            ajuda.innerText =
                `Nenhum prestador está cadastrado para "${servicoSelecionado}". Edite o prestador em Cadastros.`;

        }


        return;

    }


    // ========================================================
    // MONTA SELECT
    // ========================================================

    selectPrestador.innerHTML = `

        <option value="">
            Selecione o prestador
        </option>

        ${
            encontrados
                .map(
                    prestador => {

                        const nome =
                            escaparHtmlOS(
                                prestador.nome || ""
                            );


                        return `
                            <option
                                value="${nome}"
                            >
                                ${nome}
                            </option>
                        `;

                    }
                )
                .join("")
        }

    `;


    if (ajuda) {

        ajuda.innerText =
            `${encontrados.length} prestador(es) atendem este serviço.`;

    }

}

function escaparHtmlOS(valor) {

    return String(
        valor ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
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
            },

            {
                numero: "1.2",
                pergunta:
                    "Há demarcação visível de incêndio no piso? (Apenas para casos em que efetivamente NÃO existe a demarcação)",
            },

            {
                numero: "1.3",
                pergunta:
                    "Recargas de extintores estão dentro da validade?",
            },

            {
                numero: "1.4",
                pergunta:
                    "Testes de mangueiras estão dentro da validade?",
            },

            {
                numero: "1.5",
                pergunta:
                    "Bomba de incêndio está operando normalmente?",
            },

            {
                numero: "1.6",
                pergunta:
                    "Central de Alarme em funcionamento?",
            },

            {
                numero: "1.7",
                pergunta:
                    "Existe sinalização de emergência nas paredes (indicação de saída e de equipamentos de incêndio)?",
            },

            {
                numero: "1.8",
                pergunta:
                    "Associados sabem como proceder caso ocorra um princípio de incêndio?",
            },

            {
                numero: "1.9",
                pergunta:
                    "Possui AVCB dentro da validade?",
            },

            {
                numero: "1.10",
                pergunta:
                    "As mangueiras são do tipo 2?",
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
            },

            {
                numero: "2.2",
                pergunta:
                    "Cabos elétricos encontram-se protegidos (dentro de calhas e eletrodutos)?",
            },

            {
                numero: "2.3",
                pergunta:
                    "Quadros de energia estão sinalizados, desobstruídos e em perfeito estado de conservação?",
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
            },

            {
                numero: "3.2",
                pergunta:
                    "As escadas possuem corrimãos? (Escadas internas com menos de 1,20 m de largura precisam de corrimão em apenas um lado. Já escadas externas de uso coletivo devem ter corrimão dos dois lados, independentemente da largura.)",
            },

            {
                numero: "3.3",
                pergunta:
                    "As paredes não possuem infiltrações, rachaduras ou danos estruturais?",
            },

            {
                numero: "3.4",
                pergunta:
                    "Corredores e vias de passagem estão desobstruídos?",
            },

            {
                numero: "3.5",
                pergunta:
                    "Ambientes estão limpos e higienizados?",
            },

            {
                numero: "3.6",
                pergunta:
                    "Ambientes foram dedetizados?",
            },

            {
                numero: "3.7",
                pergunta:
                    "Elevador(es) estão em bom estado de uso (limpeza, iluminação, organização e de uso)?",
            },

            {
                numero: "3.8",
                pergunta:
                    "Caixas possuem cadeiras com encosto para lombar e são ajustáveis?",
            },

            {
                numero: "3.9",
                pergunta:
                    "Caixas possuem apoio para os pés?",
            },

            {
                numero: "3.10",
                pergunta:
                    "As mercadorias estão armazenadas a uma distância superior a 50 cm das estruturas laterais (paredes) do prédio?",
            },

            {
                numero: "3.11",
                pergunta:
                    "As mercadorias estão armazenadas sem contato direto com fios elétricos, painéis elétricos, tomadas e/ou assemelhados?",
            },

            {
                numero: "3.12",
                pergunta:
                    "Arranjo físico do estoque está adequado para armazenamento de mercadorias?",
            },

            {
                numero: "3.13",
                pergunta:
                    "A temperatura ambiente está adequada - conforto térmico?",
            },

            {
                numero: "3.14",
                pergunta:
                    "A iluminação do ambiente está adequada?",
            },

            {
                numero: "3.15",
                pergunta:
                    "O estoque está organizado?",
            },

            {
                numero: "3.16",
                pergunta:
                    "Os PDVs e equipamento do Checkout estão em perfeito estado de conservação?",
            },

            {
                numero: "3.17",
                pergunta:
                    "Monitores dos Checkouts têm regulagem de altura ou suporte de regulagem?",
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
            },

            {
                numero: "4.2",
                pergunta:
                    "Prensas possuem sistemas de segurança em devido funcionamento?",
            },

            {
                numero: "4.3",
                pergunta:
                    "As escadas móveis são adequadas?",
            },

            {
                numero: "4.4",
                pergunta:
                    "Associados da área de manutenção utilizam adequadamente os EPI’s necessários às suas atividades?",
            },

            {
                numero: "4.5",
                pergunta:
                    "Roltainers e carrinhos de cargas estão em bom estado de conservação?",
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
            },

            {
                numero: "5.2",
                pergunta:
                    "As instalações hidráulicas, mictórios, vasos sanitários e chuveiros estão em boas condições de uso?",
            },

            {
                numero: "5.3",
                pergunta:
                    "Há segregação dos sanitários por sexo?",
            },

            {
                numero: "5.4",
                pergunta:
                    "Há disponibilidade adequada de sabão, papel toalha e papel higiênico nos sanitários?",
            },

            {
                numero: "5.5",
                pergunta:
                    "Lixeiras possuem tampas?",
            },

            {
                numero: "5.6",
                pergunta:
                    "Apresentam boas condições de higiene, limpeza e organização?",
            },

            {
                numero: "5.7",
                pergunta:
                    "Produtos de limpeza são armazenados em locais adequados?",
            },

            {
                numero: "5.8",
                pergunta:
                    "Ambientes possuem iluminação adequada?",
            },

            {
                numero: "5.9",
                pergunta:
                    "Ralos e caneletas possuem tampas e estão em bom estado de conservação?",
            },

            {
                numero: "5.10",
                pergunta:
                    "Armários estão em boas condições de uso?",
            },

            {
                numero: "5.11",
                pergunta:
                    "Os pertences dos associados encontram-se dentro dos armários?",
            },

            {
                numero: "5.12",
                pergunta:
                    "Ambientes não apresentam infiltrações?",
            },

            {
                numero: "5.13",
                pergunta:
                    "As cadeiras e/ou bancos estão em boas condições de uso?",
            },

            {
                numero: "5.14",
                pergunta:
                    "As cabines para banho estão providas com porta que impeçam o devassamento?",
            },

            {
                numero: "5.15",
                pergunta:
                    "Chuveiros dispõem de água quente e fria?",
            },

            {
                numero: "5.16",
                pergunta:
                    "Nas cabines têm suportes para sabonetes e toalhas?",
            },

            {
                numero: "5.17",
                pergunta:
                    "As cabines possuem dimensões de acordo com o código de obra local ou, na ausência desse, no mínimo 0,80m (oitenta centímetros) por 0,80m (oitenta centímetros)?",
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
            },

            {
                numero: "6.2",
                pergunta:
                    "Há local para lavagem de utensílios usados na refeição?",
            },

            {
                numero: "6.3",
                pergunta:
                    "Possui iluminação adequada?",
            },

            {
                numero: "6.4",
                pergunta:
                    "Local é arejado e apresenta boas condições de conservação, limpeza e higiene?",
            },

            {
                numero: "6.5",
                pergunta:
                    "Possui mesas e cadeiras em quantidades suficientes e em bom estado de conservação?",
            },

            {
                numero: "6.6",
                pergunta:
                    "Há meios para conservação e aquecimento das refeições?",
            },

            {
                numero: "6.7",
                pergunta:
                    "Há copos descartáveis disponíveis no local?",
            },

            {
                numero: "6.8",
                pergunta:
                    "Existem bebedouros em quantidades suficientes (1 p/ cada grupo de 50) e estão higienizados?",
            },

            {
                numero: "6.9",
                pergunta:
                    "A troca de filtros dos bebedouros obedece o prazo máximo de 6 meses?",
            },

            {
                numero: "6.10",
                pergunta:
                    "Lixeiras estão em boas condições e possuem tampas?",
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
            },

            {
                numero: "7.2",
                pergunta:
                    "A loja não possui registro de acidentes típicos ocorridos neste ano?",
            },

            {
                numero: "7.3",
                pergunta:
                    "Não há histórico de ações de órgãos públicos (como Sindicato, MPT, Vigilância Sanitária) passadas ou em andamento na loja?",
            },

            {
                numero: "7.4",
                pergunta:
                    "No mural da loja está disponível o Fluxo de comunicação de acidentes e a Rota de segurança?",
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

        const selectServico =
    document.getElementById(
        "osServico"
    );

const opcaoServico =
    selectServico
        ?.options[
            selectServico.selectedIndex
        ];

const contaContabil =
    opcaoServico
        ?.dataset
        ?.conta || "";

    const prioridade =
        document.getElementById("osPrioridade")?.value;

    const prestador =
    document
        .getElementById(
            "osPrestador"
        )
        ?.value || "";

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



osAtual.tipo =
    tipo;

osAtual.servico =
    servico;

osAtual.prioridade =
    prioridade;

osAtual.prestador =
    prestador;

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
// ============================================================
// INICIALIZAÇÃO DOS TIPOS DE SERVIÇO DA OS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "OS: carregando dados do módulo..."
        );


        if (
            typeof osCarregarTiposServico ===
            "function"
        ) {

            await osCarregarTiposServico();

        }


        if (
            typeof osCarregarPrestadores ===
            "function"
        ) {

            await osCarregarPrestadores();

        }

    }
);

// ============================================================================================================
// ============================================================================================================
// ============================================================================================================
//                                      FIM DO MÓDULO DE OS
// ============================================================================================================