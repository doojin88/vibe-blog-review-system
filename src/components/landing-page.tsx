'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  FileCheck, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { CampaignList } from '@/features/campaign/components/campaign-list';

const FEATURES = [
  {
    icon: Search,
    title: '간편한 체험단 탐색',
    description: '다양한 카테고리와 필터로 원하는 체험단을 쉽게 찾아보세요',
  },
  {
    icon: FileCheck,
    title: '투명한 선정 프로세스',
    description: '공정하고 투명한 선정 과정으로 신뢰할 수 있는 매칭을 제공합니다',
  },
  {
    icon: TrendingUp,
    title: '효율적인 관리',
    description: '체험단 모집부터 선정까지 모든 과정을 한 곳에서 관리하세요',
  },
  {
    icon: Shield,
    title: '안전한 플랫폼',
    description: '검증된 광고주와 인플루언서만 참여하는 안전한 환경을 제공합니다',
  },
];

const ADVERTISER_BENEFITS = [
  '효율적인 체험단 모집',
  '적합한 인플루언서 선정',
  '체험단 관리 대시보드',
  '투명한 지원자 관리',
];

const INFLUENCER_BENEFITS = [
  '다양한 체험 기회',
  '간편한 지원 프로세스',
  '투명한 선정 과정',
  '채널 성장 기회',
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/10 via-background to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              블로그 체험단 리뷰 시스템
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              광고주와 인플루언서를
              <br />
              <span className="text-primary">효율적으로 연결</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              체험단 모집부터 선정까지, 모든 과정을 한 곳에서 관리하세요.
              <br />
              신뢰할 수 있는 매칭 플랫폼으로 더 나은 마케팅을 시작하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/signup">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8">
                <Link href="/login">
                  로그인
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              왜 우리 플랫폼을 선택해야 할까요?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              체험단 매칭의 모든 과정을 간소화하고 효율화합니다
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              누구를 위한 플랫폼인가요?
            </h2>
            <p className="text-muted-foreground text-lg">
              광고주와 인플루언서 모두를 위한 맞춤 솔루션
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Advertiser Card */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">광고주</CardTitle>
                </div>
                <CardDescription className="text-base">
                  제품/서비스를 홍보하고 싶은 광고주를 위한 체험단 관리 플랫폼
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ADVERTISER_BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
                <div className="pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signup">
                      광고주로 시작하기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Influencer Card */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">인플루언서</CardTitle>
                </div>
                <CardDescription className="text-base">
                  다양한 체험 기회를 찾는 인플루언서를 위한 체험단 지원 플랫폼
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {INFLUENCER_BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
                <div className="pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signup">
                      인플루언서로 시작하기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              어떻게 작동하나요?
            </h2>
            <p className="text-muted-foreground text-lg">
              간단한 3단계로 시작하세요
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold">회원가입</h3>
              <p className="text-muted-foreground">
                이메일로 간편하게 가입하고 광고주 또는 인플루언서 역할을 선택하세요
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold">프로필 등록</h3>
              <p className="text-muted-foreground">
                역할에 맞는 정보를 입력하여 프로필을 완성하세요
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold">시작하기</h3>
              <p className="text-muted-foreground">
                체험단을 등록하거나 지원하여 활동을 시작하세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Preview Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 모집 중인 체험단
            </h2>
            <p className="text-muted-foreground text-lg">
              다양한 체험 기회를 확인해보세요
            </p>
          </div>
          <CampaignList />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl opacity-90">
              무료로 가입하고 첫 체험단을 만나보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" variant="secondary" className="text-lg px-8">
                <Link href="/signup">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/login">
                  로그인
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

