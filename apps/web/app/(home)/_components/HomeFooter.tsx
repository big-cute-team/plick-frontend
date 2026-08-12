import Link from "next/link";
import { TEAM_FULL_NAMES, TEAM_ORDER } from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import { Logo } from "@plick/ui/Logo";
import { PageContainer } from "@/_components/PageContainer";

/** 서비스·정책 링크 — 색인 가치가 있는 정적 페이지만 싣는다(로그인·마이는 noindex라 뺀다). */
const SERVICE_LINKS = [
  { href: "/articles", label: "기사" },
  { href: "/reels", label: "릴스" },
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
] as const;

/**
 * 데스크톱 홈 하단 푸터 (SEO) — 모바일 HomeFooter와 같은 내용을 데스크톱
 * 레이아웃으로 그린다. 크롤러가 홈에서 팀별 기사·릴스·정책 페이지를 내부
 * 링크로 발견하는 통로다. 팀 링크는 팀별 기사 페이지(`/articles/teams/[slug]`)로
 * 보낸다 — 홈 팀 허브는 상단 팀 탭이 이미 잇고 있어, 푸터는 끝까지 읽을 목록이
 * 있는 기사 쪽을 잇는다. 상호작용이 없어 서버 컴포넌트로 두고 첫 HTML에 링크가
 * 전부 실리게 한다. 테두리는 화면 전체 폭, 내용은 PageContainer 폭이다.
 */
export function HomeFooter() {
  return (
    <footer className="border-border border-t">
      <PageContainer className="py-8">
        <Logo height={12} />

        <nav aria-label="팀별 이적 소식" className="mt-5">
          <h2 className="text-caption text-text-4 font-bold">팀별 이적 소식</h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {TEAM_ORDER.map((code) => (
              <li key={code}>
                <Link
                  href={articlesTeamPath(code)}
                  className="text-caption text-text-3 hover:text-text-2 transition-colors"
                >
                  {TEAM_FULL_NAMES[code]} 이적 루머
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="서비스" className="mt-5">
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {SERVICE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-caption text-text-3 hover:text-text-2 transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-micro text-text-4 mt-5">
          © {new Date().getFullYear()} PLick
        </p>
      </PageContainer>
    </footer>
  );
}
