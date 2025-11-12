document.addEventListener('DOMContentLoaded', () => {

    // --- Constantes e Estado da Aplicação ---
    const META_HORAS = 75.0;
    // (NOVO) Chave para salvar no localStorage.
    // Mudar isto (ex: 'v4') "reseta" os dados salvos se precisarmos.
    const STORAGE_KEY = 'gerenciadorHorasState_v3';
    
    // Base de Dados (A estrutura padrão)
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

    // Variáveis de estado (serão substituídas pelos dados salvos, se existirem)
    let totalHoras = 0.0;
    let selectedActivityId = null;
    let historicoVazio = true;

    // Referências aos Elementos do DOM (KPIs)
    const kpiTotalHoras = document.getElementById('kpi-total-horas');
    const kpiNotaAtual = document.getElementById('kpi-nota-atual');
    const kpiHorasFaltantes = document.getElementById('kpi-horas-faltantes');

    // Referências antigas
    const tabelaCorpo = document.getElementById('tabela-corpo');
    const formLancamento = document.getElementById('form-lancamento');
    const inputHoras = document.getElementById('input-horas');
    const historicoLista = document.getElementById('historico-lista');
    const placeholderHistorico = document.querySelector('.historico-placeholder');
    const btnZerar = document.getElementById('btn-zerar');

    
    // --- (NOVO) Funções de Salvar e Carregar ---

    /**
     * (NOVO) Salva o estado atual da aplicação no localStorage.
     */
    function salvarDados() {
        // Criamos um objeto de "estado" para salvar
        const saveState = {
            atividades: {}, // Salvamos apenas o 'lancado'
            total: totalHoras,
            historicoHTML: historicoLista.innerHTML,
            historicoVazio: historicoVazio
        };

        // Itera sobre os dados para salvar apenas o 'lancado' (mais eficiente)
        for (const id in atividadesData) {
            saveState.atividades[id] = { lancado: atividadesData[id].lancado };
        }
        
        // Converte o objeto para JSON (string) e salva
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    }


    /**
     * Zera todas as horas lançadas (em todas as atividades) e limpa o histórico.
     * Confirma a ação com o usuário antes de executar.
     */
    function zerarTodasHoras() {
        const confirma = confirm('Tem certeza que deseja zerar todas as horas lançadas e limpar o histórico? Esta ação não pode ser desfeita.');
        if (!confirma) return;

        // Zera o campo 'lancado' em todas as atividades
        for (const id in atividadesData) {
            atividadesData[id].lancado = 0.0;
        }

        // Zera total
        totalHoras = 0.0;

        // Limpa o histórico e mostra placeholder
        historicoLista.innerHTML = '<p class="historico-placeholder">Nenhuma atividade lançada ainda.</p>';
        historicoVazio = true;

        // Atualiza UI
        popularTabela();
        atualizarProgressoUI();

        // Salva estado
        salvarDados();
    }


    /**
     * Adiciona um listener de exclusão a todos os botões do histórico.
     * Chamado ao carregar os dados e após criar novos itens no histórico.
     */
    function attachHistoricoDeleteHandlers() {
        const buttons = historicoLista.querySelectorAll('.btn-delete');
        buttons.forEach(btn => {
            // Removemos antes para prevenir listeners duplicados
            btn.removeEventListener('click', onClickExcluir);
            btn.addEventListener('click', onClickExcluir);
        });
    }

    /**
     * Handler para o clique do botão de excluir em um lançamento do histórico.
     * Lê os data-attributes (id e horas), confirma a ação, atualiza os dados
     * (subtrai horas da atividade e do total), atualiza UI e salva.
     */
    function onClickExcluir(event) {
        const btn = event.currentTarget;
        const entry = btn.closest('.historico-entry');
        if (!entry) return;

        // Primeiro tentamos ler os data-attributes (padrão novo)
        let atividadeId = btn.dataset.id;
        let horasStr = btn.dataset.horas;

        // Fallback: se não houver data-attributes (entradas antigas), tentamos
        // extrair do texto dentro do próprio item do histórico.
        if (!atividadeId || !horasStr) {
            const text = entry.textContent || '';

            // Tenta extrair horas com regex, exemplo: "+1.0h" ou "+1,0h"
            const horasMatch = text.match(/\+\s?(\d+[\.,]?\d*)\s?h/);
            if (horasMatch) {
                horasStr = horasMatch[1].replace(',', '.');
            }

            // Tenta extrair o nome da atividade após o separador "- "
            const nomeMatch = text.split('-').pop();
            if (nomeMatch) {
                const nome = nomeMatch.trim();
                // Procura pelo id correspondente no objeto atividadesData
                for (const id in atividadesData) {
                    if (atividadesData[id].nome === nome) {
                        atividadeId = id;
                        break;
                    }
                }
            }
        }

        const horasRemov = parseFloat(horasStr);

        if (!atividadeId || isNaN(horasRemov)) {
            alert('Não foi possível identificar corretamente a atividade ou as horas deste lançamento. A exclusão que reverte horas não pode ser realizada.');
            return;
        }

        const infoAtividade = atividadesData[atividadeId];
        if (!infoAtividade) {
            alert('Atividade não encontrada.');
            return;
        }

        const confirma = confirm(`Deseja realmente remover ${horasRemov.toFixed(1)}h lançadas para "${infoAtividade.nome}"? Esta ação irá subtrair essas horas.`);
        if (!confirma) return;

        // Subtrai as horas da atividade e do total (proteção para não ficar negativo)
        const atualLancado = infoAtividade.lancado;
        const subtrair = Math.min(horasRemov, atualLancado);
        infoAtividade.lancado = Math.max(0, atualLancado - subtrair);

        totalHoras = Math.max(0, totalHoras - subtrair);

        // Remove a linha da lista de histórico
        entry.remove();

        // Se ficou vazio, mostra placeholder
        if (!historicoLista.querySelector('.historico-entry')) {
            historicoLista.innerHTML = '<p class="historico-placeholder">Nenhuma atividade lançada ainda.</p>';
            historicoVazio = true;
        }

        // Atualiza tabela, KPIs e salva
        atualizarLinhaTabela(atividadeId, infoAtividade.lancado);
        atualizarProgressoUI();
        salvarDados();
    }

    /**
     * (NOVO) Carrega os dados salvos do localStorage ao iniciar.
     */
    function carregarDados() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (savedData) {
            try {
                const loadedState = JSON.parse(savedData);

                // Verifica se os dados são válidos
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
                // Esta abordagem garante que se atualizarmos a 'atividadesData'
                // (ex: mudar um nome), os dados salvos não quebram a app.
                for (const id in atividadesData) {
                    if (loadedState.atividades[id]) {
                        atividadesData[id].lancado = loadedState.atividades[id].lancado;
                    }
                }
                
                // Remove o placeholder do histórico se ele não estiver vazio
                    if (!historicoVazio) {
                        const placeholder = historicoLista.querySelector('.historico-placeholder');
                        if (placeholder) placeholder.remove();
                    }

                    // Reanexa os handlers de exclusão aos botões do histórico (se existirem)
                    // (listeners serão anexados pela função declarada mais abaixo)
                    attachHistoricoDeleteHandlers();

            } catch (error) {
                console.error("Erro ao carregar dados salvos (JSON inválido):", error);
                localStorage.removeItem(STORAGE_KEY); // Limpa dados corrompidos
            }
        }
    }


    // --- Funções Principais (Sem grandes mudanças) ---

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
    adicionarAoHistorico(selectedActivityId, infoAtividade.nome, horasAContar);
        atualizarProgressoUI();
        
        inputHoras.value = "1.0";

        // (NOVO) Salva os dados após cada adição bem-sucedida
        salvarDados();
    }

    function atualizarLinhaTabela(id, novoValor) {
        const linha = tabelaCorpo.querySelector(`tr[data-id="${id}"]`);
        if (linha) {
            const celula = linha.querySelector('td[data-tipo="lancado"]');
            celula.textContent = `${novoValor.toFixed(1)}h`;
        }
    }

    function adicionarAoHistorico(id, nome, horas) {
        if (historicoVazio) {
            historicoLista.innerHTML = '';
            historicoVazio = false;
        }

        const dataStr = new Date().toLocaleDateString('pt-BR');

        // Container do item do histórico (texto + botão)
        const div = document.createElement('div');
        div.className = 'historico-entry';

        const span = document.createElement('span');
        span.textContent = `[${dataStr}] +${horas.toFixed(1)}h - ${nome}`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-delete';
        btn.textContent = 'Remover';
        // Informações necessárias para reverter o lançamento
        btn.dataset.id = id;
        btn.dataset.horas = horas.toFixed(1);

        div.appendChild(span);
        div.appendChild(btn);

        historicoLista.appendChild(div);
        historicoLista.scrollTop = historicoLista.scrollHeight;

        // Anexa o listener apenas para este botão
        btn.addEventListener('click', onClickExcluir);
    }

    function calcularNota(horas) {
        if (horas < 75) return "Zero"; // Corresponde à nota 0 (Zero) ou 5.0 (MINIMO)
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


    // --- (ATUALIZADO) Inicialização ---
    
    carregarDados();        // 1. Carrega os dados salvos (se existirem)
    popularTabela();        // 2. Preenche a tabela (agora com dados salvos)
    atualizarProgressoUI(); // 3. Atualiza os KPIs (com dados salvos)
    
    // 4. Define o 'ouvinte' do formulário
    formLancamento.addEventListener('submit', adicionarAtividade);
    // 5. Ouvinte do botão zerar
    if (btnZerar) btnZerar.addEventListener('click', zerarTodasHoras);

});
