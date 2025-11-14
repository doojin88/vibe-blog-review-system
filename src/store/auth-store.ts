import { create } from "zustand";

type Role = "advertiser" | "influencer" | null;

interface AuthStore {
  selectedRole: Role;
  setSelectedRole: (role: Role) => void;
  clearSelectedRole: () => void;
}

/**
 * 인증 관련 전역 상태 관리 스토어
 * 주로 회원가입 플로우에서 역할 선택을 임시 저장하는 데 사용됩니다.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  selectedRole: null,
  setSelectedRole: (role) => set({ selectedRole: role }),
  clearSelectedRole: () => set({ selectedRole: null }),
}));
