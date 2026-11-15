-- The platform's event trigger is not an application RPC. Keep the trigger
-- and its definition intact; remove only unnecessary client EXECUTE grants.
do $$
declare f oid:=to_regprocedure('public.rls_auto_enable()');
begin
 if f is not null then
  if (select prorettype from pg_proc where oid=f)<>'event_trigger'::regtype then
   raise exception 'funcao_auto_rls_inesperada' using errcode='22023';
  end if;
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
