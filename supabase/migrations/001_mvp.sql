-- Duhat Gen Sticker MVP schema.
-- Apply with the Supabase CLI or SQL editor using an administrative role.

create extension if not exists pgcrypto;

create table if not exists public.source_images (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null unique,
    mime_type text not null,
    byte_size bigint not null check (byte_size > 0),
    checksum_sha256 text not null check (length(checksum_sha256) = 64),
    status text not null check (status in ('ready', 'rejected', 'deleted')),
    created_at timestamptz not null default now()
);

create index if not exists source_images_owner_created_idx
    on public.source_images(owner_id, created_at desc);

create table if not exists public.consent_records (
    id uuid primary key default gen_random_uuid(),
    source_image_id uuid not null unique references public.source_images(id) on delete cascade,
    owner_id uuid not null references auth.users(id) on delete cascade,
    consent_version text not null check (length(consent_version) between 1 and 64),
    accepted_at timestamptz not null default now()
);

create table if not exists public.validation_results (
    id uuid primary key default gen_random_uuid(),
    source_image_id uuid not null references public.source_images(id) on delete cascade,
    owner_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('technical', 'subject', 'input_moderation')),
    status text not null check (status in ('passed', 'failed', 'mocked')),
    safe_reason_code text,
    provider_version text not null,
    created_at timestamptz not null default now(),
    unique (source_image_id, kind)
);

create table if not exists public.generation_jobs (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    source_image_id uuid not null references public.source_images(id),
    regenerated_from_job_id uuid references public.generation_jobs(id),
    status text not null check (
        status in ('queued', 'generating', 'moderating', 'succeeded', 'failed', 'timed_out')
    ),
    stage text not null,
    progress smallint not null check (progress between 0 and 100),
    mock_scenario text not null check (mock_scenario in ('success', 'failure', 'timeout', 'blocked')),
    idempotency_key text not null check (length(idempotency_key) between 8 and 128),
    request_hash text not null check (length(request_hash) = 64),
    safe_error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    unique (owner_id, idempotency_key)
);

create index if not exists generation_jobs_owner_created_idx
    on public.generation_jobs(owner_id, created_at desc);
create index if not exists generation_jobs_owner_status_idx
    on public.generation_jobs(owner_id, status);

create table if not exists public.sticker_sets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    job_id uuid not null unique references public.generation_jobs(id) on delete cascade,
    style text not null check (style = 'chibi_3d'),
    status text not null check (status in ('preview', 'deleted')),
    created_at timestamptz not null default now()
);

create table if not exists public.sticker_variants (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    set_id uuid not null references public.sticker_sets(id) on delete cascade,
    ordinal smallint not null check (ordinal between 1 and 8),
    expression_key text not null,
    storage_path text not null unique,
    mime_type text not null,
    moderation_status text not null check (moderation_status in ('passed', 'blocked')),
    created_at timestamptz not null default now(),
    unique (set_id, ordinal)
);

create index if not exists sticker_variants_owner_set_idx
    on public.sticker_variants(owner_id, set_id);

create table if not exists public.saved_packs (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    source_set_id uuid not null references public.sticker_sets(id),
    title text not null,
    idempotency_key text not null check (length(idempotency_key) between 8 and 128),
    selection_hash text not null check (length(selection_hash) = 64),
    created_at timestamptz not null default now(),
    unique (owner_id, idempotency_key)
);

create index if not exists saved_packs_owner_created_idx
    on public.saved_packs(owner_id, created_at desc);

create table if not exists public.saved_pack_items (
    pack_id uuid not null references public.saved_packs(id) on delete cascade,
    sticker_id uuid not null references public.sticker_variants(id),
    ordinal smallint not null check (ordinal between 1 and 8),
    primary key (pack_id, sticker_id),
    unique (pack_id, ordinal)
);

-- A successful generation is only valid when its set contains exactly 8 items.
create or replace function public.enforce_exact_eight_variants()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    target_set_id uuid;
    target_status text;
    item_count integer;
begin
    if tg_table_name = 'generation_jobs' then
        if new.status <> 'succeeded' then
            return new;
        end if;
        select id into target_set_id from public.sticker_sets where job_id = new.id;
    else
        if tg_op = 'UPDATE' and (
            new.set_id is distinct from old.set_id
            or new.owner_id is distinct from old.owner_id
        ) then
            raise exception 'A sticker variant cannot move between set or owner'
                using errcode = '23514';
        end if;
        if tg_op = 'DELETE' then
            target_set_id := old.set_id;
        else
            target_set_id := new.set_id;
        end if;
        select j.status into target_status
        from public.sticker_sets s
        join public.generation_jobs j on j.id = s.job_id
        where s.id = target_set_id;
        if target_status is distinct from 'succeeded' then
            if tg_op = 'DELETE' then
                return old;
            end if;
            return new;
        end if;
    end if;

    if target_set_id is null then
        raise exception 'A successful job requires a sticker set'
            using errcode = '23514';
    end if;
    select count(*) into item_count
    from public.sticker_variants
    where set_id = target_set_id
      and moderation_status = 'passed';
    if item_count <> 8 then
        raise exception 'A successful sticker set requires exactly 8 passed variants'
            using errcode = '23514';
    end if;
    if exists (
        select 1 from public.sticker_variants
        where set_id = target_set_id and moderation_status <> 'passed'
    ) then
        raise exception 'A successful sticker set cannot contain blocked variants'
            using errcode = '23514';
    end if;
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists generation_jobs_exact_eight on public.generation_jobs;
create constraint trigger generation_jobs_exact_eight
after insert or update of status on public.generation_jobs
deferrable initially deferred
for each row execute function public.enforce_exact_eight_variants();

drop trigger if exists sticker_variants_exact_eight on public.sticker_variants;
create constraint trigger sticker_variants_exact_eight
after insert or update of set_id, owner_id, moderation_status or delete on public.sticker_variants
deferrable initially deferred
for each row execute function public.enforce_exact_eight_variants();

-- Prevent a set row mutation from detaching or cascading away the exact-eight
-- contract while its parent job still exists as succeeded. If the job itself is
-- already being deleted, the parent lookup is empty and owner cascade can proceed.
create or replace function public.protect_succeeded_sticker_set()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if tg_op = 'UPDATE' and (
        new.job_id is distinct from old.job_id
        or new.owner_id is distinct from old.owner_id
        or new.status is distinct from old.status
    ) and exists (
        select 1 from public.generation_jobs
        where id = old.job_id and owner_id = old.owner_id and status = 'succeeded'
    ) then
        raise exception 'A succeeded sticker set cannot change job, owner or status'
            using errcode = '23514';
    end if;

    if tg_op = 'DELETE' and exists (
        select 1 from public.generation_jobs
        where id = old.job_id and owner_id = old.owner_id and status = 'succeeded'
    ) then
        raise exception 'A succeeded sticker set cannot be deleted independently'
            using errcode = '23514';
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists sticker_sets_protect_succeeded on public.sticker_sets;
create trigger sticker_sets_protect_succeeded
before update of job_id, owner_id, status or delete on public.sticker_sets
for each row execute function public.protect_succeeded_sticker_set();

-- Atomic terminal transition used by the service-role mock adapter.
create or replace function public.complete_mock_generation(
    p_job_id uuid,
    p_owner_id uuid,
    p_set_id uuid,
    p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_job public.generation_jobs%rowtype;
    existing_set_id uuid;
    invalid_count integer;
begin
    select * into current_job
    from public.generation_jobs
    where id = p_job_id and owner_id = p_owner_id
    for update;

    if not found then
        raise exception 'Generation job not found' using errcode = 'P0002';
    end if;
    if current_job.status = 'succeeded' then
        select id into existing_set_id
        from public.sticker_sets
        where job_id = p_job_id and owner_id = p_owner_id;
        return existing_set_id;
    end if;
    if current_job.status in ('failed', 'timed_out') then
        raise exception 'Terminal job cannot be completed' using errcode = '23514';
    end if;
    if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) <> 8 then
        raise exception 'Exactly 8 variants are required' using errcode = '23514';
    end if;

    select count(*) into invalid_count
    from jsonb_to_recordset(p_variants) as variant(
        id uuid,
        ordinal smallint,
        expression_key text,
        storage_path text,
        mime_type text,
        moderation_status text,
        created_at timestamptz
    )
    where variant.id is null
       or variant.ordinal not between 1 and 8
       or variant.expression_key is null
       or variant.storage_path not like p_owner_id::text || '/' || p_set_id::text || '/%'
       or variant.mime_type <> 'image/svg+xml'
       or variant.moderation_status <> 'passed';

    if invalid_count <> 0 then
        raise exception 'Variant payload is invalid' using errcode = '23514';
    end if;
    if (
        select count(distinct variant.ordinal)
        from jsonb_to_recordset(p_variants) as variant(ordinal smallint)
    ) <> 8 then
        raise exception 'Variant ordinals must be unique 1 through 8' using errcode = '23514';
    end if;

    insert into public.sticker_sets(id, owner_id, job_id, style, status)
    values (p_set_id, p_owner_id, p_job_id, 'chibi_3d', 'preview');

    insert into public.sticker_variants(
        id, owner_id, set_id, ordinal, expression_key, storage_path,
        mime_type, moderation_status, created_at
    )
    select
        variant.id, p_owner_id, p_set_id, variant.ordinal,
        variant.expression_key, variant.storage_path, variant.mime_type,
        variant.moderation_status, coalesce(variant.created_at, now())
    from jsonb_to_recordset(p_variants) as variant(
        id uuid,
        ordinal smallint,
        expression_key text,
        storage_path text,
        mime_type text,
        moderation_status text,
        created_at timestamptz
    );

    update public.generation_jobs
    set status = 'succeeded', stage = 'ready', progress = 100,
        safe_error_code = null, updated_at = now(), completed_at = now()
    where id = p_job_id and owner_id = p_owner_id;
    return p_set_id;
end;
$$;

-- Idempotent, owner-checked and transactional save of a selected subset.
create or replace function public.save_sticker_selection(
    p_owner_id uuid,
    p_set_id uuid,
    p_sticker_ids uuid[],
    p_pack_id uuid,
    p_idempotency_key text,
    p_selection_hash text
)
returns table(pack_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
    existing_pack public.saved_packs%rowtype;
    selected_count integer;
begin
    -- Serialize both missing-row creators and replays for the same owner/key.
    -- Two-int advisory keys avoid reliance on a nonexistent row FOR UPDATE.
    perform pg_advisory_xact_lock(
        hashtext(p_owner_id::text),
        hashtext(p_idempotency_key)
    );

    select * into existing_pack
    from public.saved_packs sp
    where sp.owner_id = p_owner_id and sp.idempotency_key = p_idempotency_key
    for update;
    if found then
        if existing_pack.selection_hash <> p_selection_hash then
            raise exception 'Idempotency key reused for another selection'
                using errcode = '23505';
        end if;
        return query select existing_pack.id, false;
        return;
    end if;

    if coalesce(array_length(p_sticker_ids, 1), 0) not between 1 and 8 then
        raise exception 'Select between 1 and 8 stickers' using errcode = '23514';
    end if;
    if (
        select count(distinct sticker_id)
        from unnest(p_sticker_ids) as selected(sticker_id)
    ) <> array_length(p_sticker_ids, 1) then
        raise exception 'Sticker selection contains duplicates' using errcode = '23514';
    end if;
    if not exists (
        select 1 from public.sticker_sets
        where id = p_set_id and owner_id = p_owner_id and status = 'preview'
    ) then
        raise exception 'Sticker set not found' using errcode = 'P0002';
    end if;
    select count(*) into selected_count
    from public.sticker_variants
    where id = any(p_sticker_ids)
      and set_id = p_set_id
      and owner_id = p_owner_id
      and moderation_status = 'passed';
    if selected_count <> array_length(p_sticker_ids, 1) then
        raise exception 'Sticker selection is invalid' using errcode = '23514';
    end if;

    insert into public.saved_packs(
        id, owner_id, source_set_id, title, idempotency_key, selection_hash
    ) values (
        p_pack_id, p_owner_id, p_set_id, 'Mock Sticker Pack',
        p_idempotency_key, p_selection_hash
    );

    insert into public.saved_pack_items(pack_id, sticker_id, ordinal)
    select p_pack_id, selected.sticker_id, selected.position::smallint
    from unnest(p_sticker_ids) with ordinality as selected(sticker_id, position);

    return query select p_pack_id, true;
end;
$$;

-- Atomically writes source metadata, consent and all three mock validation rows.
-- The caller uploads to the reserved deterministic Storage path first, then
-- invokes this RPC. Replays with an identical payload return the same source.
create or replace function public.create_mock_source(
    p_source_id uuid,
    p_owner_id uuid,
    p_storage_path text,
    p_mime_type text,
    p_byte_size bigint,
    p_checksum_sha256 text,
    p_consent_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_source public.source_images%rowtype;
begin
    perform pg_advisory_xact_lock(
        hashtext(p_owner_id::text),
        hashtext(p_source_id::text)
    );

    select * into current_source
    from public.source_images
    where id = p_source_id and owner_id = p_owner_id;
    if found then
        if current_source.storage_path <> p_storage_path
           or current_source.mime_type <> p_mime_type
           or current_source.byte_size <> p_byte_size
           or current_source.checksum_sha256 <> p_checksum_sha256
           or current_source.status <> 'ready'
           or not exists (
               select 1 from public.consent_records
               where source_image_id = p_source_id and owner_id = p_owner_id
                 and consent_version = p_consent_version
           )
           or (
               select count(*) from public.validation_results
               where source_image_id = p_source_id and owner_id = p_owner_id
                 and (
                     (kind = 'technical' and status = 'passed')
                     or (kind in ('subject', 'input_moderation') and status = 'mocked')
                 )
           ) <> 3 then
            raise exception 'Source replay payload conflicts with committed data'
                using errcode = '23505';
        end if;
        return p_source_id;
    end if;

    insert into public.source_images(
        id, owner_id, storage_path, mime_type, byte_size,
        checksum_sha256, status
    ) values (
        p_source_id, p_owner_id, p_storage_path, p_mime_type,
        p_byte_size, p_checksum_sha256, 'ready'
    );

    insert into public.consent_records(
        id, source_image_id, owner_id, consent_version
    ) values (
        gen_random_uuid(), p_source_id, p_owner_id, p_consent_version
    );

    insert into public.validation_results(
        id, source_image_id, owner_id, kind, status, provider_version
    ) values
        (gen_random_uuid(), p_source_id, p_owner_id, 'technical', 'passed', 'mock-v1'),
        (gen_random_uuid(), p_source_id, p_owner_id, 'subject', 'mocked', 'mock-v1'),
        (gen_random_uuid(), p_source_id, p_owner_id, 'input_moderation', 'mocked', 'mock-v1');

    return p_source_id;
end;
$$;

revoke all on function public.complete_mock_generation(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.save_sticker_selection(uuid, uuid, uuid[], uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_mock_source(uuid, uuid, text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.complete_mock_generation(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.save_sticker_selection(uuid, uuid, uuid[], uuid, text, text) to service_role;
grant execute on function public.create_mock_source(uuid, uuid, text, text, bigint, text, text) to service_role;

-- API-only boundary: RLS is enabled and no anon/authenticated policy is created.
-- Mobile clients authenticate with Supabase, then call FastAPI. Only the
-- backend's service_role accesses application tables and Storage objects.
alter table public.source_images enable row level security;
alter table public.consent_records enable row level security;
alter table public.validation_results enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.sticker_sets enable row level security;
alter table public.sticker_variants enable row level security;
alter table public.saved_packs enable row level security;
alter table public.saved_pack_items enable row level security;

-- Drop policies from an earlier draft if this migration is reapplied.
drop policy if exists source_images_owner_read on public.source_images;
drop policy if exists consent_records_owner_read on public.consent_records;
drop policy if exists validation_results_owner_read on public.validation_results;
drop policy if exists generation_jobs_owner_read on public.generation_jobs;
drop policy if exists sticker_sets_owner_read on public.sticker_sets;
drop policy if exists sticker_variants_owner_read on public.sticker_variants;
drop policy if exists saved_packs_owner_read on public.saved_packs;
drop policy if exists saved_pack_items_owner_read on public.saved_pack_items;

revoke all privileges on table
    public.source_images,
    public.consent_records,
    public.validation_results,
    public.generation_jobs,
    public.sticker_sets,
    public.sticker_variants,
    public.saved_packs,
    public.saved_pack_items
from public, anon, authenticated;

grant all privileges on table
    public.source_images,
    public.consent_records,
    public.validation_results,
    public.generation_jobs,
    public.sticker_sets,
    public.sticker_variants,
    public.saved_packs,
    public.saved_pack_items
to service_role;

-- Buckets remain private and intentionally have no client Storage policies.
-- Paths are prefixed by owner UUID for backend-side ownership checks, but path
-- layout alone is not authorization. Review and remove any project-wide
-- permissive storage.objects policies before deployment.
insert into storage.buckets(id, name, public)
values ('source-images', 'source-images', false)
on conflict (id) do update set public = false;

insert into storage.buckets(id, name, public)
values ('generated-stickers', 'generated-stickers', false)
on conflict (id) do update set public = false;

drop policy if exists source_assets_owner_read on storage.objects;
drop policy if exists generated_assets_owner_read on storage.objects;

-- This migration assumes a clean, isolated Supabase project. Any pre-existing
-- policy on storage.objects could grant direct client access and bypass FastAPI.
do $$
begin
    if exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
    ) then
        raise exception
            'API-only deployment requires an isolated project with no storage.objects policies';
    end if;
end;
$$;
