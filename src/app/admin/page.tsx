'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Download,
  RefreshCw,
  Clock,
  ChefHat,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { motion } from 'framer-motion'

interface CheckInData {
  name: string
  date: string
  time: string
  timestamp: string
}

interface DailyStats {
  date: string
  count: number
  percentage: number
}

export default function AdminDashboard() {
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInData[]>([])
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchMonthlyData()
    fetchCheckInsByDate(selectedDate)
    const interval = setInterval(fetchDashboardData, 30000) // 30초마다 업데이트
    
    // 키보드 단축키 이벤트 리스너
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousDay()
      } else if (e.key === 'ArrowRight' && !isNextDayDisabled()) {
        handleNextDay()
      } else if (e.key === 'Home') {
        handleToday()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  useEffect(() => {
    fetchCheckInsByDate(selectedDate)
  }, [selectedDate])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // 오늘 체크인 데이터 조회
      const todayResponse = await fetch('/api/checkin')
      if (todayResponse.ok) {
        const todayData = await todayResponse.json()
        setTodayCheckIns(todayData.checkIns || [])
      }

      // 통계 데이터 조회
      try {
        const statsResponse = await fetch('/api/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setMonthlyTotal(statsData.totalCheckIns || 0)
          
          // 일간 통계를 주간 통계로 변환 (임시)
          const dailyStats = statsData.dailyStats || {}
          const weekDays = ['월요일', '화요일', '수요일', '목요일', '금요일']
          const weeklyData = weekDays.map((day, index) => {
            const count = Object.values(dailyStats)[index] || 0
            return {
              date: day,
              count: count as number,
              percentage: Math.min((count as number / 60) * 100, 100) // 60명 기준으로 퍼센트 계산
            }
          })
          setWeeklyStats(weeklyData)
        }
      } catch (statsError) {
        console.error('통계 데이터 조회 실패:', statsError)
        // 기본 데이터 설정
        setWeeklyStats([
          { date: '월요일', count: 0, percentage: 0 },
          { date: '화요일', count: 0, percentage: 0 },
          { date: '수요일', count: 0, percentage: 0 },
          { date: '목요일', count: 0, percentage: 0 },
          { date: '금요일', count: 0, percentage: 0 },
        ])
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMonthlyData = async () => {
    try {
      const response = await fetch('/api/monthly-full-data')
      const result = await response.json()
      if (response.ok && result.success) {
        setMonthlyData(result.data)
      }
    } catch (error) {
      console.error('월별 데이터 조회 실패:', error)
    }
  }

  const getCountForDate = (date: Date): number => {
    if (!monthlyData) return 0
    
    const day = date.getDate()
    const dayIndex = day - 1 // 0-based index
    
    if (dayIndex < 0 || dayIndex >= monthlyData.daysInMonth) return 0
    
    let count = 0
    for (let userIndex = 0; userIndex < monthlyData.rawData.length; userIndex++) {
      if (monthlyData.rawData[userIndex][dayIndex]) {
        count++
      }
    }
    
    return count
  }

  const fetchCheckInsByDate = async (date: Date) => {
    setIsLoadingStats(true)
    try {
      if (monthlyData) {
        // 클라이언트에서 계산
        const count = getCountForDate(date)
        setCheckedInCount(count)
        
        if (date.toDateString() === new Date().toDateString()) {
          // 오늘 데이터인 경우 체크인 목록도 업데이트
          const day = date.getDate()
          const response = await fetch(`/api/checkin/${day}`)
          const data = await response.json()
          if (response.ok) {
            setTodayCheckIns(data.checkIns || [])
          }
        }
      } else {
        // 폴백: API 호출
        const day = date.getDate()
        const response = await fetch(`/api/checkin/${day}`)
        const data = await response.json()
        
        if (response.ok) {
          setCheckedInCount(data.count || 0)
          if (date.toDateString() === new Date().toDateString()) {
            setTodayCheckIns(data.checkIns || [])
          }
        }
      }
    } catch (error) {
      console.error('날짜별 체크인 데이터 조회 실패:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handlePreviousDay = () => {
    const prevDate = new Date(selectedDate)
    prevDate.setDate(prevDate.getDate() - 1)
    setSelectedDate(prevDate)
  }

  const handleNextDay = () => {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    // 미래 날짜는 오늘까지만 허용
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 오늘 끝까지
    
    if (nextDate <= today) {
      setSelectedDate(nextDate)
    }
  }

  const handleToday = () => {
    const today = new Date()
    setSelectedDate(today)
  }

  const isNextDayDisabled = () => {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return nextDate > today
  }

  const handleExportData = () => {
    // TODO: CSV 또는 Excel로 데이터 내보내기
    console.log('Exporting data...')
  }

  const calculateAverageUsage = () => {
    if (weeklyStats.length === 0) return 0
    const totalPercentage = weeklyStats.reduce((sum, stat) => sum + stat.percentage, 0)
    return Math.round(totalPercentage / weeklyStats.length)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">관리자 대시보드</h1>
          <p className="text-gray-600">조식 이용 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            데이터 내보내기
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  이용 현황
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousDay}
                    disabled={isLoadingStats}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToday}
                    disabled={isLoadingStats}
                    className="text-xs px-2"
                  >
                    오늘
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextDay}
                    disabled={isLoadingStats || isNextDayDisabled()}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDate.toDateString()}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Clock className="w-8 h-8 animate-spin" />
                      ) : (
                        `${checkedInCount}명`
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(selectedDate, 'MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedDate.toDateString() === new Date().toDateString() 
                      ? '오늘 조식을 이용한 인원' 
                      : '조식을 이용한 인원'
                    }
                  </p>
                </motion.div>
              </AnimatePresence>
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
              <CardTitle className="text-sm font-medium">주간 평균</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateAverageUsage()}%</div>
              <p className="text-xs text-muted-foreground">
                이용률
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
              <CardTitle className="text-sm font-medium">월간 누적</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyTotal}명</div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'MM월', { locale: ko })} 기준
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
              <CardTitle className="text-sm font-medium">마지막 업데이트</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(lastUpdated, 'HH:mm')}
              </div>
              <p className="text-xs text-muted-foreground">
                실시간 동기화 중
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="today">오늘 현황</TabsTrigger>
          <TabsTrigger value="weekly">주간 통계</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>오늘의 체크인 목록</CardTitle>
              <CardDescription>
                {format(new Date(), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })} 조식 이용자
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>총 {todayCheckIns.length}명이 조식을 이용했습니다.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">순번</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>체크인 시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayCheckIns.map((checkIn, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{checkIn.name}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{checkIn.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>주간 이용 통계</CardTitle>
              <CardDescription>이번 주 조식 이용 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm font-medium">{stat.date}</span>
                      <div className="w-64 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">{stat.count}명</span>
                      <span className="text-sm text-gray-600 ml-2">({stat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>시스템 설정</CardTitle>
              <CardDescription>조식 체크인 시스템 설정을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">체크인 가능 시간</h4>
                  <p className="text-sm text-gray-600">현재: 08:00 - 10:00</p>
                </div>
                <Button variant="outline">변경</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Google Sheets 연동</h4>
                  <p className="text-sm text-gray-600">마지막 동기화: 5분 전</p>
                </div>
                <Button variant="outline">설정</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">자동 백업</h4>
                  <p className="text-sm text-gray-600">매일 자정 실행</p>
                </div>
                <Button variant="outline">설정</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}