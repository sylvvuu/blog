# SV Career 블로그

채용 공고와 교육 소식을 모아 보여 주는 정적 블로그입니다. HTML과 JavaScript로 만들었고, 글 데이터는 Firebase Firestore에 저장합니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 블로그 메인 (교육, 채용 공고, 문의 바로가기) |
| `admin.html` | 관리자 페이지 (Google 로그인, 글 작성·수정·삭제, 외부 API 키 설정) |
| `js/config.js` | Firebase 설정값, 관리자 이메일, 회사명 |
| `js/app.js` | 블로그 화면 로직, GA4 이벤트 전송 |
| `js/admin.js` | 관리자 화면 로직 |
| `js/seed.js` | 초기 샘플 글 |
| `firestore.rules` | 읽기는 공개 글만, 쓰기는 관리자만 허용 |
| `docs/PRD.md` | 기획서 (문제 정의, 지표, 개선 필요 사항) |
| `docs/WORKLOG.md` | 작업 기록 |

## 1. Firebase 설정

1. Firebase 콘솔에서 프로젝트 `sylvi-electronic`을 엽니다. 프로젝트 표시 이름은 `SV Career`, 웹 앱 닉네임은 `sv-career-web`입니다. 프로젝트 ID는 바꿀 수 없으므로 그대로 둡니다.
2. **Firestore Database**를 만들고 위치를 `asia-northeast3 (서울)`로 선택합니다.
3. **Authentication > 시작하기 > Google**을 사용 설정하고 지원 이메일을 `fkdna3@gmail.com`으로 지정합니다.
4. **프로젝트 설정 > 일반 > 내 앱 > 웹 앱 추가**를 하고 표시되는 `firebaseConfig` 값을 `js/config.js`에 붙여넣습니다.
5. **Firestore > 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 게시합니다.
6. **Authentication > 설정 > 승인된 도메인**에 `sylvieee.vercel.app`과 `sylvvuu.github.io`를 추가합니다.

## 2. Google Analytics 연결

- 현재 `index.html`과 `admin.html`에 측정 ID가 들어 있습니다. 새 속성을 쓸 때만 `G-` 값을 바꿉니다.
- 측정 ID는 GA4 관리 > 데이터 스트림에서 확인합니다.
- Firebase 콘솔에서 Analytics를 켜면 같은 속성에 자동으로 연결됩니다.

## 3. 외부 API 키 설정 (관리자 페이지)

관리자 페이지에서 아래 두 키를 저장하면 홈 화면에 반영됩니다.

| 기능 | 키 위치 (Firestore) | 설명 |
| --- | --- | --- |
| 공채속보 (고용24 Open-API) | `settings/jobs` | 홈 하단 최신 공고 5건 |
| 서울 실시간 날씨 (기상청) | `settings/weather` | 헤더 아래 날씨 위젯 |

> 주의: 이 키는 Firestore 설정 문서에 저장됩니다. 설정 문서를 누구나 읽을 수 있는지 보안 규칙을 확인해야 합니다. 자세한 경고는 `docs/WORKLOG.md`에 있습니다.

## 4. 로컬 확인

```bash
npx serve .
```

브라우저에서 `http://localhost:3000`과 `http://localhost:3000/admin.html`을 엽니다. 로컬 주소를 승인된 도메인에 추가해야 로그인이 됩니다.

## 5. 관리자 사용법

1. `admin.html`에서 `fkdna3@gmail.com` 계정으로 로그인합니다.
2. 글이 없으면 **샘플 글 등록** 버튼을 한 번 눌러 샘플을 넣습니다.
3. 왼쪽 목록에서 글을 고르거나 **+ 새 글 작성**을 누릅니다.
4. 분류를 **채용 공고**로 두면 신입공채·경력직, 근무지, 마감 항목이 나타납니다.

## 6. 배포

- 공개 배포 주소 2곳 (같은 main 코드):
  - Vercel: `https://sylvieee.vercel.app/`
  - GitHub Pages: `https://sylvvuu.github.io/blog/`
- `sylvielectronics.vercel.app`은 위 주소로 307 리다이렉트됩니다.
- 두 주소 모두 `main` 브랜치 push 후 반영됩니다. 같은 측정 ID를 쓰므로 GA에서 호스트 이름으로 나눠 봅니다.

## 7. GitHub 업데이트

```bash
git add .
git commit -m "블로그 업데이트"
git push
```

## 8. 추가 설정 (공개 설정 · 사진 · 보안 규칙)

- 글마다 **공개** 또는 **나만보기**를 고를 수 있습니다. 나만보기 글은 관리자만 볼 수 있습니다.
- 글 사진은 Unsplash 등 무료 사진 주소를 `사진 주소`에 넣고, 출처를 `사진 출처 표기`에 적습니다.
- Firestore 보안 규칙(`firestore.rules`)을 바꾸면 Firebase 콘솔 > Firestore > 규칙에 붙여 넣고 **게시**해야 적용됩니다.
- GA4 이벤트 목록 (실제 코드 기준)
  - 화면: `page_view`, `page_time`
  - 글: `post_read`(완독), `post_like`, `post_unlike`, `post_scrap`, `post_unscrap`, `post_comment`, `share`
  - 지원: `post_apply`, `post_apply_submit`
  - 문의: `inquiry_submit`
  - 공채속보: `job_list_view`, `job_item_click`
- 11/18 이전에는 완독 이벤트 이름이 `post_complete`였고, 글 조회 이벤트 `post_view`도 있었습니다. 이전 데이터를 볼 때 이 이름 변경을 고려합니다.
