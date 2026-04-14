// --- BANCO DE DADOS LOCAL ---
let db = {

    lojas: [
        "#102 - PATIO BELEM",
        "#133 -SHC PARQUE SHOPPING - PA",
        "#368 - CASTANHAL - PA",
        "#403 PEDREIRA - PA",
        "#421 - ICOARACI - PA",
        "#1068 – MARITUBA - PA",
        "#1093 - Santarém - PA",
        "#1113 - SHC RIO TAPAJOS - PA",
        "#1119 - ALTAMIRA - PA",
        "#1227 - SHC GRÃO PARA - PA",
        "#1261 - ANANINDEUA - PA",
        "#1270 - CASTANHEIRA - PA",
        "#1317 – ITAITUBA - PA",
        "#1333 - SHC METROPOLE - PA",
        "#1402 - DISTRITO - PA",
        "#1476 - S. M. GUAMA - PA",
        "#1527 - ALENQUER - PA",
        "#1548 - BENEVIDES - PA",
        "#5186 - MARAMBAIA - PA",
        "#5255 - SANTA IZABEL - PA",
    ],
    fornecedores: [
        "THERMO ENGENHARIA SOLUÇÕES LTDA", 
        "EMC SERVIÇOS REFORMA PREDIAL E METALURGIA",
        "JSERVICE INSTAÇÃO E MANUTENÇÃO PREDIAL ",
        "RELATÓRIO INSPEÇÃO DE SEGURANÇA",
    ]
};

let anexos = [{ id: Date.now(), titulo: "ANEXO 1", obs: "", fotosAntes: [], fotosDepois: [] }];
let logos = { prestador: null, americanas: null };
let fotosObrigatorias = { fachada: null, marquise: null };

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('are_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}
if(localStorage.getItem('are_theme') === 'dark') document.documentElement.classList.add('dark');

// --- SISTEMA DE GESTÃO DE DADOS ---
function renderDB() {
    localStorage.setItem('are_lojas', JSON.stringify(db.lojas));
    localStorage.setItem('are_provs', JSON.stringify(db.fornecedores));
    
    document.getElementById('lojaSelect').innerHTML = db.lojas.map(l => `<option value="${l}">${l}</option>`).join('');
    document.getElementById('prestador').innerHTML = db.fornecedores.map(f => `<option value="${f}">${f}</option>`).join('');
    
    document.getElementById('storeList').innerHTML = db.lojas.map((l, i) => `<div class="flex justify-between p-3 glass rounded-xl text-xs font-medium"><span>${l}</span><button onclick="db.lojas.splice(${i},1);renderDB()" class="text-red-500 font-bold">×</button></div>`).join('');
    document.getElementById('provList').innerHTML = db.fornecedores.map((f, i) => `<div class="flex justify-between p-3 glass rounded-xl text-xs font-medium"><span>${f}</span><button onclick="db.fornecedores.splice(${i},1);renderDB()" class="text-red-500 font-bold">×</button></div>`).join('');
}

function addStore() { const v = document.getElementById('newStore').value.toUpperCase(); if(v){ db.lojas.push(v); document.getElementById('newStore').value=""; renderDB(); } }
function addProv() { const v = document.getElementById('newProv').value.toUpperCase(); if(v){ db.fornecedores.push(v); document.getElementById('newProv').value=""; renderDB(); } }

// --- LOGICA DE IMAGENS ---
async function handleSingleUpload(input, key) {
    if(input.files[0]) {
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
function entrarNoSistema() { document.getElementById('welcomeView').classList.add('hidden-view'); document.getElementById('appContainer').classList.remove('hidden-view'); renderDB(); renderAnexos(); }
function navigate(v) { ['mainView', 'configView'].forEach(id => document.getElementById(id).classList.add('hidden-view')); document.getElementById(`${v}View`).classList.remove('hidden-view'); document.getElementById('userMenu').classList.add('hidden'); }
function toggleMenu() { document.getElementById('userMenu').classList.toggle('hidden'); }
function toggleConverter() { document.getElementById('converterExpand').classList.toggle('hidden'); }
function triggerConverter(id) { document.getElementById(id).click(); }
async function handleConversion(input, type) {
    const file = input.files[0];
    if (!file) return;

    // Feedback visual para o usuário não achar que travou
    const btn = input.parentElement;
    const originalText = btn.innerHTML;
    btn.innerHTML = "<p class='text-[9px] font-black animate-pulse'>CONVERTENDO...</p>";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("https://api.pdf.co/v1/pdf/convert/to/doc", {
            method: "POST",
            headers: {
                "x-api-key": "SUA_CHAVE_AQUI" // <--- Troque pela sua chave real
            },
            body: formData
        });

        const result = await response.json();

        if (result.url) {
            const link = document.createElement('a');
            link.href = result.url;
            link.download = file.name.replace(".pdf", ".doc");
            link.click();
        } else {
            alert("Erro: " + (result.message || "Falha na conversão"));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor de conversão.");
    } finally {
        btn.innerHTML = originalText; // Restaura o botão
    }
}
function addNovoAnexo() { anexos.push({ id: Date.now(), titulo: `ANEXO ${anexos.length + 1}`, obs: "", fotosAntes: [], fotosDepois: [] }); renderAnexos(); }
function removeAnexo(id) { if(anexos.length > 1) { anexos = anexos.filter(a => a.id !== id); renderAnexos(); } }
function updateAnexoObs(id, val) { const a = anexos.find(x => x.id === id); if(a) a.obs = val; }
function updateFotoDesc(id, fIdx, tipo, val) { const a = anexos.find(x => x.id === id); if(a) a[`fotos${tipo}`][fIdx].desc = val; }
function removeFotoAnexo(id, fIdx, tipo) { const a = anexos.find(x => x.id === id); a[`fotos${tipo}`].splice(fIdx, 1); renderAnexos(); }
function removeObrigatoria(key) { fotosObrigatorias[key] = null; document.getElementById(`prev-${key}`).innerHTML = `<input type="file" onchange="handleSingleUpload(this, '${key}')" class="absolute inset-0 opacity-0 cursor-pointer"><span class="text-[10px] opacity-40 font-bold uppercase">Figura ${key === 'fachada' ? '1' : '2'} – ${key}</span>`; }
async function saveLogo(input, key) { if(input.files[0]) logos[key] = await comprimirImagem(input.files[0]); }

// --- GERAÇÃO DE PDF ---
async function gerarRelatorio() {
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

    if(logos.prestador) {
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
doc.text(`LOJA: ${lNome}`, 10.5, 21.0, { align: 'center' });
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
    if(anexo.fotosAntes.length === 0 && anexo.fotosDepois.length === 0) continue;

    const renderGal = (photos, sub) => {
    if(photos.length === 0) return;
    
    doc.addPage(); 
    header();
    
    // Título da primeira página do anexo
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(11); 
    doc.text(sub, 10.5, 5.2, {align:'center'}); // Título centralizado

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
    const alturaImg  = 3.9;

    // 1. CALCULA A LEGENDA PRIMEIRO
    doc.setFontSize(10); 
    const legendaTexto = `Figura ${fCount++} - ${f.desc || 'Averiguação técnica.'}`;
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

    doc.save(`AREISPRO_${lNome.split(' ')[0] || 'RELATORIO'}.pdf`);
}

// ANIMAÇÃO DE TEXTO
const frases = ["PROJETO AREISPRO","GESTÃO DE NEGÓCIOS", "RELATÓRIOS TÉCNICOS", "CONVERSOR DE ARQUIVOS"];
let fIdx = 0;
setInterval(() => {
    const el = document.getElementById('changingText');
    if(el) { el.style.opacity = 0; setTimeout(() => { fIdx = (fIdx + 1) % frases.length; el.innerText = frases[fIdx]; el.style.opacity = 1; }, 500); }
}, 3000);