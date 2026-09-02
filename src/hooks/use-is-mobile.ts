"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)"; // 跟 Tailwind 的 md 斷點對齊

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false; // SSR 沒有 viewport 概念，掛載後 useSyncExternalStore 會自動用真的寬度重算一次
}

// Calendar 的 3 Days/Week 那種多欄時間軸在手機窄螢幕上會擠成一團，
// 用這個判斷是不是該收成單日顯示。用 useSyncExternalStore 而不是
// useState+useEffect，避免「effect 裡直接 setState」被 lint 擋，也不會有
// SSR/CSR 算出來不一樣的 hydration 警告。
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
