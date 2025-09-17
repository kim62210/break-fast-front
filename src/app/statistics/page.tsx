'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Users,
  RefreshCw,
  ArrowLeft,
  PieChart
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface MonthlyFullData {
  rawData: boolean[][]
  userList: { name: string; row: number }[]
  sheetName: string
  daysInMonth: number
  currentMonth: number
  currentYear: number
}

interface ProcessedStats {
  dailyStats: { [date: string]: number }
  weeklyStats: { [week: string]: number }
  totalCount: number
  averageDaily: number
  maxDailyCount: number
  bestDay: { day: number; count: number }
}

export default function StatisticsPage() {
  const [rawData, setRawData] = useState<MonthlyFullData | null>(null)
  const [processedStats, setProcessedStats] = useState<ProcessedStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    fetchMonthlyFullData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMonthlyFullData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/monthly-full-data')
      const result = await response.json()
      if (response.ok && result.success) {
        setRawData(result.data)
        setProcessedStats(processRawData(result.data))
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('월별 전체 데이터 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processRawData = (data: MonthlyFullData): ProcessedStats => {
    const { rawData, daysInMonth, currentMonth, currentYear } = data
    
    // 일별 통계 계산
    const dailyStats: { [date: string]: number } = {}
    let totalCount = 0
    let maxDailyCount = 0
    let bestDay = { day: 0, count: 0 }
    let daysWithCheckIns = 0 // 1명 이상 체크인한 날짜 수
    
    for (let day = 0; day < daysInMonth; day++) {
      let dayCount = 0
      for (let userIndex = 0; userIndex < rawData.length; userIndex++) {
        if (rawData[userIndex][day]) {
          dayCount++
        }
      }
      
      const dateKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${(day + 1).toString().padStart(2, '0')}`
      dailyStats[dateKey] = dayCount
      totalCount += dayCount
      
      // 1명 이상 체크인한 날짜 카운트
      if (dayCount > 0) {
        daysWithCheckIns++
      }
      
      if (dayCount > maxDailyCount) {
        maxDailyCount = dayCount
        bestDay = { day: day + 1, count: dayCount }
      }
    }
    
    // 주별 통계 계산
    const weeklyStats: { [week: string]: number } = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const weekOfMonth = Math.ceil(day / 7)
      const weekKey = `${currentMonth}월 ${weekOfMonth}주차`
      
      const dateKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + (dailyStats[dateKey] || 0)
    }
    
    // 1명 이상 체크인한 날짜가 있을 때만 평균 계산
    const averageDaily = daysWithCheckIns > 0 ? totalCount / daysWithCheckIns : 0
    
    return {
      dailyStats,
      weeklyStats,
      totalCount,
      averageDaily: Math.round(averageDaily * 100) / 100,
      maxDailyCount,
      bestDay
    }
  }

  const getDailyStatsArray = () => {
    if (!processedStats) return []
    
    return Object.entries(processedStats.dailyStats)
      .map(([date, count]) => ({
        date,
        count,
        dayOfMonth: parseInt(date.split('-')[2])
      }))
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
  }

  const getWeeklyStatsArray = () => {
    if (!processedStats) return []
    
    return Object.entries(processedStats.weeklyStats)
      .map(([week, count]) => ({ week, count }))
  }

  const getMaxCount = () => {
    if (!processedStats) return 60
    return Math.max(processedStats.maxDailyCount, 60)
  }

  // 특정 날짜의 체크인한 사용자 목록 조회 (클라이언트에서 계산)
  const getUsersForDate = (day: number): string[] => {
    if (!rawData || day < 1 || day > rawData.daysInMonth) return []
    
    const users: string[] = []
    const dayIndex = day - 1 // 0-based index
    
    for (let userIndex = 0; userIndex < rawData.rawData.length; userIndex++) {
      if (rawData.rawData[userIndex][dayIndex]) {
        users.push(rawData.userList[userIndex].name)
      }
    }
    
    return users
  }

  // 요일 계산 함수
  const getWeekday = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return weekdays[date.getDay()]
  }

  // 주말 여부 확인 함수
  const isWeekend = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day)
    return date.getDay() === 0 || date.getDay() === 6 // 일요일(0) 또는 토요일(6)
  }

  // 달력 형태의 일별 통계 컴포넌트
  const CalendarView = () => {
    if (!rawData || !processedStats) return null
    
    const totalUsers = rawData.userList.length
    const days = Array.from({ length: rawData.daysInMonth }, (_, i) => i + 1)
    
    return (
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {/* 요일 헤더 */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div 
            key={day} 
            className={`text-center text-xs sm:text-sm font-medium p-2 ${
              index === 0 || index === 6 ? 'text-red-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
        
        {/* 첫째 주 시작 전 빈 칸들 */}
        {Array.from({ length: new Date(rawData.currentYear, rawData.currentMonth - 1, 1).getDay() }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* 달력 날짜들 */}
        {days.map((day) => {
          const dateKey = `${rawData.currentYear}-${rawData.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          const count = processedStats.dailyStats[dateKey] || 0
          const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
          const weekday = getWeekday(rawData.currentYear, rawData.currentMonth, day)
          const weekend = isWeekend(rawData.currentYear, rawData.currentMonth, day)
          const users = getUsersForDate(day)
          
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: day * 0.01 }}
              className={`aspect-square border-2 rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center relative group cursor-pointer transition-all hover:shadow-lg ${
                weekend ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              } ${count > 0 ? 'shadow-md' : ''}`}
              title={users.length > 0 ? `${day}일 (${weekday})\n식수인원: ${count}명 (${percentage}%)\n이용자: ${users.join(', ')}` : `${day}일 (${weekday})\n식수인원: 0명`}
            >
              {/* 날짜 */}
              <div className={`text-xs sm:text-sm font-bold mb-1 ${weekend ? 'text-red-600' : 'text-gray-800'}`}>
                {day}
              </div>
              
              {/* 요일 */}
              <div className={`text-[10px] sm:text-xs ${weekend ? 'text-red-500' : 'text-gray-500'}`}>
                {weekday}
              </div>
              
              {/* 식수 인원 */}
              {count > 0 && (
                <div className="text-xs sm:text-sm font-semibold text-blue-600 mt-1">
                  {count}명
                </div>
              )}
              
              {/* 퍼센티지 바 */}
              {count > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 mt-1">
                  <motion.div
                    className={`h-1 sm:h-1.5 rounded-full ${weekend ? 'bg-red-400' : 'bg-blue-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: day * 0.02 }}
                  />
                </div>
              )}
              
              {/* 퍼센티지 표시 */}
              {count > 0 && (
                <div className={`text-[10px] sm:text-xs font-medium mt-0.5 ${weekend ? 'text-red-600' : 'text-blue-600'}`}>
                  {percentage}%
                </div>
              )}
              
              {/* 호버 시 상세 정보 */}
              <div className="absolute inset-0 bg-black bg-opacity-75 text-white rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-center text-xs z-10 pointer-events-none">
                <div className="font-bold">{day}일 ({weekday})</div>
                <div className="text-center mt-1">
                  {count > 0 ? (
                    <>
                      <div>식수인원: {count}명 ({percentage}%)</div>
                      {users.length > 0 && users.length <= 3 && (
                        <div className="mt-1 text-[10px]">
                          {users.join(', ')}
                        </div>
                      )}
                      {users.length > 3 && (
                        <div className="mt-1 text-[10px]">
                          {users.slice(0, 2).join(', ')} 외 {users.length - 2}명
                        </div>
                      )}
                    </>
                  ) : (
                    <div>식수인원: 0명</div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8"
      >
        <div className="w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2 sm:mb-0">
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                메인으로
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800">식수 통계</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            {format(new Date(), 'yyyy년 MM월', { locale: ko })} 조식 이용 통계
          </p>
        </div>
        <Button
          onClick={fetchMonthlyFullData}
          variant="outline"
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </motion.div>

      {/* 요약 카드들 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">월간 총 이용자</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {isLoading ? '...' : `${processedStats?.totalCount || 0}명`}
              </div>
              <p className="text-xs text-muted-foreground">
                이번 달 누적
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">일평균 이용자</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {isLoading ? '...' : `${processedStats?.averageDaily || 0}명`}
              </div>
              <p className="text-xs text-muted-foreground">
                하루 평균
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">최고 이용일</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {isLoading ? '...' : (
                  processedStats?.bestDay?.count && processedStats.bestDay.count > 0 ? `${processedStats.bestDay.day}일` : '-'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? '' : (
                  processedStats?.bestDay?.count && processedStats.bestDay.count > 0 ? `${processedStats.bestDay.count}명 이용` : '데이터 없음'
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">마지막 업데이트</CardTitle>
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {format(lastUpdated, 'HH:mm')}
              </div>
              <p className="text-xs text-muted-foreground">
                실시간 동기화
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 통계 차트 */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily" className="text-xs sm:text-sm">일별 통계</TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs sm:text-sm">주별 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                일별 이용 현황 (달력 뷰)
              </CardTitle>
              <CardDescription>
                이번 달 일별 조식 이용자 수 - 주말은 빨간색으로 표시됩니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <CalendarView />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                주별 이용 현황
              </CardTitle>
              <CardDescription>
                이번 달 주차별 조식 이용자 수
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {getWeeklyStatsArray().map(({ week, count }, index) => (
                    <div key={week} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1">
                        <span className="w-16 sm:w-20 text-xs sm:text-sm font-medium">{week}</span>
                        <div className="flex-1 max-w-32 sm:max-w-64 bg-gray-200 rounded-full h-3 sm:h-4">
                          <motion.div
                            className="bg-primary h-3 sm:h-4 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / (processedStats?.totalCount || 1)) * 100}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg sm:text-xl font-bold">{count}명</span>
                        <span className="text-xs sm:text-sm text-gray-600 ml-1 sm:ml-2 hidden sm:inline">
                          ({Math.round((count / (processedStats?.totalCount || 1)) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
