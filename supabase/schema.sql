create extension if not exists pgcrypto;

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('standard', 'strict')),
  player_id text not null check (player_id ~ '^[a-zA-Z0-9-]{8,80}$'),
  name text not null check (char_length(name) between 1 and 16),
  score bigint not null check (score between 0 and 1000000000),
  updated_at timestamptz not null default now(),
  unique (mode, player_id)
);

create index if not exists leaderboard_mode_score_idx
  on public.leaderboard_scores (mode, score desc, updated_at asc);

alter table public.leaderboard_scores enable row level security;

drop policy if exists "leaderboard public read" on public.leaderboard_scores;
create policy "leaderboard public read"
  on public.leaderboard_scores
  for select
  to anon
  using (true);

revoke all on public.leaderboard_scores from anon;
grant select on public.leaderboard_scores to anon;

drop function if exists public.submit_score(text, text, text, bigint);

create or replace function public.submit_score(
  p_mode text,
  p_player_id text,
  p_name text,
  p_score bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  run_rank integer;
  best_rank integer;
  best_score bigint;
  previous_best bigint;
begin
  if p_mode not in ('standard', 'strict') then
    raise exception 'invalid mode';
  end if;
  if p_player_id is null
    or p_player_id !~ '^[a-zA-Z0-9-]{8,80}$' then
    raise exception 'invalid player id';
  end if;
  if p_name is null
    or char_length(trim(p_name)) not between 1 and 16 then
    raise exception 'invalid name';
  end if;
  if p_score is null or p_score < 0 or p_score > 1000000000 then
    raise exception 'invalid score';
  end if;

  perform pg_advisory_xact_lock(hashtext('leaderboard_scores:' || p_mode));

  -- Repair any oversized legacy leaderboard before calculating the new rank.
  with ranked as (
    select
      id,
      row_number() over (
        partition by mode
        order by score desc, updated_at asc, id asc
      ) as place
    from public.leaderboard_scores
    where mode = p_mode
  )
  delete from public.leaderboard_scores as scores
  using ranked
  where scores.id = ranked.id
    and ranked.place > 100;

  select score into previous_best
  from public.leaderboard_scores
  where mode = p_mode and player_id = p_player_id;

  best_score := greatest(coalesce(previous_best, 0), p_score);

  insert into public.leaderboard_scores (mode, player_id, name, score, updated_at)
  values (p_mode, p_player_id, trim(p_name), p_score, now())
  on conflict (mode, player_id) do update
  set
    name = case
      when excluded.score >= public.leaderboard_scores.score then excluded.name
      else public.leaderboard_scores.name
    end,
    score = greatest(public.leaderboard_scores.score, excluded.score),
    updated_at = case
      when excluded.score > public.leaderboard_scores.score then excluded.updated_at
      else public.leaderboard_scores.updated_at
    end;

  -- Keep each mode to the best 100 player records after every run.
  with ranked as (
    select
      id,
      row_number() over (
        partition by mode
        order by score desc, updated_at asc, id asc
      ) as place
    from public.leaderboard_scores
    where mode = p_mode
  )
  delete from public.leaderboard_scores as scores
  using ranked
  where scores.id = ranked.id
    and ranked.place > 100;

  select 1 + count(*) into run_rank
  from public.leaderboard_scores
  where mode = p_mode
    and score > p_score;

  select 1 + count(*) into best_rank
  from public.leaderboard_scores
  where mode = p_mode
    and score > best_score;

  if not exists (
    select 1
    from public.leaderboard_scores
    where mode = p_mode and player_id = p_player_id
  ) then
    run_rank := null;
    best_rank := null;
  elsif run_rank > 100 then
    run_rank := null;
  end if;

  return jsonb_build_object(
    'runRank', run_rank,
    'bestRank', best_rank,
    'bestScore', best_score
  );
end;
$$;

revoke all on function public.submit_score(text, text, text, bigint) from public;
grant execute on function public.submit_score(text, text, text, bigint) to anon;
