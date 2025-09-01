'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Coffee, Clock, Users, Calendar, CreditCard, MapPin, AlertCircle } from 'lucide-react'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm sm:max-w-md mx-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl border-0 p-0 overflow-hidden fixed top-4 sm:top-1/2 left-1/2 transform -translate-x-1/2 sm:-translate-y-1/2 translate-y-0 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-orange-400 to-yellow-400 p-4 sm:p-6 text-white text-center">
          <div className="flex items-center justify-center mb-2">
            <Coffee className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
            <h2 className="text-lg sm:text-2xl font-bold">경영지원실 안내사항</h2>
          </div>
          <div className="text-base sm:text-lg">조식🍽️</div>
        </div>

        {/* 내용 */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="text-center mb-3 sm:mb-4">
            <p className="text-gray-700 font-medium text-sm sm:text-base">안녕하세요!</p>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              조식 제공 방식 변경에 대한 안내드립니다.
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-700">
                기존 조식 업체의 일방적인 일정 변경 및 지연 회신으로 인해
                아래와 같이 조식 제공 방식을 조정하고자 합니다.
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-xs sm:text-sm">조식 전용 카드를 비치해 놓았습니다.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-xs sm:text-sm">조식 사용 가능 금액은 인당 3,000원 입니다.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-xs sm:text-sm">사용 가능 장소는 정우빌딩 1층 CU 입니다.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-xs sm:text-sm">결제 가능 시간은 오전 10시 이전 입니다.</p>
                  <p className="text-xs text-gray-500 mt-1">(개발팀 출근시간 고려)</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 mt-3 sm:mt-4">
              <p className="text-yellow-800 text-xs sm:text-sm font-medium">
                비치된 법인카드로 조식 구매 요청드리며
                사용하시면서 불편사항은 편하게 공유해주세요!
              </p>
            </div>

            <div className="text-center mt-3 sm:mt-4">
              <p className="text-gray-600 font-medium text-sm sm:text-base">감사합니다!</p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t">
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 text-white font-medium py-2 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base"
          >
            확인했습니다
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
