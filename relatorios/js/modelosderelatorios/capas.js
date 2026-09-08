// ============================================================
// AREISPRO
// ROTEADOR DE CAPAS
// ============================================================
//
// Este arquivo decide qual capa será usada.
//
// IMPORTANTE:
// - pdf.js não desenha capas;
// - cada modelo possui sua própria capa;
// - vistoria possui sua própria capa;
// - modelo1, modelo2 etc. são MODELOS VISUAIS,
//   não nomes fixos de fornecedores.
// ============================================================


async function gerarCapaSelecionada(dados) {

    // --------------------------------------------------------
    // VISTORIA
    // --------------------------------------------------------

    if (dados.tipoRelatorio === "vistoria") {

        return gerarCapaVistoria(dados);

    }


    // --------------------------------------------------------
    // MODELOS DE CAPA DOS RELATÓRIOS FOTOGRÁFICOS
    // --------------------------------------------------------

    switch (dados.modeloCapa) {

        case "modelo1":

            return gerarCapaModelo1(dados);


        case "modelo2":

            return gerarCapaModelo2(dados);


        case "modelo3":

            return gerarCapaModelo3(dados);


        case "modelo4":

            return gerarCapaModelo4(dados);


        case "modelo5":

            return gerarCapaModelo5(dados);


        default:

            throw new Error(
                `Modelo de capa não encontrado: ${dados.modeloCapa}`
            );

    }

}