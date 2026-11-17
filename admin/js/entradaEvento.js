export const TIPOS_ENTRADA=['Gratuito','Ingresso Online','Ingresso no Local','Cover'];
export function estadoTipoEntrada(valor=''){
 return !valor||TIPOS_ENTRADA.includes(valor)?{opcao:valor,outro:''}:{opcao:'__outro__',outro:valor};
}
export function lerTipoEntrada(opcao,outro=''){return opcao==='__outro__'?outro:opcao;}
