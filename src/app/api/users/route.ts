import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

// 등록된 사용자 목록 조회
export async function GET() {
  try {
    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    const users = await googleSheetsService.getRegisteredUsers();

    return NextResponse.json({
      users: users,
      count: users.length,
    });
  } catch (error: any) {
    console.error("사용자 목록 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "사용자 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 새 사용자 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    await googleSheetsService.addUser(name.trim());

    return NextResponse.json({
      success: true,
      message: `${name}님이 등록되었습니다.`,
      name: name.trim(),
    });
  } catch (error: any) {
    console.error("사용자 추가 오류:", error);
    return NextResponse.json(
      { error: error.message || "사용자 추가 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
