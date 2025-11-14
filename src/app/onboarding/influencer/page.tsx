'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useCreateInfluencer } from '@/features/influencers/hooks/useCreateInfluencer';
import { createInfluencerSchema, type CreateInfluencerInput } from '@/features/influencers/lib/dto';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';
import { extractApiErrorMessage } from '@/lib/remote/api-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function InfluencerOnboardingPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { toast } = useToast();
  const createInfluencer = useCreateInfluencer();

  const form = useForm<CreateInfluencerInput>({
    resolver: zodResolver(createInfluencerSchema),
    defaultValues: {
      name: '',
      birth_date: '',
      phone: '',
      channel_name: '',
      channel_link: '',
      followers_count: 0,
    },
  });

  // 비로그인 사용자 리다이렉트
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/onboarding/influencer');
    }
  }, [user, isUserLoading, router]);

  // 이미 등록된 사용자 리다이렉트
  useEffect(() => {
    if (!isUserLoading && user?.hasProfile && user?.role === 'influencer') {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (data: CreateInfluencerInput) => {
    try {
      await createInfluencer.mutateAsync(data);
      toast({
        title: '인플루언서 정보가 등록되었습니다',
        description: '홈 페이지로 이동합니다.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '프로필 등록에 실패했습니다',
        description: extractApiErrorMessage(error, '일시적인 오류가 발생했습니다'),
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>인플루언서 정보 등록</CardTitle>
          <CardDescription>
            체험단 지원을 위해 프로필을 완성해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 이름 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 생년월일 */}
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>생년월일 *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 휴대폰번호 */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>휴대폰번호 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="01012345678"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SNS 채널명 */}
              <FormField
                control={form.control}
                name="channel_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SNS 채널명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="길동TV" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 채널 링크 */}
              <FormField
                control={form.control}
                name="channel_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 링크 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/@gildongtv"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 팔로워 수 */}
              <FormField
                control={form.control}
                name="followers_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>팔로워 수 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={createInfluencer.isPending}
              >
                {createInfluencer.isPending ? '처리 중...' : '등록 완료'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
