# Sylvi 일렉트로닉 인사팀 블로그

채용 공고와 교육 소식을 올리는 정적 블로그입니다. HTML과 JavaScript로 만들었고, 데이터는 Firebase Firestore에 저장합니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 블로그 메인 (최신 글, 교육, 채용 공고) |
| `admin.html` | 관리자 페이지 (Google 로그인, 글 작성·수정·삭제) |
| `js/config.js` | Firebase 설정값, 관리자 이메일, 회사명 |
| `js/app.js` | 블로그 화면 로직 |
| `js/admin.js` | 관리자 화면 로직 |
| `js/seed.js` | 초기 샘플 글 |
| `firestore.rules` | 읽기는 공개, 쓰기는 관리자만 허용 |

## 1. Firebase 설정

1. Firebase 콘솔에서 프로젝트 `sylvi-electronic`을 엽니다.
2. **Firestore Database**를 만들고 위치를 `asia-northeast3 (서울)`로 선택합니다.
3. **Authentication > 시작하기 > Google**을 사용 설정하고 지원 이메일을 `fkdna3@gmail.com`으로 지정합니다.
4. **프로젝트 설정 > 일반 > 내 앱 > 웹 앱 추가**를 하고 표시되는 `firebaseConfig` 값을 `js/config.js`에 붙여넣습니다.
5. **Firestore > 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 게시합니다.
6. **Authentication > 설정 > 승인된 도메인**에 배포 도메인(예: `xxx.vercel.app`)을 추가합니다.

## 2. Google Analytics 연결

1. [analytics.google.com](https://analytics.google.com)에서 속성을 만들고 웹 데이터 스트림을 추가합니다.
2. 표시되는 **측정 ID**(`G-`로 시작)를 복사합니다.
3. `index.html`과 `admin.html`에 있는 `G-XXXXXXXXXX`를 모두 실제 ID로 바꿉니다.

Firebase 콘솔에서 Analytics를 켜면 같은 속성에 자동으로 연결됩니다.

## 3. 로컬 확인

```bash
npx serve .
```

브라우저에서 `http://localhost:3000`과 `http://localhost:3000/admin.html`을 엽니다. 로컬 주소를 승인된 도메인에 추가해야 로그인이 됩니다.

## 4. 관리자 사용법

1. `admin.html`에서 `fkdna3@gmail.com` 계정으로 로그인합니다.
2. 글이 없으면 **샘플 글 등록** 버튼을 한 번 눌러 샘플을 넣습니다.
3. 왼쪽 목록에서 글을 고르거나 **+ 새 글 작성**을 누릅니다.
4. 분류를 **채용 공고**로 두면 신입공채·경력직, 근무지, 마감 항목이 나타납니다.

## 5. 배포 (Vercel)

1. [vercel.com](https://vercel.com)에서 GitHub 저장소를 Import합니다.
2. Framework Preset은 `Other`로 두고 바로 Deploy합니다. 빌드 명령은 필요하지 않습니다.
3. 배포 후 주소를 Firebase 승인된 도메인에 추가합니다.

## 6. GitHub 업데이트

```bash
git add .
git commit -m "블로그 업데이트"
git push
```

Vercel은 `main` 브랜치에 push될 때마다 자동으로 다시 배포합니다.
