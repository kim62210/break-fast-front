'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion } from 'framer-motion'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function StatisticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // 임시 데이터
  const monthlyData = [
    { month: '1월', count: 850, percentage: 71 },
    { month: '2월', count: 920, percentage: 77 },
    { month: '3월', count: 1050, percentage: 88 },
    { month: '4월', count: 980, percentage: 82 },
    { month: '5월', count: 890, percentage: 74 },
    { month: '6월', count: 950, percentage: 79 },
  ]

  const departmentData = [
    { name: '개발팀', value: 320, percentage: 35 },
    { name: '마케팅팀', value: 180, percentage: 20 },
    { name: '영업팀', value: 220, percentage: 24 },
    { name: '인사팀', value: 110, percentage: 12 },
    { name: '기타', value: 90, percentage: 9 },
  ]

  const timeDistribution = [
    { time: '07:00', count: 15 },
    { time: '07:15', count: 35 },
    { time: '07:30', count: 85 },
    { time: '07:45', count: 120 },
    { time: '08:00', count: 95 },
    { time: '08:15', count: 60 },
    { time: '08:30', count: 40 },
    { time: '08:45', count: 20 },
  ]

  const weeklyTrend = [
    { week: '1주차', mon: 45, tue: 52, wed: 48, thu: 50, fri: 38 },
    { week: '2주차', mon: 48, tue: 55, wed: 51, thu: 53, fri: 40 },
    { week: '3주차', mon: 50, tue: 58, wed: 54, thu: 56, fri: 42 },
    { week: '4주차', mon: 47, tue: 54, wed: 50, thu: 52, fri: 39 },
  ]

  const topUsers = [
    { name: '김철수', count: 22, rate: 100 },
    { name: '이영희', count: 21, rate: 95 },
    { name: '박민수', count: 20, rate: 91 },
    { name: '정수진', count: 19, rate: 86 },
    { name: '최동욱', count: 18, rate: 82 },
  ]

  const calculateTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    if (change > 0) return { icon: TrendingUp, value: `+${change.toFixed(1)}%`, color: 'text-green-600' }
    if (change < 0) return { icon: TrendingDown, value: `${change.toFixed(1)}%`, color: 'text-red-600' }
    return { icon: Minus, value: '0%', color: 'text-gray-600' }
  }

  const trend = calculateTrend(950, 890)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">통계 분석</h1>
          <p className="text-gray-600">조식 이용 패턴과 트렌드를 분석합니다</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          리포트 다운로드
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>이번 달 총 이용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">950명</div>
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <trend.icon className="h-4 w-4" />
              <span className="text-sm">{trend.value} vs 지난달</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>평균 일일 이용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">48명</div>
            <p className="text-sm text-gray-600">영업일 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최다 이용 시간대</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">07:45</div>
            <p className="text-sm text-gray-600">평균 120명 이용</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="monthly">월별 추이</TabsTrigger>
          <TabsTrigger value="department">부서별 현황</TabsTrigger>
          <TabsTrigger value="time">시간대 분포</TabsTrigger>
          <TabsTrigger value="users">개인별 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>월별 이용 추이</CardTitle>
              <CardDescription>최근 6개월간 조식 이용 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#10B981" name="이용자 수" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>부서별 이용 비율</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>부서별 상세 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentData.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{dept.value}명</span>
                        <span className="text-sm text-gray-600 ml-2">({dept.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>시간대별 이용 분포</CardTitle>
              <CardDescription>조식 시간대별 평균 이용자 수</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="이용자 수"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>이용 우수 직원 TOP 5</CardTitle>
              <CardDescription>이번 달 조식 이용률이 높은 직원</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.count}회 이용</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{user.rate}%</p>
                      <p className="text-sm text-gray-600">이용률</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}