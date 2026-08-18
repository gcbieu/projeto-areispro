// ============================================================
// AREIS PRO
// CENTRAL DE CHAMADOS
// ============================================================
//
// Responsável por:
// - carregar chamados;
// - filtros e pesquisas;
// - dashboards de chamados;
// - detalhes do chamado;
// - comentários e histórico;
// - alteração de status;
// - integração do chamado com OS e Relatórios.
//
// Os dados continuam utilizando o Supabase e as mesmas
// estruturas existentes antes da modularização.
// ============================================================

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
                autor: 'ADM',
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
// ============================================================================================================

