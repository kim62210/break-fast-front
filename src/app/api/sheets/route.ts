import { NextResponse } from "next/server";
import { GoogleSpreadSheetService } from "@/services/googleSheetsService";

// 사용 가능한 시트 목록 조회
export async function GET() {
  try {
    const googleSheetsService = GoogleSpreadSheetService.getInstance();
    const sheets = await googleSheetsService.getAvailableSheets();

    return NextResponse.json({
      sheets: sheets,
      count: sheets.length,
    });
  } catch (error: any) {
    console.error("시트 목록 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "시트 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
