-- Sequências legíveis usadas pela API
create sequence if not exists public.driver_code_seq start 1;
create sequence if not exists public.ride_ref_seq start 1;

-- updated_at automático
create or replace function public.nzila_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
before update on public.profiles
for each row execute function public.nzila_touch_updated_at();

drop trigger if exists rides_touch on public.rides;
create trigger rides_touch
before update on public.rides
for each row execute function public.nzila_touch_updated_at();

drop trigger if exists drivers_touch on public.drivers;
create trigger drivers_touch
before update on public.drivers
for each row execute function public.nzila_touch_updated_at();
