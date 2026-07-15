"use client";

import { useEffect, useState } from "react";
import { BellLineIcon, MoonLineIcon } from "@plick/ui/icons";
import { SettingRow } from "./SettingRow";
import { ToggleSwitch } from "./ToggleSwitch";

/**
 * 알림 설정·다크 모드 토글 카드.
 *
 * 알림은 목 상태(BE 연동 전), 다크 모드는 ThemeToggle과 같은 방식으로
 * `<html data-theme>`를 토글해 전체 테마를 전환한다.
 */
export function PreferenceCard() {
  const [notifOn, setNotifOn] = useState(true);
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
        icon={<BellLineIcon />}
        label="알림 설정"
        trailing={
          <ToggleSwitch
            on={notifOn}
            onToggle={() => setNotifOn((v) => !v)}
            label="알림 설정"
          />
        }
      />
      <div className="border-border mx-4 border-t" aria-hidden />
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
