import Link from "next/link";
import { BRAND_NAME_KO } from "@plick/domain/brand";
import { TEAM_FULL_NAMES, TEAM_ORDER } from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";

const SERVICE_LINKS = [
  { href: "/articles", label: "기사" },
  { href: "/reels", label: "릴스" },
  { href: "/debates", label: "투표" },
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
] as const;

/**
 * SEO 푸터 (KAN-386 후속) — 홈 리스트가 유한해져 생긴 바닥에 내부 링크를 모은다.
 * 시안(KAN-567)의 웹 푸터처럼 12px 회색 링크를 쉼표 없이 나열한다.
 */
export function HomeFooter() {
  return (
    <footer className="px-edge pt-4 pb-2">
      <nav aria-label="팀별 이적 소식">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {TEAM_ORDER.map((code) => (
            <li key={code}>
              <Link
                href={articlesTeamPath(code)}
                className="text-caption text-text-3 active:opacity-60"
              >
                {TEAM_FULL_NAMES[code]} 이적 루머
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="서비스" className="mt-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {SERVICE_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-caption text-text-3 active:opacity-60"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-micro text-text-4 mt-4">
        © {new Date().getFullYear()} {BRAND_NAME_KO}
      </p>
    </footer>
  );
}
