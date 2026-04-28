# Kanana Mail Studio

교수님께 보낼 메일 초안을 카나나 API로 생성하는 로컬 테스트용 웹앱입니다.

## 파일 구성

- `index.html`: 페이지 구조
- `styles.css`: UI 스타일
- `app.js`: 화면 동작, 로컬 서버 호출, 결과 파싱
- `main.py`: 정적 파일 서버와 카나나 API 프록시

## 로컬 테스트 방법

1. PowerShell에서 프로젝트 폴더로 이동합니다.

   ```powershell
   cd C:\Users\great\Desktop\Writing_Email_For_Professor
   ```

2. 카나나 API 키를 환경 변수로 설정합니다.

   ```powershell
   $env:KANANA_API_KEY="본인_API_키"
   ```

3. 로컬 서버를 실행합니다.

   ```powershell
   python main.py
   ```

4. 브라우저에서 아래 주소를 엽니다.

   ```text
   http://127.0.0.1:8000
   ```

서버를 멈추려면 터미널에서 `Ctrl+C`를 누르면 됩니다. 다른 포트를 쓰고 싶으면 실행 전에 `$env:PORT="8080"`처럼 지정할 수 있습니다.
