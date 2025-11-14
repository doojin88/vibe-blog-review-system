"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "./useCurrentUser";
import type { CurrentUser } from "../types";

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

  if (user.role === null) {
    return "/signup?step=role-select";
  }

  if (!user.hasProfile) {
    return user.role === "advertiser"
      ? "/onboarding/advertiser"
      : "/onboarding/influencer";
  }

  // 3. redirect 파라미터가 있으면 해당 경로로
  if (redirectParam) {
    return redirectParam;
  }

  // 4. 역할별 기본 페이지
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

        // 3. 리다이렉트 경로 결정
        const redirectPath = determineRedirectPath(user, searchParams);

        // 4. 리다이렉트
        router.push(redirectPath);
      } catch (error) {
        setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, router, searchParams, user]
  );

  return {
    form,
    isSubmitting,
    errorMessage,
    handleSubmit,
  };
}
