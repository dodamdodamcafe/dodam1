# 도담 패키지 관리

도담 수업 스케줄, 10회권/20회권 패키지, 잔여 횟수, 사용기한, 카톡 안내문을 관리하는 웹앱입니다.

## Supabase 준비

Supabase SQL Editor에서 아래 SQL을 실행합니다.

```sql
create table if not exists public.dodam_data (
  id text primary key,
  data jsonb not null default '{"students":[],"packages":[],"lessons":[],"attendance":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.dodam_data (id, data)
values ('main', '{"students":[],"packages":[],"lessons":[],"attendance":[]}'::jsonb)
on conflict (id) do nothing;
```

## Vercel 환경변수

Vercel 프로젝트 설정의 Environment Variables에 아래 2개를 추가합니다.

```text
SUPABASE_URL=Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=Supabase service_role key
```

`SUPABASE_SERVICE_ROLE_KEY`는 비밀키입니다. GitHub에 올리면 안 됩니다.

## 배포

GitHub에 이 프로젝트를 올린 뒤 Vercel에서 Import Project로 가져오면 됩니다.
