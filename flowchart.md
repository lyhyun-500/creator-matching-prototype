# 흐름도

`src/lib`의 실제 구현(`dataLoad.ts`, `filter.ts`, `scoring.ts`, `search.ts`, `alternatives.ts`, `sort.ts`)과 UI(`App.tsx`)의 분기를 반영한 Mermaid 흐름입니다.

## 1. 데이터 로드 및 검증

```mermaid
flowchart TD
    A[앱 시작] --> B[public/data/dummy_creators.csv fetch]
    B -->|fetch 실패| E1[파일 오류: fetch_failed]
    B -->|성공| C[BOM 제거 후 CSV 파싱]
    C -->|파싱 실패| E2[파일 오류: parse_failed]
    C --> D{필수 헤더 11개 모두 존재?}
    D -->|누락| E3[파일 오류: missing_headers]
    D -->|정상| F[행 단위 검증 루프]
    F --> G{id/name/category/platform 존재?}
    G -->|누락| X1[해당 행 제외 + 사유 기록]
    G -->|존재| H{필수 숫자 유효?<br/>followers/avg_view_count/<br/>engagement_rate/campaign_count/<br/>budget 값}
    H -->|NaN/Infinity/음수/범위 위반| X1
    H -->|정상| I{campaign_count==0 이고<br/>rating 공란 이고<br/>avg/total budget==0?}
    I -->|예| J[정상 신규 후보로 표시<br/>isNew=true]
    I -->|아니오| K{이력 불일치?<br/>0건인데 평점/가격 존재<br/>또는 양수건인데 budget==0}
    K -->|예| X1
    K -->|아니오| L{campaign_count>0 이고<br/>rating 공란?}
    L -->|예| M[isRatingUnverified=true<br/>평점 미확인 유지]
    L -->|아니오| N[정상 이력 보유 후보]
    J --> O[creator_id 중복 검사]
    M --> O
    N --> O
    O -->|중복 발견| E4[파일 오류: duplicate_id]
    O -->|중복 없음| P{유효 행 1건 이상?}
    P -->|0건| E5[데이터 오류: no_valid_rows]
    P -->|1건 이상| Q[규모별 기준 집합 baseline 고정<br/>+ 최대 campaign_count(M) 계산]
    Q --> R[ready 상태]
```

## 2. 검색 실행

```mermaid
flowchart TD
    S0[사용자 입력: 예산/카테고리/규모] --> S1{입력 검증 통과?<br/>예산 양의 정수, 카테고리 1개+, 규모 1개}
    S1 -->|실패| S2[필드별 입력 오류 표시]
    S1 -->|통과| S3["'추천 보기' 클릭 → 제출 조건 확정"]
    S3 --> S4[카테고리 OR + 규모 필터]
    S4 --> S5[이력 보유 / 신규 분리]
    S5 --> S6[이력 보유 후보에 예산 필터 적용]
    S6 --> S7[baseline으로 V/E 백분위 계산]
    S7 --> S8[협업 점수 C 계산<br/>평점 미확인 시 R=50]
    S8 --> S9[S = 0.60V + 0.25E + 0.15C]
    S9 --> S10[신규 후보: (0.60V+0.25E)/0.85]
    S10 --> S11[참고 1천 조회당 비용 계산<br/>budget/view*1000, 0이면 null]
    S11 --> S12{이력 보유 예산 적합 후보 수 > 0?}
    S12 -->|예| S13[기본 정렬: 점수↓ → 조회수↓ → 예산↑ → ID↑]
    S13 --> S14[결과 카드 + 신규 영역 표시]
    S12 -->|아니오| S15[조건 완화 계산]
    S15 --> S16[예산 대안: 같은 카테고리·규모 최소 평균 집행액]
    S15 --> S17[규모 대안: 같은 카테고리·예산으로 다른 두 규모 각각 계산]
    S16 --> S18{대안 후보 1명 이상?}
    S17 --> S18
    S18 -->|예| S19[대안 버튼 표시]
    S18 -->|아니오| S20["'예산 또는 카테고리·규모를 다시 설정해 주세요'"]
    S19 --> S21{사용자가 대안 클릭?}
    S21 -->|예| S22[해당 필드 1개만 변경 후 자동 재검색<br/>정렬은 추천순으로 초기화]
    S22 --> S4
```
