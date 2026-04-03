const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const DEMO_BIG_CATEGORY_ID = "14";
const DEMO_MED_CATEGORY_ID = "1401";

const waitFor = async (predicate, timeout = 4500, interval = 120) => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const value = predicate();

    if (value) {
      return value;
    }

    await wait(interval);
  }

  return null;
};

const getElement = (selector) => document.querySelector(selector);

const setNativeValue = (element, value) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const fillIfEmpty = (element, value) => {
  if (!element) return false;

  const currentValue = String(element.value ?? "").trim();
  if (currentValue.length > 0) return true;

  setNativeValue(element, value);
  return true;
};

const clickWhenReady = async (selector) => {
  const element = await waitFor(() => {
    const target = getElement(selector);
    return target && !target.disabled ? target : null;
  });

  if (!element) {
    return false;
  }

  element.click();
  return true;
};

const clickFirst = async (selector) => {
  const element = await waitFor(() => document.querySelector(selector));

  if (!element || element.disabled) {
    return false;
  }

  element.click();
  return true;
};

const startVideoOnboarding = async () => {
  const startButton = await waitFor(() => {
    const button = getElement(".global-video-start");
    return button && !button.disabled ? button : null;
  }, 8000, 120);

  if (!startButton) {
    return false;
  }

  window.dispatchEvent(new Event("student-onboarding-video-confirmed"));

  const videoContainer = await waitFor(
    () => getElement(".video-container"),
    8000,
    120
  );

  return Boolean(videoContainer);
};

const clickRotating = async (selector, storageKey) => {
  const elements = await waitFor(
    () => Array.from(document.querySelectorAll(selector)),
    4500
  );

  if (!elements || elements.length === 0) {
    return false;
  }

  const rawIndex = Number(sessionStorage.getItem(storageKey) ?? "0");
  const safeIndex = Number.isFinite(rawIndex) ? rawIndex : 0;
  const target = elements[safeIndex % elements.length];

  sessionStorage.setItem(storageKey, String(safeIndex + 1));
  target.click();
  return true;
};

const clickByDataAttr = async (selector, dataAttr, value) => {
  const element = await waitFor(() =>
    document.querySelector(`${selector}[${dataAttr}='${value}']`)
  );

  if (!element || element.disabled) {
    return false;
  }

  element.click();
  return true;
};

const selectDemoBigCategory = async () => {
  const clicked = await clickByDataAttr(
    ".global-big-card",
    "data-big-id",
    DEMO_BIG_CATEGORY_ID
  );

  if (clicked) {
    return true;
  }

  return clickRotating(".global-big-card", "onboarding_big_idx");
};

const selectDemoMediumCategory = async () => {
  const clicked = await clickByDataAttr(
    ".global-med-card",
    "data-mid-id",
    DEMO_MED_CATEGORY_ID
  );

  if (clicked) {
    return true;
  }

  const cards = await waitFor(
    () => Array.from(document.querySelectorAll(".global-med-card")),
    4500
  );

  if (!cards || cards.length === 0) {
    return false;
  }

  cards[0].click();
  return true;
};

const fillName = async () => {
  const nameInput = await waitFor(() => getElement('input[name="name"]'));
  const done = fillIfEmpty(nameInput, "홍길동");

  await wait(180);
  return done;
};

const fillSsn = async () => {
  const ssn1Input = await waitFor(() => getElement('input[name="ssn1"]'));
  const ssn2Input = getElement('input[name="ssn2"]');

  if (!ssn1Input || !ssn2Input) return false;

  fillIfEmpty(ssn1Input, "900101");
  fillIfEmpty(ssn2Input, "1");

  await wait(180);
  return true;
};

const fillPhone = async () => {
  const phone1Select = await waitFor(() => getElement('select[name="phone1"]'));
  const phone2Input = getElement('input[name="phone2"]');
  const phone3Input = getElement('input[name="phone3"]');

  if (!phone1Select || !phone2Input || !phone3Input) return false;

  setNativeValue(phone1Select, "010");
  fillIfEmpty(phone2Input, "1234");
  fillIfEmpty(phone3Input, "5678");

  await wait(180);
  return true;
};

const fillEmail = async () => {
  const emailIdInput = await waitFor(() => getElement('input[name="emailId"]'));
  const emailDomainSelect = getElement('select[name="emailDomain"]');

  if (!emailIdInput || !emailDomainSelect) return false;

  fillIfEmpty(emailIdInput, "jinro.demo");
  setNativeValue(emailDomainSelect, "gmail.com");

  await wait(180);
  return true;
};

const getSmallSelectedCount = () => {
  const text = document.querySelector(".student-progress")?.textContent ?? "";
  const match = text.match(/(\d+)\s*\/\s*3/);

  if (match) {
    return Number(match[1]);
  }

  const selectedByAttr = document.querySelectorAll(
    ".global-small-card[data-selected='true']"
  ).length;

  if (selectedByAttr > 0) {
    return selectedByAttr;
  }

  return document.querySelectorAll(".selected-video-item").length;
};

const selectFirstVideoOnly = async () => {
  const cardsReady = await waitFor(
    () => document.querySelectorAll(".global-small-card").length > 0,
    2600
  );

  if (!cardsReady) {
    return false;
  }

  if (getSmallSelectedCount() >= 1) {
    return true;
  }

  const candidates = Array.from(
    document.querySelectorAll(".global-small-card")
  ).filter((element) => element.dataset.selected !== "true");

  if (candidates.length === 0) {
    return false;
  }

  const before = getSmallSelectedCount();
  candidates[0].click();

  const changed = await waitFor(() => getSmallSelectedCount() > before, 1800, 120);
  return Boolean(changed);
};

const continueToCheckoutFromSmall = async () => {
  if (getSmallSelectedCount() < 1) {
    return false;
  }

  const nextButton = await waitFor(
    () => document.querySelector(".global-category-next.next-button-active"),
    2500,
    100
  );

  if (!nextButton || nextButton.disabled) {
    return false;
  }

  nextButton.click();
  return true;
};

const answerSurveyAndSubmit = async () => {
  const maxLoops = 20;
  const initialPath = window.location.pathname;

  for (let i = 0; i < maxLoops; i += 1) {
    if (window.location.pathname !== initialPath) {
      return true;
    }

    const firstOption = await waitFor(() => getElement(".global-survey-option"));
    const nextButton = getElement(".global-survey-next");

    if (!firstOption || !nextButton) {
      return false;
    }

    const buttonText = nextButton.textContent?.trim() ?? "";
    const shouldSubmitStep =
      buttonText === "결과 제출" || buttonText === "다음 영상으로";
    const isSubmitStep = buttonText !== "다음 문항";

    if (nextButton.disabled) {
      firstOption.click();
      const enabled = await waitFor(() => !nextButton.disabled, 1000, 100);

      if (!enabled) {
        return false;
      }
    }

    if (shouldSubmitStep) {
      nextButton.click();
      return true;
    }

    nextButton.click();
    await wait(280);
  }

  return false;
};

export const FLOW = [
  {
    route: "/",
    steps: [
      {
        target: ".onboard-start-card",
        title: "내담자용 버튼",
        text: "내담자 카드를 선택하여 '너, 내 진로가 되라'를 경험해보세요.",
        action: async () => clickWhenReady(".onboard-start-card"),
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/agreement",
    steps: [
      {
        target: ".onboard-agree1",
        title: "개인정보 수집 동의",
        text: "진단에 필요한 기본 정보 처리에 대한 동의 영역입니다.",
        action: async () => clickWhenReady(".onboard-agree1 input[type='checkbox']"),
      },
      {
        target: ".onboard-agree2",
        title: "카메라 촬영 동의",
        text: "상담중에 있어 카메라 사용 동의 영역입니다.",
        action: async () => clickWhenReady(".onboard-agree2 input[type='checkbox']"),
      },
      {
        target: ".onboard-start-btn",
        title: "진단 시작 버튼",
        text: "모든 동의 사항에 체크 후 진단을 시작하는 버튼입니다.",
        action: async () => clickWhenReady(".onboard-start-btn"),
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/login",
    steps: [
      {
        target: ".onboard-name",
        title: "이름 입력란",
        text: "내담자 이름을 입력하는 필드입니다.",
        action: fillName,
      },
      {
        target: ".onboard-ssn",
        title: "주민등록번호 입력란",
        text: "생년월일과 뒷자리 첫 자리를 입력하는 필드입니다.",
        action: fillSsn,
      },
      {
        target: ".onboard-phone",
        title: "연락처 입력란",
        text: "진행 안내에 사용하는 휴대폰 번호 입력 필드입니다.",
        action: fillPhone,
      },
      {
        target: ".onboard-email",
        title: "이메일 입력란",
        text: "결과 수신에 사용될 이메일 입력 필드입니다.",
        action: fillEmail,
      },
      {
        target: ".onboard-start-btn",
        title: "입력 확인 버튼",
        text: "영상시청 단계로 넘어가는 버튼입니다.",
        action: async () => clickWhenReady(".onboard-start-btn"),
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/category/big",
    steps: [
      {
        target: ".student-grid",
        title: "대분류 카테고리",
        text: "직무의 큰 분류를 선택하는 카드 목록 영역입니다.",
        action: selectDemoBigCategory,
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/category/medium",
    steps: [
      {
        target: ".cardGrid",
        title: "중분류 카테고리",
        text: "선택된 직무 안에서 세부 분야를 고르는 카드 영역입니다.",
        action: selectDemoMediumCategory,
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/category/small",
    steps: [
      {
        target: ".small-card-grid",
        title: "영상 선택 영역",
        text: "세부분야의 영상을 선택해 아래 목록에 추가합니다.",
        action: selectFirstVideoOnly,
      },
      {
        target: ".selected-video-container",
        title: "선택 영상 목록",
        text: "선택한 영상이 여기에 추가됩니다. 각 항목의 삭제 버튼으로 선택한 영상을 목록에서 제거할 수 있습니다.",
        action: continueToCheckoutFromSmall,
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/category/checkout",
    steps: [
      {
        target: ".video-list",
        title: "선택 영상 확인 목록",
        text: "선택한 영상들을 최종 확인하는 목록 영역입니다.",
      },
      {
        target: ".global-checkout-start",
        title: "시청 시작 버튼",
        text: "영상 시청부분으로 넘어가는 버튼입니다.",
        action: async () => clickWhenReady(".global-checkout-start"),
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/video/:categoryId",
    steps: [
      {
        target: ".webcam-view",
        title: "웹캠 확인 영역",
        text: "영상시청중 사용자를 녹화합니다.",
        action: startVideoOnboarding,
      },
      {
        target: ".video-container",
        title: "영상 시청 영역",
        text: "선택된 영상을 재생하는 영역입니다.",
      },
      {
        target: ".global-video-survey",
        title: "설문 이동 버튼",
        text: "영상 단계 이후 설문 단계로 진입하는 버튼입니다.",
        action: async () => clickWhenReady(".global-video-survey"),
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/survey/:categoryId",
    steps: [
      {
        target: ".survey-options",
        title: "설문 응답 영역",
        text: "문항별 선택지를 고르는 응답 카드 영역입니다. 온보딩에서는 첫 응답부터 결과 제출까지 한 번에 이어집니다.",
        action: answerSurveyAndSubmit,
        pauseUntilRouteChange: true,
      },
    ],
  },
  {
    route: "/student/complete",
    steps: [
      {
        target: ".global-complete-home",
        title: "홈으로 돌아가기 버튼",
        text: "진단 흐름을 마친 뒤 메인 화면으로 돌아가는 버튼입니다.",
        buttonLabel: "온보딩 마치기",
        finishTo: "/",
      },
    ],
  },
];
