# 조식 체크인 시스템

QR 코드를 통한 간편한 조식 체크인 시스템입니다.

## 🆕 최신 업데이트

- ✅ **안내 모달 추가**: 프로젝트 시작 시 경영지원실 안내사항을 담은 모달이 자동으로 표시됩니다
- ✅ **조식 제공 방식 변경 안내**: 조식 전용 카드 사용 방법 및 이용 장소 안내
- ✅ **localStorage 기반 모달 관리**: 한 번 확인한 모달은 다시 표시되지 않습니다

## 주요 기능

- ✅ QR 코드 스캔을 통한 빠른 접속
- ✅ 원클릭 체크인
- ✅ 실시간 이용 현황 확인
- ✅ Google Sheets 연동
- ✅ 관리자 대시보드
- ✅ 통계 분석 페이지
- ✅ 시간대별 체크인 검증
- ✅ 중복 체크인 방지
- ✅ 안내 모달 시스템

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts
- **Animation**: Framer Motion
- **UI Components**: Radix UI
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

- `/` - 메인 체크인 페이지 (안내 모달 포함)
- `/admin` - 관리자 대시보드
- `/stats` - 통계 분석 페이지

## API 엔드포인트

- `POST /api/checkin` - 체크인 처리
- `GET /api/checkin` - 오늘의 체크인 목록 조회
- `GET /api/stats` - 통계 데이터 조회
- `GET /api/users` - 등록된 사용자 목록 조회
- `POST /api/users` - 새 사용자 추가

## Google Sheets 연동

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

### 3. 스프레드시트 구조

조식대장 스프레드시트는 다음과 같은 구조를 가집니다:

#### 시트명 규칙
- `YY.MM` 형식 (예: `25.01`, `25.02`)
- 매월 새로운 시트를 수동으로 생성

#### 열 구조
- **E열**: 사용자 이름 목록
- **F열~AJ열**: 1일~31일 체크박스
- **2행**: 헤더 (날짜 표시)
- **3행부터**: 사용자 데이터

#### 체크인 방식
- 사용자가 체크인하면 해당 날짜 열에 `TRUE` 값이 설정됩니다
- 예: 1월 5일에 체크인하면 J열(5일)에 체크박스가 체크됩니다

### 4. 사용자 관리

- 새로운 사용자는 E열에 수동으로 추가하거나 API를 통해 추가할 수 있습니다
- 등록되지 않은 사용자는 체크인할 수 없습니다

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
│   │   │   ├── stats/
│   │   │   └── users/
│   │   ├── admin/
│   │   ├── stats/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   └── WelcomeModal.tsx
│   ├── hooks/
│   │   └── useWelcomeModal.ts
│   ├── services/
│   │   └── googleSheetsService.ts
│   ├── store/
│   │   └── checkInStore.ts
│   └── lib/
│       └── utils.ts
├── public/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## 개발 가이드

### 새로운 컴포넌트 추가

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

## 기여 가이드

1. 이 저장소를 Fork합니다
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
