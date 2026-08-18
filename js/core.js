// ============================================================
// AREIS PRO
// CORE DA APLICAÇÃO
// ============================================================
//
// Recursos globais usados pela interface principal.
// Não deve conter regras específicas de Chamados,
// OS, Relatórios ou Faturamento.
// ============================================================


// ============================================================
// DARK MODE
// ============================================================

function toggleDarkMode() {

    document.documentElement.classList.toggle(
        'dark'
    );

    localStorage.setItem(
        'are_theme',
        document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'light'
    );

}

if (
    localStorage.getItem('are_theme') === 'dark'
) {

    document.documentElement.classList.add(
        'dark'
    );

}


// ============================================================
// ANIMAÇÃO DA TELA INICIAL
// ============================================================

const frases = [
    "PLATAFORMA AREISPRO",
    "GESTÃO DE NEGÓCIOS",
    "RELATÓRIOS TÉCNICOS",
    "CENTRAL DE CHAMADOS"
];

let fIdx = 0;

setInterval(() => {

    const el =
        document.getElementById('changingText');

    if (!el) {
        return;
    }

    el.style.opacity = 0;

    setTimeout(() => {

        fIdx =
            (fIdx + 1) %
            frases.length;

        el.innerText =
            frases[fIdx];

        el.style.opacity = 1;

    }, 500);

}, 3000);