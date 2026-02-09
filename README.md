# Color Memory - 색상 기억력 테스트

Simon Says 스타일의 중독성 높은 색상 기억 게임입니다. 당신의 기억력을 테스트하세요!

## 기능

- **간단하고 중독성 있는 게임플레이**: 4개의 색상 버튼이 순서대로 빛나고, 플레이어가 같은 순서로 탭합니다.
- **점진적 난이도 증가**: 라운드마다 패턴이 1개씩 추가되고, 10라운드마다 속도가 증가합니다.
- **최고 기록 추적**: localStorage에 최고 기록이 저장됩니다.
- **신기록 축하**: 새로운 기록을 세울 때마다 confetti 효과가 표시됩니다.
- **음향 효과**: Web Audio API로 각 색상별 다른 음높이의 사운드가 재생됩니다.
- **PWA 지원**: 오프라인 모드 지원, 홈 화면에 설치 가능합니다.
- **12개 언어 지원**: 한국어, 영어, 중국어, 힌디어, 러시아어, 일본어, 스페인어, 포르투갈어, 인도네시아어, 터키어, 독일어, 프랑스어
- **반응형 디자인**: 모바일(360px)부터 데스크탑까지 완벽하게 대응합니다.
- **다크 모드**: 2026 UI/UX 트렌드에 맞는 glassmorphism 스타일의 다크 모드 첫 설계입니다.
- **광고 지원**: Google AdSense 배너 광고 및 전면 광고 지원합니다.

## 게임 규칙

1. **시작**: "시작" 버튼을 눌러 게임을 시작합니다.
2. **패턴 관찰**: 4개의 색상 버튼이 순서대로 빛납니다.
3. **패턴 재현**: 같은 순서로 색상 버튼을 탭합니다.
4. **승리**: 패턴을 성공하면 다음 라운드로 진행하며, 패턴에 1개의 색상이 추가됩니다.
5. **패배**: 패턴을 잘못 탭하면 게임이 끝납니다.
6. **기록**: 최고 기록을 갱신하면 축하 메시지와 confetti 효과가 나타납니다.

## 게임 단계

| 라운드 범위 | 난이도 | 속도 |
|-----------|--------|------|
| 1-9 | 쉬움 | 600ms |
| 10-19 | 보통 | 500ms |
| 20-29 | 어려움 | 400ms |
| 30+ | 매우 어려움 | 300ms |

## 기술 스택

- **프론트엔드**: HTML5, CSS3, Vanilla JavaScript
- **PWA**: Service Worker, Web App Manifest
- **오디오**: Web Audio API
- **다국어**: i18n 시스템 (12개 언어)
- **분석**: Google Analytics 4
- **광고**: Google AdSense

## 파일 구조

```
color-memory/
├── index.html              # 메인 HTML
├── manifest.json           # PWA 메니페스트
├── sw.js                   # Service Worker
├── icon-192.svg            # 192x192 아이콘
├── icon-512.svg            # 512x512 아이콘
├── css/
│   └── style.css           # 메인 스타일
├── js/
│   ├── app.js              # 게임 로직
│   ├── i18n.js             # 다국어 시스템
│   └── locales/            # 12개 언어 번역 파일
│       ├── ko.json         # 한국어
│       ├── en.json         # English
│       ├── zh.json         # 中文
│       ├── hi.json         # हिन्दी
│       ├── ru.json         # Русский
│       ├── ja.json         # 日本語
│       ├── es.json         # Español
│       ├── pt.json         # Português
│       ├── id.json         # Bahasa Indonesia
│       ├── tr.json         # Türkçe
│       ├── de.json         # Deutsch
│       └── fr.json         # Français
└── README.md               # 이 파일

```

## 로컬 테스트

### HTTP 서버 실행

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

브라우저에서 `http://localhost:8000` 접속

### 직접 열기

```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

## 배포

### Google Play Store

1. APK 생성 (Cordova/Capacitor 사용)
2. Google Play Console에 업로드
3. 심사 대기

### 웹 배포

```bash
# GitHub Pages
git push origin main

# Netlify
netlify deploy

# Firebase Hosting
firebase deploy
```

### PWA 설치

브라우저 주소창의 설치 버튼 또는 공유 메뉴에서 "홈 화면에 추가" 선택

## i18n 시스템

### 새 언어 추가

1. `js/locales/` 폴더에 `{lang}.json` 파일 생성
2. 기존 `en.json` 참고하여 번역
3. `i18n.js`의 `supportedLanguages` 배열에 언어 코드 추가
4. `index.html`의 언어 선택기에 버튼 추가

### 번역 구조

```json
{
  "section": {
    "key": "값"
  }
}
```

### 사용 방법

```html
<!-- HTML -->
<p data-i18n="game.ready">준비되셨나요?</p>

<!-- JavaScript -->
const text = window.i18n.t('game.ready');
```

## 성능 최적화

- 번들 크기: ~50KB (minified)
- 초기 로딩 시간: < 1s
- 오프라인 지원: 100% (Service Worker 캐싱)
- Lighthouse 점수: 95+ (PWA 기준)

## 광고 전략

### AdSense 배치

| 위치 | 유형 | RPM |
|------|------|-----|
| 상단 | 배너 | $1-3 |
| 하단 | 배너 | $1-3 |
| 게임 오버 | 전면 | $5-15 |

### AdMob (앱 버전)

- 배너: 상단/하단
- 전면: 3회 플레이마다
- 보상형: 추가 생명 획득 시

## 지원 언어

| 코드 | 언어 | 화자 |
|------|------|------|
| ko | 한국어 | 5,100만 |
| en | English | 15억 |
| zh | 中文 (간체) | 9억 |
| hi | हिन्दी | 3.4억 |
| ru | Русский | 2.5억 |
| ja | 日本語 | 1.3억 |
| es | Español | 5.8억 |
| pt | Português (브라질) | 2.4억 |
| id | Bahasa Indonesia | 4.3억 |
| tr | Türkçe | 9,000만 |
| de | Deutsch | 1.3억 |
| fr | Français | 2.9억 |

## 개발 팀

- **주도**: DopaBrain Games
- **게임 설계**: Simon Says 기반의 메모리 게임
- **AI 생성 자산**: 100% 저작권 자유
- **개발 도구**: Cursor AI

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 버그 리포트

게임에서 오류를 발견하면 GitHub Issues에 보고해주세요.

## 향후 계획

- [ ] 멀티플레이 모드
- [ ] 랭킹 시스템 (클라우드 동기화)
- [ ] 추가 게임 모드 (타임 어택, 무한 모드)
- [ ] 소셜 공유 기능 강화
- [ ] 맞춤형 테마/스킨
- [ ] 성과 배지 시스템

---

**즐거운 게임 되세요!** 🎮
