'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { Loader2, LogOut, LayoutDashboard, Home, Briefcase, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export const Header = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, refresh } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      
      queryClient.clear();
      await refresh();
      router.replace('/');
      router.refresh();
      
      toast({
        title: '로그아웃되었습니다',
        description: '다음에 또 만나요!',
      });
    } catch (error) {
      toast({
        title: '로그아웃 실패',
        description: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const email = user.email;
    return email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (user.role === 'advertiser' && user.profile) {
      const profile = user.profile as { business_name?: string };
      return profile.business_name || user.email || '사용자';
    }
    
    if (user.role === 'influencer' && user.profile) {
      const profile = user.profile as { name?: string };
      return profile.name || user.email || '사용자';
    }
    
    return user.email || '사용자';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">블로그 체험단</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              홈
            </Link>
            {mounted && (
              <>
                {/* 광고주 전용 메뉴 */}
                {isAuthenticated && user?.role === 'advertiser' && user?.hasProfile && (
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    대시보드
                  </Link>
                )}
                {/* 인플루언서 전용 메뉴 */}
                {isAuthenticated && user?.role === 'influencer' && user?.hasProfile && (
                  <Link
                    href="/my/applications"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    내 지원 목록
                  </Link>
                )}
                {/* 프로필 미등록 사용자 - 온보딩 안내 */}
                {isAuthenticated && user && !user.hasProfile && (
                  <Link
                    href={user.role === 'advertiser' ? '/onboarding/advertiser' : '/onboarding/influencer'}
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    프로필 등록
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>메뉴</SheetTitle>
              </SheetHeader>
              {mounted && isAuthenticated && user && (
                <div className="flex items-center gap-3 mt-6 pb-4 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.role && (
                      <Badge variant="secondary" className="w-fit mt-1">
                        {user.role === 'advertiser' ? '광고주' : '인플루언서'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <nav className="flex flex-col gap-4 mt-6">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  홈
                </Link>
                {mounted && (
                  <>
                    {/* 광고주 전용 메뉴 */}
                    {isAuthenticated && user?.role === 'advertiser' && user?.hasProfile && (
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary"
                      >
                        대시보드
                      </Link>
                    )}
                    {/* 인플루언서 전용 메뉴 */}
                    {isAuthenticated && user?.role === 'influencer' && user?.hasProfile && (
                      <Link
                        href="/my/applications"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary"
                      >
                        내 지원 목록
                      </Link>
                    )}
                    {/* 프로필 미등록 사용자 - 온보딩 안내 */}
                    {isAuthenticated && user && !user.hasProfile && (
                      <Link
                        href={user.role === 'advertiser' ? '/onboarding/advertiser' : '/onboarding/influencer'}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary"
                      >
                        프로필 등록
                      </Link>
                    )}
                    {!isAuthenticated && (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-sm font-medium transition-colors hover:text-primary"
                        >
                          로그인
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-sm font-medium transition-colors hover:text-primary"
                        >
                          회원가입
                        </Link>
                      </>
                    )}
                    {isAuthenticated && (
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="text-sm font-medium text-destructive text-left transition-colors hover:text-destructive/80"
                      >
                        로그아웃
                      </button>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {!mounted ? (
              <div className="h-10 w-10" />
            ) : isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={getUserDisplayName()} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {user.role && (
                        <Badge variant="secondary" className="w-fit mt-1">
                          {user.role === 'advertiser' ? '광고주' : '인플루언서'}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      홈으로
                    </Link>
                  </DropdownMenuItem>
                  {/* 광고주 전용 메뉴 */}
                  {user.role === 'advertiser' && user.hasProfile && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        대시보드
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {/* 인플루언서 전용 메뉴 */}
                  {user.role === 'influencer' && user.hasProfile && (
                    <DropdownMenuItem asChild>
                      <Link href="/my/applications" className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4" />
                        내 지원 목록
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {/* 프로필 미등록 사용자 - 온보딩 안내 */}
                  {!user.hasProfile && user.role && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href={user.role === 'advertiser' ? '/onboarding/advertiser' : '/onboarding/influencer'}
                        className="flex items-center"
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        프로필 등록
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">로그인</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">회원가입</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

