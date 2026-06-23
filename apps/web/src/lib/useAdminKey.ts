import { useState } from "react";

const STORAGE_KEY = "rw_admin_key";

/** 데모 관리자 키를 localStorage 에 보관한다 (운영용 인증 아님) */
export function useAdminKey() {
  const [key, setKeyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );

  const setKey = (value: string) => {
    setKeyState(value);
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return { key, setKey };
}
