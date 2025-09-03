import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

export async function GET(
  request: NextRequest,
  { params }: { params: { year: string; month: string } }
) {
  try {
    const { year, month } = params;
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    if (
      isNaN(targetYear) ||
      isNaN(targetMonth) ||
      targetMonth < 1 ||
      targetMonth > 12 ||
      targetYear < 2020 ||
      targetYear > 2030
    ) {
      return NextResponse.json(
        { error: "올바른 년도와 월을 입력해주세요" },
        { status: 400 }
      );
    }

    const googleSheetsService = GoogleSpreadSheetService.getInstance();

    // 해당 년월의 1일로 Date 객체 생성
    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    const monthlyData = await googleSheetsService.getMonthlyFullDataByDate(
      targetDate
    );

    return NextResponse.json({
      success: true,
      data: monthlyData,
      year: targetYear,
      month: targetMonth,
    });
  } catch (error: any) {
    console.error("월별 데이터 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "월별 데이터 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
