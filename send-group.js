require('dotenv').config();
const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require('baileys');
const { Boom } = require('@hapi/boom');
const fetchLoteriaJson = require('./loterias/get-loteria');
const premiumMin = 3000000;
const loteca = 'loteca';
const federal = 'federal';

const concursos = { 
    'MEGA_SENA': 'Mega-sena',
    'QUINA' : 'Quina',
    'LOTOFACIL' : 'Lotofácil',
    'LOTOMANIA' : 'Lotomania',
    'DIA_DE_SORTE' : 'Dia de Sorte',
    'DUPLA_SENA' : 'Dupla sena',
    'MAIS_MILIONARIA' : 'Mais Milionária',
    'LOTERIA_FEDERAL' : 'Loteria Federal',
    'LOTECA' : 'Loteca',
    'SUPER_SETE' : 'Super sete',
    'TIMEMANIA' : 'Timemania'
}

async function connectAndSendToGroup() {

    const mensagens = [];

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
  
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true
    });
  
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
  
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error instanceof Boom &&
           lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut);
        if (shouldReconnect) connectAndSendToGroup();
      }
  
      if (connection === 'open') {
        console.log('✅ Conectado com sucesso!\n');
  
        const groups = await sock.groupFetchAllParticipating();
  
        console.log('📋 Grupos disponíveis:');
        for (const [jid, group] of Object.entries(groups)) {
          console.log(`- ${group.subject} => ${jid}`);
        }

        const targetGroupJid = process.env.GRUPO_ALVO        
        const data = fetchLoteriaJson();
        if (!data) return;
        Object.entries(data).forEach(([nomeLoteria, value]) => {
            console.log(`Processando ${nomeLoteria}`);
            if(value.acumulado && checkpremium(value.valorEstimadoProximoConcurso)){
                mensagens.push(formatResult(value));
            }
        });

        await sendMsg(sock, targetGroupJid, mensagens);
        console.log(`✅ Mensagem enviada para o grupo ${targetGroupJid}`);
        process.exit(0);
      }
    });
}

async function sendMsg(sock, targetGroupJid, mensagens){
    for (const mensagem of mensagens) {
        try {
          await sock.sendMessage(targetGroupJid, { text: mensagem });
          console.log(`Mensagem enviada: ${mensagem}`);
        } catch (error) {
          console.error(`Erro ao enviar mensagem: ${mensagem}`, error);
        }
      }
}

function formatCurrency(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatResult(jogo, nomeLoteria, tipo = '') {
    if (!jogo || !jogo.numeroDoConcurso) return '';
    
    const name = concursos[jogo.tipoJogo];

    const dezenas = Array.isArray(jogo.dezenas)
      ? jogo.dezenas.join(', ')
      : 'N/A';
  
    const acumulado = jogo.acumulado ? 'Sim' : 'Não';
    const data = jogo.dataApuracao;
    const proxData = jogo.dataProximoConcurso;
    const estimativa = jogo.valorEstimadoProximoConcurso || 0;
    const premio = jogo.valorPremio || 0;
  
    let msg = `🟢 ${name} - Concurso ${jogo.numeroDoConcurso} (${data})\n`;
  
    if (nomeLoteria === federal) {
      msg += jogo.premios.map((p) =>
        `🏆 ${p.posicao}º prêmio: Bilhete ${p.bilhete} - ${formatCurrency(p.valorPremio)}`
      ).join('\n') + '\n';
    } else if (nomeLoteria === loteca) {
      msg += jogo.resultadoJogos.map((jogo) => {
        const gols = `${jogo.golsEquipeUm} x ${jogo.golsEquipeDois}`;
        return `${jogo.equipeUm} ${gols} ${jogo.equipeDois}`;
      }).join('\n') + '\n';
    } else {
      msg += `Dezenas: ${dezenas}\n`;
      msg += `Acumulado: ${acumulado}\n`;
      if (premio > 0) msg += `Premiação: ${formatCurrency(premio)}\n`;
      if (proxData) msg += `Estimativa próximo concurso (${proxData}): ${formatCurrency(estimativa)}\n`;
    }
    return msg;
  }

  function checkpremium(valuePremium){
    
    if(valuePremium < premiumMin){
        return false;
    }
    return true
  }

connectAndSendToGroup();
