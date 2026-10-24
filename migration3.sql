-- À exécuter UNE FOIS dans Supabase > SQL Editor (après migration2.sql)
drop policy if exists al_sel on audit_log;
create policy al_sel on audit_log for select to authenticated using(is_super());
create policy al_del on audit_log for delete to authenticated using(is_super());
