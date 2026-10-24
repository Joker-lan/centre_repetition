-- Colle tout ce script dans Supabase > SQL Editor > Run
create table profiles(id uuid primary key references auth.users on delete cascade,email text,nom text,role text default 'admin',must_change boolean default true,created_at timestamptz default now());
create table classes(id uuid primary key default gen_random_uuid(),nom text not null,niveau text,created_at timestamptz default now());
create table enseignants(id uuid primary key default gen_random_uuid(),nom text not null,telephone text,matiere text,taux_horaire numeric default 0,actif boolean default true,created_at timestamptz default now());
create table eleves(id uuid primary key default gen_random_uuid(),nom text not null,telephone text,classe_id uuid references classes on delete set null,frais_inscription numeric default 2000,mensualite numeric default 10000,actif boolean default true,created_at timestamptz default now());
create table depenses(id uuid primary key default gen_random_uuid(),nom text not null,montant numeric not null,description text,date date default current_date,auteur text,created_at timestamptz default now());
create table paiements(id uuid primary key default gen_random_uuid(),eleve_id uuid references eleves on delete cascade,type text check(type in('inscription','mensualite')),montant numeric not null,mois int default 0 check(mois between 0 and 6),date date default current_date,echeance date,recu_par text,created_at timestamptz default now());
create table seances(id uuid primary key default gen_random_uuid(),classe_id uuid references classes on delete cascade,enseignant_id uuid references enseignants on delete set null,date date,debut time,fin time,duree numeric,created_at timestamptz default now());
create table presences(id uuid primary key default gen_random_uuid(),seance_id uuid references seances on delete cascade,eleve_id uuid references eleves on delete cascade,present boolean,created_at timestamptz default now());
create table audit_log(id bigserial primary key,created_at timestamptz default now(),user_email text,tab text,action text,row_data jsonb);

create function audit() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into audit_log(user_email,tab,action,row_data) values(auth.jwt()->>'email',tg_table_name,tg_op,to_jsonb(new)); return new; end $$;
create function is_super() returns boolean language sql security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='superadmin') $$;
create function pw_done() returns void language sql security definer set search_path=public as $$ update profiles set must_change=false where id=auth.uid() $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email,nom) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'nom',new.email)); return new; end $$;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();

do $$ declare t text; begin
foreach t in array array['classes','enseignants','eleves','depenses','paiements','seances','presences'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy auth_all on %I for all to authenticated using(true) with check(true)',t);
end loop;
foreach t in array array['classes','enseignants','eleves','depenses','paiements','seances','profiles'] loop
 execute format('create trigger a_%1$s after insert or update on %1$s for each row execute function audit()',t);
end loop; end $$;

alter table profiles enable row level security;
create policy p_sel on profiles for select to authenticated using(true);
create policy p_upd on profiles for update to authenticated using(is_super()) with check(is_super());
create policy p_del on profiles for delete to authenticated using(is_super());
alter table audit_log enable row level security;
create policy al_sel on audit_log for select to authenticated using(true);
-- Après avoir créé ton 1er utilisateur (Authentication > Users) :
-- update profiles set role='superadmin' where email='TON_EMAIL';
