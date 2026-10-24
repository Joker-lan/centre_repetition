-- À exécuter UNE FOIS dans Supabase > SQL Editor (après migration.sql)
alter table paiements add column if not exists mois_debut text;
update paiements set mois_debut=to_char(date,'YYYY-MM') where type='mensualite' and mois_debut is null;

create or replace function mk_user(uname text,fname text,pw text,rl text) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=gen_random_uuid(); em text:=lower(uname)||'@centre-gestion.com';
begin
 if exists(select 1 from profiles where lower(username)=lower(uname)) then raise exception 'Nom d''utilisateur déjà pris'; end if;
 insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
 values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',em,extensions.crypt(pw,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('nom',fname,'username',lower(uname)),now(),now(),'','','','');
 insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
 values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',em),'email',now(),now(),now());
 update profiles set role=rl,must_change=true where id=uid;
end $$;
revoke all on function mk_user(text,text,text,text) from public,anon,authenticated;

create or replace function admin_create(uname text,fname text,pw text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_super() then raise exception 'interdit'; end if; perform mk_user(uname,fname,pw,'admin'); end $$;
create or replace function needs_setup() returns boolean language sql security definer set search_path=public as $$ select not exists(select 1 from profiles where role='superadmin') $$;
create or replace function setup_super(uname text,fname text,pw text) returns void language plpgsql security definer set search_path=public as $$
begin if exists(select 1 from profiles where role='superadmin') then raise exception 'interdit'; end if; perform mk_user(uname,fname,pw,'superadmin'); end $$;
grant execute on function needs_setup() to anon,authenticated;
grant execute on function setup_super(text,text,text) to anon;
grant execute on function admin_create(text,text,text) to authenticated;
