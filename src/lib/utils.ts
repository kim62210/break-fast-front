import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * KST(한국 표준시, UTC+9) 기준으로 현재 날짜를 반환
 */
export function getKSTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000); // UTC+9
  return kst;
}

/**
 * 주어진 Date 객체를 KST 기준으로 변환
 */
export function toKSTDate(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000); // UTC+9
  return kst;
}

/**
 * KST 기준으로 오늘 날짜의 일(day) 반환
 */
export function getKSTDay(): number {
  return getKSTDate().getDate();
}

/**
 * KST 기준으로 특정 날짜의 일(day) 반환
 */
export function getKSTDayFromDate(date: Date): number {
  return toKSTDate(date).getDate();
}

/**
 * KST 기준으로 날짜 문자열을 한국 형식으로 반환 (예: "2024. 1. 15.")
 */
export function formatKSTDate(date: Date): string {
  const kstDate = toKSTDate(date);
  return kstDate.toLocaleDateString("ko-KR");
}
