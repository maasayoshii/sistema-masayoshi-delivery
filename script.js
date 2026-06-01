firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let taxaEntregaCalculada = 0; 
let tipoPedidoAtual = 'retirada';

const telaLogin = document.getElementById('tela-login');
const appPrincipal = document.getElementById('app-principal');
const btnEntrar = document.getElementById('btn-entrar');
const msgErro = document.getElementById('login-erro');

auth.onAuthStateChanged(user => {
    if (user) {
        telaLogin.style.display = 'none';
        appPrincipal.style.display = 'block';
        renderizarCardapio();
        mudarAba('retirada'); 
    } else {
        telaLogin.style.display = 'flex';
        appPrincipal.style.display = 'none';
    }
});

btnEntrar.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value.trim();
    
    if (!email || !senha) {
        msgErro.innerText = "Preencha e-mail e senha.";
        msgErro.style.display = "block";
        return;
    }

    btnEntrar.innerText = "Carregando...";
    try {
        await auth.signInWithEmailAndPassword(email, senha);
        msgErro.style.display = "none";
        btnEntrar.innerText = "Entrar no Sistema";
    } catch (error) {
        msgErro.innerText = "E-mail ou senha incorretos!";
        msgErro.style.display = "block";
        btnEntrar.innerText = "Entrar no Sistema";
        console.error(error);
    }
});

window.fazerLogout = function() {
    auth.signOut().then(() => {
        document.getElementById('login-email').value = "";
        document.getElementById('login-senha').value = "";
    });
};

const taxasPorBairro = {
    "Taboão": 3.00,
    "Paulicéia": 3.00,
    "Rudge Ramos": 6.00,
    "Vila Santa Luzia": 3.00,
    "Campanário": 3.00, 
    "Vila Liviero": 3.00,
    "Centro": 5.00,
    "Anchieta": 4.00,
    "Planalto": 10.00,
    "Vila Moraes": 3.00,
    "Parque Savério": 3.00,
    "Jardim Celeste": 3.00,
    "Jardim Maria Estela": 5.00,
    "Canhema": 3.00,
    "Independência": 7.00,
    "Iraja": 5.00,
    "Santa Terezinha": 5.00,
    "Parque Bristol": 3.00,
    "Vila das Mercês": 8.00,
    "Conceição": 7.00,
    "Vila Nogueira": 6.00,
    "São João Clímaco": 9.00,
    "Jardim Clímax": 3.00,
    "Piraporinha": 7.00,
    "Casa Grande": 8.00
};

document.getElementById('end-cep').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) {
        v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = v;
});

window.buscarCEP = async function() {
    const cepInput = document.getElementById('end-cep').value.replace(/\D/g, '');
    
    if (cepInput.length === 8) {
        try {
            const resposta = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
            const dados = await resposta.json();
            
            if (!dados.erro) {
                document.getElementById('end-rua').value = dados.logradouro;
                document.getElementById('end-bairro').value = dados.bairro;
                
                calcularTaxaPorBairroStr(dados.bairro);
            } else {
                alert("CEP não encontrado.");
                zerarTaxa();
            }
        } catch (error) {
            console.error(error);
            zerarTaxa();
        }
    }
};

window.calcularTaxaPorBairroManual = function() {
    const bairroDigitado = document.getElementById('end-bairro').value.trim();
    if(bairroDigitado) {
        calcularTaxaPorBairroStr(bairroDigitado);
    }
};

function calcularTaxaPorBairroStr(bairroStr) {
    if(!bairroStr) return;

    let bairroEncontrado = Object.keys(taxasPorBairro).find(b => 
        bairroStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .includes(b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    );
    
    if (bairroEncontrado) {
        taxaEntregaCalculada = taxasPorBairro[bairroEncontrado];
        
        document.getElementById('distancia-km').innerText = `Bairro: ${bairroStr}`;
        document.getElementById('valor-taxa').innerText = `R$ ${taxaEntregaCalculada.toFixed(2).replace('.', ',')}`;
        document.getElementById('mostrador-taxa').style.display = 'block';
        document.getElementById('mostrador-taxa').style.color = 'var(--primary-color)';
    } else {
        taxaEntregaCalculada = 0; 
        
        document.getElementById('distancia-km').innerText = `Fora da área (> 6km)`;
        document.getElementById('valor-taxa').innerText = `Consultar motoboy`;
        document.getElementById('mostrador-taxa').style.display = 'block';
        document.getElementById('mostrador-taxa').style.color = '#ff5252'; 
        
        alert("Atenção: Endereço passa de 6km. Consulte a taxa com o entregador.");
    }

    atualizarTelaCarrinho();
}

function zerarTaxa() {
    taxaEntregaCalculada = 0;
    document.getElementById('mostrador-taxa').style.display = 'none';
    atualizarTelaCarrinho();
}

function mascaraTelefone(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 11) v = v.substring(0, 11); 
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    if (v.length > 9) v = v.replace(/(\d)(\d{4})$/, '$1-$2'); 
    e.target.value = v;
}

const telefoneInput = document.getElementById('telefone-cliente');
const nomeInput = document.getElementById('nome-cliente');
const modalTelInput = document.getElementById('modal-tel');

telefoneInput.addEventListener('input', mascaraTelefone);
modalTelInput.addEventListener('input', mascaraTelefone);

telefoneInput.addEventListener('blur', async () => {
    const telefone = telefoneInput.value.trim();
    if (telefone.replace(/\D/g, '').length >= 10) { 
        try {
            const docRef = db.collection("clientes").doc(telefone);
            const doc = await docRef.get();
            if (doc.exists) {
                let d = doc.data();
                nomeInput.value = d.nome || ""; 
                document.getElementById('end-cep').value = d.cep || "";
                document.getElementById('end-rua').value = d.rua || "";
                document.getElementById('end-bairro').value = d.bairro || "";
                document.getElementById('end-numero').value = d.numero || "";
                document.getElementById('end-complemento').value = d.complemento || "";
                
                if(d.bairro) {
                    calcularTaxaPorBairroStr(d.bairro);
                }
            } else {
                nomeInput.value = ""; 
                document.getElementById('end-cep').value = "";
                document.getElementById('end-rua').value = "";
                document.getElementById('end-bairro').value = "";
                document.getElementById('end-numero').value = "";
                document.getElementById('end-complemento').value = "";
                zerarTaxa();
            }
        } catch (error) {
            console.error(error);
        }
    }
});

window.toggleNumero = function() {
    const check = document.getElementById('check-sem-numero');
    const inputNum = document.getElementById('end-numero');
    
    if (check.checked) {
        inputNum.value = 'S/N';
        inputNum.disabled = true;
    } else {
        inputNum.value = '';
        inputNum.disabled = false;
    }
};

window.mudarAba = function(aba) {
    const telaPedidos = document.getElementById('tela-pedidos');
    const telaClientes = document.getElementById('tela-clientes');
    const telaDashboard = document.getElementById('tela-dashboard');
    
    const btnAbaRetirada = document.getElementById('aba-retirada');
    const btnAbaEntrega = document.getElementById('aba-entrega');
    const btnAbaClientes = document.getElementById('aba-clientes');
    const btnAbaDashboard = document.getElementById('aba-dashboard');
    
    const painelCarrinho = document.getElementById('painel-carrinho');
    const camposEndereco = document.getElementById('campos-endereco');
    const tituloPedido = document.getElementById('titulo-tipo-pedido');

    telaPedidos.style.display = 'none';
    telaClientes.style.display = 'none';
    telaDashboard.style.display = 'none';
    
    if(btnAbaRetirada) btnAbaRetirada.classList.remove('aba-ativa');
    if(btnAbaEntrega) btnAbaEntrega.classList.remove('aba-ativa');
    if(btnAbaClientes) btnAbaClientes.classList.remove('aba-ativa');
    if(btnAbaDashboard) btnAbaDashboard.classList.remove('aba-ativa');

    if (aba === 'retirada' || aba === 'entrega' || aba === 'pedidos') {
        telaPedidos.style.display = 'block'; 
        
        if(aba === 'pedidos') aba = 'retirada'; 
        tipoPedidoAtual = aba;
        
        if (aba === 'retirada') {
            if(btnAbaRetirada) btnAbaRetirada.classList.add('aba-ativa');
            camposEndereco.style.display = 'none';
            tituloPedido.innerText = "Dados do Cliente (Retirada)";
            zerarTaxa();
        } else if (aba === 'entrega') {
            if(btnAbaEntrega) btnAbaEntrega.classList.add('aba-ativa');
            camposEndereco.style.display = 'block';
            tituloPedido.innerText = "Dados do Cliente (Entrega)";
            calcularTaxaPorBairroManual();
        }
        atualizarTelaCarrinho();
        
    } else if (aba === 'clientes') {
        telaClientes.style.display = 'block';
        if(btnAbaClientes) btnAbaClientes.classList.add('aba-ativa');
        painelCarrinho.style.display = 'none';
        carregarClientesDaNuvem();
        
    } else if (aba === 'dashboard') {
        telaDashboard.style.display = 'block';
        if(btnAbaDashboard) btnAbaDashboard.classList.add('aba-ativa');
        painelCarrinho.style.display = 'none';
        carregarDashboard(); 
    }
}

window.carregarClientesDaNuvem = async function() {
    const listaHtml = document.getElementById('lista-clientes-salvos');
    listaHtml.innerHTML = `<li class="lista-vazia">Buscando na nuvem...</li>`;

    try {
        const querySnapshot = await db.collection("clientes").get();
        if (querySnapshot.empty) {
            listaHtml.innerHTML = `<li class="lista-vazia">Nenhum cliente salvo ainda.</li>`;
            return;
        }

        listaHtml.innerHTML = ""; 
        querySnapshot.forEach((doc) => {
            const telefone = doc.id;
            const dados = doc.data();
            let dataFormatada = "Data desconhecida";
            if (dados.ultimoPedido) {
                const dataObj = new Date(dados.ultimoPedido);
                dataFormatada = dataObj.toLocaleDateString('pt-BR') + ' às ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            }

            listaHtml.innerHTML += `
                <li class="cliente-item" onclick="abrirDetalhesCliente('${telefone}')">
                    <span class="cliente-tel">${telefone}</span>
                    <div class="cliente-dados">
                        <span class="cliente-nome">${dados.nome || "Sem Nome"}</span>
                        <span class="cliente-data">Último pedido: ${dataFormatada}</span>
                    </div>
                </li>
            `;
        });
    } catch (error) {
        console.error(error);
        listaHtml.innerHTML = `<li class="lista-vazia" style="color: red;">Erro ao carregar dados.</li>`;
    }
}

window.togglePedido = function(index) {
    const detalhes = document.getElementById(`detalhes-${index}`);
    const seta = document.getElementById(`seta-${index}`);
    
    if (detalhes.style.display === 'none') {
        detalhes.style.display = 'block';
        seta.style.transform = 'rotate(90deg)';
    } else {
        detalhes.style.display = 'none';
        seta.style.transform = 'rotate(0deg)';
    }
};

window.abrirDetalhesCliente = async function(telefone) {
    document.getElementById('modal-cliente').style.display = 'flex';
    document.getElementById('modal-historico').innerHTML = '<li>Carregando histórico...</li>';
    
    try {
        const doc = await db.collection("clientes").doc(telefone).get();
        if(doc.exists) {
            let d = doc.data();
            document.getElementById('modal-nome').value = d.nome || "";
            document.getElementById('modal-tel').value = telefone;
            document.getElementById('modal-tel-original').value = telefone;
            
            document.getElementById('modal-end-cep').value = d.cep || "";
            document.getElementById('modal-end-rua').value = d.rua || "";
            document.getElementById('modal-end-bairro').value = d.bairro || "";
            document.getElementById('modal-end-numero').value = d.numero || "";
            document.getElementById('modal-end-complemento').value = d.complemento || "";
        }

        const historicoSnapshot = await db.collection("pedidos").where("telefoneCliente", "==", telefone).get();
        const historicoHtml = document.getElementById('modal-historico');
        
        if (historicoSnapshot.empty) {
            historicoHtml.innerHTML = '<li>Nenhum pedido encontrado.</li>';
        } else {
            let arrayPedidos = [];
            historicoSnapshot.forEach(p => arrayPedidos.push(p.data()));
            arrayPedidos.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            window.pedidosModalAtual = arrayPedidos;
            historicoHtml.innerHTML = '';
            
            arrayPedidos.forEach((pedido, index) => {
                let dataObj = new Date(pedido.data);
                let dataStr = dataObj.toLocaleDateString('pt-BR') + ' às ' + dataObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                
                let badgeHtml = pedido.endereco 
                    ? `<span class="badge-tipo badge-entrega">Entrega</span>` 
                    : `<span class="badge-tipo badge-retirada">Retirada</span>`;
                
                let itensHtml = "";
                if (pedido.itens) {
                    pedido.itens.forEach(item => {
                        let obsHtml = item.observacao ? `<div class="hist-obs">Obs: ${item.observacao}</div>` : '';
                        itensHtml += `
                            <div class="hist-item">
                                <div>${item.quantidade}x ${item.nome}</div>
                                ${obsHtml}
                            </div>
                        `;
                    });
                }

                historicoHtml.innerHTML += `
                    <li class="historico-item-container">
                        <div class="historico-header" onclick="togglePedido(${index})">
                            <span class="setinha" id="seta-${index}">▶</span>
                            <div class="hist-data-valor" style="display: flex; justify-content: space-between; flex: 1; align-items: center;">
                                <div style="display:flex; align-items:center;">
                                    <span style="font-weight: bold; color: var(--text-main); font-size: 14px;">${dataStr}</span>
                                    ${badgeHtml}
                                </div>
                                <strong>R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}</strong>
                            </div>
                        </div>
                        <div class="historico-detalhes" id="detalhes-${index}" style="display: none;">
                            ${itensHtml}
                            <button class="btn-reimprimir" onclick="imprimirReciboHistorico('modal', ${index})">🖨️ Reimprimir Pedido</button>
                        </div>
                    </li>
                `;
            });
        }
    } catch (error) {
        console.error(error);
    }
}

window.fecharModalCliente = function() {
    document.getElementById('modal-cliente').style.display = 'none';
}

window.salvarEdicaoCliente = async function() {
    const telefoneOriginal = document.getElementById('modal-tel-original').value;
    const novoNome = document.getElementById('modal-nome').value.trim();
    const novoTelefone = document.getElementById('modal-tel').value.trim();
    
    const novoCep = document.getElementById('modal-end-cep').value.trim();
    const novaRua = document.getElementById('modal-end-rua').value.trim();
    const novoBairro = document.getElementById('modal-end-bairro').value.trim();
    const novoNum = document.getElementById('modal-end-numero').value.trim();
    const novoComp = document.getElementById('modal-end-complemento').value.trim();

    if(novoNome === "" || novoTelefone.replace(/\D/g, '').length < 10) {
        alert("Preencha um nome válido e um telefone com DDD completo.");
        return;
    }

    try {
        if (telefoneOriginal !== novoTelefone) {
            const docRefOld = db.collection("clientes").doc(telefoneOriginal);
            const docOld = await docRefOld.get();
            
            if(docOld.exists) {
                let data = docOld.data();
                data.nome = novoNome;
                data.cep = novoCep;
                data.rua = novaRua;
                data.bairro = novoBairro;
                data.numero = novoNum;
                data.complemento = novoComp;
                
                await db.collection("clientes").doc(novoTelefone).set(data);
                await docRefOld.delete();

                const pedidosSnapshot = await db.collection("pedidos").where("telefoneCliente", "==", telefoneOriginal).get();
                const batch = db.batch();
                pedidosSnapshot.forEach(doc => {
                    batch.update(doc.ref, { telefoneCliente: novoTelefone });
                });
                await batch.commit();
            }
        } else {
            await db.collection("clientes").doc(telefoneOriginal).update({ 
                nome: novoNome, cep: novoCep, rua: novaRua, bairro: novoBairro, numero: novoNum, complemento: novoComp
            });
        }

        alert("Dados do cliente atualizados com sucesso!");
        fecharModalCliente();
        carregarClientesDaNuvem(); 
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar a alteração.");
    }
}

window.togglePedidoPainel = function(id) {
    const detalhes = document.getElementById(`detalhes-painel-${id}`);
    const seta = document.getElementById(`seta-painel-${id}`);

    if (detalhes.style.display === 'none') {
        detalhes.style.display = 'block';
        seta.style.transform = 'rotate(90deg)';
    } else {
        detalhes.style.display = 'none';
        seta.style.transform = 'rotate(0deg)';
    }
};

window.carregarDashboard = async function() {
    const listaVendas = document.getElementById('lista-vendas-painel');
    const labelFaturamento = document.getElementById('dash-faturamento');
    const labelPedidos = document.getElementById('dash-qtd-pedidos');
    const inputData = document.getElementById('filtro-data');

    if (!inputData.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        inputData.value = `${ano}-${mes}-${dia}`;
    }

    const dataSelecionadaStr = inputData.value;

    listaVendas.innerHTML = `<li class="lista-vazia">Analisando vendas...</li>`;
    labelFaturamento.innerText = "R$ ...";
    labelPedidos.innerText = "...";

    try {
        const querySnapshot = await db.collection("pedidos").get();
        
        let totalFaturamento = 0;
        let totalPedidos = 0;
        let pedidosFiltrados = [];

        querySnapshot.forEach((doc) => {
            const pedido = doc.data();
            const dataDoPedidoStr = pedido.data; 
            
            if (dataDoPedidoStr && dataDoPedidoStr.startsWith(dataSelecionadaStr)) {
                totalPedidos++;
                totalFaturamento += pedido.valorTotal;
                pedidosFiltrados.push(pedido);
            }
        });

        if (totalPedidos === 0) {
            listaVendas.innerHTML = `<li class="lista-vazia">Nenhuma venda registrada nesta data.</li>`;
            labelFaturamento.innerText = "R$ 0,00";
            labelPedidos.innerText = "0";
            return;
        }

        labelFaturamento.innerText = `R$ ${totalFaturamento.toFixed(2).replace('.', ',')}`;
        labelPedidos.innerText = totalPedidos;

        pedidosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
        window.pedidosPainelAtual = pedidosFiltrados;

        listaVendas.innerHTML = "";
        pedidosFiltrados.forEach((pedido, index) => {
            let dataObj = new Date(pedido.data);
            let horaStr = dataObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

            let badgeHtml = pedido.endereco 
                ? `<span class="badge-tipo badge-entrega">Entrega</span>` 
                : `<span class="badge-tipo badge-retirada">Retirada</span>`;

            let itensHtml = "";
            if (pedido.itens) {
                pedido.itens.forEach(item => {
                    let obsHtml = item.observacao ? `<div class="hist-obs">Obs: ${item.observacao}</div>` : '';
                    itensHtml += `
                        <div class="hist-item">
                            <div>${item.quantidade}x ${item.nome}</div>
                            ${obsHtml}
                        </div>
                    `;
                });
            }

            let nomeExibicao = (pedido.nomeCliente && pedido.nomeCliente !== "Não informado" && pedido.nomeCliente !== "Sem Nome") 
                                ? pedido.nomeCliente 
                                : pedido.telefoneCliente;

            listaVendas.innerHTML += `
                <li class="historico-item-container">
                    <div class="historico-header" onclick="togglePedidoPainel(${index})">
                        <span class="setinha" id="seta-painel-${index}">▶</span>
                        <div class="hist-data-valor" style="display: flex; justify-content: space-between; flex: 1; align-items: center;">
                            <div style="display:flex; align-items:center;">
                                <span style="font-weight: bold; color: var(--text-main); font-size: 14px;">${horaStr} - ${nomeExibicao}</span>
                                ${badgeHtml}
                            </div>
                            <strong>R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}</strong>
                        </div>
                    </div>
                    <div class="historico-detalhes" id="detalhes-painel-${index}" style="display: none;">
                        ${itensHtml}
                        <button class="btn-reimprimir" onclick="imprimirReciboHistorico('painel', ${index})">🖨️ Reimprimir Pedido</button>
                    </div>
                </li>
            `;
        });

    } catch (error) {
        console.error(error);
        listaVendas.innerHTML = `<li class="lista-vazia" style="color: red;">Erro ao carregar dados.</li>`;
    }
}

window.imprimirReciboHistorico = function(origem, index) {
    let pedido;
    if (origem === 'modal') {
        pedido = window.pedidosModalAtual[index];
    } else if (origem === 'painel') {
        pedido = window.pedidosPainelAtual[index];
    }

    if (!pedido) return;

    let dataObj = new Date(pedido.data);
    let horarioFormatado = `${dataObj.toLocaleDateString('pt-BR')} ${dataObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;
    let tipoPedido = pedido.endereco ? "PEDIDO DE ENTREGA" : "PEDIDO DE RETIRADA";

    let htmlRecibo = `
        <div class="recibo-header">
            <h1>MASAYOSHI DELIVERY</h1>
            <p>${tipoPedido}</p>
            <p style="font-size:12px; margin-top:5px;">*** REIMPRESSÃO ***</p>
        </div>
        <div class="recibo-cliente">
            <h2>${pedido.nomeCliente}</h2>
            <p>${pedido.telefoneCliente}</p>
        </div>
        ${pedido.endereco ? `
        <div class="recibo-endereco">
            <strong>ENDEREÇO DE ENTREGA:</strong><br>
            ${pedido.endereco}
        </div>
        ` : ''}
        <div>
    `;

    let totalCalculadoReimpressao = 0;

    if (pedido.itens) {
        pedido.itens.forEach(item => {
            let precoItem = item.preco;
            if (precoItem === undefined) {
                const itemEncontrado = cardapio.find(c => c.nome === item.nome);
                precoItem = itemEncontrado ? itemEncontrado.preco : 0;
            }
            let subtotal = precoItem * item.quantidade;
            totalCalculadoReimpressao += subtotal;

            htmlRecibo += `
                <div class="recibo-item">
                    <div class="recibo-item-linha">
                        <span>${item.quantidade}x ${item.nome}</span>
                        <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    ${item.observacao ? `<span class="recibo-obs">" ${item.observacao} "</span>` : ''}
                </div>
            `;
        });
    }

    let diferencaTaxa = (pedido.valorTotal || 0) - totalCalculadoReimpressao;
    
    htmlRecibo += `
        </div>
        ${(pedido.endereco && diferencaTaxa > 0) ? `
        <div style="font-size:16px; font-weight:bold; display:flex; justify-content:space-between; margin-top:10px; padding: 0 5px;">
            <span>Taxa de Entrega</span>
            <span>R$ ${diferencaTaxa.toFixed(2).replace('.', ',')}</span>
        </div>` : ''}
        <div class="recibo-total">
            <span>TOTAL DO PEDIDO</span>
            <strong>R$ ${(pedido.valorTotal || 0).toFixed(2).replace('.', ',')}</strong>
        </div>
        <div class="recibo-rodape">
            Horário Original: <br>${horarioFormatado}
        </div>
    `;

    const divRecibo = document.getElementById('recibo-imprimir');
    divRecibo.innerHTML = htmlRecibo;
    window.print();
};

const cardapio = [
    { categoria: "Promoções Yakisoba", nome: "Promoção de Mini Hot!", preco: 55.00 },
    { categoria: "Promoções Yakisoba", nome: "Promoção de Harumaki!", preco: 52.00 },
    { categoria: "Promoções Yakisoba", nome: "Promoção de Shimeji!", preco: 55.00 },
    { categoria: "Promoções Yakisoba", nome: "Promoção de Guioza!", preco: 50.00 },
    { categoria: "Promoções Yakisoba", nome: "Promoção de Hot Banana!", preco: 50.00 },
    { categoria: "Promoções Yakisoba", nome: "Combo Familia! (2 a 4 pessoas)", preco: 120.00 },
    { categoria: "Yakisobas", nome: "Misto Grande", preco: 38.00 },
    { categoria: "Yakisobas", nome: "Misto Pequeno", preco: 27.00 },
    { categoria: "Yakisobas", nome: "Frango Grande", preco: 38.00 },
    { categoria: "Yakisobas", nome: "Frango Pequeno", preco: 25.00 },
    { categoria: "Yakisobas", nome: "Carne Grande", preco: 38.00 },
    { categoria: "Yakisobas", nome: "Carne Pequeno", preco: 28.00 },
    { categoria: "Yakisobas", nome: "Camarão Grande", preco: 60.00 },
    { categoria: "Yakisobas", nome: "Camarão Pequeno", preco: 40.00 },
    { categoria: "Yakisobas", nome: "Vegetariano Grande", preco: 30.00 },
    { categoria: "Yakisobas", nome: "Vegetariano Pequeno", preco: 25.00 },
    { categoria: "Yakisobas", nome: "Especial Grande", preco: 55.00 },
    { categoria: "Combinados Salmão", nome: "Super Combo 2.0 (56 Peças)", preco: 110.00 },
    { categoria: "Combinados Salmão", nome: "Combo Nick (28 peças)", preco: 75.00 },
    { categoria: "Combinados Salmão", nome: "Combinado de Salmão (12 Peças)", preco: 35.00 },
    { categoria: "Combinados Salmão", nome: "Mix de Salmão (20 peças)", preco: 20.00 },
    { categoria: "Temakis", nome: "Temaki de Salmão Cru", preco: 23.00 },
    { categoria: "Temakis", nome: "Temaki Hot", preco: 28.00 },
    { categoria: "Temakis", nome: "Temaki de Salmão Grelhado", preco: 26.00 },
    { categoria: "Temakis", nome: "Temaki de Skin de Salmão", preco: 23.00 },
    { categoria: "Sushi", nome: "Sashimi de salmão", preco: 20.00 },
    { categoria: "Sushi", nome: "Niguiri de Salmão", preco: 22.00 },
    { categoria: "Sushi", nome: "Niguiri de Salmão Maçaricado", preco: 30.00 },
    { categoria: "Sushi", nome: "Uramaki Filadélfia!", preco: 25.00 },
    { categoria: "Sushi", nome: "Uramaki Skin", preco: 20.00 },
    { categoria: "Sushi", nome: "Hossomaki de Salmão", preco: 18.00 },
    { categoria: "Sushi", nome: "Kappa Maki", preco: 13.00 },
    { categoria: "Hot Roll", nome: "Barca de Hot Roll", preco: 52.00 },
    { categoria: "Hot Roll", nome: "Porção de Hot Roll", preco: 28.00 },
    { categoria: "Hot Roll", nome: "Porção de Mini Hot (10 Un.)", preco: 23.00 },
    { categoria: "Acompanhamentos", nome: "Porção de Shimeji!", preco: 22.00 },
    { categoria: "Acompanhamentos", nome: "Ceviche de Salmão!", preco: 30.00 },
    { categoria: "Acompanhamentos", nome: "Porção de Tilápia Empanada", preco: 26.00 },
    { categoria: "Acompanhamentos", nome: "Porção de Guioza! (6 Un.)", preco: 18.00 },
    { categoria: "Acompanhamentos", nome: "Meia porção de Guioza! (3 Un.)", preco: 11.00 },
    { categoria: "Acompanhamentos", nome: "Porção de Harumaki de Queijo!", preco: 18.00 },
    { categoria: "Acompanhamentos", nome: "Meia porção de Harumaki!", preco: 11.00 },
    { categoria: "Acompanhamentos", nome: "Harumaki de Legumes", preco: 12.00 },
    { categoria: "Sobremesa", nome: "Porção de Hot Banana!", preco: 16.00 },
    { categoria: "Bebidas", nome: "Coca-Cola Lata", preco: 6.00 },
    { categoria: "Bebidas", nome: "Coca-Cola Zero Lata", preco: 6.00 },
    { categoria: "Bebidas", nome: "Guaraná Antarctica Lata", preco: 5.00 },
    { categoria: "Bebidas", nome: "Coca-Cola 600ml", preco: 8.00 },
    { categoria: "Bebidas", nome: "Coca-Cola Sem Açúcar 600ml", preco: 8.00 },
    { categoria: "Bebidas", nome: "Coca 2 litros", preco: 16.00 },
    { categoria: "Adicionais", nome: "Molho Especial Sakura Tarê", preco: 15.00 },
    { categoria: "Adicionais", nome: "Hashi adicional", preco: 1.50 },
    { categoria: "Adicionais", nome: "Sachê de Tarê", preco: 1.00 },
    { categoria: "Adicionais", nome: "Sachê de shoyu", preco: 1.00 }
];

let carrinho = [];

function renderizarCardapio() {
    const container = document.getElementById('menu-container');
    let categoriaAtual = "";
    let htmlGrid = "";

    cardapio.forEach((item) => {
        if (item.categoria !== categoriaAtual) {
            if (categoriaAtual !== "") htmlGrid += `</div>`;
            categoriaAtual = item.categoria;
            htmlGrid += `<h3 class="categoria-titulo">${categoriaAtual}</h3><div class="grid-cardapio">`;
        }
        htmlGrid += `
            <button class="btn-produto" onclick="adicionarAoCarrinho('${item.nome}', ${item.preco})">
                <strong>${item.nome}</strong>
                <span>R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
            </button>
        `;
    });
    htmlGrid += `</div>`;
    container.innerHTML = htmlGrid;
}

window.adicionarAoCarrinho = function(nome, preco) {
    let itemExistente = carrinho.find(item => item.nome === nome && !item.observacao);
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({ nome: nome, preco: preco, quantidade: 1, observacao: "" });
    }
    atualizarTelaCarrinho();
}

window.alterarQuantidade = function(index, delta) {
    carrinho[index].quantidade += delta;
    if (carrinho[index].quantidade <= 0) {
        carrinho.splice(index, 1);
    }
    atualizarTelaCarrinho();
}

window.adicionarObservacao = function(index) {
    let obsAtual = carrinho[index].observacao || "";
    let novaObs = prompt(`Digite a observação para ${carrinho[index].nome}:`, obsAtual);
    if (novaObs !== null) { 
        carrinho[index].observacao = novaObs.trim();
        atualizarTelaCarrinho();
    }
}

window.toggleCarrinho = function() {
    const conteudo = document.getElementById('carrinho-conteudo');
    const seta = document.getElementById('seta-carrinho');
    const header = document.querySelector('.carrinho-header');

    if (conteudo.style.display === 'none') {
        conteudo.style.display = 'block';
        seta.style.transform = 'rotate(180deg)';
        header.classList.remove('fechado');
    } else {
        conteudo.style.display = 'none';
        seta.style.transform = 'rotate(0deg)';
        header.classList.add('fechado');
    }
};

function atualizarTelaCarrinho() {
    const painelCarrinho = document.getElementById('painel-carrinho');
    const lista = document.getElementById('lista-pedido');
    const resumoValores = document.getElementById('resumo-valores');
    const textoItens = document.getElementById('btn-texto-itens');
    const textoTotal = document.getElementById('btn-texto-total');
    
    if (carrinho.length === 0 || document.getElementById('tela-pedidos').style.display === 'none') {
        painelCarrinho.style.display = "none";
        document.body.style.paddingBottom = "20px";
        if (carrinho.length === 0) return; 
    } else {
        painelCarrinho.style.display = "flex";
        document.body.style.paddingBottom = "80px"; 
    }

    lista.innerHTML = "";
    let totalProdutos = 0;
    let totalItens = 0;

    carrinho.forEach((item, index) => {
        let subtotal = item.preco * item.quantidade;
        totalProdutos += subtotal;
        totalItens += item.quantidade;

        let obsHtml = item.observacao ? `<div class="item-obs-texto">Obs: ${item.observacao}</div>` : "";

        lista.innerHTML += `
            <li>
                <div class="item-info">
                    <div class="item-cabecalho">
                        <span class="item-nome">${item.nome}</span>
                        <button class="btn-obs" onclick="adicionarObservacao(${index})" title="Adicionar Observação">✏️</button>
                    </div>
                    ${obsHtml}
                    <span class="item-preco">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="controle-quantidade">
                    <button onclick="alterarQuantidade(${index}, -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
            </li>
        `;
    });

    const isEntrega = (tipoPedidoAtual === 'entrega');
    let totalGeral = totalProdutos;
    if (isEntrega) {
        totalGeral += taxaEntregaCalculada;
    }

    let textoResumo = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} - R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    resumoValores.innerText = textoResumo;
    textoItens.innerText = `Finalizar (${totalItens} ${totalItens === 1 ? 'item' : 'itens'})`;
    textoTotal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

document.getElementById('btn-imprimir').onclick = function() {
    abrirModalCheckout();
};

let checkoutValores = { subtotal: 0, frete: 0, desconto: 0, imposto: 0, total: 0 };

window.abrirModalCheckout = function() {
    const telefone = document.getElementById('telefone-cliente').value.trim();
    const nomeCliente = document.getElementById('nome-cliente').value.trim();
    const telApenasNumeros = telefone.replace(/\D/g, '');

    if (carrinho.length === 0) {
        alert("O carrinho está vazio! Adicione itens antes de finalizar.");
        return;
    }

    if (!telApenasNumeros && !nomeCliente) {
        alert("Por favor, preencha o NOME ou o TELEFONE para identificar o pedido.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    document.getElementById('modal-checkout').style.display = 'flex';
    
    const isEntrega = (tipoPedidoAtual === 'entrega');
    document.getElementById('checkout-frete').value = isEntrega ? taxaEntregaCalculada.toFixed(2) : "0.00";
    document.getElementById('checkout-desconto').value = "0.00";
    document.getElementById('checkout-imposto').value = "0.00";
    document.getElementById('novo-item-nome').value = "";
    document.getElementById('novo-item-valor').value = "";
    
    document.getElementById('checkout-pagamento').value = "Não Informado";
    document.getElementById('check-pedido-pago').checked = false;
    document.getElementById('checkout-troco-para').value = "";
    toggleOpcoesPagamento();

    renderizarItensCheckout();
}

window.fecharModalCheckout = function() {
    document.getElementById('modal-checkout').style.display = 'none';
}

window.toggleOpcoesPagamento = function() {
    const pagamento = document.getElementById('checkout-pagamento').value;
    const divPix = document.getElementById('div-pagamento-pix');
    const divDinheiro = document.getElementById('div-pagamento-dinheiro');

    divPix.style.display = 'none';
    divDinheiro.style.display = 'none';

    if (pagamento === 'Pix') {
        divPix.style.display = 'flex';
    } else if (pagamento === 'Dinheiro') {
        divDinheiro.style.display = 'grid';
    }
    calcularTroco();
}

window.calcularTroco = function() {
    const pagamento = document.getElementById('checkout-pagamento').value;
    if (pagamento !== 'Dinheiro') return;

    let trocoPara = parseFloat(document.getElementById('checkout-troco-para').value) || 0;
    let total = checkoutValores.total;
    let troco = trocoPara - total;

    if (troco < 0 || trocoPara === 0) troco = 0;
    
    document.getElementById('display-troco').innerText = `R$ ${troco.toFixed(2).replace('.', ',')}`;
}

window.renderizarItensCheckout = function() {
    const container = document.getElementById('checkout-itens');
    container.innerHTML = "";
    let subtotal = 0;
    
    carrinho.forEach((item, index) => {
        let itemSubtotal = item.preco * item.quantidade;
        subtotal += itemSubtotal;
        
        container.innerHTML += `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: var(--bg-color); padding: 10px; border: 1px solid var(--border-color); border-radius: 8px;">
                <div style="flex: 2; font-size: 14px; color: var(--text-main);">
                    <strong>${item.quantidade}x ${item.nome}</strong>
                    ${item.observacao ? `<br><small style="color: var(--text-muted);">Obs: ${item.observacao}</small>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 12px; color: var(--text-muted);">R$ (Un.)</span>
                    <input type="number" step="0.50" value="${item.preco.toFixed(2)}" 
                        onchange="atualizarPrecoItemCheckout(${index}, this.value)" 
                        style="width: 80px; padding: 8px; margin-bottom: 0; background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <button onclick="removerItemCheckout(${index})" style="background: none; border: none; color: #ff5252; cursor: pointer; font-size: 18px;" title="Remover item">🗑️</button>
            </div>
        `;
    });
    
    checkoutValores.subtotal = subtotal;
    document.getElementById('checkout-subtotal').value = subtotal.toFixed(2);
    calcularTotalCheckout();
}

window.atualizarPrecoItemCheckout = function(index, novoPrecoStr) {
    let novoPreco = parseFloat(novoPrecoStr);
    if (isNaN(novoPreco) || novoPreco < 0) novoPreco = 0;
    carrinho[index].preco = novoPreco;
    atualizarTelaCarrinho(); 
    renderizarItensCheckout();
}

window.removerItemCheckout = function(index) {
    carrinho.splice(index, 1);
    atualizarTelaCarrinho();
    if (carrinho.length === 0) {
        fecharModalCheckout();
    } else {
        renderizarItensCheckout();
    }
}

window.adicionarItemExtraCheckout = function() {
    const nome = document.getElementById('novo-item-nome').value.trim();
    let valor = parseFloat(document.getElementById('novo-item-valor').value);
    
    if (!nome) {
        alert("Digite um nome para o item extra.");
        return;
    }
    if (isNaN(valor)) valor = 0;
    
    carrinho.push({ nome: nome, preco: valor, quantidade: 1, observacao: "" });
    atualizarTelaCarrinho();
    document.getElementById('novo-item-nome').value = "";
    document.getElementById('novo-item-valor').value = "";
    renderizarItensCheckout();
}

window.calcularTotalCheckout = function() {
    let frete = parseFloat(document.getElementById('checkout-frete').value) || 0;
    let desconto = parseFloat(document.getElementById('checkout-desconto').value) || 0;
    let imposto = parseFloat(document.getElementById('checkout-imposto').value) || 0;
    
    checkoutValores.frete = frete;
    checkoutValores.desconto = desconto;
    checkoutValores.imposto = imposto;
    
    checkoutValores.total = checkoutValores.subtotal + frete + imposto - desconto;
    if (checkoutValores.total < 0) checkoutValores.total = 0;
    
    document.getElementById('checkout-total-final').innerText = `R$ ${checkoutValores.total.toFixed(2).replace('.', ',')}`;
    
    calcularTroco(); 
}

window.confirmarEImprimirCheckout = async function() {
    const telefone = document.getElementById('telefone-cliente').value.trim();
    const nomeCliente = document.getElementById('nome-cliente').value.trim();
    const isEntrega = (tipoPedidoAtual === 'entrega');
    
    const formaPagamento = document.getElementById('checkout-pagamento').value;
    const pedidoPagoPix = document.getElementById('check-pedido-pago').checked;
    const trocoParaVal = parseFloat(document.getElementById('checkout-troco-para').value) || 0;
    let trocoCalculado = trocoParaVal - checkoutValores.total;
    if (trocoCalculado < 0) trocoCalculado = 0;
    
    let enderecoCompleto = "";
    let cepParaSalvar = "";
    let ruaParaSalvar = "";
    let bairroParaSalvar = "";
    let numeroParaSalvar = "";
    let compParaSalvar = "";
    
    if (isEntrega) {
        cepParaSalvar = document.getElementById('end-cep').value.trim();
        ruaParaSalvar = document.getElementById('end-rua').value.trim();
        bairroParaSalvar = document.getElementById('end-bairro').value.trim();
        numeroParaSalvar = document.getElementById('end-numero').value.trim();
        compParaSalvar = document.getElementById('end-complemento').value.trim();
        
        if (ruaParaSalvar) {
            enderecoCompleto = `${ruaParaSalvar}, ${numeroParaSalvar || 'S/N'}`;
            if (compParaSalvar) enderecoCompleto += ` - ${compParaSalvar}`;
            if (bairroParaSalvar) enderecoCompleto += ` (${bairroParaSalvar})`;
            if (cepParaSalvar) enderecoCompleto += ` - CEP: ${cepParaSalvar}`;
        }
    }

    let itensParaSalvar = [];
    carrinho.forEach(item => {
        itensParaSalvar.push({
            nome: item.nome,
            quantidade: item.quantidade,
            observacao: item.observacao,
            preco: item.preco
        });
    });

    try {
        const dataAgora = new Date().toISOString();
        if (telefone.replace(/\D/g, '').length >= 10) {
            let clienteData = {
                nome: nomeCliente || "Sem Nome",
                ultimoPedido: dataAgora
            };
            if (isEntrega && ruaParaSalvar) {
                clienteData.cep = cepParaSalvar;
                clienteData.rua = ruaParaSalvar;
                clienteData.bairro = bairroParaSalvar;
                clienteData.numero = numeroParaSalvar || 'S/N';
                clienteData.complemento = compParaSalvar;
            }
            await db.collection("clientes").doc(telefone).set(clienteData, { merge: true });
        }

        await db.collection("pedidos").add({
            telefoneCliente: telefone || "Não informado",
            nomeCliente: nomeCliente || "Não informado",
            valorTotal: checkoutValores.total,
            subtotal: checkoutValores.subtotal,
            frete: checkoutValores.frete,
            desconto: checkoutValores.desconto,
            imposto: checkoutValores.imposto,
            pagamento: formaPagamento,
            pagoNoPix: pedidoPagoPix,
            trocoPara: trocoParaVal,
            valorTroco: trocoCalculado,
            itens: itensParaSalvar,
            endereco: enderecoCompleto, 
            data: dataAgora
        });
    } catch (error) {
        console.error(error);
    }

    let nomeRecibo = nomeCliente.length > 0 ? nomeCliente : "Cliente Não Informado";
    let telRecibo = telefone.replace(/\D/g, '').length >= 10 ? telefone : "Telefone Não Informado";
    let tipoPedido = isEntrega && enderecoCompleto ? "PEDIDO DE ENTREGA" : "PEDIDO DE RETIRADA";
    let dataAtual = new Date();
    let horarioFormatado = `${dataAtual.toLocaleDateString('pt-BR')} ${dataAtual.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;

    let htmlRecibo = `
        <div class="recibo-header">
            <h1>MASAYOSHI DELIVERY</h1>
            <p>${tipoPedido}</p>
        </div>
        <div class="recibo-cliente">
            <h2>${nomeRecibo}</h2>
            <p>${telRecibo}</p>
        </div>
        ${isEntrega && enderecoCompleto ? `
        <div class="recibo-endereco">
            <strong>ENDEREÇO DE ENTREGA:</strong><br>
            ${enderecoCompleto}
        </div>
        ` : ''}
        <div>
    `;

    carrinho.forEach(item => {
        let subtotalItem = item.preco * item.quantidade;
        htmlRecibo += `
            <div class="recibo-item">
                <div class="recibo-item-linha">
                    <span>${item.quantidade}x ${item.nome}</span>
                    <span>R$ ${subtotalItem.toFixed(2).replace('.', ',')}</span>
                </div>
                ${item.observacao ? `<span class="recibo-obs">" ${item.observacao} "</span>` : ''}
            </div>
        `;
    });

    htmlRecibo += `</div><div style="margin-top: 10px; padding: 10px 0; border-top: 1px dashed black;">`;
    
    if (checkoutValores.frete > 0) {
        htmlRecibo += `<div style="display:flex; justify-content:space-between; font-size: 14px; font-weight: bold; margin-bottom: 5px;"><span>Taxa de Entrega</span><span>R$ ${checkoutValores.frete.toFixed(2).replace('.', ',')}</span></div>`;
    }
    if (checkoutValores.imposto > 0) {
        htmlRecibo += `<div style="display:flex; justify-content:space-between; font-size: 14px; font-weight: bold; margin-bottom: 5px;"><span>Acréscimo/Extra</span><span>R$ ${checkoutValores.imposto.toFixed(2).replace('.', ',')}</span></div>`;
    }
    if (checkoutValores.desconto > 0) {
        htmlRecibo += `<div style="display:flex; justify-content:space-between; font-size: 14px; font-weight: bold; margin-bottom: 5px;"><span>Desconto</span><span>- R$ ${checkoutValores.desconto.toFixed(2).replace('.', ',')}</span></div>`;
    }

    htmlRecibo += `
        </div>
        <div class="recibo-total">
            <span>TOTAL A COBRAR</span>
            <strong>R$ ${checkoutValores.total.toFixed(2).replace('.', ',')}</strong>
        </div>
    `;

    htmlRecibo += `<div style="margin-top: 10px; padding: 10px 0; border-top: 2px dashed black; border-bottom: 2px dashed black; text-align: center;">`;
    htmlRecibo += `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">PAGAMENTO: ${formaPagamento}</div>`;
    
    if (formaPagamento === 'Pix' && pedidoPagoPix) {
        htmlRecibo += `<div style="font-size: 20px; font-weight: 900; border: 2px solid black; padding: 5px; margin-top: 8px; display: inline-block;">✅ JÁ PAGO (PIX)</div>`;
    } else if (formaPagamento === 'Dinheiro' && trocoParaVal > 0) {
        htmlRecibo += `<div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Troco para: R$ ${trocoParaVal.toFixed(2).replace('.', ',')}</div>`;
        htmlRecibo += `<div style="font-size: 18px; font-weight: 900; margin-top: 5px;">LEVAR TROCO: R$ ${trocoCalculado.toFixed(2).replace('.', ',')}</div>`;
    }
    htmlRecibo += `</div>`;

    htmlRecibo += `
        <div class="recibo-rodape">
            Horário do pedido: <br>${horarioFormatado}
        </div>
    `;

    document.getElementById('recibo-imprimir').innerHTML = htmlRecibo;
    window.print();

    carrinho = [];
    document.getElementById('nome-cliente').value = "";
    document.getElementById('telefone-cliente').value = "";
    document.getElementById('end-cep').value = "";
    document.getElementById('end-rua').value = "";
    document.getElementById('end-bairro').value = "";
    document.getElementById('end-numero').value = "";
    document.getElementById('end-complemento').value = "";
    document.getElementById('check-sem-numero').checked = false;
    document.getElementById('end-numero').disabled = false;
    zerarTaxa();

    fecharModalCheckout();
    mudarAba('retirada');
    
    const conteudo = document.getElementById('carrinho-conteudo');
    const seta = document.getElementById('seta-carrinho');
    const header = document.querySelector('.carrinho-header');
    conteudo.style.display = 'none';
    seta.style.transform = 'rotate(0deg)';
    header.classList.add('fechado');
    
    atualizarTelaCarrinho();
};