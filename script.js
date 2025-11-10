document.addEventListener('DOMContentLoaded', () => {

    // --- Constantes e Estado da Aplicação ---
    const META_HORAS = 75.0;
    const STORAGE_KEY = 'gerenciadorHorasState_v3';
    
    // Base de Dados
    const atividadesData = {
        '0.0': {nome: 'Lista de Chamada em sala', limite: Infinity, lancado: 0.0},
        '1.1': {nome: 'Plantões de Atendimento', limite: Infinity, lancado: 0.0},
        '1.2': {nome: 'Petições Judiciais Reais', limite: Infinity, lancado: 0.0},
        '1.3': {nome: 'Audiências judiciais NPJ', limite: Infinity, lancado: 0.0},
        '1.4': {nome: 'Análise de Autos', limite: Infinity, lancado: 0.0},
        '1.5': {nome: 'Visitas externas orientadas', limite: Infinity, lancado: 0.0},
        '1.6': {nome: 'Ações Sociais', limite: Infinity, lancado: 0.0},
        '1.7': {nome: 'Diligências processuais', limite: 30.0, lancado: 0.0},
        '1.8': {nome: 'Atividades de Conciliação', limite: Infinity, lancado: 0.0},
        '2.1': {nome: 'Redação de Petições Simuladas', limite: 10.0, lancado: 0.0},
        '2.2': {nome: 'Frequência atividades letivas', limite: Infinity, lancado: 0.0},
        '2.3': {nome: 'Projetos de Extensão', limite: Infinity, lancado: 0.0},
        '2.4': {nome: 'Frequência práticas orientadas', limite: 20.0, lancado: 0.0},
        '2.5': {nome: 'Audiências (instrução, etc)', limite: 10.0, lancado: 0.0},
        '2.6': {nome: 'Audiências (conciliação, etc)', limite: 20.0, lancado: 0.0},
        '2.7': {nome: 'Juri Popular', limite: 20.0, lancado: 0.0},
        '2.8': {nome: 'Cursos on line / eventos externos', limite: 35.0, lancado: 0.0},
        '2.9': {nome: 'Estágios fora da IES (relatório)', limite: 75.0, lancado: 0.0},
        '2.10': {nome: 'Atividade Profissional Pertinente', limite: 35.0, lancado: 0.0},
        '2.11': {nome: 'Cursos Ext., SEMEX, Aula Magna', limite: Infinity, lancado: 0.0},
        '2.12': {nome: 'Webnários Universo', limite: Infinity, lancado: 0.0},
        '2.13': {nome: 'Monitoria', limite: 50.0, lancado: 0.0},
        '3.1': {nome: 'Plantões presenciais preceptoria', limite: Infinity, lancado: 0.0},
        '3.2': {nome: 'Pesquisas, cinema jurídico, etc', limite: Infinity, lancado: 0.0},
        '3.3': {nome: 'Laboratório ENADE', limite: Infinity, lancado: 0.0},
    };

    // Variáveis de estado
    let totalHoras = 0.0;
    let selectedActivityId = null;
    let historicoVazio = true;

    // Referências aos Elementos do DOM
    const kpiTotalHoras = document.getElementById('kpi-total-horas');
    const kpiNotaAtual = document.getElementById('kpi-nota-atual');
    const kpiHorasFaltantes = document.getElementById('kpi-horas-faltantes');
    const tabelaCorpo = document.getElementById('tabela-corpo');
    const formLancamento = document.getElementById('form-lancamento');
    const inputHoras = document.getElementById('input-horas');
    const historicoLista = document.getElementById('historico-lista');
    const placeholderHistorico = document.querySelector('.historico-placeholder');

    
    // --- Funções de Salvar e Carregar ---

    /**
     * Salva o estado atual da aplicação no localStorage.
     */
    function salvarDados() {
        const saveState = {
            atividades: {},
            total: totalHoras,
            historicoHTML: historicoLista.innerHTML,
            historicoVazio: historicoVazio
        };

        // Salva apenas o 'lancado' de cada atividade
        for (const id in atividadesData) {
            saveState.atividades[id] = { lancado: atividadesData[id].lancado };
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    }

    /**
     * Carrega os dados salvos do localStorage ao iniciar.
     */
    function carregarDados() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (savedData) {
            try {
                const loadedState = JSON.parse(savedData);

                if (!loadedState.atividades || loadedState.total === undefined) {
                    console.error("Dados salvos corrompidos. Ignorando.");
                    localStorage.removeItem(STORAGE_KEY);
                    return;
                }

                // Atualiza as variáveis de estado globais
                totalHoras = loadedState.total;
                historicoLista.innerHTML = loadedState.historicoHTML;
                historicoVazio = loadedState.historicoVazio;

                // Restaura o 'lancado' em cada atividade
                // Esta abordagem garante robustez se a 'atividadesData' for atualizada no futuro
                for (const id in atividadesData) {
                    if (loadedState.atividades[id]) {
                        atividadesData[id].lancado = loadedState.atividades[id].lancado;
                    }
                }
                
                if (!historicoVazio) {
                     const placeholder = historicoLista.querySelector('.historico-placeholder');
                     if (placeholder) placeholder.remove();
                }

            } catch (error) {
                console.error("Erro ao carregar dados salvos (JSON inválido):", error);
                localStorage.removeItem(STORAGE_KEY); // Limpa dados corrompidos
            }
        }
    }


    // --- Funções Principais ---

    function popularTabela() {
        tabelaCorpo.innerHTML = '';
        for (const id in atividadesData) {
            const data = atividadesData[id];
            const limiteStr = data.limite === Infinity ? 'Livre' : `${data.limite.toFixed(1)}h`;
            
            const tr = document.createElement('tr');
            tr.dataset.id = id;
            tr.innerHTML = `
                <td>${id}</td>
                <td>${data.nome}</td>
                <td data-tipo="lancado">${data.lancado.toFixed(1)}h</td>
                <td>${limiteStr}</td>
            `;
            tr.addEventListener('click', () => selecionarLinha(tr, id));
            tabelaCorpo.appendChild(tr);
        }
    }

    function selecionarLinha(linha, id) {
        const linhas = tabelaCorpo.querySelectorAll('tr');
        linhas.forEach(l => l.classList.remove('selected'));
        
        linha.classList.add('selected');
        selectedActivityId = id;
    }

    function adicionarAtividade(event) {
        event.preventDefault(); 
        
        if (!selectedActivityId) {
            alert("Por favor, selecione uma atividade na tabela primeiro.");
            return;
        }

        const horasAdicionadas = parseFloat(inputHoras.value);
        if (isNaN(horasAdicionadas) || horasAdicionadas <= 0) {
            alert("Valor de horas inválido. Use um número maior que zero.");
            return;
        }

        const infoAtividade = atividadesData[selectedActivityId];
        let horasAContar = horasAdicionadas;

        if ((infoAtividade.lancado + horasAdicionadas) > infoAtividade.limite) {
            const horasRemanescentes = infoAtividade.limite - infoAtividade.lancado;
            
            if (horasRemanescentes <= 0) {
                alert(`Limite atingido para "${infoAtividade.nome}". Nenhuma hora nova será adicionada.`);
                return;
            }

            const resposta = confirm(
                `Limite excedido!\n\n` +
                `Está a tentar adicionar ${horasAdicionadas}h, mas o limite é ${infoAtividade.limite}h (já lançou ${infoAtividade.lancado}h).\n\n` +
                `Apenas ${horasRemanescentes.toFixed(1)}h (o restante) serão contabilizadas.\n\n` +
                `Deseja continuar?`
            );
            
            if (resposta) {
                horasAContar = horasRemanescentes;
            } else {
                return;
            }
        }
        
        infoAtividade.lancado += horasAContar;
        totalHoras += horasAContar;

        atualizarLinhaTabela(selectedActivityId, infoAtividade.lancado);
        adicionarAoHistorico(infoAtividade.nome, horasAContar);
        atualizarProgressoUI();
        
        inputHoras.value = "1.0";

        // Salva os dados após cada adição bem-sucedida
        salvarDados();
    }

    function atualizarLinhaTabela(id, novoValor) {
        const linha = tabelaCorpo.querySelector(`tr[data-id="${id}"]`);
        if (linha) {
            const celula = linha.querySelector('td[data-tipo="lancado"]');
            celula.textContent = `${novoValor.toFixed(1)}h`;
        }
    }

    function adicionarAoHistorico(nome, horas) {
        if (historicoVazio) {
            historicoLista.innerHTML = '';
            historicoVazio = false;
        }

        const dataStr = new Date().toLocaleDateString('pt-BR');
        const p = document.createElement('p');
        p.textContent = `[${dataStr}] +${horas.toFixed(1)}h - ${nome}`;
        
        historicoLista.appendChild(p);
        historicoLista.scrollTop = historicoLista.scrollHeight;
    }

    function calcularNota(horas) {
        if (horas < 75) return "Zero"; // Mínimo para aprovação
        if (horas <= 81) return "5.5";
        if (horas <= 87) return "6.0";
        if (horas <= 93) return "6.5";
        if (horas <= 99) return "7.0";
        if (horas <= 106) return "7.5";
        if (horas <= 112) return "8.0";
        if (horas <= 118) return "8.5";
        if (horas <= 124) return "9.0";
        if (horas <= 130) return "9.5";
        return "10.0";
    }

    function atualizarProgressoUI() {
        const nota = calcularNota(totalHoras);
        const horasFaltantes = Math.max(0, META_HORAS - totalHoras);

        kpiTotalHoras.textContent = totalHoras.toFixed(1);
        kpiNotaAtual.textContent = nota;
        kpiHorasFaltantes.textContent = horasFaltantes.toFixed(1);
    }


    // --- Inicialização ---
    
    carregarDados();        // 1. Carrega os dados salvos (se existirem)
    popularTabela();        // 2. Preenche a tabela (com dados salvos)
    atualizarProgressoUI(); // 3. Atualiza os KPIs (com dados salvos)
    
    // 4. Define o 'ouvinte' do formulário
    formLancamento.addEventListener('submit', adicionarAtividade);

});
