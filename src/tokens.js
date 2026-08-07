// Tokens de design, copiados verbatim do protótipo do handoff
// (design_handoff_diario_cefaleia/"Diário da Cefaléia - App.dc.html", linhas 152-161).

export const INT = {
  'Leve': {
    grad: 'linear-gradient(180deg,#5ee6a8,#30d158)', fg: '#04250f',
    sh: '0 3px 10px rgba(48,209,88,.45),inset 1px 1px 1px rgba(255,255,255,.5)',
    dot: '#30d158', glow: 'rgba(48,209,88,.6)',
    chipFg: '#a9f0cd', chipBg: 'rgba(48,209,88,.15)', chipBd: '.5px solid rgba(48,209,88,.3)',
  },
  'Moderada': {
    grad: 'linear-gradient(180deg,#ffc94d,#ff9f0a)', fg: '#1a1200',
    sh: '0 3px 10px rgba(255,159,10,.45),inset 1px 1px 1px rgba(255,255,255,.5)',
    dot: '#ff9f0a', glow: 'rgba(255,159,10,.6)',
    chipFg: '#ffd9a3', chipBg: 'rgba(255,159,10,.16)', chipBd: '.5px solid rgba(255,159,10,.3)',
  },
  'Intensa': {
    grad: 'linear-gradient(180deg,#ff6961,#ff453a)', fg: '#fff',
    sh: '0 3px 10px rgba(255,69,58,.45),inset 1px 1px 1px rgba(255,255,255,.4)',
    dot: '#ff453a', glow: 'rgba(255,69,58,.7)',
    chipFg: '#ffb5b0', chipBg: 'rgba(255,69,58,.16)', chipBd: '.5px solid rgba(255,69,58,.3)',
  },
}

export const GATCHIP = {
  'Estresse': { fg: '#a9f0cd', bg: 'rgba(48,209,88,.15)', bd: '.5px solid rgba(48,209,88,.3)' },
  'Mudança climática': { fg: '#b8e4fd', bg: 'rgba(56,189,248,.15)', bd: '.5px solid rgba(56,189,248,.3)' },
  'Alimentação': { fg: '#ffd9a3', bg: 'rgba(255,159,10,.16)', bd: '.5px solid rgba(255,159,10,.3)' },
}

// Paleta do alívio na tela de crise em andamento (protótipo linha 258).
const VERDE = { grad: 'linear-gradient(180deg,#5ee6a8,#30d158)', fg: '#04250f', sh: '0 3px 10px rgba(48,209,88,.4)' }
export const ALIVIO_PAL = {
  'Não': { grad: 'linear-gradient(180deg,#ff6961,#ff453a)', fg: '#fff', sh: '0 3px 10px rgba(255,69,58,.4)' },
  'Parcial': VERDE,
  'Total': VERDE,
}

export const INTENSIDADES = ['Leve', 'Moderada', 'Intensa']
export const LOCALIZACOES = ['Esq.', 'Dir.', 'Bilateral']
export const CARATERES = ['Pulsátil', 'Pressão']
export const ALIVIOS = ['Não', 'Parcial', 'Total']
export const SINTOMAS = ['Náusea', 'Vômito', 'Fotofobia', 'Fonofobia', 'Aura']

// [rótulo exibido, valor gravado, placeholder do detalhe].
// O iOS guarda só a chave curta; o placeholder ensina a separar por vírgula, que é o
// que torna os itens comparáveis entre crises sem nenhuma heurística de linguagem.
export const GATILHOS = [
  ['Estresse (prova, escola)', 'Estresse', 'Ex.: prova, briga, apresentação'],
  ['Alimentação (pulou refeição)', 'Alimentação', 'Ex.: leite, chocolate, queijo'],
  ['Mudança climática', 'Mudança climática', 'Ex.: calor forte, chuva, frente fria'],
]

export const FORM_PADRAO = {
  intensidade: 'Moderada', localizacao: 'Bilateral', carater: 'Pulsátil',
  sintomas: [], sono_horas: 8, gatilhos: [], detalhes: {}, medicacao: '',
}

/** "alho, frango,, batata " -> ["alho","frango","batata"] */
export const itensDe = (texto) =>
  (texto ?? '').split(',').map((s) => s.trim()).filter(Boolean)
