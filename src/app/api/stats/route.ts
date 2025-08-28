import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const googleSheetsService = GoogleSpreadSheetService.getInstance();

    if (startDate && endDate) {
      // 날짜 범위별 통계 조회
      const stats = await googleSheetsService.getStatsByDateRange(
        startDate,
        endDate
      );

      return NextResponse.json({
        period: `${startDate} ~ ${endDate}`,
        dailyStats: stats,
      });
    } else {
      // 전체 데이터 조회
      const allCheckIns = await googleSheetsService.getAllCheckIns();

      // 날짜별 그룹화
      const dailyStats: { [date: string]: number } = {};
      allCheckIns.forEach((checkIn) => {
        const date = checkIn.date;
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });

      return NextResponse.json({
        totalCheckIns: allCheckIns.length,
        dailyStats: dailyStats,
        allCheckIns: allCheckIns,
      });
    }
  } catch (error: any) {
    console.error("통계 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
