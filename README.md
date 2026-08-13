# GS E&R 대외협력 행사 모니터링

국회·공공기관·협회 행사와 에너지·전력 뉴스를 수집해 보여주는 내부 업무용 모니터링 사이트입니다. 프런트엔드와 API는 Vinext 기반 Cloudflare Worker로 실행되며, 수집 결과는 Cloudflare D1에 보관합니다.

## 주요 기능

- 이번 주·다음 주 행사 캘린더
- 출처별 전체 행사와 원문 링크
- 기후에너지환경부 및 국회 위원회 모니터링
- 에너지 전문매체 뉴스 모니터링
- 수집 실패 시 마지막 정상 데이터 유지
- 행사 데이터 매일 09:00 KST 자동 갱신
- 뉴스 데이터 3시간마다 자동 갱신
- Excel·PDF 출력과 선택 행사 복사

## 로컬 실행

필수 환경은 Node.js 22.13 이상입니다.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

실제 API 키와 비밀번호는 `.env.local`에만 넣고 Git에 올리지 않습니다.

```bash
npm run build
```

## Cloudflare 최초 설정

1. Cloudflare에서 `gs-enr-monitoring-db`라는 D1 데이터베이스를 생성합니다.
2. `drizzle/0000_source_cache.sql`을 해당 D1 데이터베이스에 한 번 적용합니다.
3. GitHub 저장소의 `Settings > Secrets and variables > Actions`에 다음 값을 등록합니다.

Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `ASSEMBLY_API_KEY`
- `SITE_PASSWORD`

Variables:

- `PUBLIC_SITE_ORIGIN`: 최초 배포 후 발급된 `https://...workers.dev` 주소

설정이 끝나면 `Actions > Deploy to Cloudflare Workers > Run workflow`를 실행합니다. 이후 `main` 브랜치에 반영된 변경은 자동으로 배포됩니다.

Cloudflare Cron은 UTC 기준입니다. `0 0 * * *`는 한국시간 오전 9시이며, `0 */3 * * *`는 3시간 간격입니다.

## Gemini·Claude·Codex 작업 방식

모든 도구는 이 저장소를 원본으로 사용합니다.

```bash
git clone https://github.com/mhkim250-spec/gs-enr-monitoring.git
cd gs-enr-monitoring
npm ci
git switch -c feature/수정내용
```

수정 후 `npm run build`를 통과시키고 Pull Request를 만들어 `main`에 병합합니다. Claude Code는 `CLAUDE.md`, Gemini CLI는 `GEMINI.md`의 인수인계 규칙도 함께 읽습니다.

## 배포 구조

- 애플리케이션: Vinext + React
- 실행 환경: Cloudflare Workers
- 데이터베이스: Cloudflare D1
- 자동 배포: GitHub Actions + Wrangler
- 예약 갱신: Cloudflare Cron Triggers

현재 ChatGPT Sites 설정은 이전 완료 전까지 병행 운영을 위해 보존되어 있습니다.
