-- À exécuter UNE FOIS dans Supabase > SQL Editor (après migration3.sql)
create table notes(id uuid primary key default gen_random_uuid(),eleve_id uuid references eleves on delete cascade,sequence int check(sequence between 1 and 6),moyenne numeric check(moyenne between 0 and 20),rang int,created_at timestamptz default now(),unique(eleve_id,sequence));
alter table notes enable row level security;
create policy auth_all on notes for all to authenticated using(true) with check(true);
create trigger a_notes after insert or update on notes for each row execute function audit();
