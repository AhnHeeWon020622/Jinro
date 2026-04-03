import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { FLOW } from "./onbordingflow";

const SPOTLIGHT_PADDING = 14;
const GUIDE_MARGIN = 16;
const GUIDE_MASCOT_BOTTOM_SPACE = 92;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const findRouteIndex = (pathname) =>
  FLOW.findIndex(({ route }) => matchPath({ path: route, end: true }, pathname));

export default function GlobalOnboardingEngine({ onFinish }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [routeIndex, setRouteIndex] = useState(() =>
    Math.max(findRouteIndex(location.pathname), 0)
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [pausedUntilRouteChange, setPausedUntilRouteChange] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [runningAction, setRunningAction] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);
  const [guideSize, setGuideSize] = useState({ width: 420, height: 260 });
  const guideRef = useRef(null);
  const pointerIntentRef = useRef(false);

  const routeConfig = FLOW[routeIndex] ?? FLOW[0];
  const step = routeConfig?.steps?.[stepIndex] ?? null;

  const resolvedTarget = useMemo(() => {
    if (!step?.target) return null;
    return typeof step.target === "function" ? step.target() : step.target;
  }, [step]);

  const resolvedTitle = useMemo(() => {
    if (!step?.title) return "가이드";
    return typeof step.title === "function" ? step.title() : step.title;
  }, [step]);

  const resolvedButtonLabel = useMemo(() => {
    if (!step?.buttonLabel) return "확인";
    return typeof step.buttonLabel === "function"
      ? step.buttonLabel()
      : step.buttonLabel;
  }, [step]);

  const finishFlow = useCallback(() => {
    localStorage.removeItem("student_onboarding_flow");
    localStorage.removeItem("skip_all_onboarding");
    sessionStorage.removeItem("onboarding_big_idx");
    sessionStorage.removeItem("onboarding_med_idx");
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    document.body.classList.add("onboarding-lock");
    localStorage.setItem("skip_all_onboarding", "true");
    sessionStorage.removeItem("onboarding_big_idx");
    sessionStorage.removeItem("onboarding_med_idx");

    return () => {
      document.body.classList.remove("onboarding-lock");
      localStorage.removeItem("skip_all_onboarding");
    };
  }, []);

  useEffect(() => {
    const handlePopstate = () => {
      finishFlow();
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [finishFlow]);

  useEffect(() => {
    const nextRouteIndex = findRouteIndex(location.pathname);

    if (nextRouteIndex === -1) {
      return;
    }

    setPausedUntilRouteChange(false);
    setRunningAction(false);
    setTargetRect(null);

    setRouteIndex((prevRouteIndex) => {
      if (prevRouteIndex !== nextRouteIndex) {
        setStepIndex(0);
      }

      return nextRouteIndex;
    });
  }, [location.pathname]);

  const updateTargetRect = useCallback(() => {
    if (pausedUntilRouteChange || !resolvedTarget) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(resolvedTarget);

    if (!element) {
      setTargetRect(null);
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const rect = element.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      setTargetRect(null);
      return;
    }

    setTargetRect({
      top: Math.max(rect.top - SPOTLIGHT_PADDING, 12),
      left: Math.max(rect.left - SPOTLIGHT_PADDING, 12),
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    });
  }, [pausedUntilRouteChange, resolvedTarget]);

  useEffect(() => {
    updateTargetRect();

    if (pausedUntilRouteChange || !resolvedTarget) {
      return undefined;
    }

    const intervalId = window.setInterval(updateTargetRect, 250);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [pausedUntilRouteChange, resolvedTarget, step, updateTargetRect]);

  useEffect(() => {
    if (pausedUntilRouteChange || !step) {
      setNextEnabled(false);
      pointerIntentRef.current = false;
      return undefined;
    }

    setNextEnabled(false);
    pointerIntentRef.current = false;
    const timeoutId = window.setTimeout(() => setNextEnabled(true), 420);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, pausedUntilRouteChange, step, stepIndex]);

  const handleNext = useCallback(async () => {
    if (runningAction || !nextEnabled) {
      return;
    }

    if (!step) {
      finishFlow();
      return;
    }

    let actionSucceeded = true;
    const initialPathname = window.location.pathname;

    if (typeof step.action === "function") {
      setRunningAction(true);

      try {
        actionSucceeded = await step.action();
      } finally {
        setRunningAction(false);
      }
    }

    if (!actionSucceeded) {
      return;
    }

    if (window.location.pathname !== initialPathname) {
      return;
    }

    if (step.pauseUntilRouteChange) {
      setPausedUntilRouteChange(true);
      return;
    }

    const lastStepIndex = (routeConfig?.steps?.length ?? 1) - 1;

    if (stepIndex < lastStepIndex) {
      setStepIndex((currentStepIndex) => currentStepIndex + 1);
      return;
    }

    if (step?.finishTo) {
      navigate(step.finishTo);
      finishFlow();
      return;
    }

    finishFlow();
  }, [finishFlow, navigate, nextEnabled, routeConfig?.steps?.length, runningAction, step, stepIndex]);

  const handleButtonClick = useCallback(() => {
    if (step?.requireClick && !pointerIntentRef.current) {
      return;
    }

    pointerIntentRef.current = false;
    void handleNext();
  }, [handleNext, step?.requireClick]);

  useEffect(() => {
    if (pausedUntilRouteChange) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!nextEnabled) return;
      if (step?.requireClick) return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.();

      if (
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return;
      }

      event.preventDefault();
      void handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, nextEnabled, pausedUntilRouteChange, step?.requireClick]);

  useEffect(() => {
    const element = guideRef.current;

    if (!element) {
      return undefined;
    }

    const updateGuideSize = () => {
      const rect = element.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      setGuideSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateGuideSize();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateGuideSize)
        : null;

    observer?.observe(element);
    window.addEventListener("resize", updateGuideSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateGuideSize);
    };
  }, [location.pathname, stepIndex, resolvedTitle, resolvedTarget]);

  const guideStyle = useMemo(() => {
    const isHomeStartRoute = routeConfig?.route === "/";
    const isRightPanelRoute =
      routeConfig?.route === "/student/agreement" ||
      routeConfig?.route === "/student/login";
    const panelWidth = guideSize.width;
    const panelHeight = guideSize.height;
    const maxLeft = Math.max(GUIDE_MARGIN, window.innerWidth - panelWidth - GUIDE_MARGIN);
    const maxTop = Math.max(
      GUIDE_MARGIN,
      window.innerHeight - panelHeight - GUIDE_MARGIN - GUIDE_MASCOT_BOTTOM_SPACE
    );

    if (isHomeStartRoute && targetRect && window.innerWidth >= 1024) {
      const gap = 24;
      const dynamicTop = targetRect.top + targetRect.height / 2 - panelHeight / 2;
      let left = targetRect.left - panelWidth - gap;

      if (left < GUIDE_MARGIN) {
        left = targetRect.left + targetRect.width + gap;
      }

      return {
        left: clamp(left, GUIDE_MARGIN, maxLeft),
        top: clamp(dynamicTop, GUIDE_MARGIN, maxTop),
        transform: "none",
      };
    }

    if (isRightPanelRoute && targetRect && window.innerWidth >= 1024) {
      const gap = 18;
      let left = targetRect.left + targetRect.width + gap;

      if (left + panelWidth > window.innerWidth - 24) {
        left = Math.max(24, targetRect.left - panelWidth - gap);
      }

      const dynamicTop = targetRect.top + targetRect.height / 2 - panelHeight / 2;

      return {
        left: clamp(left, GUIDE_MARGIN, maxLeft),
        top: clamp(dynamicTop, GUIDE_MARGIN, maxTop),
        transform: "none",
      };
    }

    if (!targetRect) {
      return {
        left: clamp((window.innerWidth - panelWidth) / 2, GUIDE_MARGIN, maxLeft),
        top: clamp(window.innerHeight - panelHeight - 48, GUIDE_MARGIN, maxTop),
        transform: "none",
      };
    }

    const preferredLeft = targetRect.left + targetRect.width / 2 - panelWidth / 2;
    const left = clamp(preferredLeft, GUIDE_MARGIN, maxLeft);

    const belowTop = targetRect.top + targetRect.height + 28;
    const aboveTop = targetRect.top - panelHeight - 28;
    const top = belowTop + panelHeight <= window.innerHeight - GUIDE_MARGIN
      ? belowTop
      : aboveTop >= GUIDE_MARGIN
        ? aboveTop
        : clamp(targetRect.top + targetRect.height / 2 - panelHeight / 2, GUIDE_MARGIN, maxTop);

    return {
      left,
      top: clamp(top, GUIDE_MARGIN, maxTop),
      transform: "none",
    };
  }, [guideSize.height, guideSize.width, routeConfig?.route, targetRect]);

  const formattedText = useMemo(() => {
    const rawText = typeof step?.text === "function"
      ? step.text()
      : step?.text ?? "강조된 영역을 보면서 천천히 진행해 주세요.";
    return rawText.replace(/\.\s*/g, ".\n");
  }, [step?.text]);

  if (pausedUntilRouteChange) {
    return null;
  }

  return (
    <>
      <div className="global-dim" />

      {targetRect && (
        <div
          className="global-spot"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <div className="global-guide" style={guideStyle} ref={guideRef}>
        <h3>{resolvedTitle}</h3>
        <p>{formattedText}</p>

        <button
          onPointerDown={() => {
            pointerIntentRef.current = true;
          }}
          onClick={handleButtonClick}
          disabled={runningAction || !nextEnabled}
        >
          {runningAction ? "진행 중..." : resolvedButtonLabel}
        </button>
      </div>
    </>
  );
}
