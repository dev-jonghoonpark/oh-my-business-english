# Oh My Business English

한국 회사에서 실제로 쓰는 말을 영어로 하나씩 익히는 페이지입니다.

👉 https://dev-jonghoonpark.github.io/oh-my-business-english/

## 표현 추가하기

`phrases.json` 끝에 항목을 추가하면 됩니다. 빌드 과정은 없습니다.

```json
{
  "id": 30,
  "added": "2026-10-31",
  "category": "요청",
  "ko": "한글 표현",
  "en": "대표 영어 표현",
  "alt": ["다른 표현 1", "다른 표현 2"],
  "example": "영어 예문",
  "exampleKo": "예문 번역",
  "note": "뉘앙스나 사용 팁"
}
```

- `added` 날짜별로 Day 1, Day 2 … 로 묶여서 보입니다.
- `category`: 보고·공유 / 요청 / 질문 / 진행 / 회의·의견 / 감사 / 사과 (새 값을 쓰면 필터에 자동으로 추가됩니다)
- `alt`, `example`, `exampleKo`, `note`는 생략할 수 있습니다.

## 로컬에서 보기

```sh
python3 -m http.server 8000
# http://localhost:8000
```
