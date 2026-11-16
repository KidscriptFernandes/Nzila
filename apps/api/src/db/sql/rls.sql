-- RLS: leituras diretas com anon key (Realtime). Escritas passam sempre pela API.

create or replace function public.nzila_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_documents enable row level security;
alter table public.rides enable row level security;
alter table public.ride_events enable row level security;
alter table public.ratings enable row level security;
alter table public.places enable row level security;
alter table public.support_requests enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists profiles_staff_read on public.profiles;
create policy profiles_staff_read on public.profiles
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

-- clients
drop policy if exists clients_self_read on public.clients;
create policy clients_self_read on public.clients
for select to authenticated using (id = auth.uid());

drop policy if exists clients_staff_read on public.clients;
create policy clients_staff_read on public.clients
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

-- drivers / vehicles
drop policy if exists drivers_self_read on public.drivers;
create policy drivers_self_read on public.drivers
for select to authenticated using (id = auth.uid());

drop policy if exists drivers_staff_read on public.drivers;
create policy drivers_staff_read on public.drivers
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles
for select to authenticated using (
  driver_id = auth.uid() or public.nzila_role() in ('assistant', 'admin')
);

-- rides
drop policy if exists rides_client_read on public.rides;
create policy rides_client_read on public.rides
for select to authenticated using (client_id = auth.uid());

drop policy if exists rides_driver_read on public.rides;
create policy rides_driver_read on public.rides
for select to authenticated using (driver_id = auth.uid());

drop policy if exists rides_staff_read on public.rides;
create policy rides_staff_read on public.rides
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

-- ride_events
drop policy if exists ride_events_read on public.ride_events;
create policy ride_events_read on public.ride_events
for select to authenticated using (
  exists (
    select 1 from public.rides r
    where r.id = ride_events.ride_id
      and (
        r.client_id = auth.uid()
        or r.driver_id = auth.uid()
        or public.nzila_role() in ('assistant', 'admin')
      )
  )
);

-- ratings
drop policy if exists ratings_client_read on public.ratings;
create policy ratings_client_read on public.ratings
for select to authenticated using (client_id = auth.uid());

drop policy if exists ratings_driver_read on public.ratings;
create policy ratings_driver_read on public.ratings
for select to authenticated using (driver_id = auth.uid());

drop policy if exists ratings_staff_read on public.ratings;
create policy ratings_staff_read on public.ratings
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

-- places publicadas
drop policy if exists places_read on public.places;
create policy places_read on public.places
for select to authenticated using (published = true);

-- support
drop policy if exists support_self_read on public.support_requests;
create policy support_self_read on public.support_requests
for select to authenticated using (profile_id = auth.uid());

drop policy if exists support_staff_read on public.support_requests;
create policy support_staff_read on public.support_requests
for select to authenticated using (public.nzila_role() in ('assistant', 'admin'));

-- push tokens
drop policy if exists push_tokens_self_read on public.push_tokens;
create policy push_tokens_self_read on public.push_tokens
for select to authenticated using (profile_id = auth.uid());

-- Realtime: apenas tabelas necessárias (o app usa como gatilho e busca pela API)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rides'
    ) then
      alter publication supabase_realtime add table public.rides;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_requests'
    ) then
      alter publication supabase_realtime add table public.support_requests;
    end if;
  end if;
end;
$$;
