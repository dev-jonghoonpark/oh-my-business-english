# Oh My Business English

한국 회사에서 실제로 쓰는 말을 영어로 하나씩 익히는 페이지입니다.

👉 https://dev-jonghoonpark.github.io/oh-my-business-english/

## Claude Code에서 보기

Claude Code 프롬프트 바로 위에 표현이 하나씩 뜨고, 1분마다 다음 표현으로 넘어갑니다.

```
📘 미팅으로 답변이 늦었습니다
   Sorry for the late reply. I was in a meeting.
   11/29  1: 이전  2: 고정  3: 다음
```

### 설치

Claude Code **v2.1.287 이상**이 필요합니다 (`claude --version`으로 확인, 낮으면 `claude update`).

```
/plugin install oh-my-business-english --marketplace dev-jonghoonpark/oh-my-business-english
```

또는 두 단계로:

```
/plugin marketplace add dev-jonghoonpark/oh-my-business-english
/plugin install oh-my-business-english@oh-my-business-english
```

터미널과 Desktop 앱의 Code 탭에서 보입니다. VS Code 확장에는 이 영역이 없습니다.

### 조작

| 하고 싶은 것 | 방법 |
| :- | :- |
| 이전 / 고정 / 다음 | 프롬프트가 비어 있을 때 `1` / `2` / `3`을 누르고 잠깐 기다리기 |
| 명령으로 | `/biz-prev`, `/biz-pin`, `/biz-next` (Claude가 작업 중일 때도 바로 실행) |
| 예문과 팁 보기 | `/biz` |
| 잠시 숨기기 | `Ctrl+X` → `Ctrl+A` (다시 누르면 보임) |

고정하면 자동으로 넘어가지 않습니다. 보던 위치와 고정 상태는 다음 세션에도 이어집니다.

### 단축키 연결 (선택)

`/keybindings`로 `~/.claude/keybindings.json`을 열고 아래를 추가하면, 프롬프트에 글을 쓰는 중에도 단축키로 넘길 수 있습니다.

```json
{
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+x j": "command:biz-next",
        "ctrl+x k": "command:biz-prev",
        "ctrl+x p": "command:biz-pin"
      }
    }
  ]
}
```

### 설정

`/config`에서 바꿀 수 있습니다.

- **표현이 바뀌는 간격(초)**: 기본 60초
- **무작위 순서**: 기본 꺼짐

표현 목록은 이 페이지의 `phrases.json`을 6시간마다 받아옵니다. 그래서 새 표현을 추가해도 플러그인을 업데이트할 필요가 없습니다. 오프라인이면 마지막으로 받은 목록을 씁니다.

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

## 개발

```sh
# 페이지 미리보기
python3 -m http.server 8000

# 플러그인을 이 디렉터리에서 바로 불러오기 (저장하면 자동으로 다시 불러옴)
claude --plugin-dir .

# 플러그인 검증과 테스트
claude plugin validate .
claude plugin test
```

플러그인 코드는 `hooks/register.js`(Claude Code mod), 테스트는 `tests/`에 있습니다. v2.1.312에서 테스트했습니다.
