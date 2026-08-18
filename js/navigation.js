// ============================================================
// AREIS PRO
// NAVEGAÇÃO E INICIALIZAÇÃO DA INTERFACE
// ============================================================
//
// Responsável por:
// - entrada no sistema;
// - troca entre módulos;
// - menu do usuário;
// - inicialização específica de módulos.
//
// As regras internas dos módulos permanecem nos arquivos
// próprios. Este arquivo apenas controla para onde o usuário vai.
// ============================================================


// ============================================================
// ENTRADA NO SISTEMA
// ============================================================
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
if (view === "main") {

    if (typeof initRelatoriosModule === "function") {

        initRelatoriosModule();

    }
if (view === "os") {

    if (
        typeof osCarregarTiposServico ===
        "function"
    ) {

        osCarregarTiposServico();

    }


    if (
        typeof osCarregarPrestadores ===
        "function"
    ) {

        osCarregarPrestadores();

    }

}
}
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function toggleMenu() { document.getElementById('userMenu').classList.toggle('hidden'); }