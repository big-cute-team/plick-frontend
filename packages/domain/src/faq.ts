/**
 * @file FAQ 문안의 단일 출처 (KAN-372, KAN-623) — web·mobile 화면과 FAQPage JSON-LD가 같이 읽는다.
 *
 * 원래 `@plick/ui` FaqBody 안에 ReactNode로 있었는데, 구조화 데이터는 답을 평문으로
 * 내야 해서 데이터를 여기로 내리고 링크만 조각으로 표시한다. 화면은 조각을 `<a>`로
 * 그리고 JSON-LD는 조각의 글자만 이어 붙인다({@link faqAnswerText}).
 *
 * 탈퇴·문의 답변은 개인정보처리방침·이용약관과 절차가 어긋나면 안 되니 바뀌면 같은
 * PR에서 함께 고친다.
 */

/** 답변 한 조각 — 평문이거나 앱 내부 링크 */
export type FaqSegment = string | { text: string; href: string };

/** FAQ 한 항목 — 질문과 답변 조각 목록 */
export interface FaqItem {
  question: string;
  answer: FaqSegment[];
}

/** FAQ 항목 전부. 화면 순서 그대로다. */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "해축이모는 어떤 서비스인가요?",
    answer: [
      "프리미어리그 이적 루머와 소식을 릴스처럼 세로로 넘겨보는 서비스입니다. 응원팀을 등록하면 그 팀 소식 위주의 맞춤 피드를 볼 수 있습니다.",
    ],
  },
  {
    question: "이적 소식은 어디에서 가져오나요?",
    answer: [
      "파브리시오 로마노 같은 해외 축구 기자들이 X(옛 트위터)에 올리는 게시물을 직접 가져옵니다. 국내 매체가 번역해 기사로 옮기는 과정을 거치지 않기 때문에, 국내 어떤 서비스보다도 빠르게 원 소식을 확인할 수 있습니다. 각 소식에서 원문 게시물 링크를 열어 볼 수 있습니다.",
    ],
  },
  {
    question: "루머는 얼마나 믿을 수 있나요?",
    answer: [
      "이적 소식은 구단이나 선수의 공식 발표 전까지는 확정이 아닙니다. 판단에 도움이 되도록 소식을 보도한 기자를 함께 표시하고 원문 링크를 엽니다.",
    ],
  },
  {
    question: "로그인하지 않아도 쓸 수 있나요?",
    answer: [
      "둘러보기는 로그인 없이 가능합니다. 댓글 작성과 응원팀 설정은 로그인이 필요하며, 로그인은 카카오, 구글, 애플 소셜 로그인만 지원합니다.",
    ],
  },
  {
    question: "응원팀은 어떻게 바꾸나요?",
    answer: [
      "MY > 계정에서 언제든지 바꿀 수 있습니다. 여러 팀을 함께 선택할 수도 있습니다.",
    ],
  },
  {
    question: "회원 탈퇴는 어떻게 하나요?",
    answer: [
      "MY 화면 맨 아래의 회원 탈퇴로 바로 탈퇴할 수 있습니다. 탈퇴하면 계정을 복구할 수 없고, 소셜 연결·이메일·닉네임·응원팀 정보가 삭제됩니다. 작성한 댓글은 '탈퇴한사용자'가 쓴 것으로 표시된 채 남습니다. 같은 소셜 계정으로는 탈퇴 후 7일이 지나야 다시 가입할 수 있으며, 다시 가입하면 신규 가입으로 처리되어 이전 활동과 연결되지 않습니다. 자세한 내용은 ",
      { text: "개인정보처리방침", href: "/privacy" },
      "을 확인해 주세요.",
    ],
  },
  {
    question: "오류 제보나 문의는 어디로 하나요?",
    answer: [
      "운영자 이메일(whoru3918@gmail.com)로 보내 주시면 확인 후 답변드립니다.",
    ],
  },
];

/**
 * 답변 조각을 평문 한 줄로 이어 붙인다 — JSON-LD `Answer.text`와 llms.txt용.
 *
 * @param item FAQ 항목
 */
export function faqAnswerText(item: FaqItem): string {
  return item.answer
    .map((segment) => (typeof segment === "string" ? segment : segment.text))
    .join("");
}
