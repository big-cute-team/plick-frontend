import { LegalSection as Section } from "./LegalSection";

/** 목차 항목 정의 — 앵커 id와 제목. Section의 id와 1:1로 맞춘다. */
const SECTIONS = [
  { id: "purpose", title: "제1조 (목적)" },
  { id: "definitions", title: "제2조 (정의)" },
  { id: "revision", title: "제3조 (약관의 게시와 개정)" },
  { id: "signup", title: "제4조 (이용계약의 체결)" },
  { id: "service", title: "제5조 (서비스의 제공·변경 및 중단)" },
  { id: "content", title: "제6조 (이적 소식 콘텐츠의 성격)" },
  { id: "comments", title: "제7조 (회원이 작성한 댓글)" },
  { id: "obligations", title: "제8조 (회원의 의무)" },
  { id: "termination", title: "제9조 (계약 해지 및 이용 제한)" },
  { id: "copyright", title: "제10조 (저작권)" },
  { id: "liability", title: "제11조 (책임의 제한)" },
  { id: "law", title: "제12조 (준거법 및 재판관할)" },
  { id: "addendum", title: "부칙" },
] as const;

/**
 * 이용약관 본문 (KAN-372) — 서문 + 앵커 목차 + 12개 조 + 부칙.
 *
 * 법률 문서라 web/mobile 문안이 어긋나면 안 되어 `PrivacyPolicyBody`처럼
 * 단일 출처로 공용화했다. 좌우 패딩과 페이지 제목은 앱 쪽 래퍼가 책임진다.
 *
 * ⚠️ 문안은 실제 서비스 현황과 일치해야 한다 — 회원이 직접 작성할 수 있는
 * 것은 댓글뿐이라 7·8조를 댓글 기준으로 썼다. 회원 작성 콘텐츠가 늘거나
 * 유료 기능·앱 내 탈퇴·제재 절차가 생기면 이 문서도 같은 PR에서 개정한다. 개인정보 항목이 바뀌면
 * `PrivacyPolicyBody`와 함께 고친다.
 */
export function TermsBody() {
  return (
    <div className="text-body text-text-2 flex flex-col gap-6 leading-relaxed">
      <p>
        이 약관은 팀 기엽대(이하 &ldquo;운영자&rdquo;)가 제공하는 프리미어리그
        이적 소식 서비스 PLick(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여
        운영자와 회원의 권리·의무 및 책임사항을 정합니다. 서비스에 가입하거나
        서비스를 이용하면 이 약관에 동의한 것으로 봅니다.
      </p>

      <nav className="bg-elevate border-border rounded-card flex flex-col gap-1.5 border p-4">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-label underline">
            {s.title}
          </a>
        ))}
      </nav>

      <Section id="purpose" title="제1조 (목적)">
        <p>
          이 약관은 운영자가 제공하는 서비스의 이용 조건 및 절차, 운영자와
          회원의 권리·의무·책임사항, 기타 필요한 사항을 규정함을 목적으로
          합니다.
        </p>
      </Section>

      <Section id="definitions" title="제2조 (정의)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            &ldquo;서비스&rdquo;란 운영자가 웹과 모바일을 통해 제공하는
            프리미어리그 이적 소식·루머 큐레이션 서비스 PLick을 말합니다.
          </li>
          <li>
            &ldquo;회원&rdquo;이란 이 약관에 동의하고 소셜 로그인(카카오·구글)
            으로 가입하여 서비스를 이용하는 자를 말합니다.
          </li>
          <li>
            &ldquo;댓글&rdquo;이란 회원이 이적 소식에 남긴 문자 형태의 의견을
            말합니다. 회원은 이적 소식 자체를 작성하거나 등록할 수 없으며,
            서비스에서 회원이 직접 작성할 수 있는 것은 댓글뿐입니다.
          </li>
        </ol>
      </Section>

      <Section id="revision" title="제3조 (약관의 게시와 개정)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            운영자는 이 약관을 회원이 언제든지 확인할 수 있도록 서비스 내
            페이지에 게시합니다.
          </li>
          <li>
            운영자는 「약관의 규제에 관한 법률」 등 관계 법령을 위배하지 않는
            범위에서 이 약관을 개정할 수 있습니다.
          </li>
          <li>
            약관을 개정하는 경우 적용일자 및 개정 내용을 명시하여 적용일 7일
            전부터(회원에게 불리한 변경은 30일 전부터) 서비스 내 페이지에
            공지합니다. 회원이 적용일 이후에도 서비스를 계속 이용하면 개정
            약관에 동의한 것으로 봅니다.
          </li>
          <li>
            회원은 개정 약관에 동의하지 않을 경우 제9조에 따라 이용계약을
            해지(탈퇴)할 수 있습니다.
          </li>
        </ol>
      </Section>

      <Section id="signup" title="제4조 (이용계약의 체결)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            이용계약은 가입 희망자가 이 약관에 동의하고 카카오 또는 구글 소셜
            로그인으로 가입을 신청하면, 운영자가 이를 승낙함으로써 체결됩니다.
          </li>
          <li>
            서비스는 14세 미만 아동을 이용 대상으로 하지 않습니다. 가입은 14세
            미만의 단독 가입을 제한하는 카카오·구글 계정으로만 가능합니다.
          </li>
          <li>
            운영자는 타인의 계정을 도용한 가입, 부정한 용도의 가입 등 정당한
            사유가 있는 경우 승낙을 거절하거나 사후에 이용계약을 해지할 수
            있습니다.
          </li>
        </ol>
      </Section>

      <Section id="service" title="제5조 (서비스의 제공·변경 및 중단)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            운영자는 이적 소식 열람, 응원팀 설정에 기반한 맞춤 피드, 기사
            좋아요·댓글 기능을 제공합니다. 서비스는 무료로 제공됩니다.
          </li>
          <li>
            운영자는 서비스의 내용을 변경하거나 추가할 수 있으며, 중요한 변경은
            서비스 내에 공지합니다.
          </li>
          <li>
            운영자는 설비 점검·교체, 장애, 운영상 상당한 이유가 있는 경우 서비스
            제공을 일시적으로 중단할 수 있습니다. 사전 공지가 가능한 경우 미리
            공지하며, 불가피한 경우 사후에 공지할 수 있습니다.
          </li>
        </ol>
      </Section>

      <Section id="content" title="제6조 (이적 소식 콘텐츠의 성격)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            서비스가 제공하는 이적 소식은 해외 기자·매체가 X(옛 트위터) 등에
            공개한 글과 보도를 바탕으로 정리한 것으로, 구단이나 선수의 공식
            발표가 있기 전까지는 확정되지 않은 루머일 수 있습니다.
          </li>
          <li>
            운영자는 이용자의 판단을 돕기 위해 출처 원문 링크와 보도 기자의
            신뢰도 등급을 함께 표시하지만, 콘텐츠의 정확성·완전성·최신성을
            보증하지 않습니다.
          </li>
          <li>
            이용자가 서비스의 콘텐츠를 근거로 내린 판단과 그 결과에 대한 책임은
            이용자 본인에게 있습니다.
          </li>
        </ol>
      </Section>

      <Section id="comments" title="제7조 (회원이 작성한 댓글)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            회원은 이적 소식에 댓글을 남길 수 있으며, 댓글 내용에 대한 권리와
            책임은 이를 작성한 회원에게 있습니다.
          </li>
          <li>
            운영자는 회원이 작성한 댓글을 해당 소식의 댓글 목록에 노출하는 등
            서비스 운영에 필요한 범위에서만 사용합니다.
          </li>
          <li>
            회원은 자신이 작성한 댓글을 언제든지 수정하거나 삭제할 수 있습니다.
          </li>
          <li>
            운영자는 댓글이 제8조의 금지행위에 해당하거나 관계 법령을 위반하는
            경우 삭제하거나 노출을 제한할 수 있습니다.
          </li>
        </ol>
      </Section>

      <Section id="obligations" title="제8조 (회원의 의무)">
        <p>회원은 다음 각 호의 행위를 해서는 안 됩니다.</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>타인의 계정·개인정보를 도용하거나 부정하게 사용하는 행위</li>
          <li>
            욕설·비방·혐오 표현, 타인(선수·기자·구단 관계자를 포함)의 명예를
            훼손하는 댓글을 작성하는 행위
          </li>
          <li>타인의 저작권 등 지식재산권을 침해하는 행위</li>
          <li>
            허위 사실을 유포하거나 영리 목적의 광고·스팸 댓글을 작성하는 행위
          </li>
          <li>
            서비스의 정상적인 운영을 방해하는 행위(자동화된 수단을 이용한 대량
            접근·수집을 포함)
          </li>
        </ol>
      </Section>

      <Section id="termination" title="제9조 (계약 해지 및 이용 제한)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            회원은 언제든지 이용계약 해지(탈퇴)를 요청할 수 있습니다. 탈퇴는
            운영자 이메일(whoru3918@gmail.com)로 요청할 수 있으며, 운영자는 본인
            확인 후 지체 없이 처리합니다. 탈퇴 시 개인정보는 개인정보 처리방침에
            따라 파기됩니다.
          </li>
          <li>
            운영자는 회원이 이 약관을 위반한 경우 댓글 삭제, 서비스 이용 제한,
            이용계약 해지 등의 조치를 할 수 있습니다. 회원은 조치에 이의가 있는
            경우 운영자 이메일로 이의를 제기할 수 있습니다.
          </li>
        </ol>
      </Section>

      <Section id="copyright" title="제10조 (저작권)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            서비스가 자체 작성한 콘텐츠와 서비스의 구성·디자인에 대한 저작권은
            운영자에게 있습니다.
          </li>
          <li>
            서비스가 정리·인용한 보도의 원문에 대한 권리는 해당 매체와 기자 등
            원저작자에게 있으며, 서비스는 출처를 표시합니다.
          </li>
          <li>
            이용자는 서비스의 콘텐츠를 운영자의 사전 동의 없이 복제·배포 등 영리
            목적으로 이용할 수 없습니다.
          </li>
        </ol>
      </Section>

      <Section id="liability" title="제11조 (책임의 제한)">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            운영자는 천재지변, 통신사업자의 서비스 중지 등 불가항력으로 인하여
            서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.
          </li>
          <li>
            운영자는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을
            지지 않습니다.
          </li>
          <li>
            운영자는 회원 상호 간 또는 회원과 제3자 간에 서비스를 매개로 발생한
            분쟁에 개입하지 않으며, 이로 인한 손해를 배상할 책임이 없습니다.
          </li>
          <li>
            무료로 제공되는 서비스의 이용과 관련하여 관계 법령에 특별한 규정이
            없는 한 운영자는 책임을 지지 않습니다.
          </li>
        </ol>
      </Section>

      <Section id="law" title="제12조 (준거법 및 재판관할)">
        <p>
          이 약관과 서비스 이용에 관한 분쟁에는 대한민국 법을 적용하며, 분쟁에
          관한 소송은 「민사소송법」에 따른 관할 법원에 제기합니다.
        </p>
      </Section>

      <Section id="addendum" title="부칙">
        <p>이 약관은 2026. 8. 5.부터 시행합니다.</p>
      </Section>
    </div>
  );
}
