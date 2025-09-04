import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * KST 기준 현재 날짜를 반환
 * 서버/클라이언트 환경에 관계없이 항상 KST 시간을 반환
 */
export function getKSTDate(): Date {
  // 클라이언트 환경에서는 로컬타임이 KST이므로 변환 불필요
  if (typeof window !== "undefined") {
    return new Date();
  }

  // 서버 환경에서는 명시적으로 KST로 변환
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000); // UTC+9
  return kst;
}

/**
 * 주어진 Date 객체를 KST 기준으로 변환
 */
export function toKSTDate(date: Date): Date {
  // 클라이언트 환경에서는 로컬타임이 KST이므로 변환 불필요
  if (typeof window !== "undefined") {
    return date;
  }

  // 서버 환경에서는 명시적으로 KST로 변환
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000); // UTC+9
  return kst;
}

/**
 * KST 기준 오늘 날짜의 일(day) 반환
 */
export function getKSTDay(): number {
  return getKSTDate().getDate();
}

/**
 * KST 기준 특정 날짜의 일(day) 반환
 */
export function getKSTDayFromDate(date: Date): number {
  return toKSTDate(date).getDate();
}

/**
 * 날짜를 한국 형식으로 반환 (예: "2024. 1. 15.")
 * KST 기준으로 변환 후 포맷팅
 */
export function formatKSTDate(date: Date): string {
  const kstDate = toKSTDate(date);
  return kstDate.toLocaleDateString("ko-KR");
}

/**
 * 웹스토리지 관련 유틸리티 함수들
 */
const STORAGE_KEYS = {
  SAVED_NAME: "breakfast-check-saved-name",
  REMEMBER_NAME: "breakfast-check-remember-name",
  AUTO_CHECKIN: "breakfast-check-auto-checkin",
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
 * 자동 체크인 설정을 가져옴
 */
export function getAutoCheckinSetting(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTO_CHECKIN) === "true";
  } catch {
    return false;
  }
}

/**
 * 자동 체크인 설정을 저장
 */
export function setAutoCheckinSetting(autoCheckin: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_CHECKIN, autoCheckin.toString());
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
