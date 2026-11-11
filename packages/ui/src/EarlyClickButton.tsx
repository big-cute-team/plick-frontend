"use client";

import type { ButtonHTMLAttributes } from "react";

/**
 * 하이드레이션 전에 눌러도 버려지지 않는 버튼 (KAN-750).
 *
 * 서버가 보낸 HTML은 스크립트보다 먼저 그려진다. 그 사이의 버튼은 보이기만 하고 `onClick`이 붙어
 * 있지 않아, 페이지가 뜨자마자 누른 클릭은 그냥 사라진다. React는 붙기 전의 클릭을 기억하지 않는다.
 *
 * 폼 제출은 다르다. React 19는 함수 `action`을 가진 폼을 서버에서 그릴 때 작은 인라인 스크립트를
 * 같이 내보내, 하이드레이션 전의 submit을 붙잡아 모아 둔다. 붙은 뒤에 그 폼의 `action`을 불러
 * 다시 처리한다. 그래서 버튼을 submit 버튼으로 두고 폼으로 감싼다. 일찍 누른 클릭은 폼 제출이 되어
 * 모였다가 하이드레이션 직후에 `onPress`로 온다.
 *
 * 붙은 뒤의 클릭은 폼을 거치지 않는다. `onClick`에서 제출을 막고 `onPress`를 바로 부른다. 폼
 * `action`은 트랜지션 안에서 돌아 그 안의 상태 갱신이 급하지 않은 것으로 밀리는데, 누른 즉시
 * 반응해야 하는 버튼이라 평소 길은 그대로 둔다.
 *
 * 폼은 `display: contents`라 배치에 끼어들지 않는다. 다만 폼 안에 폼을 둘 수 없으니 다른 폼 안에서는
 * 쓰지 않는다. 브라우저가 안쪽 폼 태그를 버려 하이드레이션이 어긋난다.
 *
 * @param onPress 눌렀을 때 할 일. 일찍 누른 클릭이 여러 번이면 그만큼 불린다
 */
export function EarlyClickButton({
  onPress,
  children,
  ...rest
}: Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "formAction"
> & {
  onPress: () => void;
}) {
  return (
    <form action={onPress} className="contents">
      <button
        {...rest}
        type="submit"
        onClick={(event) => {
          event.preventDefault();
          onPress();
        }}
      >
        {children}
      </button>
    </form>
  );
}
