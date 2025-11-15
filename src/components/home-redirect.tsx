'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { determineRedirectPath } from '@/features/auth/hooks/useLogin';

export function HomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading } = useCurrentUser();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // 로딩 중이 아니고 인증된 사용자인 경우
    if (!isLoading && isAuthenticated && user) {
      // 프로필이 없거나 역할이 선택되지 않은 경우 리다이렉트
      if ((!user.hasProfile || user.role === null) && !hasRedirected.current) {
        const redirectPath = determineRedirectPath(user, new URLSearchParams());
        
        // 현재 경로와 리다이렉트 경로가 다르고, 홈이 아닌 경우에만 리다이렉트
        if (redirectPath !== '/' && redirectPath !== pathname) {
          hasRedirected.current = true;
          router.replace(redirectPath);
        }
      }
    }
    
    // 사용자 상태가 변경되면 리다이렉트 플래그 리셋
    if (user?.hasProfile && user?.role !== null) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, user, isLoading, router, pathname]);

  return null;
}

