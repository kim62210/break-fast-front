"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client";

export function WhiteboardRoom({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider publicApiKey={"pk_dev_chcVVkpr7m_GJw8sj_rEVGZM1twwajqTQo4eXzBZJa7Y8oa6bxW4j5wEen3jLHZM"}>
      <RoomProvider 
        id="breakfast-check-whiteboard"
        initialStorage={{
          layers: new LiveMap(),
        }}
      >
        <ClientSideSuspense fallback={<div>화이트보드 로딩 중...</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
