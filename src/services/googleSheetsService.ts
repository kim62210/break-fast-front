import { google, sheets_v4 } from "googleapis";
import { getKSTDate, utcTimestampToKSTDate } from "@/lib/utils";

/** 구글 스프레드 서비스 상수 */
const GOOGLE_SHEET_CONSTANT = {
  SERVICE_EMAIL: "spreadsheet@ship-da.iam.gserviceaccount.com",
  SERVICE_SCOPE: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
};

export interface CheckInData {
  name: string;
  date: string;
  time: string;
  timestamp: string;
}

export interface SheetUserData {
  name: string;
  row: number;
}

export class GoogleSpreadSheetService {
  private static instance: GoogleSpreadSheetService;
  private readonly sheetClient: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly sheetName: string;
  private userListCache: Map<
    string,
    { data: SheetUserData[]; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

  constructor() {
    const privateKey = process.env.GOOGLE_SPREAD_API_PEM_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (!privateKey) {
      throw new Error(
        "GOOGLE_SPREAD_API_PEM_KEY 환경 변수가 설정되지 않았습니다."
      );
    }

    if (!process.env.GOOGLE_SPREAD_SERVICE_EMAIL) {
      throw new Error(
        "GOOGLE_SPREAD_SERVICE_EMAIL 환경 변수가 설정되지 않았습니다."
      );
    }

    if (!process.env.GOOGLE_SPREADSHEET_ID) {
      throw new Error("GOOGLE_SPREADSHEET_ID 환경 변수가 설정되지 않았습니다.");
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SPREAD_SERVICE_EMAIL,
      key: privateKey,
      scopes: GOOGLE_SHEET_CONSTANT.SERVICE_SCOPE,
    });

    this.sheetClient = google.sheets({ version: "v4", auth });
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.sheetName = this.getCurrentSheetName();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): GoogleSpreadSheetService {
    if (!GoogleSpreadSheetService.instance) {
      GoogleSpreadSheetService.instance = new GoogleSpreadSheetService();
    }
    return GoogleSpreadSheetService.instance;
  }

  /**
   * 현재 월에 맞는 시트명 생성 (YY.MM 형식) - KST 기준
   */
  private getCurrentSheetName(): string {
    const now = getKSTDate(); // KST 기준 현재 시간
    const year = now.getFullYear().toString().slice(-2); // 24, 25 등
    const month = (now.getMonth() + 1).toString().padStart(2, "0"); // 01, 02 등
    return `${year}.${month}`;
  }

  /**
   * 특정 날짜에 맞는 시트명 생성 (YY.MM 형식)
   */
  private getSheetNameByDate(date: Date): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}.${month}`;
  }

  /**
   * E열에서 사용자 목록과 행 번호 가져오기 (3글자 이름만 필터링, 캐싱 적용)
   */
  private async getUserList(sheetName: string): Promise<SheetUserData[]> {
    try {
      // 캐시 확인
      const cached = this.userListCache.get(sheetName);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!E:E`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 2) {
        return [];
      }

      // 3행부터 데이터 (2행은 헤더)
      const userList: SheetUserData[] = [];
      for (let i = 2; i < rows.length; i++) {
        const name = rows[i] && rows[i][0];
        if (name && name.trim()) {
          const trimmedName = name.trim();
          // 3글자 이름만 필터링
          if (trimmedName.length === 3) {
            userList.push({
              name: trimmedName,
              row: i + 1, // 스프레드시트 행 번호 (1부터 시작)
            });
          }
        }
      }

      // 캐시에 저장
      this.userListCache.set(sheetName, {
        data: userList,
        timestamp: now,
      });

      return userList;
    } catch (error) {
      console.error("사용자 목록 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 날짜에 해당하는 열 번호 계산 (F열=6부터 시작)
   */
  private getColumnByDate(day: number): string {
    // F열이 1일, G열이 2일, ... AJ열이 31일
    const columnIndex = 5 + day; // F열이 6번째 열(인덱스 5)
    return this.numberToColumnLetter(columnIndex);
  }

  /**
   * 숫자를 열 문자로 변환 (6 -> F, 7 -> G, ...)
   */
  private numberToColumnLetter(num: number): string {
    let result = "";
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  /**
   * 스프레드시트에 체크인 데이터 추가 (체크박스 방식, 3글자 이름만 허용)
   */
  public async addCheckIn(checkInData: CheckInData): Promise<boolean> {
    try {
      // 3글자 이름 검증
      if (!checkInData.name || checkInData.name.trim().length !== 3) {
        throw new Error("이름은 반드시 3글자여야 합니다.");
      }

      const trimmedName = checkInData.name.trim();
      const checkInDate = utcTimestampToKSTDate(checkInData.timestamp); // UTC timestamp를 KST로 변환
      const sheetName = this.getSheetNameByDate(checkInDate);
      const day = checkInDate.getDate(); // 이미 KST로 변환된 날짜

      // 중복 체크
      const isDuplicate = await this.isDuplicateCheckIn(
        trimmedName,
        checkInDate
      );
      if (isDuplicate) {
        throw new Error(
          `${trimmedName}님은 ${checkInData.date}에 이미 체크인하셨습니다.`
        );
      }

      // 사용자 목록에서 해당 이름의 행 찾기
      const userList = await this.getUserList(sheetName);
      const user = userList.find((u) => u.name === trimmedName);

      if (!user) {
        throw new Error(
          `${trimmedName}님은 등록되지 않은 사용자입니다. 관리자에게 문의하세요.`
        );
      }

      // 해당 날짜 열 계산
      const column = this.getColumnByDate(day);
      const cellRange = `${sheetName}!${column}${user.row}`;

      // 체크박스에 TRUE 값 설정
      const response = await this.sheetClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: cellRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [[true]],
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error("Google Sheets 데이터 추가 오류:", error);
      throw error;
    }
  }

  /**
   * 특정 날짜 컬럼에서 체크인된 사용자 수 조회 (KST 기준)
   */
  public async getCheckInCountByDate(targetDay: number): Promise<number> {
    try {
      const today = getKSTDate(); // KST 기준 오늘 날짜
      const sheetName = this.getSheetNameByDate(today);
      const targetColumn = this.getColumnByDate(targetDay);

      // 사용자 목록 가져오기
      const userList = await this.getUserList(sheetName);
      if (userList.length === 0) {
        return 0;
      }

      // 해당 날짜 컬럼의 모든 체크박스 상태 조회
      const range = `${sheetName}!${targetColumn}3:${targetColumn}${
        userList.length + 2
      }`;

      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const checkInStates = response.data.values || [];

      // 체크된 셀의 개수 계산
      let count = 0;
      for (let i = 0; i < checkInStates.length; i++) {
        const cellValue = checkInStates[i] && checkInStates[i][0];
        if (cellValue === true || cellValue === "TRUE") {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("체크인 수 조회 오류:", error);
      return 0;
    }
  }

  /**
   * 오늘 날짜 컬럼에서 체크인된 사용자 수 조회 (KST 기준)
   */
  public async getTodayCheckInCount(): Promise<number> {
    const today = getKSTDate(); // KST 기준 오늘 날짜
    return this.getCheckInCountByDate(today.getDate());
  }

  /**
   * 특정 날짜의 체크인 데이터 조회
   */
  public async getCheckInsByDate(date: string): Promise<CheckInData[]> {
    try {
      // 한국 날짜 형식을 Date 객체로 변환 (예: "2024. 1. 15.")
      let targetDate: Date;
      let targetDay: number;

      if (date.includes(". ")) {
        // "2024. 1. 15." 형식
        const dateParts = date.replace(/\.$/, "").split(". ");
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript 월은 0부터 시작
        const day = parseInt(dateParts[2]);
        targetDate = new Date(year, month, day);
        targetDay = day;
      } else {
        // 현재 날짜 사용 (KST 기준)
        targetDate = getKSTDate();
        targetDay = targetDate.getDate();
      }

      const sheetName = this.getSheetNameByDate(targetDate);

      // 사용자 목록 가져오기
      const userList = await this.getUserList(sheetName);
      if (userList.length === 0) {
        return [];
      }

      // 해당 날짜 열 계산
      const column = this.getColumnByDate(targetDay);
      const range = `${sheetName}!${column}3:${column}${userList.length + 2}`;

      // 체크인 상태 조회
      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const checkInStates = response.data.values || [];
      const checkIns: CheckInData[] = [];

      // 체크인된 사용자들만 반환
      for (let i = 0; i < userList.length; i++) {
        const cellValue = checkInStates[i] && checkInStates[i][0];
        const isCheckedIn = cellValue === true || cellValue === "TRUE";

        if (isCheckedIn) {
          checkIns.push({
            name: userList[i].name,
            date: date,
            time: "조식 시간", // 정확한 시간은 따로 기록되지 않음
            timestamp: targetDate.toISOString(),
          });
        }
      }

      return checkIns;
    } catch (error) {
      console.error("Google Sheets 데이터 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 모든 체크인 데이터 조회
   */
  public async getAllCheckIns(): Promise<CheckInData[]> {
    try {
      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:D`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      // 헤더 제외하고 데이터만 처리
      const dataRows = rows.slice(1);

      return dataRows.map((row) => ({
        name: row[0] || "",
        date: row[1] || "",
        time: row[2] || "",
        timestamp: row[3] || "",
      }));
    } catch (error) {
      console.error("Google Sheets 전체 데이터 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 중복 체크인 확인 (KST 기준)
   */
  private async isDuplicateCheckIn(name: string, date: Date): Promise<boolean> {
    try {
      const sheetName = this.getSheetNameByDate(date);
      const day = date.getDate(); // 이미 KST로 변환된 날짜

      // 사용자 목록에서 해당 이름의 행 찾기
      const userList = await this.getUserList(sheetName);
      const user = userList.find((u) => u.name === name);

      if (!user) {
        return false; // 등록되지 않은 사용자
      }

      // 해당 날짜 열의 체크 상태 확인
      const column = this.getColumnByDate(day);
      const cellRange = `${sheetName}!${column}${user.row}`;

      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: cellRange,
      });

      const cellValue = response.data.values?.[0]?.[0];
      return cellValue === true || cellValue === "TRUE";
    } catch (error) {
      console.error("중복 체크 오류:", error);
      return false;
    }
  }

  /**
   * 스프레드시트의 모든 시트 목록 조회
   */
  public async getAvailableSheets(): Promise<string[]> {
    try {
      const response = await this.sheetClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      const sheetNames = sheets
        .map((sheet) => sheet.properties?.title || "")
        .filter((name) => name);

      return sheetNames;
    } catch (error) {
      console.error("시트 목록 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 등록된 사용자 목록 조회
   */
  public async getRegisteredUsers(): Promise<string[]> {
    try {
      const userList = await this.getUserList(this.sheetName);
      return userList.map((user) => user.name);
    } catch (error) {
      console.error("등록된 사용자 목록 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 새 사용자 추가 (3글자 이름만 허용)
   */
  public async addUser(name: string): Promise<boolean> {
    try {
      // 3글자 이름 검증
      if (!name || name.trim().length !== 3) {
        throw new Error("이름은 반드시 3글자여야 합니다.");
      }

      const trimmedName = name.trim();
      const userList = await this.getUserList(this.sheetName);

      // 중복 확인
      if (userList.some((user) => user.name === trimmedName)) {
        throw new Error(`${trimmedName}님은 이미 등록된 사용자입니다.`);
      }

      // 새 행에 사용자 추가
      const newRow = userList.length + 3; // 헤더 다음부터
      const range = `${this.sheetName}!E${newRow}`;

      const response = await this.sheetClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[trimmedName]],
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error("사용자 추가 오류:", error);
      throw error;
    }
  }

  /**
   * 월별 전체 데이터를 한 번에 조회 (최적화된 버전)
   */
  /**
   * 시트가 존재하는지 확인
   */
  private async sheetExists(sheetName: string): Promise<boolean> {
    try {
      const response = await this.sheetClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return sheets.some((sheet) => sheet.properties?.title === sheetName);
    } catch (error) {
      console.error("시트 존재 확인 오류:", error);
      return false;
    }
  }

  /**
   * 이전 달 시트명 생성
   */
  private getPreviousMonthSheetName(currentDate: Date): string {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return this.getSheetNameByDate(prevMonth);
  }

  /**
   * 시트 복사 (이전 달 → 현재 달)
   */
  private async copySheetFromPreviousMonth(
    currentSheetName: string,
    previousSheetName: string
  ): Promise<void> {
    try {
      // 1. 이전 달 시트가 존재하는지 확인
      const prevSheetExists = await this.sheetExists(previousSheetName);
      if (!prevSheetExists) {
        throw new Error(
          `이전 달 시트 '${previousSheetName}'가 존재하지 않습니다.`
        );
      }

      // 2. 스프레드시트 정보 가져오기
      const spreadsheetResponse = await this.sheetClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = spreadsheetResponse.data.sheets || [];
      const sourceSheet = sheets.find(
        (sheet) => sheet.properties?.title === previousSheetName
      );

      if (!sourceSheet || !sourceSheet.properties?.sheetId) {
        throw new Error(
          `이전 달 시트 '${previousSheetName}'를 찾을 수 없습니다.`
        );
      }

      // 3. 시트 복사
      await this.sheetClient.spreadsheets.sheets.copyTo({
        spreadsheetId: this.spreadsheetId,
        sheetId: sourceSheet.properties.sheetId,
        requestBody: {
          destinationSpreadsheetId: this.spreadsheetId,
        },
      });

      // 4. 복사된 시트의 이름을 현재 달로 변경
      const updatedSpreadsheet = await this.sheetClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const copiedSheet = updatedSpreadsheet.data.sheets?.find((sheet) =>
        sheet.properties?.title?.startsWith(`Copy of ${previousSheetName}`)
      );

      if (copiedSheet && copiedSheet.properties?.sheetId) {
        await this.sheetClient.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: copiedSheet.properties.sheetId,
                    title: currentSheetName,
                  },
                  fields: "title",
                },
              },
            ],
          },
        });
      }

      // 5. 새 시트의 체크인 데이터 초기화 (사용자 목록은 유지, 체크인 데이터만 삭제)
      await this.clearCheckInDataInNewSheet(currentSheetName);

      console.log(
        `시트 '${previousSheetName}'를 복사하여 '${currentSheetName}' 시트를 생성했습니다.`
      );
    } catch (error) {
      console.error("시트 복사 오류:", error);
      throw error;
    }
  }

  /**
   * 새 시트의 체크인 데이터 초기화 (F열부터 끝까지 - 체크박스를 모두 FALSE로 설정)
   */
  private async clearCheckInDataInNewSheet(sheetName: string): Promise<void> {
    try {
      // 사용자 목록 가져오기
      const userList = await this.getUserList(sheetName);
      if (userList.length === 0) return;

      const today = getKSTDate(); // KST 기준 오늘 날짜
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // F열부터 해당 월의 마지막 날까지 체크박스를 모두 FALSE로 설정
      const startColumn = "F"; // 1일
      const endColumn = this.numberToColumnLetter(6 + daysInMonth - 1); // 마지막 날
      const range = `${sheetName}!${startColumn}3:${endColumn}${
        userList.length + 2
      }`;

      // 모든 체크박스를 FALSE로 설정할 데이터 준비
      const falseValues: boolean[][] = [];
      for (let userIndex = 0; userIndex < userList.length; userIndex++) {
        const userRow: boolean[] = [];
        for (let day = 0; day < daysInMonth; day++) {
          userRow.push(false);
        }
        falseValues.push(userRow);
      }

      // 체크박스를 모두 FALSE로 업데이트
      await this.sheetClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: "RAW",
        requestBody: {
          values: falseValues,
        },
      });

      console.log(
        `새 시트 '${sheetName}'의 체크박스를 모두 해제했습니다. (${userList.length}명 × ${daysInMonth}일)`
      );
    } catch (error) {
      console.error("체크인 데이터 초기화 오류:", error);
      throw error;
    }
  }

  /**
   * 특정 월의 전체 데이터 조회
   */
  public async getMonthlyFullDataByDate(targetDate: Date): Promise<{
    rawData: boolean[][];
    userList: { name: string; row: number }[];
    sheetName: string;
    daysInMonth: number;
    currentMonth: number;
    currentYear: number;
  }> {
    try {
      const sheetName = this.getSheetNameByDate(targetDate);
      const currentMonth = targetDate.getMonth() + 1;
      const currentYear = targetDate.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // 해당 월 시트가 존재하는지 확인
      const sheetExists = await this.sheetExists(sheetName);

      if (!sheetExists) {
        console.log(`시트 '${sheetName}'가 존재하지 않습니다.`);
        return {
          rawData: [],
          userList: [],
          sheetName,
          daysInMonth,
          currentMonth,
          currentYear,
        };
      }

      // 사용자 목록 가져오기
      const userList = await this.getUserList(sheetName);
      if (userList.length === 0) {
        return {
          rawData: [],
          userList: [],
          sheetName,
          daysInMonth,
          currentMonth,
          currentYear,
        };
      }

      // 전체 체크인 데이터를 한 번에 가져오기 (F열부터 해당 월의 마지막 날까지)
      const startColumn = "F"; // 1일
      const endColumn = this.numberToColumnLetter(6 + daysInMonth - 1); // 마지막 날
      const range = `${sheetName}!${startColumn}3:${endColumn}${
        userList.length + 2
      }`;

      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rawData: boolean[][] = [];
      const values = response.data.values || [];

      // 각 사용자별로 일별 체크인 상태를 boolean 배열로 변환
      for (let userIndex = 0; userIndex < userList.length; userIndex++) {
        const userRow = values[userIndex] || [];
        const userDailyData: boolean[] = [];

        for (let day = 0; day < daysInMonth; day++) {
          const cellValue = userRow[day];
          userDailyData.push(cellValue === true || cellValue === "TRUE");
        }

        rawData.push(userDailyData);
      }

      return {
        rawData,
        userList,
        sheetName,
        daysInMonth,
        currentMonth,
        currentYear,
      };
    } catch (error) {
      console.error("월별 전체 데이터 조회 오류:", error);
      throw error;
    }
  }

  public async getMonthlyFullData(): Promise<{
    rawData: boolean[][];
    userList: { name: string; row: number }[];
    sheetName: string;
    daysInMonth: number;
    currentMonth: number;
    currentYear: number;
  }> {
    try {
      const today = getKSTDate(); // KST 기준 오늘 날짜
      const sheetName = this.getSheetNameByDate(today);
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // 현재 달 시트가 존재하는지 확인
      const currentSheetExists = await this.sheetExists(sheetName);

      if (!currentSheetExists) {
        console.log(
          `현재 달 시트 '${sheetName}'가 존재하지 않습니다. 이전 달 시트를 복사합니다.`
        );

        const previousSheetName = this.getPreviousMonthSheetName(today);
        await this.copySheetFromPreviousMonth(sheetName, previousSheetName);
      }

      // 사용자 목록 가져오기
      const userList = await this.getUserList(sheetName);
      if (userList.length === 0) {
        return {
          rawData: [],
          userList: [],
          sheetName,
          daysInMonth,
          currentMonth,
          currentYear,
        };
      }

      // 전체 체크인 데이터를 한 번에 가져오기 (F열부터 해당 월의 마지막 날까지)
      const startColumn = "F"; // 1일
      const endColumn = this.numberToColumnLetter(6 + daysInMonth - 1); // 마지막 날
      const range = `${sheetName}!${startColumn}3:${endColumn}${
        userList.length + 2
      }`;

      const response = await this.sheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rawData: boolean[][] = [];
      const values = response.data.values || [];

      // 각 사용자별로 일별 체크인 상태를 boolean 배열로 변환
      for (let userIndex = 0; userIndex < userList.length; userIndex++) {
        const userRow = values[userIndex] || [];
        const userDailyData: boolean[] = [];

        for (let day = 0; day < daysInMonth; day++) {
          const cellValue = userRow[day];
          userDailyData.push(cellValue === true || cellValue === "TRUE");
        }

        rawData.push(userDailyData);
      }

      return {
        rawData,
        userList,
        sheetName,
        daysInMonth,
        currentMonth,
        currentYear,
      };
    } catch (error) {
      console.error("월별 전체 데이터 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 월별 전체 통계 조회 (기존 호환성 유지)
   */
  public async getMonthlyStats(): Promise<{
    dailyStats: { [date: string]: number };
    weeklyStats: { [week: string]: number };
    totalCount: number;
    averageDaily: number;
  }> {
    try {
      const fullData = await this.getMonthlyFullData();
      const { rawData, daysInMonth, currentMonth, currentYear } = fullData;

      // 일별 통계 계산
      const dailyStats: { [date: string]: number } = {};
      let totalCount = 0;
      let daysWithCheckIns = 0; // 1명 이상 체크인한 날짜 수

      for (let day = 0; day < daysInMonth; day++) {
        let dayCount = 0;
        for (let userIndex = 0; userIndex < rawData.length; userIndex++) {
          if (rawData[userIndex][day]) {
            dayCount++;
          }
        }

        const dateKey = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, "0")}-${(day + 1).toString().padStart(2, "0")}`;
        dailyStats[dateKey] = dayCount;
        totalCount += dayCount;

        // 1명 이상 체크인한 날짜 카운트
        if (dayCount > 0) {
          daysWithCheckIns++;
        }
      }

      // 주별 통계 계산
      const weeklyStats: { [week: string]: number } = {};
      for (let day = 1; day <= daysInMonth; day++) {
        const weekOfMonth = Math.ceil(day / 7);
        const weekKey = `${currentMonth}월 ${weekOfMonth}주차`;

        const dateKey = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        weeklyStats[weekKey] =
          (weeklyStats[weekKey] || 0) + (dailyStats[dateKey] || 0);
      }

      // 1명 이상 체크인한 날짜가 있을 때만 평균 계산
      const averageDaily =
        daysWithCheckIns > 0 ? totalCount / daysWithCheckIns : 0;

      return {
        dailyStats,
        weeklyStats,
        totalCount,
        averageDaily: Math.round(averageDaily * 100) / 100,
      };
    } catch (error) {
      console.error("월별 통계 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 날짜별 통계 조회
   */
  public async getStatsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ [date: string]: number }> {
    try {
      const allCheckIns = await this.getAllCheckIns();
      const stats: { [date: string]: number } = {};

      allCheckIns.forEach((checkIn) => {
        const checkInDate = checkIn.date;
        if (checkInDate >= startDate && checkInDate <= endDate) {
          stats[checkInDate] = (stats[checkInDate] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error("통계 조회 오류:", error);
      throw error;
    }
  }
}
