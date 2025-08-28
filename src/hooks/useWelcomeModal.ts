"use client";

import { useState, useEffect } from "react";

const WELCOME_MODAL_KEY = "breakfast-check-welcome-modal-seen";
const MODAL_VERSION = "1.0"; // 모달 내용이 변경되면 버전을 업데이트

export function useWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 클라이언트 사이드에서만 실행
    if (typeof window !== "undefined") {
      const seenVersion = localStorage.getItem(WELCOME_MODAL_KEY);

      // 모달을 본 적이 없거나, 버전이 다르면 모달을 표시
      if (!seenVersion || seenVersion !== MODAL_VERSION) {
        setIsOpen(true);
      }
    }
  }, []);

  const closeModal = () => {
    setIsOpen(false);

    // 모달을 닫을 때 localStorage에 현재 버전 저장
    if (typeof window !== "undefined") {
      localStorage.setItem(WELCOME_MODAL_KEY, MODAL_VERSION);
    }
  };

  const resetModal = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(WELCOME_MODAL_KEY);
      setIsOpen(true);
    }
  };

  return {
    isOpen: mounted && isOpen,
    closeModal,
    resetModal,
  };
}
