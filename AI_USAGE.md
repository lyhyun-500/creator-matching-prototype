# AI 활용 기록

## 사용 도구

Claude Code (Sonnet 5, `claude-sonnet-5`), 단일 대화 세션. 사용자의 요청은 "README.md, PRD.md 문서를 기반으로 작업해봐"였고, 두 문서를 구현 계약으로 삼아 저장소 전체(코드·설정·테스트·문서)를 이 세션에서 작성했습니다.

## 실제 작업 순서

1. README.md, PRD.md를 전체 읽고 요구사항(추천 계산식, 데이터 계약, 화면 상태, 수용 기준 15개)을 파악.
2. `dummy_creators.csv` 실제 바이트를 확인(BOM 존재, CRLF 존재, 카테고리/플랫폼 종류, `total_campaign_count == 0`인 행이 정확히 27건임을 `awk`로 사전 확인).
3. Vite React+TypeScript 템플릿을 스캐폴딩. **이 과정에서 실수로 기존 README.md를 템플릿 파일로 덮어썼고**, 대화 맥락에 남아 있던 원본 내용으로 즉시 복구함.
4. 순수 함수 계층(`src/lib/*`)을 PRD 5~9절 수식 그대로 구현: CSV 파서, 데이터 검증/신규 분리, 백분위/협업점수/최종점수, 필터, 정렬, 빈 결과 대안.
5. vitest로 PRD 9.1/9.3/9.4의 수치를 그대로 단정문으로 옮긴 테스트 27개 작성 및 통과 확인.
6. React UI(`App.tsx` + `src/components/*`)를 PRD 7절 화면 상태에 맞춰 구현.
7. `tsc -b`, `vite build`, `npm run test`, `npx oxlint` 실행 및 결과 확인. dev 서버를 띄워 `curl`로 `index.html`과 `public/data/dummy_creators.csv` 응답을 확인.
8. README.md의 "구현 전" 표현을 실제 검증 결과로 갱신하고 flowchart.md·AI_USAGE.md(본 문서) 작성.

## 명세가 해석을 요구했던 지점과 실제 판단

- **M(최대 캠페인 집행 건수)의 범위**: PRD 6.3은 "전체 유효 데이터의 최대 total_campaign_count"라고 명시. 규모별이 아닌 전체 데이터셋 기준으로 1회 계산해 `scoring.ts`의 `computeMaxCampaignCount`에 구현. 제공 CSV로 실제 값이 30임을 테스트로 확인.
- **참여율 분모/실제 CPM 관련 문구**: PRD가 이미 "참여율×조회수를 예상 반응수로 계산하지 않는다", "실제 CPM이 아니다"라고 결론을 내려 두었으므로, 그 결론을 그대로 UI 문구(`CandidateCard.tsx`, `format.ts`)에 반영했습니다. 별도로 반응수·CPM을 계산하는 코드를 추가하지 않았습니다.
- **신규 후보의 0원을 무료로 해석하지 않음**: `dataLoad.ts`에서 `avgCampaignBudgetKrw`가 0인 신규 후보를 예산 필터에 아예 태우지 않고(`filter.ts`의 `splitExistingAndNew`로 분리), UI에서도 '가격 미확인'으로만 표시합니다. 예산 이하 후보 수(`existing.length`)에 신규 후보를 합산하지 않았습니다.
- **비용 효율을 기본 점수에서 제외**: PRD 4절/6.5절 결정을 그대로 따라 `scoring.ts`의 `scoreExistingCandidate`는 비용 지표를 전혀 참조하지 않고, `costPer1000Views`는 별도 필드로만 계산해 정렬 옵션(`costAsc`)에서만 사용합니다.
- **추천 근거 문구의 금액 표기**: PRD 예시는 "78만 원"처럼 축약 표기를 보여주지만, 이는 예시일 뿐 리터럴 규격이 아니라고 판단해 `formatKrw`로 전체 자리수를 콤마 구분해 표시했습니다(예: 780,000원). 백분위·평점·집행 건수 등 근거의 의미 내용은 PRD 요구대로 모두 노출합니다.
- **CSV 로딩 경로**: PRD는 "앱이 읽을 수 있는 위치에 원본 바이트 그대로 배치"라고만 명시했습니다. Vite의 정적 자산 규칙에 따라 `public/data/dummy_creators.csv`에 원본을 복사하고, 저장소 루트의 원본은 그대로 유지했습니다. 두 파일의 SHA-256 해시가 동일함을 `shasum -a 256`으로 확인했습니다.
- **CSV 파서를 직접 구현**: 외부 파서 라이브러리(papaparse 등)를 추가하는 대신 BOM 제거·CRLF·따옴표 이스케이프를 처리하는 최소 파서를 직접 작성했습니다. 실제 제공 CSV에는 따옴표가 없었지만(grep으로 확인), PRD가 "인용부호를 지원하는 파서"를 명시적으로 요구해 방어적으로 구현하고 별도 fixture 테스트로 확인했습니다.
- **테스트에서 fetch를 우회**: `dataLoad.ts`의 `loadCreators`(fetch 담당)와 `parseCreatorsFromCsvText`(순수 파싱/검증)를 분리해, vitest(Node 환경)에서 브라우저 fetch 없이 실제 CSV 파일을 `fs.readFileSync`로 읽어 검증하도록 했습니다.

## 실제로 수행한 검증

- `npm run test` (vitest): 27개 테스트 전부 통과. PRD 9.1의 뷰티·패션/마이크로/200만원 상위 5명 점수·순서, 식품/나노/50만원 케이스, 피트니스/매크로/50만원의 빈 결과와 593만원 예산 대안, C0077의 참고 비용(≈22,177원), 규모 경계(9,999/10,000/99,999/100,000), 기준 집합 불변성(AC05), 백분위 N=1 및 전값 동일 시 50점(AC13), 정렬 방향과 동점 재현성(AC12), 이력 불일치·평점 미확인 처리(AC15)를 포함합니다.
- `npx tsc -b`: 타입 오류 0건.
- `npm run build` (tsc -b && vite build): 성공, 산출물 크기 확인.
- `npx oxlint`: 경고 1건(`useCreatorData.ts`의 `set-state-in-effect`) — fetch 시작 시 로딩 상태로 전환하는 표준 패턴이며 오류로 보지 않았습니다.
- `npm run dev` 백그라운드 실행 후 `curl`로 `/`(index.html)와 `/data/dummy_creators.csv` 응답(HTTP 200, BOM 보존)을 확인.
- **하지 않은 것**: 이 세션에는 브라우저 자동화 도구가 연결되어 있지 않아(사용자가 Chrome 확장 연결을 보류함) 실제 브라우저 클릭 흐름(입력 → 추천 보기 → 정렬 변경 → 빈 결과 → 대안 클릭)은 눈으로 확인하지 못했습니다. `git init`과 커밋도 수행하지 않았습니다(저장소가 git으로 초기화되어 있지 않았고, 사용자가 커밋을 명시적으로 요청하지 않음).

## 실수와 수정

- Vite 템플릿을 스캐폴딩하며 `cp -r`로 전체 디렉터리를 복사하는 과정에서 기존 README.md(문서 작성자가 준비한 프로토타입 소개 문서)를 템플릿 기본 README.md로 덮어썼습니다. 대화 맥락에 남아 있던 원본 텍스트로 즉시 복구했으며, 이후 스캐폴딩 시 대상 디렉터리를 별도 임시 디렉터리로 분리하지 않은 것이 원인이었습니다.
