import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, GUIDE_ORDER, type GuideSlug } from "@plick/domain/guides";
import { ProseBody } from "@plick/ui/ProseBody";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";

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

/** 가이드별 title·description. 이 URL이 canonical이고 대응 모바일 페이지를 alternate로 선언한다. */
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
    alternates: {
      canonical: `/guide/${guide.slug}`,
      media: {
        [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/guide/${guide.slug}`,
      },
    },
  };
}

/**
 * 가이드 문서 (KAN-652) - 루머 단계 읽는 법, 이적 용어 사전처럼 소식을 읽는 데 필요한 배경을
 * 운영자가 쓴 글. 소개 페이지와 같은 읽기 폭 한 열이고 문안은 `@plick/domain/guides`가
 * 모바일과 단일 출처다.
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
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <div className="max-w-read">
            <h1 className="text-section text-text-strong tracking-title font-black">
              {guide.title}
            </h1>
            <div className="pt-5">
              <ProseBody
                sections={guide.sections}
                updatedAt={guide.updatedAt}
              />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
