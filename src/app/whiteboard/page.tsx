import { WhiteboardRoom } from "../WhiteboardRoom";
import { SimpleWhiteboard } from "@/components/SimpleWhiteboard";

export default function WhiteboardPage() {
  return (
    <div className="h-screen w-screen">
      <WhiteboardRoom>
        <div className="flex flex-col h-full">
          <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold">조식 체크인 - 협업 화이트보드</h1>
            <a 
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              메인으로 돌아가기
            </a>
          </header>
          <main className="flex-1">
            <SimpleWhiteboard />
          </main>
        </div>
      </WhiteboardRoom>
    </div>
  );
}
