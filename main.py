import os

from openai import OpenAI

BASE_URL = "https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1"
MODEL_NAME = "kanana-o"


def build_prompt(
    professor_name: str,
    course_name: str,
    department: str,
    student_id: str,
    student_name: str,
    user_prompt: str,
) -> str:
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


def main() -> None:
    api_key = os.environ.get("KANANA_API_KEY")
    if not api_key:
        raise SystemExit("KANANA_API_KEY 환경 변수를 설정해 주세요.")

    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    prompt = build_prompt(
        professor_name="OOO",
        course_name="데이터구조",
        department="컴퓨터공학과",
        student_id="20250123",
        student_name="홍길동",
        user_prompt="중간고사 일정과 공지 방식이 강의계획서 기준으로 진행되는지 확인하고 싶습니다.",
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.35,
    )

    print(response.choices[0].message.content)


if __name__ == "__main__":
    main()
