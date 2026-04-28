const API_BASE_URL = "https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1";
const MODEL_NAME = "kanana-o";
const PROFILE_STORAGE_KEY = "kanana-mail-studio-profile";

const form = document.querySelector("#mail-form");
const apiKeyInput = document.querySelector("#apiKey");
const professorNameInput = document.querySelector("#professorName");
const courseNameInput = document.querySelector("#courseName");
const studentNameInput = document.querySelector("#studentName");
const departmentInput = document.querySelector("#department");
const studentIdInput = document.querySelector("#studentId");
const userPromptInput = document.querySelector("#userPrompt");
const rememberProfileInput = document.querySelector("#rememberProfile");
const generateButton = document.querySelector("#generateButton");
const toggleApiKeyButton = document.querySelector("#toggleApiKey");
const fillExampleButton = document.querySelector("#fillExampleButton");
const clearButton = document.querySelector("#clearButton");
const copySubjectButton = document.querySelector("#copySubjectButton");
const copyBodyButton = document.querySelector("#copyBodyButton");
const copyAllButton = document.querySelector("#copyAllButton");
const copyPromptButton = document.querySelector("#copyPromptButton");
const statusMessage = document.querySelector("#statusMessage");
const subjectOutput = document.querySelector("#subjectOutput");
const bodyOutput = document.querySelector("#bodyOutput");
const rawOutput = document.querySelector("#rawOutput");
const promptPreview = document.querySelector("#promptPreview");

const profileInputs = [
  professorNameInput,
  courseNameInput,
  studentNameInput,
  departmentInput,
  studentIdInput,
];

const exampleData = {
  professorName: "김민준",
  courseName: "데이터구조",
  studentName: "홍길동",
  department: "컴퓨터공학과",
  studentId: "20250123",
  userPrompt:
    "중간고사 일정이 강의계획서에 적힌 내용대로 진행되는지, 혹은 날짜나 장소에 대한 별도 공지가 예정되어 있는지 정중하게 문의하고 싶습니다.",
};

initialize();

function initialize() {
  restoreProfile();
  updatePromptPreview();

  form.addEventListener("submit", handleSubmit);
  toggleApiKeyButton.addEventListener("click", toggleApiKeyVisibility);
  fillExampleButton.addEventListener("click", fillExampleData);
  clearButton.addEventListener("click", clearForm);
  copySubjectButton.addEventListener("click", () => copyText(subjectOutput.textContent, "제목"));
  copyBodyButton.addEventListener("click", () => copyText(bodyOutput.textContent, "본문"));
  copyAllButton.addEventListener("click", () => {
    const fullDraft = `제목: ${subjectOutput.textContent}\n\n${bodyOutput.textContent}`;
    copyText(fullDraft, "전체 초안");
  });
  copyPromptButton.addEventListener("click", () => copyText(promptPreview.textContent, "프롬프트"));

  [apiKeyInput, userPromptInput, rememberProfileInput, ...profileInputs].forEach((input) => {
    input.addEventListener("input", updatePromptPreview);
    input.addEventListener("change", updatePromptPreview);
  });
}

function getFormData() {
  return {
    apiKey: apiKeyInput.value.trim(),
    professorName: professorNameInput.value.trim(),
    courseName: courseNameInput.value.trim(),
    studentName: studentNameInput.value.trim(),
    department: departmentInput.value.trim(),
    studentId: studentIdInput.value.trim(),
    userPrompt: userPromptInput.value.trim(),
  };
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
- 구조: [과목명] 핵심 목적 (소속 학번 이름)
- 핵심 목적은 사용자의 추가 요청을 바탕으로 자연스럽고 간결하게 재구성할 것.

**2. 본문 구조 및 단락 구분**
- 본문은 가독성을 위해 의미 단위로 줄바꿈하여 단락을 분리할 것.
- 도입부는 "${professorName} 교수님께," 또는 "안녕하세요, ${professorName} 교수님."으로 시작할 것.
- 도입부 다음 줄에 본인의 소속, 학번, 이름, 수강 과목을 명확히 기재할 것.
- 본론부에는 "다름이 아니라, ~로 인해 메일 드립니다." 구조를 사용해 메일 목적을 분명하게 밝힐 것.
- 질문은 단순한 오픈형 표현을 피하고, 교수님이 답변하기 쉬운 형태로 구체화할 것.
- 마무리부에는 감사 인사를 포함하고 "${data.studentName} 올림"으로 맺을 것.

**3. 어조 및 금지어 (절대 준수)**
- 문체는 정중한 문어체만 사용하고 '~요'는 사용하지 말 것.
- 이모티콘, 과도하게 구어체인 표현, 지나치게 예스러운 표현은 사용하지 말 것.
- 번역투 표현을 피하고 자연스러운 한국어로 작성할 것.
- 감정적 호소보다는 객관적이고 정중하게 피드백을 구하는 톤을 유지할 것.

# Output
아래 형식을 정확히 지키고, 다른 설명은 덧붙이지 말 것.
제목: ...
본문:
...`;
}

function updatePromptPreview() {
  const data = getFormData();
  promptPreview.textContent = buildPrompt({
    professorName: data.professorName || "OOO",
    courseName: data.courseName || "과목명",
    studentName: data.studentName || "이름",
    department: data.department || "학과",
    studentId: data.studentId || "학번",
    userPrompt: data.userPrompt || "작성하고 싶은 메일 상황을 입력하세요.",
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  const data = getFormData();
  if (!data.apiKey) {
    setStatus("카나나 API 키를 먼저 입력해 주세요.", "error");
    apiKeyInput.focus();
    return;
  }

  const prompt = buildPrompt(data);
  persistProfile();
  setLoadingState(true);
  setStatus("카나나 API에 초안 생성을 요청하고 있습니다.", "pending");
  rawOutput.textContent = "응답을 기다리는 중입니다.";

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.35,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const responseText = await response.text();
    rawOutput.textContent = responseText || "응답 본문이 비어 있습니다.";

    if (!response.ok) {
      throw new Error(buildApiErrorMessage(response.status, responseText));
    }

    const payload = JSON.parse(responseText);
    const message = payload?.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error("응답에서 메일 본문을 찾지 못했습니다.");
    }

    renderDraft(parseDraft(message));
    setStatus("메일 초안이 생성되었습니다.", "success");
  } catch (error) {
    console.error(error);
    renderDraft({ subject: "", body: "" });
    setStatus(resolveDisplayError(error), "error");
  } finally {
    setLoadingState(false);
  }
}

function buildApiErrorMessage(statusCode, responseText) {
  if (statusCode === 401) {
    return "API 키가 올바르지 않거나 만료되었습니다.";
  }

  if (statusCode === 403) {
    return "현재 API 키로는 해당 모델에 접근할 수 없습니다.";
  }

  if (statusCode === 429) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (statusCode >= 500) {
    return "카나나 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return `요청이 실패했습니다. 상태 코드: ${statusCode}\n${responseText}`;
}

function resolveDisplayError(error) {
  if (error instanceof TypeError) {
    return "브라우저에서 API 요청이 차단되었습니다. GitHub Pages 환경에서는 CORS 설정이 필요할 수 있습니다.";
  }

  return error.message || "알 수 없는 오류가 발생했습니다.";
}

function parseDraft(message) {
  const subjectMatch = message.match(/(?:^|\n)제목\s*[:：]\s*(.+)/);
  const bodyMatch = message.match(/(?:^|\n)본문\s*[:：]\s*([\s\S]+)/);

  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }

  const lines = message
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length >= 2) {
    return {
      subject: lines[0].replace(/^제목\s*[:：]\s*/, "").trim(),
      body: lines.slice(1).join("\n"),
    };
  }

  return {
    subject: "제목을 분리하지 못했습니다.",
    body: message,
  };
}

function renderDraft(draft) {
  const hasContent = Boolean(draft.subject || draft.body);

  subjectOutput.textContent = draft.subject || "생성 결과가 여기에 표시됩니다.";
  bodyOutput.textContent = draft.body || "생성 결과가 여기에 표시됩니다.";

  toggleResultState(subjectOutput, Boolean(draft.subject));
  toggleResultState(bodyOutput, Boolean(draft.body));

  copySubjectButton.disabled = !draft.subject;
  copyBodyButton.disabled = !draft.body;
  copyAllButton.disabled = !hasContent;
}

function toggleResultState(element, hasContent) {
  element.classList.toggle("has-content", hasContent);
  element.classList.toggle("muted-box", !hasContent);
}

function setLoadingState(isLoading) {
  generateButton.disabled = isLoading;
  fillExampleButton.disabled = isLoading;
  clearButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "생성 중..." : "메일 초안 생성";
}

function setStatus(message, tone) {
  statusMessage.textContent = message;
  statusMessage.classList.remove("is-error", "is-success");

  if (tone === "error") {
    statusMessage.classList.add("is-error");
  }

  if (tone === "success") {
    statusMessage.classList.add("is-success");
  }
}

function toggleApiKeyVisibility() {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleApiKeyButton.textContent = isPassword ? "숨기기" : "표시";
}

function fillExampleData() {
  professorNameInput.value = exampleData.professorName;
  courseNameInput.value = exampleData.courseName;
  studentNameInput.value = exampleData.studentName;
  departmentInput.value = exampleData.department;
  studentIdInput.value = exampleData.studentId;
  userPromptInput.value = exampleData.userPrompt;
  updatePromptPreview();
  setStatus("예시 입력을 채웠습니다. API 키를 넣고 바로 생성할 수 있습니다.", "pending");
}

function clearForm() {
  form.reset();
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  subjectOutput.textContent = "생성 결과가 여기에 표시됩니다.";
  bodyOutput.textContent = "생성 결과가 여기에 표시됩니다.";
  rawOutput.textContent = "아직 원본 응답이 없습니다.";
  copySubjectButton.disabled = true;
  copyBodyButton.disabled = true;
  copyAllButton.disabled = true;
  toggleResultState(subjectOutput, false);
  toggleResultState(bodyOutput, false);
  updatePromptPreview();
  setStatus("입력과 저장된 기본 정보를 비웠습니다.", "pending");
}

function persistProfile() {
  if (!rememberProfileInput.checked) {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    return;
  }

  const data = getFormData();
  const profile = {
    professorName: data.professorName,
    courseName: data.courseName,
    studentName: data.studentName,
    department: data.department,
    studentId: data.studentId,
    rememberProfile: true,
  };

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function restoreProfile() {
  const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!saved) {
    return;
  }

  try {
    const profile = JSON.parse(saved);
    professorNameInput.value = profile.professorName || "";
    courseNameInput.value = profile.courseName || "";
    studentNameInput.value = profile.studentName || "";
    departmentInput.value = profile.department || "";
    studentIdInput.value = profile.studentId || "";
    rememberProfileInput.checked = Boolean(profile.rememberProfile);
  } catch (error) {
    console.warn("저장된 기본 정보를 복원하지 못했습니다.", error);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
}

async function copyText(text, label) {
  if (!text) {
    setStatus(`복사할 ${label} 내용이 없습니다.`, "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label}을(를) 클립보드에 복사했습니다.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("클립보드 복사에 실패했습니다.", "error");
  }
}
