import { NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

export async function GET() {
  try {
    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    const monthlyStats = await googleSheetsService.getMonthlyStats();

    return NextResponse.json({
      success: true,
      data: monthlyStats,
      month: new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long' 
      })
    });
  } catch (error: any) {
    console.error("월별 통계 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "월별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
