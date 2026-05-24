import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

BASE_URL = "https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1"
MODEL_NAME = "kanana-o"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8000"))
ROOT_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT_DIR / "public"


def normalize_professor_name(name: str) -> str:
    trimmed = name.strip()
    if trimmed.endswith("교수님"):
        return trimmed.removesuffix("교수님").strip()
    return trimmed


def build_prompt(
    professor_name: str,
    course_name: str,
    department: str,
    student_id: str,
    student_name: str,
    user_prompt: str,
) -> str:
    professor_name = normalize_professor_name(professor_name)

    return f"""# Instruction
당신은 대학생이 교수님께 보내는 비즈니스 이메일 작성기입니다. 아래 제공된 [Context]를 바탕으로, [Format & Style Rules]의 모든 형식적 규칙과 제약 사항을 100% 일치시켜 이메일 초안을 출력하세요.

# Context (상황 정보)
* 수신자: {professor_name} 교수님
* 수강 과목: {course_name}
* 발신자 소속: {department}
* 발신자 학번: {student_id}
* 발신자 이름: {student_name}
* 사용자의 추가 요청: {user_prompt}

# Format & Style Rules (형식 및 어조 규칙)

**1. 제목 형식**
- 구조: `[과목명] 핵심 목적 (소속 학번 이름)`
- 핵심 목적은 사용자의 추가 요청을 바탕으로 자연스럽고 간결한 명사형 또는 정중한 문의형으로 재구성할 것.

**2. 본문 구조 및 단락 구분**
- 본문은 가독성을 위해 의미 단위로 반드시 줄바꿈을 적용하여 단락을 분리할 것.
- **[도입부]**
  - "{professor_name} 교수님께," 또는 "안녕하세요, {professor_name} 교수님."으로 시작.
  - 다음 줄에 본인의 소속, 학번, 이름, 수강 과목을 명확히 기재.
- **[본론부]**
  - "다름이 아니라, ~로 인해 메일 드립니다."라는 문장 구조로 목적을 명확히 명시.
  - 사용자의 추가 요청을 바탕으로 교수님이 답변하기 쉬운 형태로 질문을 정리할 것.
  - 단순한 오픈형 질문을 피하고, 가능한 경우 일정, 절차, 기준, 가능 여부 등 답변 포인트가 분명한 문장으로 작성할 것.
- **[마무리부]**
  - 바쁜 시간을 할애한 것에 대한 감사 인사를 포함할 것.
  - "{student_name} 올림"으로 맺을 것.

**3. 어조 및 금지어 (절대 준수)**
- **문체:** 오직 정중한 문어체만 사용. '~요' 사용 금지.
- **이모티콘 금지:** `ㅠㅠ`, `ㅎㅎ`, `^^` 등 비격식적 기호 절대 사용 금지.
- **시대착오적 어휘 금지:** `다름이 아니오라`, `금번`, `작금의`, `명일` 등 지나치게 예스러운 표현 금지.
- **번역투 금지:** `~에 관심을 가지고 있습니다`, `~하기를 희망합니다` 등 딱딱한 기계식 표현 금지.
- **태도:** 감정적 호소나 요구가 아닌, 객관적이고 정중하게 피드백을 구하는 톤을 유지할 것.

# Output
아래 형식을 정확히 지켜서, 설명 없이 이메일 결과만 출력할 것.
제목: ...
본문:
...
"""


def request_completion(prompt: str, api_key: str) -> dict:
    payload = {
        "model": MODEL_NAME,
        "temperature": 0.35,
        "messages": [{"role": "user", "content": prompt}],
    }
    body = json.dumps(payload).encode("utf-8")
    api_request = request.Request(
        f"{BASE_URL}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with request.urlopen(api_request, timeout=60) as response:
        response_body = response.read().decode("utf-8")
        return json.loads(response_body)


def map_upstream_status(status_code: int) -> HTTPStatus:
    if status_code in (401, 403, 429):
        return HTTPStatus(status_code)
    if status_code in (408, 504):
        return HTTPStatus.GATEWAY_TIMEOUT
    if status_code >= 500:
        return HTTPStatus.BAD_GATEWAY
    return HTTPStatus.BAD_REQUEST


def resolve_upstream_error(status_code: int) -> str:
    if status_code == 401:
        return "Kanana API 키가 올바르지 않거나 만료되었습니다."
    if status_code == 403:
        return "현재 Kanana API 키로는 해당 모델에 접근할 수 없습니다."
    if status_code == 429:
        return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
    if status_code in (408, 504):
        return "Kanana API 응답 시간이 초과되었습니다."
    if status_code >= 500:
        return "Kanana 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    return "Kanana API 요청이 실패했습니다."


class LocalAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        static_dir = PUBLIC_DIR if PUBLIC_DIR.exists() else ROOT_DIR
        super().__init__(*args, directory=str(static_dir), **kwargs)

    def do_POST(self) -> None:
        if self.path != "/api/generate":
            self.send_json({"error": "지원하지 않는 경로입니다."}, HTTPStatus.NOT_FOUND)
            return

        api_key = self.get_api_key()
        if not api_key:
            self.send_json(
                {"error": "Kanana API 키를 입력해 주세요."},
                HTTPStatus.UNAUTHORIZED,
            )
            return

        try:
            data = self.read_json_body()
            cleaned = self.validate_payload(data)
            prompt = build_prompt(**cleaned)
            upstream_payload = request_completion(prompt, api_key)
            message = (
                upstream_payload.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )

            if not message:
                self.send_json(
                    {"error": "Kanana 응답에서 메일 본문을 찾지 못했습니다."},
                    HTTPStatus.BAD_GATEWAY,
                )
                return

            self.send_json({"message": message})
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except error.HTTPError as exc:
            self.send_json(
                {"error": resolve_upstream_error(exc.code)},
                map_upstream_status(exc.code),
            )
        except error.URLError as exc:
            self.send_json(
                {"error": f"Kanana API에 연결하지 못했습니다: {exc.reason}"},
                HTTPStatus.BAD_GATEWAY,
            )
        except TimeoutError:
            self.send_json(
                {"error": "Kanana API 응답 시간이 초과되었습니다."},
                HTTPStatus.GATEWAY_TIMEOUT,
            )

    def get_api_key(self) -> str:
        authorization = self.headers.get("Authorization", "")
        if authorization.lower().startswith("bearer "):
            return authorization[7:].strip()

        return os.environ.get("KANANA_API_KEY", "").strip()

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise ValueError("요청 본문이 비어 있습니다.")
        if content_length > 1024 * 1024:
            raise ValueError("요청 본문이 너무 큽니다.")

        body = self.rfile.read(content_length).decode("utf-8")
        try:
            data = json.loads(body)
        except json.JSONDecodeError as exc:
            raise ValueError("JSON 요청만 지원합니다.") from exc

        if not isinstance(data, dict):
            raise ValueError("요청 형식이 올바르지 않습니다.")
        return data

    def validate_payload(self, data: dict) -> dict:
        fields = {
            "professor_name": "professorName",
            "course_name": "courseName",
            "department": "department",
            "student_id": "studentId",
            "student_name": "studentName",
            "user_prompt": "userPrompt",
        }
        cleaned = {
            python_name: str(data.get(js_name, "")).strip()
            for python_name, js_name in fields.items()
        }

        missing = [name for name, value in cleaned.items() if not value]
        if missing:
            raise ValueError("모든 입력 항목을 채워 주세요.")

        return cleaned

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), LocalAppHandler)
    print(f"Local server running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
