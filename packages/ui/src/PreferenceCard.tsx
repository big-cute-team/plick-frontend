"use client";

import { useEffect, useState } from "react";
import { MoonLineIcon } from "./icons";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

/**
 * 다크 모드 토글 카드. 웹·모바일 공용 (`@plick/ui`).
 *
 * ThemeToggle과 같은 방식으로 `<html data-theme>`를 토글해 전체 테마를 전환한다.
 * (알림 설정 줄은 제품에 알림 기능이 없어 뺐다 — KAN-267 피드백.)
 */
export function PreferenceCard() {
  const [darkOn, setDarkOn] = useState(true);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light") setDarkOn(false);
  }, []);

  function toggleDark() {
    const next = !darkOn;
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light",
    );
    setDarkOn(next);
  }

  return (
    <section className="bg-elevate-2 border-border rounded-card border">
      <SettingRow
        icon={<MoonLineIcon />}
        label="다크 모드"
        trailing={
          <ToggleSwitch on={darkOn} onToggle={toggleDark} label="다크 모드" />
        }
      />
    </section>
  );
}
