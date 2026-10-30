import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, GUIDE_ORDER, type GuideSlug } from "@plick/domain/guides";
import { ProseBody } from "@plick/ui/ProseBody";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { WEB_SITE_URL } from "@/_constants/site";

/** 가이드는 코드에 박힌 목록이라 빌드 때 전부 미리 그린다. */
export function generateStaticParams(): { slug: GuideSlug }[] {
  return GUIDE_ORDER.map((slug) => ({ slug }));
}

/** slug가 가이드 목록에 있는지. 모르는 slug는 404다. */
function findGuide(slug: string) {
  return (GUIDE_ORDER as readonly string[]).includes(slug)
    ? GUIDES[slug as GuideSlug]
    : null;
}

/** 가이드별 title·description. canonical은 같은 글의 데스크톱 URL이다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${WEB_SITE_URL}/guide/${guide.slug}` },
  };
}

/**
 * 가이드 문서 (KAN-652). FAQ와 팀 허브, MY의 링크에서 진입한다. 상단 바는 공용 `SubTopBar`고
 * 뒤로가기는 히스토리 back, URL로 직접 들어왔으면 홈으로 간다. 문안은 `@plick/domain/guides`가
 * 웹과 단일 출처다.
 */
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  return (
    <AppShell>
      <SubTopBar title={guide.title} backHref="/" backBehavior="back" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <ProseBody sections={guide.sections} updatedAt={guide.updatedAt} />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
