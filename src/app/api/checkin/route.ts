import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";
import { getKSTDate, formatKSTDate, kstDateToUTCTimestamp } from "@/lib/utils";

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

    // KST 기준으로 체크인 시간 처리
    const kstCheckInDate = getKSTDate(); // 실제 체크인은 항상 KST 기준 현재 시간
    const hours = kstCheckInDate.getHours();
    const isBreakfastTime = hours >= 8 && hours < 10;

    // 조식시간 외라도 체크인은 허용하되, 경고 메시지 포함
    let warningMessage = "";
    if (!isBreakfastTime) {
      warningMessage = "조식 시간(08:00-10:00) 외의 체크인입니다.";
    }

    // Google Sheets API 연동
    try {
      const googleSheetsService = GoogleSpreadSheetService.getInstance();

      const checkInData = {
        name,
        date: formatKSTDate(kstCheckInDate),
        time: kstCheckInDate.toLocaleTimeString("ko-KR"),
        timestamp: kstDateToUTCTimestamp(kstCheckInDate),
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
      warningMessage,
      isBreakfastTime,
      checkInTime: kstCheckInDate.toISOString(),
      data: {
        name,
        date: formatKSTDate(kstCheckInDate),
        time: kstCheckInDate.toLocaleTimeString("ko-KR"),
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
  // 오늘의 체크인 목록 조회 (KST 기준)
  try {
    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    const today = formatKSTDate(getKSTDate());

    // 오늘 체크인 목록을 조회하고 개수는 계산으로 처리
    const checkIns = await googleSheetsService.getCheckInsByDate(today);
    const checkInCount = checkIns.length;

    return NextResponse.json({
      date: today,
      count: checkInCount, // 체크인 목록의 길이로 계산
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
