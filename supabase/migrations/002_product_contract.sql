-- Upgrade an existing kien_v6 MVP database to the 6-8 output product contract.
-- This migration is idempotent so a fresh database may run 001 then 002 safely.

alter table public.source_images
    add column if not exists subject_type text not null default 'person',
    add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');

alter table public.source_images drop constraint if exists source_images_subject_type_check;
alter table public.source_images
    add constraint source_images_subject_type_check
    check (subject_type in ('person', 'pet', 'object'));

alter table public.generation_jobs
    add column if not exists style_id text not null default 'chibi_3d',
    add column if not exists locale text not null default 'vi',
    add column if not exists catalog_version text not null default 'v1';

alter table public.generation_jobs drop constraint if exists generation_jobs_status_check;
alter table public.generation_jobs drop constraint if exists generation_jobs_mock_scenario_check;
alter table public.generation_jobs drop constraint if exists generation_jobs_style_id_check;
alter table public.generation_jobs drop constraint if exists generation_jobs_locale_check;
alter table public.generation_jobs
    add constraint generation_jobs_status_check check (
        status in (
            'queued', 'validating', 'canonicalizing', 'generating', 'splitting',
            'quality_checking', 'moderating', 'succeeded', 'failed', 'timed_out'
        )
    ),
    add constraint generation_jobs_mock_scenario_check check (
        mock_scenario in (
            'success', 'failure', 'timeout', 'blocked', 'partial_six', 'partial_seven'
        )
    ),
    add constraint generation_jobs_style_id_check
        check (style_id in ('chibi_2d', 'chibi_3d', 'plush', 'pixel')),
    add constraint generation_jobs_locale_check check (locale in ('vi', 'en'));

alter table public.sticker_sets
    add column if not exists subject_type text not null default 'person',
    add column if not exists locale text not null default 'vi',
    add column if not exists catalog_version text not null default 'v1',
    add column if not exists target_count smallint not null default 8,
    add column if not exists published_count smallint,
    add column if not exists rejected_count smallint;

update public.sticker_sets as sticker_set
set subject_type = source.subject_type,
    locale = job.locale,
    catalog_version = job.catalog_version,
    target_count = 8,
    published_count = (
        select count(*)::smallint from public.sticker_variants as variant
        where variant.set_id = sticker_set.id and variant.moderation_status = 'passed'
    ),
    rejected_count = 8 - (
        select count(*)::smallint from public.sticker_variants as variant
        where variant.set_id = sticker_set.id and variant.moderation_status = 'passed'
    )
from public.generation_jobs as job
join public.source_images as source on source.id = job.source_image_id
where job.id = sticker_set.job_id
  and (
      sticker_set.published_count is null
      or sticker_set.rejected_count is null
      or sticker_set.subject_type is distinct from source.subject_type
      or sticker_set.locale is distinct from job.locale
      or sticker_set.catalog_version is distinct from job.catalog_version
  );

do $$
begin
    if exists (
        select 1 from public.sticker_sets
        where published_count not between 6 and 8
           or rejected_count <> 8 - published_count
    ) then
        raise exception 'Existing sticker sets do not satisfy the 6-8 output contract'
            using errcode = '23514';
    end if;
end;
$$;

alter table public.sticker_sets alter column published_count set not null;
alter table public.sticker_sets alter column rejected_count set not null;
alter table public.sticker_sets drop constraint if exists sticker_sets_style_check;
alter table public.sticker_sets drop constraint if exists sticker_sets_subject_type_check;
alter table public.sticker_sets drop constraint if exists sticker_sets_locale_check;
alter table public.sticker_sets drop constraint if exists sticker_sets_target_count_check;
alter table public.sticker_sets drop constraint if exists sticker_sets_published_count_check;
alter table public.sticker_sets drop constraint if exists sticker_sets_rejected_count_check;
alter table public.sticker_sets
    add constraint sticker_sets_style_check
        check (style in ('chibi_2d', 'chibi_3d', 'plush', 'pixel')),
    add constraint sticker_sets_subject_type_check
        check (subject_type in ('person', 'pet', 'object')),
    add constraint sticker_sets_locale_check check (locale in ('vi', 'en')),
    add constraint sticker_sets_target_count_check check (target_count = 8),
    add constraint sticker_sets_published_count_check check (published_count between 6 and 8),
    add constraint sticker_sets_rejected_count_check check (rejected_count between 0 and 2);

create or replace function public.enforce_publishable_variants()
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
        if new.status <> 'succeeded' then return new; end if;
        select id into target_set_id from public.sticker_sets where job_id = new.id;
    else
        if tg_op = 'UPDATE' and (
            new.set_id is distinct from old.set_id or new.owner_id is distinct from old.owner_id
        ) then
            raise exception 'A sticker variant cannot move between set or owner'
                using errcode = '23514';
        end if;
        target_set_id := case when tg_op = 'DELETE' then old.set_id else new.set_id end;
        select job.status into target_status
        from public.sticker_sets as sticker_set
        join public.generation_jobs as job on job.id = sticker_set.job_id
        where sticker_set.id = target_set_id;
        if target_status is distinct from 'succeeded' then
            if tg_op = 'DELETE' then return old; end if;
            return new;
        end if;
    end if;

    if target_set_id is null then
        raise exception 'A successful job requires a sticker set' using errcode = '23514';
    end if;
    select count(*) into item_count
    from public.sticker_variants
    where set_id = target_set_id and moderation_status = 'passed';
    if item_count not between 6 and 8 then
        raise exception 'A successful sticker set requires 6-8 passed variants'
            using errcode = '23514';
    end if;
    if exists (
        select 1 from public.sticker_variants
        where set_id = target_set_id and moderation_status <> 'passed'
    ) then
        raise exception 'A successful sticker set cannot contain blocked variants'
            using errcode = '23514';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

drop trigger if exists generation_jobs_exact_eight on public.generation_jobs;
drop trigger if exists generation_jobs_publishable on public.generation_jobs;
create constraint trigger generation_jobs_publishable
after insert or update of status on public.generation_jobs
deferrable initially deferred
for each row execute function public.enforce_publishable_variants();

drop trigger if exists sticker_variants_exact_eight on public.sticker_variants;
drop trigger if exists sticker_variants_publishable on public.sticker_variants;
create constraint trigger sticker_variants_publishable
after insert or update of set_id, owner_id, moderation_status or delete on public.sticker_variants
deferrable initially deferred
for each row execute function public.enforce_publishable_variants();

drop function if exists public.enforce_exact_eight_variants();

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
        select id into existing_set_id from public.sticker_sets
        where job_id = p_job_id and owner_id = p_owner_id;
        return existing_set_id;
    end if;
    if current_job.status in ('failed', 'timed_out') then
        raise exception 'Terminal job cannot be completed' using errcode = '23514';
    end if;
    if jsonb_typeof(p_variants) <> 'array'
       or jsonb_array_length(p_variants) not between 6 and 8 then
        raise exception 'Between 6 and 8 variants are required' using errcode = '23514';
    end if;

    select count(*) into invalid_count
    from jsonb_to_recordset(p_variants) as variant(
        id uuid, ordinal smallint, expression_key text, storage_path text,
        mime_type text, moderation_status text, created_at timestamptz
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
    ) <> jsonb_array_length(p_variants) then
        raise exception 'Variant ordinals must be unique values 1 through 8'
            using errcode = '23514';
    end if;

    insert into public.sticker_sets(
        id, owner_id, job_id, style, subject_type, locale, catalog_version,
        target_count, published_count, rejected_count, status
    )
    select p_set_id, p_owner_id, p_job_id, current_job.style_id, source.subject_type,
        current_job.locale, current_job.catalog_version, 8, jsonb_array_length(p_variants),
        8 - jsonb_array_length(p_variants), 'preview'
    from public.source_images as source
    where source.id = current_job.source_image_id;

    insert into public.sticker_variants(
        id, owner_id, set_id, ordinal, expression_key, storage_path,
        mime_type, moderation_status, created_at
    )
    select variant.id, p_owner_id, p_set_id, variant.ordinal, variant.expression_key,
        variant.storage_path, variant.mime_type, variant.moderation_status,
        coalesce(variant.created_at, now())
    from jsonb_to_recordset(p_variants) as variant(
        id uuid, ordinal smallint, expression_key text, storage_path text,
        mime_type text, moderation_status text, created_at timestamptz
    );

    update public.generation_jobs
    set status = 'succeeded', stage = 'ready', progress = 100,
        safe_error_code = null, updated_at = now(), completed_at = now()
    where id = p_job_id and owner_id = p_owner_id;
    return p_set_id;
end;
$$;

revoke all on function public.complete_mock_generation(uuid, uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.complete_mock_generation(uuid, uuid, uuid, jsonb)
to service_role;
