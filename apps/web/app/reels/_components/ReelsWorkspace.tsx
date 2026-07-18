"use client";

import { useState } from "react";
import type { FeedPost } from "@plick/domain/types";
import { ReelDetailPanel } from "./ReelDetailPanel";
import { ReelViewer } from "./ReelViewer";

/**
 * 릴스 작업 영역 (KAN-219) — 세로 스냅 뷰어 + 오른쪽 세부 패널을 가로로 배치하고
 * 패널 개폐 상태를 소유한다.
 *
 * 릴에서 제목 영역이나 댓글 버튼을 누르면 그 게시물로 패널이 열리고, 데스크톱에선
 * 뷰어가 폭을 나눠 주며 패널이 오른쪽에서 미끄러져 들어온다. 모바일 뷰에선 패널이
 * 전체 화면 오버레이로 뜬다(`ReelDetailPanel`).
 *
 * @param posts - 피드에 표시할 게시물
 */
export function ReelsWorkspace({ posts }: { posts: FeedPost[] }) {
  const [activePost, setActivePost] = useState<FeedPost | null>(null);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ReelViewer posts={posts} onOpenDetail={setActivePost} />
      <ReelDetailPanel post={activePost} onClose={() => setActivePost(null)} />
    </div>
  );
}
