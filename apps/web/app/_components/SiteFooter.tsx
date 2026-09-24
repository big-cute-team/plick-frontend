import type { ReactNode } from "react";
import Link from "next/link";
import { homeIntroCopy } from "@plick/domain/brand";

/** 푸터 링크 — 색인 가치가 있는 정적 페이지만 싣는다(로그인·MY는 noindex라 뺀다). */
const FOOTER_LINKS = [
  { href: "/articles", label: "이슈" },
  { href: "/reels", label: "릴스" },
  { href: "/debates", label: "투표" },
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
] as const;

/**
 * 페이지 하단 푸터 (KAN-567, 시안 "푸터") — 소개문 한 단락과 링크 한 줄. 홈 전용이던
 * `HomeFooter`(팀별 기사 링크 목록, 로고, 저작권)와 `HomeIntro`(크롤러블 소개문)를
 * 합쳐 모든 페이지가 쓰는 조각으로 바꿨다. 팀별 기사 링크는 팀 탭이 앵커로 이미
 * 잇고 있어 뺐고, 기사 목록(`/articles`)은 GNB에서 빠진 대신 여기 "이슈"가 잇는다 —
 * 크롤러가 홈에서 기사 목록을 내부 링크로 발견하는 통로다.
 *
 * 소개문은 SEO 몫이다 (KAN-384) — 홈 본문에 서비스 설명 텍스트가 없으면 구글이
 * description을 버리고 탭바·빈 상태 문구를 긁어 스니펫을 만든다. 홈은 팀 탭을 따라
 * 문구가 바뀌어야 해서 클라 조각(`HomeIntro`)을 `intro`로 넘기고, 나머지 페이지는
 * 기본 문구다.
 *
 * 당겨서 새로고침 transform 밖에 둔다 — 풀 제스처에 딸려 움직이지 않게.
 *
 * @param intro 소개문. 생략하면 서비스 공통 문구
 */
export function SiteFooter({ intro }: { intro?: ReactNode }) {
  return (
    <footer className="border-border border-t">
      <div className="max-w-page px-gutter mx-auto w-full pt-4.5 pb-6">
        <p className="text-label text-text-3 max-w-225 leading-[1.7]">
          {intro ?? homeIntroCopy()}
        </p>
        <nav aria-label="서비스" className="mt-2.25">
          <ul className="text-label text-text-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="hover:text-accent">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
