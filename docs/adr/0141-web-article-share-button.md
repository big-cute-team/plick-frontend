# 0141. 웹 기사 상세 공유 버튼이 안 눌리던 것 고치기 (KAN-485)

## 어떤 문제였나

티켓은 "웹 공유 버튼 지금 동작 안함" 한 줄이었고 설명은 비어 있었다. 웹에 공유 버튼이 두 군데 있다.
릴스 액션 레일의 공유(KAN-349에서 딥링크 팝업으로 붙였다)와 기사 상세 본문 밑 액션 줄의 공유다.
어느 쪽인지 티켓만으로는 몰라서 둘 다 코드부터 봤다.

릴스 쪽은 `ReelItem`이 `shareOpen` 상태를 들고 `ShareDialog`를 띄우는 흐름이 그대로였다.
문제는 기사 상세였다. `ArticleMain.tsx`의 액션 줄에 `<button type="button">` 하나가 `SendIcon`과
"공유" 글자만 달고 서 있었고 `onClick`이 없었다. 눌러도 아무 일도 안 일어나는 죽은 버튼이었다.

왜 이렇게 남아 있었는지 이력을 따라가 보니 이렇다. 모바일은 KAN-312에서 `ArticleShareButton`을
만들어 기사 상세 공유를 팝업에 연결했고, KAN-349에서 릴 딥링크가 생기면서 릴 공유를 웹에도
이식했다. 그때 웹에 `ShareDialog`와 `share.ts`, `useCopyLink`가 같이 넘어왔는데, 이식 범위가
릴스였던 탓에 기사 상세 버튼은 퍼블리싱 때 자리만 잡아 둔 채로 남았다. `ArticleMain`은 서버
컴포넌트라 `onClick`을 달 수도 없는 자리였고, 좋아요는 KAN-330에서 `ArticleLikeButton`으로
클라 경계를 떼어 냈지만 공유는 그 작업에 끼지 않았다.

## 어떻게 고쳤나

모바일 `ArticleShareButton`을 그대로 웹에 옮겼다.

- `apps/web/app/articles/[postId]/_components/ArticleShareButton.tsx`를 새로 만들었다.
  `"use client"`이고 `open` 상태 하나만 들고, 누르면 `ShareDialog`에 `articleSharePath(articleId)`를
  넘긴다. 버튼 클래스는 원래 `ArticleMain`에 있던 죽은 버튼 것을 그대로 가져왔다. 시각은 바뀌지
  않아야 하니까.
- `apps/web/app/_utils/share.ts`에 `articleSharePath`를 추가했다. 웹에는 `reelSharePath`만 있었다.
  모바일 `share.ts`와 이제 함수 목록이 같다.
- `ArticleMain.tsx`에서 죽은 버튼을 `<ArticleShareButton articleId={article.id} />`로 바꾸고
  더 안 쓰는 `SendIcon` import를 뺐다. `ArticleMain`은 서버 컴포넌트로 그대로 남는다.
  `ArticleLikeButton`과 같은 이유다. 본문 전체를 클라로 내리면 문단과 추천 카드까지 번들에 실린다.
- `ShareDialog` 주석에 기사 세부도 쓴다고 적었다.

모바일은 KAN-428에서 `ShareDialog`를 `next/dynamic`으로 지연 로드하는데 웹은 그렇게 안 했다.
웹 코드베이스에 `next/dynamic`을 쓰는 자리가 아직 한 곳도 없고, 웹 `ReelItem`도 `ShareDialog`를
정적으로 import한다. 웹 성능 패스를 따로 돌릴 때 릴스와 함께 옮기는 게 맞지, 버그 수정 PR에서
한 파일만 먼저 바꾸면 웹 안에서 두 방식이 섞인다.

## 검증에서 헷갈렸던 것

로컬 dev 서버를 띄우고 `/articles/8032`에서 공유를 눌렀다. 팝업이 열리고 주소 칸에
`http://localhost:3000/articles/8032`가 정확히 떴다. 여기까지는 티켓 범위가 끝난 거다.

그런데 "링크 복사"를 누르니 "주소를 드래그해 직접 복사해 주세요" 안내로 떨어졌다. 복사 실패 경로다.
코드 문제인지 환경 문제인지 갈라야 했다. 이미 배포돼 잘 쓰는 릴스 공유에서 같은 걸 눌러 보니
똑같이 실패했다. `document.hasFocus()`가 false였다. Clipboard API의 `writeText`는 문서에 포커스가
있어야 허용되는데, 클로드 데스크톱의 브라우저 패널은 세션 창 뒤에 숨어 있어 포커스가 없다.
그래서 `navigator.clipboard.writeText`가 reject되고, `execCommand("copy")` 폴백도 같은 이유로
false를 돌려준다. 실제 브라우저 창에서는 클릭 자체가 포커스를 주니 이 경로로 안 떨어진다.

정리하면 브라우저 패널로 검증할 수 있는 건 "버튼이 팝업을 열고 주소가 맞다"까지고,
클립보드 복사 성공 여부는 이 패널에선 확인이 불가능하다. 애니메이션을 iOS 시뮬레이터로 보는 것과
같은 종류의 함정이라 기억해 둘 일이다.

## 남은 것

- 웹 `ShareDialog`의 `next/dynamic` 전환은 웹 성능 패스에서 릴스와 함께 처리한다.
