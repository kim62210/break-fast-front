# 조식 체크인 시스템

QR 코드를 통한 간편한 조식 체크인 시스템입니다.

## 🆕 최신 업데이트

- ✅ **자동 체크인 기능**: 페이지 접근 시 저장된 이름으로 자동 체크인하는 기능 추가
- ✅ **이름 저장 기능**: 체크박스를 통해 사용자 이름을 localStorage에 저장하여 재입력 불필요
- ✅ **KST 시간 처리 개선**: 프론트엔드 로컬타임(KST)과 구글 스프레드시트 API(UTC) 간 정확한 시간 변환
- ✅ **월별 데이터 캐싱**: 이전 날짜 조회 시 월별 데이터를 캐싱하여 성능 향상
- ✅ **날짜별 네비게이션**: 키보드 단축키와 버튼을 통한 날짜 이동 기능
- ✅ **안내 모달 시스템**: 프로젝트 시작 시 경영지원실 안내사항을 담은 모달 표시

## 주요 기능

- ✅ QR 코드 스캔을 통한 빠른 접속
- ✅ 원클릭 체크인 (이름 자동 저장/불러오기)
- ✅ 자동 체크인 (페이지 접근 시 자동 체크인)
- ✅ 실시간 이용 현황 확인
- ✅ 날짜별 체크인 현황 조회 (← → 키보드 네비게이션)
- ✅ Google Sheets 연동 (정확한 KST/UTC 시간 처리)
- ✅ 관리자 대시보드
- ✅ 통계 분석 페이지 (월별, 일별 데이터)
- ✅ 시간대별 체크인 검증 (조식 시간: 08:00-10:00)
- ✅ 중복 체크인 방지
- ✅ 월별 데이터 캐싱 및 성능 최적화

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **State Management**: Zustand, localStorage
- **Charts**: Recharts
- **Animation**: Framer Motion
- **UI Components**: Radix UI (Button, Input, Card, Checkbox, Dialog, etc.)
- **API Integration**: Google Sheets API, Google Drive API
- **Time Handling**: Custom KST/UTC conversion utilities
- **Deployment**: Vercel

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고 필요한 값을 입력합니다:

```bash
cp .env.example .env.local
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 페이지 구조

- `/` - 메인 체크인 페이지 (이름 저장 기능, 날짜별 네비게이션, 안내 모달 포함)
- `/admin` - 관리자 대시보드
- `/stats` - 통계 분석 페이지
- `/statistics` - 확장된 통계 페이지

## API 엔드포인트

- `POST /api/checkin` - 체크인 처리 (KST to UTC 변환)
- `GET /api/checkin` - 오늘의 체크인 목록 조회
- `GET /api/checkin/[date]` - 특정 날짜의 체크인 목록 조회
- `GET /api/monthly-data/[year]/[month]` - 월별 체크인 데이터 조회
- `GET /api/monthly-full-data` - 현재 월 전체 데이터 조회 (캐싱)
- `GET /api/monthly-stats` - 월별 통계 데이터 조회
- `GET /api/stats` - 통계 데이터 조회
- `GET /api/users` - 등록된 사용자 목록 조회
- `POST /api/users` - 새 사용자 추가
- `GET /api/sheets` - 구글 시트 연결 상태 확인

## Google Sheets 연동 & 시간 처리

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성
2. Google Sheets API와 Google Drive API 활성화
3. 서비스 계정 생성 및 JSON 키 파일 다운로드

### 2. 환경 변수 설정

`.env.local` 파일에 다음 정보를 입력:

```env
# Google Sheets API 설정
GOOGLE_SPREAD_SERVICE_EMAIL=spreadsheet@ship-da.iam.gserviceaccount.com
GOOGLE_SPREAD_API_PEM_KEY=-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n

# 스프레드시트 설정 (조식대장 스프레드시트)
GOOGLE_SPREADSHEET_ID=1tT7U6vfCGb15u8fjdZu0dNiUbZWHO-BsZmJvuesuqNE

# 개발 환경 설정
NODE_ENV=development
``` 

### 3. KST/UTC 시간 처리

프론트엔드는 KST(한국 표준시)를 사용하고, 구글 스프레드시트 API는 UTC를 기대하므로 정확한 시간 변환이 중요합니다:

- **프론트엔드**: 모든 시간은 KST 기준으로 처리
- **API 전송**: KST 시간을 UTC로 변환하여 구글 시트에 전송
- **시간 변환 함수**:
  - `kstDateToUTCTimestamp()`: KST → UTC 변환 (구글 시트 전송용)
  - `utcTimestampToKSTDate()`: UTC → KST 변환 (구글 시트 데이터 수신용)

### 4. 스프레드시트 구조

조식대장 스프레드시트는 다음과 같은 구조를 가집니다:

#### 시트명 규칙
- `YY.MM` 형식 (예: `25.01`, `25.02`)
- 매월 새로운 시트를 수동으로 생성

#### 열 구조
- **E열**: 사용자 이름 목록 (3글자 한글명)
- **F열~AJ열**: 1일~31일 체크박스
- **2행**: 헤더 (날짜 표시)
- **3행부터**: 사용자 데이터

#### 체크인 방식
- 사용자가 체크인하면 해당 날짜 열에 `TRUE` 값이 설정됩니다
- 예: 1월 5일에 체크인하면 J열(5일)에 체크박스가 체크됩니다
- UTC 시간으로 전송되지만 KST 기준 날짜로 정확히 변환되어 저장됩니다

### 5. 사용자 관리

- 새로운 사용자는 E열에 수동으로 추가하거나 API를 통해 추가할 수 있습니다
- 이름은 반드시 3글자여야 합니다 (한글 이름 기준)
- 등록되지 않은 사용자는 체크인할 수 없습니다

### 6. 데이터 캐싱

- 월별 데이터는 Map 기반 캐싱으로 성능 최적화
- 캐시 지속시간: 5분
- 이전 날짜 조회 시 월별 데이터를 미리 로드하여 빠른 응답

## 배포

### Vercel 배포

```bash
npm run build
vercel
```

## 프로젝트 구조

```
breakfast-check/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkin/
│   │   │   │   ├── [date]/
│   │   │   │   └── route.ts
│   │   │   ├── monthly-data/
│   │   │   │   └── [year]/[month]/
│   │   │   ├── monthly-full-data/
│   │   │   ├── monthly-stats/
│   │   │   ├── sheets/
│   │   │   ├── stats/
│   │   │   └── users/
│   │   ├── admin/
│   │   ├── statistics/
│   │   ├── stats/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx (새로 추가)
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   └── WelcomeModal.tsx
│   ├── hooks/
│   │   └── useWelcomeModal.ts
│   ├── services/
│   │   └── googleSheetsService.ts (KST/UTC 변환 적용)
│   ├── store/
│   │   └── checkInStore.ts
│   └── lib/
│       └── utils.ts (시간 변환 & localStorage 유틸리티)
├── public/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## 개발 가이드

### 이름 저장 및 자동 체크인 기능 (localStorage)

체크인 페이지에서 사용자는 "이름 저장하기"와 "자동 체크인하기" 체크박스를 통해 편의 기능을 사용할 수 있습니다:

```tsx
// localStorage 유틸리티 함수 사용
import { 
  getSavedName, 
  saveName, 
  removeSavedName, 
  getRememberNameSetting, 
  setRememberNameSetting,
  getAutoCheckinSetting,
  setAutoCheckinSetting 
} from '@/lib/utils'

// 저장된 이름과 설정 불러오기
const savedName = getSavedName()
const rememberSetting = getRememberNameSetting()
const autoCheckinSetting = getAutoCheckinSetting()

// 이름 저장/삭제
if (rememberName && name.trim()) {
  saveName(name.trim())
} else {
  removeSavedName()
}

// 자동 체크인 설정 저장
setAutoCheckinSetting(autoCheckinEnabled)

// 자동 체크인 로직
useEffect(() => {
  if (mounted && autoCheckin && name.trim() && !isCheckingIn && !showSuccess) {
    const timer = setTimeout(() => {
      handleCheckIn()
    }, 1000)
    
    return () => clearTimeout(timer)
  }
}, [mounted, autoCheckin, name, isCheckingIn, showSuccess])
```

### KST/UTC 시간 변환

구글 스프레드시트와 통신할 때 시간 변환이 필요한 경우:

```tsx
import { kstDateToUTCTimestamp, utcTimestampToKSTDate } from '@/lib/utils'

// KST 시간을 UTC timestamp로 변환 (구글 시트 전송용)
const kstDate = new Date()
const utcTimestamp = kstDateToUTCTimestamp(kstDate)

// UTC timestamp를 KST 날짜로 변환 (구글 시트 데이터 수신용)
const kstDate = utcTimestampToKSTDate(utcTimestamp)
```

### 새로운 UI 컴포넌트 추가

```tsx
// src/components/ui/new-component.tsx
import { cn } from '@/lib/utils'

export function NewComponent({ className, ...props }) {
  return (
    <div className={cn('your-styles', className)} {...props}>
      {/* Component content */}
    </div>
  )
}
```

### 상태 관리 (Zustand)

```tsx
// src/store/exampleStore.ts
import { create } from 'zustand'

interface ExampleState {
  count: number
  increment: () => void
}

export const useExampleStore = create<ExampleState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

### 안내 모달 관리

안내 모달의 내용을 변경하거나 다시 표시하려면:

```tsx
// src/hooks/useWelcomeModal.ts
const MODAL_VERSION = '2.0' // 버전을 변경하면 모든 사용자에게 다시 표시됩니다
```

## 사용법

### 일반 사용자

1. **체크인하기**:
   - 이름을 입력하고 체크인 버튼을 클릭
   - "이름 저장하기" 체크박스를 활성화하면 다음에 자동으로 이름이 입력됩니다
   - "자동 체크인하기" 체크박스를 활성화하면 페이지 접근 시 저장된 이름으로 자동 체크인됩니다
   - 조식 시간(08:00-10:00) 외에도 체크인 가능 (경고 메시지 표시)

2. **이용 현황 확인**:
   - 실시간으로 오늘의 체크인 현황을 확인할 수 있습니다
   - ← → 버튼 또는 키보드로 다른 날짜의 현황을 조회할 수 있습니다
   - "인원 목록" 탭에서 체크인한 사용자 목록을 확인할 수 있습니다

3. **키보드 단축키**:
   - `←` : 이전 날짜
   - `→` : 다음 날짜  
   - `Home` : 오늘 날짜로 이동

### 관리자

1. **통계 조회**: `/statistics` 페이지에서 월별, 일별 통계를 확인
2. **사용자 관리**: `/admin` 페이지에서 등록된 사용자 목록 관리
3. **데이터 관리**: 구글 스프레드시트에서 직접 데이터 수정 가능

## 기여 가이드

1. 이 저장소를 Fork합니다
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
