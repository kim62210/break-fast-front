import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 현재 날짜를 반환 (프론트엔드 로컬타임이 KST이므로 변환 불필요)
 */
export function getKSTDate(): Date {
  return new Date();
}

/**
 * 주어진 Date 객체를 그대로 반환 (프론트엔드 로컬타임이 KST이므로 변환 불필요)
 */
export function toKSTDate(date: Date): Date {
  return date;
}

/**
 * 오늘 날짜의 일(day) 반환
 */
export function getKSTDay(): number {
  return new Date().getDate();
}

/**
 * 특정 날짜의 일(day) 반환
 */
export function getKSTDayFromDate(date: Date): number {
  return date.getDate();
}

/**
 * 날짜 문자열을 한국 형식으로 반환 (예: "2024. 1. 15.")
 */
export function formatKSTDate(date: Date): string {
  return date.toLocaleDateString("ko-KR");
}

/**
 * 웹스토리지 관련 유틸리티 함수들
 */
const STORAGE_KEYS = {
  SAVED_NAME: "breakfast-check-saved-name",
  REMEMBER_NAME: "breakfast-check-remember-name",
} as const;

/**
 * localStorage에서 저장된 이름을 가져옴
 */
export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEYS.SAVED_NAME) || "";
  } catch {
    return "";
  }
}

/**
 * localStorage에 이름을 저장
 */
export function saveName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_NAME, name);
  } catch {
    // localStorage 오류 무시
  }
}

/**
 * localStorage에서 저장된 이름을 삭제
 */
export function removeSavedName(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.SAVED_NAME);
  } catch {
    // localStorage 오류 무시
  }
}

/**
 * 이름 저장 여부 설정을 가져옴
 */
export function getRememberNameSetting(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_NAME) === "true";
  } catch {
    return false;
  }
}

/**
 * 이름 저장 여부 설정을 저장
 */
export function setRememberNameSetting(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_NAME, remember.toString());
  } catch {
    // localStorage 오류 무시
  }
}

/**
 * 구글 스프레드시트 API용 날짜 변환 함수들
 * 구글 스프레드시트는 UTC 시간을 기대하므로 KST를 UTC로 변환
 */

/**
 * KST 날짜를 UTC timestamp로 변환 (구글 스프레드시트 API용)
 */
export function kstDateToUTCTimestamp(kstDate: Date): string {
  // KST 시간을 UTC로 변환 (9시간 빼기)
  const utcTime = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
  return utcTime.toISOString();
}

/**
 * UTC timestamp를 KST 날짜로 변환 (구글 스프레드시트에서 받은 데이터 처리용)
 */
export function utcTimestampToKSTDate(utcTimestamp: string): Date {
  const utcDate = new Date(utcTimestamp);
  // UTC 시간을 KST로 변환 (9시간 더하기)
  return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * UTC timestamp에서 KST 기준 날짜의 일(day) 반환
 */
export function getKSTDayFromUTCTimestamp(utcTimestamp: string): number {
  const kstDate = utcTimestampToKSTDate(utcTimestamp);
  return kstDate.getDate();
}
