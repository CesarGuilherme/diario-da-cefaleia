// Encadeia escritas: cada uma espera a anterior confirmar, então dois cliques rápidos
// não se sobrescrevem. Espelha a fila de Task do iOS (CriseAndamentoView.alternarSintoma).
// Fora do useCrises de propósito: aqui é código puro, testável sem o cliente do Supabase.
export function serial() {
  let fila = Promise.resolve()
  return (fn) => (fila = fila.then(fn, fn))
}
