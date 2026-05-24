const KANANA_API_URL = "https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1/chat/completions";
const MODEL_NAME = "kanana-o";
const MAX_REQUEST_BYTES = 16 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate") {
      return handleGenerate(request);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleGenerate(request) {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: "지원하지 않는 요청 방식입니다." },
      405,
      { Allow: "POST" },
    );
  }

  const apiKey = getBearerToken(request.headers.get("Authorization"));
  if (!apiKey) {
    return jsonResponse({ error: "카나나 API 키를 입력해 주세요." }, 401);
  }

  try {
    const data = await readJsonBody(request);
    const cleaned = validatePayload(data);
    const prompt = buildPrompt(cleaned);
    const upstreamPayload = await requestCompletion(prompt, apiKey);
    const message = extractMessage(upstreamPayload);

    if (!message) {
      return jsonResponse({ error: "카나나 응답에서 메일 본문을 찾지 못했습니다." }, 502);
    }

    return jsonResponse({ message });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonResponse({ error: "카나나 API 응답 시간이 초과되었습니다." }, 504);
    }

    return jsonResponse({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

function getBearerToken(authorization) {
  if (!authorization) {
    return "";
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    throw new AppError("요청 본문이 너무 큽니다.", 400);
  }

  const bodyText = await request.text();
  if (!bodyText) {
    throw new AppError("요청 본문이 비어 있습니다.", 400);
  }

  if (new TextEncoder().encode(bodyText).length > MAX_REQUEST_BYTES) {
    throw new AppError("요청 본문이 너무 큽니다.", 400);
  }

  try {
    const data = JSON.parse(bodyText);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("요청 형식이 올바르지 않습니다.", 400);
    }
    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("JSON 요청만 지원합니다.", 400);
  }
}

function validatePayload(data) {
  const schema = {
    professorName: 80,
    courseName: 120,
    department: 120,
    studentId: 40,
    studentName: 80,
    userPrompt: 2000,
  };

  const cleaned = {};
  const missing = [];

  for (const [field, maxLength] of Object.entries(schema)) {
    const value = String(data[field] ?? "").trim();
    if (!value) {
      missing.push(field);
      continue;
    }

    if (value.length > maxLength) {
      throw new AppError("입력 내용이 너무 깁니다.", 400);
    }

    cleaned[field] = value;
  }

  if (missing.length > 0) {
    throw new AppError("모든 입력 항목을 채워 주세요.", 400);
  }

  return cleaned;
}

function normalizeProfessorName(name) {
  const trimmed = name.trim();
  return trimmed.endsWith("교수님") ? trimmed.replace(/교수님$/, "").trim() : trimmed;
}

function buildPrompt(data) {
  const professorName = normalizeProfessorName(data.professorName);

  return `# Instruction
당신은 대학생이 교수님께 보내는 비즈니스 이메일 작성기입니다. 아래 제공된 [Context]를 바탕으로, [Format & Style Rules]의 모든 형식적 규칙과 제약 사항을 100% 일치시켜 이메일 초안을 출력하세요.

# Context (상황 정보)
* 수신자: ${professorName} 교수님
* 수강 과목: ${data.courseName}
* 발신자 소속: ${data.department}
* 발신자 학번: ${data.studentId}
* 발신자 이름: ${data.studentName}
* 사용자의 추가 요청: ${data.userPrompt}

# Format & Style Rules (형식 및 어조 규칙)

**1. 제목 형식**
- 구조: \`[과목명] 핵심 목적 (소속 학번 이름)\`
- 핵심 목적은 사용자의 추가 요청을 바탕으로 자연스럽고 간결한 명사형 또는 정중한 문의형으로 재구성할 것.

**2. 본문 구조 및 단락 구분**
- 본문은 가독성을 위해 의미 단위로 반드시 줄바꿈을 적용하여 단락을 분리할 것.
- **[도입부]**
  - "${professorName} 교수님께," 또는 "안녕하세요, ${professorName} 교수님."으로 시작.
  - 다음 줄에 본인의 소속, 학번, 이름, 수강 과목을 명확히 기재.
- **[본론부]**
  - "다름이 아니라, ~로 인해 메일 드립니다."라는 문장 구조로 목적을 명확히 명시.
  - 사용자의 추가 요청을 바탕으로 교수님이 답변하기 쉬운 형태로 질문을 정리할 것.
  - 단순한 오픈형 질문을 피하고, 가능한 경우 일정, 절차, 기준, 가능 여부 등 답변 포인트가 분명한 문장으로 작성할 것.
- **[마무리부]**
  - 바쁜 시간을 할애한 것에 대한 감사 인사를 포함할 것.
  - "${data.studentName} 올림"으로 맺을 것.

**3. 어조 및 금지어 (절대 준수)**
- **문체:** 오직 정중한 문어체만 사용. '~요' 사용 금지.
- **이모티콘 금지:** \`ㅠㅠ\`, \`ㅎㅎ\`, \`^^\` 등 비격식적 기호 절대 사용 금지.
- **시대착오적 어휘 금지:** \`다름이 아니오라\`, \`금번\`, \`작금의\`, \`명일\` 등 지나치게 예스러운 표현 금지.
- **번역투 금지:** \`~에 관심을 가지고 있습니다\`, \`~하기를 희망합니다\` 등 딱딱한 기계식 표현 금지.
- **태도:** 감정적 호소나 요구가 아닌, 객관적이고 정중하게 피드백을 구하는 톤을 유지할 것.

# Output
아래 형식을 정확히 지켜서, 설명 없이 이메일 결과만 출력할 것.
제목: ...
본문:
...`;
}

async function requestCompletion(prompt, apiKey) {
  const response = await fetch(KANANA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      temperature: 0.35,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new AppError(resolveUpstreamError(response.status), mapUpstreamStatus(response.status));
  }

  if (!payload || typeof payload !== "object") {
    throw new AppError("카나나 응답을 해석하지 못했습니다.", 502);
  }

  return payload;
}

function extractMessage(payload) {
  return String(payload?.choices?.[0]?.message?.content ?? "").trim();
}

function mapUpstreamStatus(status) {
  if (status === 401 || status === 403 || status === 429) {
    return status;
  }

  if (status === 408 || status === 504) {
    return 504;
  }

  return status >= 500 ? 502 : 400;
}

function resolveUpstreamError(status) {
  if (status === 401) {
    return "카나나 API 키가 올바르지 않거나 만료되었습니다.";
  }

  if (status === 403) {
    return "현재 카나나 API 키로는 해당 모델에 접근할 수 없습니다.";
  }

  if (status === 429) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (status === 408 || status === 504) {
    return "카나나 API 응답 시간이 초과되었습니다.";
  }

  if (status >= 500) {
    return "카나나 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "카나나 API 요청이 실패했습니다.";
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
