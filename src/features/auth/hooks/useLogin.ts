"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "./useCurrentUser";
import { apiClient } from "@/lib/remote/api-client";
import type { CurrentUser } from "../types";
import type { ProfileResponse } from "@/features/profile/lib/dto";

// Zod 스키마
export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// 훅 반환 타입
export type UseLoginReturn = {
  form: ReturnType<typeof useForm<LoginFormValues>>;
  isSubmitting: boolean;
  errorMessage: string | null;
  handleSubmit: (values: LoginFormValues) => Promise<void>;
};

/**
 * 리다이렉트 경로 결정 함수
 */
export function determineRedirectPath(
  user: CurrentUser | null,
  searchParams: URLSearchParams
): string {
  // 1. redirect 쿼리 파라미터 확인
  const redirectParam = searchParams.get("redirect");

  // 2. 역할 및 프로필 확인
  if (!user) return "/login";

  // 3. 역할이 선택되지 않은 경우 역할 선택 화면으로
  if (user.role === null) {
    return "/signup?step=role-select";
  }

  // 4. 인플루언서인 경우 프로필이 없으면 프로필 등록 화면으로
  if (user.role === "influencer" && !user.hasProfile) {
    return "/onboarding/influencer";
  }

  // 5. 광고주인 경우 프로필이 없으면 광고주 온보딩 화면으로
  if (user.role === "advertiser" && !user.hasProfile) {
    return "/onboarding/advertiser";
  }

  // 6. redirect 파라미터가 있으면 해당 경로로
  if (redirectParam) {
    return redirectParam;
  }

  // 7. 역할별 기본 페이지
  return user.role === "advertiser" ? "/dashboard" : "/";
}

/**
 * 로그인 커스텀 훅
 */
export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = useCallback(
    async (values: LoginFormValues) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      const supabase = getSupabaseBrowserClient();

      try {
        // 1. Supabase Auth 로그인
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        // 2. 사용자 정보 갱신 (CurrentUserContext)
        await refresh();

        // 3. 갱신된 사용자 정보 가져오기
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setErrorMessage("사용자 정보를 가져올 수 없습니다.");
          return;
        }

        // 4. 프로필 정보 조회
        let profileData: ProfileResponse | null = null;
        try {
          const profileResponse = await apiClient.get<ProfileResponse>('/api/profile');
          profileData = profileResponse.data;
        } catch (error) {
          // 프로필 조회 실패 시 기본값 사용
          profileData = {
            role: null,
            hasProfile: false,
          };
        }

        // 5. 리다이렉트 경로 결정을 위한 사용자 객체 생성
        const currentUser: CurrentUser = {
          id: authUser.id,
          email: authUser.email,
          appMetadata: authUser.app_metadata ?? {},
          userMetadata: authUser.user_metadata ?? {},
          role: profileData.role,
          hasProfile: profileData.hasProfile,
          profile: profileData.profile,
        };

        const redirectPath = determineRedirectPath(currentUser, searchParams);

        // 6. 리다이렉트
        router.push(redirectPath);
      } catch (error) {
        setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, router, searchParams]
  );

  return {
    form,
    isSubmitting,
    errorMessage,
    handleSubmit,
  };
}
