import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";
import { getKSTDate, formatKSTDate } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const targetDay = parseInt(date);
    const today = getKSTDate(); // KST 기준 오늘 날짜
    const targetDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      targetDay
    );

    if (isNaN(targetDay) || targetDay < 1 || targetDay > 31) {
      return NextResponse.json(
        { error: "올바른 날짜를 입력해주세요 (1-31)" },
        { status: 400 }
      );
    }

    const googleSheetsService = GoogleSpreadSheetService.getInstance();

    // 특정 날짜의 체크인 수와 목록 조회 (KST 기준)
    const [checkInCount, checkIns] = await Promise.all([
      googleSheetsService.getCheckInCountByDate(targetDay),
      googleSheetsService.getCheckInsByDate(formatKSTDate(targetDate)),
    ]);

    return NextResponse.json({
      date: formatKSTDate(targetDate),
      day: targetDay,
      count: checkInCount,
      checkIns: checkIns,
    });
  } catch (error: any) {
    console.error("특정 날짜 데이터 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
