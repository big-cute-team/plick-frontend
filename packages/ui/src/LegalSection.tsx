import type { ReactNode } from "react";

/**
 * 법률·정책 문서의 절 제목 + 본문 묶음 — 앵커 목차(id)를 받는다.
 *
 * `PrivacyPolicyBody`의 사적 헬퍼였는데 `TermsBody`가 생기며 공용으로 뺐다.
 * `scroll-mt-14`는 모바일 상단바에 절 제목이 가리지 않게 하는 오프셋이다.
 *
 * @param id - 앵커 목차와 1:1로 맞추는 섹션 id
 * @param title - 절 제목
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-14 flex-col gap-2">
      <h2 className="text-body-lg text-text font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
