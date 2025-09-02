'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Coffee, Users, Clock, Calendar, ChevronLeft, ChevronRight, BarChart3, User } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import WelcomeModal from '@/components/WelcomeModal'
import { useWelcomeModal } from '@/hooks/useWelcomeModal'

export default function Home() {
  const [name, setName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [checkedInUsers, setCheckedInUsers] = useState<any[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const { toast } = useToast()
  const { isOpen: isWelcomeModalOpen, closeModal: closeWelcomeModal } = useWelcomeModal()

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    // 실제 체크인 현황 조회
    fetchTodayCheckIns()
    // 월별 전체 데이터 로드
    fetchMonthlyData()
    
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
      clearInterval(timer)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, []) // selectedDate 의존성 제거

  // selectedDate가 변경될 때 해당 날짜의 데이터 가져오기
  useEffect(() => {
    fetchCheckInsByDate(selectedDate)
  }, [selectedDate])

  // 월별 데이터가 로드되면 현재 선택된 날짜의 데이터를 다시 가져오기
  useEffect(() => {
    if (monthlyData && selectedDate.toDateString() !== new Date().toDateString()) {
      // 오늘이 아닌 날짜이고 월별 데이터가 있으면 클라이언트에서 계산
      const count = getCountForDate(selectedDate)
      setCheckedInCount(count)
    }
  }, [monthlyData])

  const fetchTodayCheckIns = async () => {
    try {
      const response = await fetch('/api/checkin')
      const data = await response.json()
      if (response.ok) {
        setCheckedInCount(data.count)
        setCheckedInUsers(data.checkIns || [])
      }
    } catch (error) {
      console.error('체크인 현황 조회 실패:', error)
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
      const isToday = date.toDateString() === new Date().toDateString()
      
      if (isToday) {
        // 오늘 날짜는 실시간 API 호출
        const day = date.getDate()
        const response = await fetch(`/api/checkin/${day}`)
        const data = await response.json()
        
        if (response.ok) {
          setCheckedInCount(data.count)
          setCheckedInUsers(data.checkIns || [])
        }
      } else if (monthlyData) {
        // 이전 날짜는 월별 데이터에서 계산
        const count = getCountForDate(date)
        setCheckedInCount(count)
        setCheckedInUsers([]) // 이전 날짜는 상세 목록 없음
      } else {
        // 폴백: API 호출 (월별 데이터가 아직 로드되지 않은 경우)
        const day = date.getDate()
        const response = await fetch(`/api/checkin/${day}`)
        const data = await response.json()
        
        if (response.ok) {
          setCheckedInCount(data.count)
          setCheckedInUsers(data.checkIns || [])
        }
      }
    } catch (error) {
      console.error('날짜별 체크인 현황 조회 실패:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handlePreviousDay = () => {
    const prevDate = new Date(selectedDate)
    prevDate.setDate(prevDate.getDate() - 1)
    setSelectedDate(prevDate)
    fetchCheckInsByDate(prevDate)
  }

  const handleNextDay = () => {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    // 미래 날짜는 오늘까지만 허용
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 오늘 끝까지
    
    if (nextDate <= today) {
      setSelectedDate(nextDate)
      fetchCheckInsByDate(nextDate)
    }
  }

  const isNextDayDisabled = () => {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return nextDate > today
  }

  const handleToday = () => {
    const today = new Date()
    setSelectedDate(today)
    fetchTodayCheckIns()
  }

  const isBreakfastTime = () => {
    const hours = currentTime.getHours()
    return hours >= 8 && hours < 10
  }

  const handleCheckIn = async () => {
    if (!name.trim()) {
      toast({
        title: "이름을 입력해주세요",
        description: "체크인을 위해 이름이 필요합니다.",
        variant: "destructive",
      })
      return
    }



    setIsCheckingIn(true)

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          checkInTime: currentTime.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크인 실패')
      }

      setShowSuccess(true)
      
      // 체크인 후 현황 업데이트
      fetchTodayCheckIns()
      
      // 조식시간 외라도 성공 토스트로 표시 (항상 초록색)
      if (data.warningMessage) {
        toast({
          title: "체크인 완료!",
          description: `${name}님의 체크인이 완료되었습니다. ${data.warningMessage}`,
        })
      } else {
        toast({
          title: "체크인 완료!",
          description: `${name}님의 조식 체크인이 완료되었습니다.`,
        })
      }

      setTimeout(() => {
        setShowSuccess(false)
        setName('')
      }, 3000)
    } catch (error: any) {
      toast({
        title: "체크인 실패",
        description: error.message || "체크인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <>
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={closeWelcomeModal} />
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 flex items-center gap-2">
            <Coffee className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
            <span className="text-center sm:text-left">조식 체크인 시스템</span>
          </h1>
          <Link href="/statistics" className="mt-2 sm:mt-0">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              통계 보기
            </Button>
          </Link>
        </div>
        <p className="text-sm sm:text-base text-gray-600 px-4">QR 코드로 간편하게 조식을 체크인하세요</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                오늘 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm sm:text-lg">
                  {format(currentTime, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {mounted ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
                </p>
                <div className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                  isBreakfastTime() 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isBreakfastTime() ? '조식 시간' : '조식 시간 외'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  이용 현황
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousDay}
                    disabled={isLoadingStats}
                    className="p-1 sm:p-2"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToday}
                    disabled={isLoadingStats}
                    className="text-xs px-1 sm:px-2"
                  >
                    오늘
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextDay}
                    disabled={isLoadingStats || isNextDayDisabled()}
                    className="p-1 sm:p-2"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stats">통계</TabsTrigger>
                  <TabsTrigger value="users" disabled={checkedInUsers.length === 0}>
                    인원 목록 ({checkedInUsers.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="mt-4">
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
                        <p className="text-2xl sm:text-4xl font-bold text-primary">
                          {isLoadingStats ? (
                            <Clock className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                          ) : (
                            `${checkedInCount}명`
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {format(selectedDate, 'MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {selectedDate.toDateString() === new Date().toDateString() 
                          ? '오늘 조식을 이용한 인원' 
                          : '조식을 이용한 인원'
                        }
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div 
                          className="bg-primary h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((checkedInCount / 60) * 100, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
                        <p className="text-xs text-gray-500 hidden sm:block">
                          ← → 키로 날짜 이동, Home키로 오늘
                        </p>
                        <p className="text-xs text-gray-500 sm:hidden">
                          버튼으로 날짜 이동
                        </p>
                        <p className="text-xs text-gray-500">
                          최대 60명 기준
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>
                
                <TabsContent value="users" className="mt-4">
                  <div className="space-y-3">
                    {checkedInUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">체크인한 인원이 없습니다</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {checkedInUsers.map((user, index) => (
                          <motion.div
                            key={`${user.name}-${user.time}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                          >
                            <User className="w-4 h-4 text-gray-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.time}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">조식 체크인</CardTitle>
            <CardDescription>이름을 입력하고, 체크인 버튼을 눌러주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                  disabled={isCheckingIn || showSuccess}
                  className="text-base sm:text-lg flex-1"
                />
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn || showSuccess}
                  size="lg"
                  className="px-6 sm:px-8 w-full sm:w-auto"
                >
                  {isCheckingIn ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      체크인 중...
                    </>
                  ) : (
                    '체크인'
                  )}
                </Button>
              </div>
              
              {!isBreakfastTime() && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 text-sm">
                    <strong>조식 시간 외입니다.</strong> 조식 시간은 08:00 ~ 10:00이지만, 체크인은 언제든 가능합니다.
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-white/95 flex items-center justify-center"
              >
                <div className="text-center">
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">체크인 완료!</h3>
                  <p className="text-gray-600">{name}님, 맛있는 조식 되세요!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>조식 이용 안내</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-blue-900">이용 방법</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 체크인 후 3,000원 한도 내에서 자유롭게 메뉴 선택</li>
                  <li>• CU 편의점 내 모든 메뉴 이용 가능</li>
                  <li>• 초과 금액은 개인 부담</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-gray-700">이용 시간</h4>
                  <p className="text-xl sm:text-2xl font-bold text-primary">08:00 ~ 10:00</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">평일 운영 (주말/공휴일 제외)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-gray-700">지원 금액</h4>
                  <p className="text-xl sm:text-2xl font-bold text-primary">3,000원</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">1인 1일 1회 한정</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </>
  )
}