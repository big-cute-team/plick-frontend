import Link from "next/link";
import { guestLinkNotice } from "@plick/domain/format";
import { ACTIVITY_LOGIN_COPY } from "@/_constants/activity";

/**
 * MY 상단 안내 (KAN-255, KAN-514, KAN-567 리디자인). 비로그인이면 제목과
 * "로그인" 텍스트 버튼, 게스트면 연동 마감 안내와 "계정 연동" 텍스트 버튼이다.
 * 카드 섀시 없이 글줄로만 두는 게 시안의 톤이다(테두리 카드 금지).
 *
 * 비로그인에게 하는 말과 게스트에게 하는 말은 전제가 다르다. 게스트는 이미
 * 기록을 쌓고 있고, 연동은 그 기록을 잃지 않으려고 하는 일이다. 마감을 문구에
 * 박아 언제까지 해야 하는지도 같이 알린다. 두 경우 다 로그인 화면으로 가고,
 * 게스트 세션이면 그 화면이 연동 화면으로 열린다.
 *
 * @param mode 비로그인(`login`)인지 게스트(`guest`)인지
 * @param guestExpiresAt 게스트 마감 시각. 쿠키에서 읽으므로 없을 수 있다
 */
export function MeLoginNotice({
  mode,
  guestExpiresAt,
}: {
  mode: "login" | "guest";
  guestExpiresAt: string | null;
}) {
  const guest = mode === "guest";
  return (
    <section
      className={`px-edge ${guest ? "border-border border-t py-3.5" : "pt-5 pb-4"}`}
    >
      {guest ? (
        <p className="text-label-lg text-text-3">
          {guestLinkNotice(guestExpiresAt)}
        </p>
      ) : (
        <>
          <p className="text-section tracking-title text-text-strong font-black">
            {ACTIVITY_LOGIN_COPY.title}
          </p>
          <p className="text-label-lg text-text-3 mt-1.5">
            {ACTIVITY_LOGIN_COPY.description}
          </p>
        </>
      )}
      <Link
        href="/login"
        className="text-body text-accent mt-2.5 inline-block font-bold active:opacity-60"
      >
        {guest ? "계정 연동" : "로그인"}
      </Link>
    </section>
  );
}
