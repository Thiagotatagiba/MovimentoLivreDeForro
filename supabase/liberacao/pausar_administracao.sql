-- INCIDENT/ROLLBACK ONLY. Not a migration and not part of normal activation.
-- Stops new administrative/VIP RPC calls without deleting any records or
-- changing public catalog/profile/favorite/ticket policies. In-flight calls
-- may finish. Re-enable only after reviewing the original explicit grants.
begin;
set local lock_timeout='5s';
do $vtf_pausa$
declare assinatura text;
begin
 for assinatura in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'salvar_rascunho_evento','publicar_evento','alterar_situacao_evento','alterar_membro_marca',
 'criar_convite_marca','revogar_convite_marca','aceitar_convite_marca',
 'limpar_entregas_convites','reservar_entrega_convite','iniciar_entrega_convite','finalizar_entrega_convite',
 'criar_lista_vip','encerrar_lista_vip','consultar_lista_vip','confirmar_data_lista_vip',
 'salvar_inscricao_vip','cancelar_inscricao_vip','corrigir_inscricao_vip','consultar_grupos_vip',
 'exportar_lista_vip','consultar_gestao_listas_vip','consultar_minha_inscricao_vip','consultar_lista_vip_evento') loop
  execute 'revoke execute on function '||assinatura||' from public,anon,authenticated,service_role';
 end loop;
end $vtf_pausa$;
commit;
