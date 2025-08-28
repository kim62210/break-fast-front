import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, checkInTime } = body;

    if (!name) {
      return NextResponse.json(
        { error: "이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkInTime);
    const hours = checkInDate.getHours();
    console.log(hours);
    if (hours >= 10 || hours < 8) {
      return NextResponse.json(
        { error: "조식 시간(08:00-10:00)에만 체크인 가능합니다." },
        { status: 400 }
      );
    }

    // Google Sheets API 연동
    try {
      const googleSheetsService = GoogleSpreadSheetService.getInstance();

      const checkInData = {
        name,
        date: checkInDate.toLocaleDateString("ko-KR"),
        time: checkInDate.toLocaleTimeString("ko-KR"),
        timestamp: checkInDate.toISOString(),
      };

      await googleSheetsService.addCheckIn(checkInData);
    } catch (sheetsError: any) {
      console.error("Google Sheets 연동 오류:", sheetsError);
      return NextResponse.json(
        {
          error:
            sheetsError.message || "Google Sheets 연동 중 오류가 발생했습니다.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      message: `${name}님의 체크인이 완료되었습니다.`,
      checkInTime: checkInDate.toISOString(),
      data: {
        name,
        date: checkInDate.toLocaleDateString("ko-KR"),
        time: checkInDate.toLocaleTimeString("ko-KR"),
      },
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "체크인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  // 오늘의 체크인 목록 조회
  try {
    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    const today = new Date().toLocaleDateString("ko-KR");

    // 오늘 체크인 수와 목록을 모두 조회
    const [checkInCount, checkIns] = await Promise.all([
      googleSheetsService.getTodayCheckInCount(),
      googleSheetsService.getCheckInsByDate(today),
    ]);

    return NextResponse.json({
      date: today,
      count: checkInCount, // 실제 체크된 셀의 개수
      checkIns: checkIns, // 체크인한 사용자 목록
    });
  } catch (error: any) {
    console.error("데이터 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
