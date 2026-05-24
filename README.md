# Kanana Mail Studio

한국어 문어체에 강한 Kanana AI를 활용해 대학생이 교수님께 보낼 정중한 메일 초안을 작성하는 웹앱입니다. 카카오 AI 앰배서더 활동의 Kanana API 활용기 프로젝트로, KANANA429 찬욱이 제작했습니다.

연구와 제작 과정에 대한 자세한 내용은 아래 Notion 페이지를 참고하세요.

https://www.notion.so/Kanana-o-API-350460fb08a280ffad8ccae0ad4b7a6e?source=copy_link

## 구성

- `public/`: 브라우저에서 열리는 정적 UI
- `src/index.js`: Cloudflare Worker API 프록시
- `wrangler.toml`: Cloudflare Workers + Static Assets 배포 설정
- `main.py`: 선택 사항인 로컬 Python 테스트 서버

## Cloudflare 로컬 실행

1. 의존성을 설치합니다.

   ```powershell
   npm install
   ```

2. Wrangler 개발 서버를 실행합니다.

   ```powershell
   npm run dev
   ```

3. 터미널에 표시되는 로컬 주소를 브라우저에서 엽니다.

## Cloudflare 배포

1. Cloudflare 계정에 로그인합니다.

   ```powershell
   npx wrangler login
   ```

2. 배포합니다.

   ```powershell
   npm run deploy
   ```

배포가 끝나면 Wrangler가 `https://...workers.dev` 형식의 공용 링크를 출력합니다. 해당 링크를 공유하면 사용자는 본인 Kanana API 키로 서비스를 이용할 수 있습니다.

## API 키와 개인정보 안내

- 사용자의 Kanana API 키는 `/api/generate` 요청의 `Authorization` 헤더로만 전송됩니다.
- Worker는 API 키를 환경 변수, DB, 로그에 저장하지 않습니다.
- `브라우저에만 저장`을 켜면 API 키가 서버가 아니라 현재 브라우저의 `localStorage`에만 저장됩니다.
- 공용 PC에서는 API 키 저장을 사용하지 않는 것을 권장합니다.
- 교수님 성함, 이름, 학과, 학번, 메일 상황은 초안 생성을 위해 Kanana API로 전송됩니다.
- 생성된 메일은 초안이므로 실제 발송 전 사용자가 반드시 내용을 확인해야 합니다.
- 이 서비스는 카카오 공식 서비스가 아닌 카카오 AI 앰배서더 활동의 Kanana API 활용 데모입니다.

## 선택: Python 로컬 서버

기존 방식도 테스트용으로 남아 있습니다.

```powershell
python main.py
```

브라우저에서 `http://127.0.0.1:8000`을 열면 됩니다. 새 UI에서 입력한 API 키가 우선 사용되며, 환경 변수 `KANANA_API_KEY`도 fallback으로 지원합니다.
