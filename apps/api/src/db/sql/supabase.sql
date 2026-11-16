-- Executar apenas em projetos Supabase (requer schema auth).
-- A API usa a service role; o RLS protege leituras diretas (Realtime/anon key).

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, whatsapp, role, locale, consent_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    'client',
    coalesce(new.raw_user_meta_data ->> 'locale', 'pt-AO'),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end
  )
  on conflict (id) do nothing;

  insert into public.clients (id, nationality, arrival_date, hotel)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'nationality', ''),
    nullif(new.raw_user_meta_data ->> 'arrival_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'hotel', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
