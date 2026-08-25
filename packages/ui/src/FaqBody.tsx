import type { ReactNode } from "react";

/** FAQ 한 항목 정의 — 질문과 답변. 답변은 링크를 넣을 수 있어 ReactNode다. */
const ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: "PLick은 어떤 서비스인가요?",
    answer: (
      <p>
        프리미어리그 이적 루머와 소식을 릴스처럼 세로로 넘겨보는 서비스입니다.
        응원팀을 등록하면 그 팀 소식 위주의 맞춤 피드를 볼 수 있습니다.
      </p>
    ),
  },
  {
    question: "이적 소식은 어디에서 가져오나요?",
    answer: (
      <p>
        파브리시오 로마노 같은 해외 축구 기자들이 X(옛 트위터)에 올리는 게시물을
        직접 가져옵니다. 국내 매체가 번역해 기사로 옮기는 과정을 거치지 않기
        때문에, 국내 어떤 서비스보다도 빠르게 원 소식을 확인할 수 있습니다. 각
        소식에서 원문 게시물 링크를 열어 볼 수 있습니다.
      </p>
    ),
  },
  {
    question: "루머는 얼마나 믿을 수 있나요?",
    answer: (
      <p>
        이적 소식은 구단이나 선수의 공식 발표 전까지는 확정이 아닙니다. 판단에
        도움이 되도록 소식을 보도한 기자의 신뢰도 등급을 함께 표시합니다.
      </p>
    ),
  },
  {
    question: "로그인하지 않아도 쓸 수 있나요?",
    answer: (
      <p>
        둘러보기는 로그인 없이 가능합니다. 좋아요·댓글 작성과 응원팀 설정은
        로그인이 필요하며, 로그인은 카카오·구글·애플 소셜 로그인만 지원합니다.
      </p>
    ),
  },
  {
    question: "응원팀은 어떻게 바꾸나요?",
    answer: (
      <p>
        MY &gt; 프로필 수정에서 언제든지 바꿀 수 있습니다. 여러 팀을 함께 선택할
        수도 있습니다.
      </p>
    ),
  },
  {
    question: "회원 탈퇴는 어떻게 하나요?",
    answer: (
      <p>
        MY 화면 맨 아래의 탈퇴하기 버튼으로 바로 탈퇴할 수 있습니다. 탈퇴하면
        계정을 복구할 수 없고, 소셜 연결·이메일·닉네임·응원팀 정보가 삭제됩니다.
        작성한 댓글은 &apos;탈퇴한사용자&apos;가 쓴 것으로 표시된 채 남습니다.
        같은 소셜 계정으로는 탈퇴 후 7일이 지나야 다시 가입할 수 있으며, 다시
        가입하면 신규 가입으로 처리되어 이전 활동과 연결되지 않습니다. 자세한
        내용은{" "}
        <a href="/privacy" className="underline">
          개인정보처리방침
        </a>
        을 확인해 주세요.
      </p>
    ),
  },
  {
    question: "오류 제보나 문의는 어디로 하나요?",
    answer: (
      <p>
        운영자 이메일(whoru3918@gmail.com)로 보내 주시면 확인 후 답변드립니다.
      </p>
    ),
  },
];

/**
 * FAQ 본문 (KAN-372) — 질문과 답을 항상 펼친 채로 나열한다.
 *
 * 처음엔 `details/summary` 아코디언이었는데 항목이 일곱 개뿐이라 접어 둘
 * 이유가 없었다. 한 화면에서 눈으로 훑는 게 낫다.
 *
 * 문안이 web/mobile에서 같아야 해서 단일 출처로 공용화했다. 좌우 패딩과
 * 페이지 제목은 앱 쪽 래퍼가 책임진다. 탈퇴·문의 답변은 개인정보처리방침·
 * 이용약관과 절차가 어긋나면 안 되니 바뀌면 같은 PR에서 함께 고친다.
 */
export function FaqBody() {
  return (
    <div className="flex flex-col gap-2.5">
      {ITEMS.map((item) => (
        <section
          key={item.question}
          className="bg-elevate-2 border-border rounded-card flex flex-col gap-2 border px-4 py-3.5"
        >
          <h2 className="text-body text-text font-bold">{item.question}</h2>
          <div className="text-body text-text-2 leading-relaxed">
            {item.answer}
          </div>
        </section>
      ))}
    </div>
  );
}
