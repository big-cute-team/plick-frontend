"use client";

import { useRouter } from "next/navigation";

/**
 * 프로필 화면의 빵부스러기 (KAN-567 시안 프로필 1219-1223행) — "← 이전" 12/700 강조색
 * 뒤로 가기와 종류 라벨 12 보조색. 시안의 프로필은 스택 구조라 어디서 왔든 이전 화면으로
 * 돌아간다. `router.back()`이 그 뜻이라 클라 컴포넌트다. 팀 프로필과 인물 프로필이 같이 쓴다.
 *
 * @param kind 종류 라벨 (팀, 선수, 감독 등)
 */
export function ProfileBreadcrumb({ kind }: { kind: string }) {
  const router = useRouter();
  return (
    <nav aria-label="경로" className="flex items-center gap-1.75 pb-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-label text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ← 이전
      </button>
      <span aria-hidden className="text-caption text-text-3">
        /
      </span>
      <span className="text-label text-text-3">{kind}</span>
    </nav>
  );
}
