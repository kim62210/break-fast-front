import { create } from 'zustand'

interface CheckInState {
  checkedInCount: number
  recentCheckIns: Array<{
    name: string
    time: string
  }>
  incrementCount: () => void
  addCheckIn: (name: string, time: string) => void
  resetDaily: () => void
}

export const useCheckInStore = create<CheckInState>((set) => ({
  checkedInCount: 0,
  recentCheckIns: [],
  incrementCount: () => set((state) => ({ checkedInCount: state.checkedInCount + 1 })),
  addCheckIn: (name, time) => set((state) => ({
    recentCheckIns: [{ name, time }, ...state.recentCheckIns].slice(0, 10)
  })),
  resetDaily: () => set({ checkedInCount: 0, recentCheckIns: [] })
}))