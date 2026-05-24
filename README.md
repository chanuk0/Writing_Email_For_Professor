# Kanana Mail Studio

교수님께 보낼 메일 초안을 카나나 API로 생성하는 웹앱입니다. 사용자는 본인 카나나 API 키를 입력해 사용하고, 배포 서버는 API 키를 저장하지 않습니다.

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

배포가 끝나면 Wrangler가 `*.workers.dev` 공용 링크를 출력합니다. Cloudflare Workers Free 한도를 넘으면 요청이 실패할 수 있지만, 별도 유료 플랜을 켜지 않는 한 운영 서버 비용은 0원을 목표로 합니다.

## API 키 보안

- 사용자의 카나나 API 키는 `/api/generate` 요청의 `Authorization` 헤더로만 전송됩니다.
- Worker는 키를 환경 변수, DB, 로그에 저장하지 않습니다.
- `이 기기에 기억`을 켜면 키가 서버가 아니라 현재 브라우저의 `localStorage`에만 저장됩니다.
- 공용 PC에서는 `이 기기에 기억`을 사용하지 않는 것을 권장합니다.

## 선택: Python 로컬 서버

기존 방식도 테스트용으로 남아 있습니다.

```powershell
python main.py
```

브라우저에서 `http://127.0.0.1:8000`을 열면 됩니다. 새 UI에서 입력한 API 키가 우선 사용되며, 환경 변수 `KANANA_API_KEY`도 fallback으로 지원합니다.
