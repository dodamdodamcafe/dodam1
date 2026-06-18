# 도담 앱 Supabase + Vercel 배포 가이드

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에 로그인합니다.
2. `New project`를 누릅니다.
3. 프로젝트 이름을 정합니다. 예: `dodam-package-manager`
4. Region은 가까운 곳을 선택합니다.
5. 프로젝트 생성이 끝날 때까지 기다립니다.

## 2. 데이터 테이블 만들기

Supabase 왼쪽 메뉴에서 `SQL Editor`를 열고 아래 SQL을 실행합니다.

```sql
create table if not exists public.dodam_data (
  id text primary key,
  data jsonb not null default '{"students":[],"packages":[],"lessons":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.dodam_data (id, data)
values ('main', '{"students":[],"packages":[],"lessons":[]}'::jsonb)
on conflict (id) do nothing;
```

## 3. Supabase 키 확인하기

Supabase에서 `Project Settings` → `API`로 이동합니다.

필요한 값은 2개입니다.

- `Project URL`
- `service_role key`

`service_role key`는 절대 브라우저 코드에 넣지 말고, Vercel 환경변수에만 넣어야 합니다.

## 4. Vercel에 올리기

### GitHub로 올리는 방법

1. 이 프로젝트 폴더를 GitHub 저장소로 올립니다.
2. https://vercel.com 에 로그인합니다.
3. `Add New...` → `Project`를 누릅니다.
4. GitHub 저장소를 선택합니다.
5. Framework Preset은 `Other`로 둡니다.
6. Environment Variables에 아래 2개를 추가합니다.

```text
SUPABASE_URL=Supabase의 Project URL
SUPABASE_SERVICE_ROLE_KEY=Supabase의 service_role key
```

7. `Deploy`를 누릅니다.

## 5. 배포 후 확인하기

Vercel 주소로 접속해서 학생을 하나 추가해봅니다.

Supabase `Table Editor` → `dodam_data` 테이블에서 `data` 값이 바뀌면 정상입니다.

## 6. 운영할 때 주의할 점

- Vercel에는 컴퓨터 파일 저장이 아니라 Supabase 저장이 사용됩니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 비밀키입니다. GitHub나 앱 코드에 직접 적으면 안 됩니다.
- 데이터가 하나의 `main` 행에 저장되는 방식이라, 지금처럼 한 곳에서 운영하는 도담 관리용 앱에 적합합니다.
