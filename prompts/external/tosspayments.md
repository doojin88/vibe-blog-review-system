# 토스페이먼츠 연동 가이드 (2025년 최신판)

## 목차
- [서비스 개요](#서비스-개요)
- [연동 전 준비사항](#연동-전-준비사항)
- [SDK/API 연동 수단 선택](#sdkapi-연동-수단-선택)
- [환경 설정](#환경-설정)
- [자동결제(빌링) 연동](#자동결제빌링-연동)
- [웹훅 설정](#웹훅-설정)
- [환불 처리](#환불-처리)
- [Supabase Cron 스케줄링](#supabase-cron-스케줄링)
- [에러 처리](#에러-처리)
- [테스트 환경](#테스트-환경)
- [보안 및 베스트 프랙티스](#보안-및-베스트-프랙티스)
- [체크리스트](#체크리스트)

---

## 서비스 개요

토스페이먼츠는 온라인 결제 서비스로 다양한 결제수단을 통합 지원합니다. 이 문서는 **Saju맛피아 구독 서비스**에 필요한 자동결제(빌링) 연동을 중점적으로 다룹니다.

### 자동결제(빌링) 특징
- **정기 구독형 서비스 전용**: 비정기 결제는 정책상 제한
- **지원 결제수단**: 국내 카드만 지원 (간편결제 미지원)
- **빌링키 방식**: 최초 1회 본인인증 후 계속 결제 가능
- **계약 필요**: 추가 리스크 검토 및 계약 필수 (고객센터 1544-7772)

---

## 연동 전 준비사항

### 1. 개발자센터 가입
1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com) 접속
2. 이메일 또는 소셜 로그인으로 가입
3. 자동으로 테스트 상점 생성

### 2. API 키 확인
개발자센터 > API 키 메뉴에서 확인:
- **클라이언트 키**: `test_ck_` 또는 `test_gck_`로 시작
- **시크릿 키**: `test_sk_` 또는 `test_gsk_`로 시작

### 3. 자동결제 계약
- 토스페이먼츠 고객센터(1544-7772) 문의
- 추가 리스크 검토 필요
- 계약 완료 후 라이브 키 발급

---

## SDK/API 연동 수단 선택

### 선택 1: SDK (결제창) - 권장 ✅
**장점**:
- 토스페이먼츠 제공 UI 사용
- 본인인증 자동 처리
- 보안 강화

**사용 기능**:
- `requestBillingAuth()`: 카드 등록창
- 빌링키 발급 API
- 자동결제 승인 API

### 선택 2: API Only
**장점**:
- 자체 UI 구현 가능
- 커스터마이징 자유도 높음

**단점**:
- 본인인증 직접 구현 필요
- 보안 책임 증가

---

## 환경 설정

### 1. 패키지 설치

```bash
npm install @tosspayments/tosspayments-sdk
```

### 2. 환경 변수 설정

`.env.local`:
```bash
# 토스페이먼츠 API 키
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
TOSS_SECRET_KEY=test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6

# 결제 리다이렉트 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase Cron 인증
CRON_SECRET=your-secure-random-string
```

### 3. 시크릿 키 인코딩

시크릿 키는 Base64로 인코딩하여 사용:

```bash
echo -n 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6:' | base64
# 주의: 시크릿 키 뒤에 콜론(:) 필수
```

---

## 자동결제(빌링) 연동

### 플로우 개요
```
1. 카드 등록 요청 (SDK) → 2. 본인인증 (구매자) → 3. authKey 수신
→ 4. 빌링키 발급 (서버) → 5. 빌링키 저장 (DB) → 6. 정기 결제 (Cron)
```

### 1단계: 카드 등록 페이지 (Client Component)

`app/subscription/register/page.tsx`:
```typescript
'use client';

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function RegisterCardPage() {
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
  // customerKey는 UUID로 생성 (보안 중요!)
  const customerKey = uuidv4();

  useEffect(() => {
    async function initPayment() {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey });
        setPayment(payment);
      } catch (error) {
        console.error('SDK 초기화 실패:', error);
      }
    }
    initPayment();
  }, [clientKey, customerKey]);

  async function requestBillingAuth() {
    if (!payment) return;

    setLoading(true);
    try {
      // 고객 정보를 세션이나 쿠키에 임시 저장
      sessionStorage.setItem('customerKey', customerKey);

      await payment.requestBillingAuth({
        method: 'CARD', // 카드만 지원
        successUrl: `${window.location.origin}/subscription/success`,
        failUrl: `${window.location.origin}/subscription/fail`,
        customerEmail: 'customer@example.com', // 실제 사용자 이메일
        customerName: '김토스', // 실제 사용자 이름
      });
    } catch (error: any) {
      if (error.code === 'USER_CANCEL') {
        console.log('사용자가 결제창을 닫았습니다.');
      } else {
        console.error('카드 등록 실패:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">구독 카드 등록</h1>
      <button
        onClick={requestBillingAuth}
        disabled={!payment || loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? '처리 중...' : '카드 등록하기'}
      </button>
    </div>
  );
}
```

### 2단계: 성공 페이지 및 빌링키 발급

`app/subscription/success/page.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function issueBillingKey() {
      const authKey = searchParams.get('authKey');
      const customerKey = searchParams.get('customerKey');

      if (!authKey || !customerKey) {
        console.error('필수 파라미터 누락');
        return;
      }

      try {
        const response = await fetch('/api/subscription/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authKey,
            customerKey,
          }),
        });

        if (!response.ok) {
          throw new Error('빌링키 발급 실패');
        }

        const data = await response.json();

        // 성공 시 구독 관리 페이지로 이동
        router.push('/subscription/manage');
      } catch (error) {
        console.error('빌링키 발급 실패:', error);
        router.push('/subscription/fail');
      }
    }

    issueBillingKey();
  }, [searchParams, router]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">카드 등록 처리 중...</h1>
    </div>
  );
}
```

### 3단계: 빌링키 발급 API (Next.js 15 App Router)

`app/api/subscription/confirm/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { authKey, customerKey } = await request.json();

    if (!authKey || !customerKey) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 시크릿 키 인코딩
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');

    // 빌링키 발급 API 호출
    const response = await fetch(
      'https://api.tosspayments.com/v1/billing/authorizations/issue',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey,
          customerKey,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('토스페이먼츠 API 에러:', error);
      throw new Error(error.message || '빌링키 발급 실패');
    }

    const billingData = await response.json();

    // Supabase에 빌링키 저장
    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: customerKey, // 실제로는 인증된 사용자 ID 사용
        billing_key: billingData.billingKey,
        customer_key: customerKey,
        card_number: billingData.card?.number,
        card_type: billingData.card?.cardType,
        card_company: billingData.cardCompany,
        status: 'active',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
      });

    if (dbError) {
      console.error('DB 저장 실패:', dbError);
      throw new Error('구독 정보 저장 실패');
    }

    return NextResponse.json({
      success: true,
      billingKey: billingData.billingKey,
      message: '구독이 성공적으로 등록되었습니다.'
    });

  } catch (error: any) {
    console.error('빌링키 발급 실패:', error);
    return NextResponse.json(
      { error: error.message || '빌링키 발급에 실패했습니다.' },
      { status: 500 }
    );
  }
}
```

### 4단계: 자동결제 승인 API

`app/api/subscription/charge/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { billingKey, customerKey, amount } = await request.json();

    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');

    // 주문 ID 생성 (고유값)
    const orderId = `ORDER_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const orderName = 'Saju맛피아 Pro 구독';

    const response = await fetch(
      `https://api.tosspayments.com/v1/billing/${billingKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerKey,
          amount,
          orderId,
          orderName,
          customerEmail: 'customer@example.com',
          customerName: '김토스',
          taxFreeAmount: 0,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();

      // 에러 코드별 처리
      if (error.code === 'REJECT_CARD_PAYMENT') {
        return NextResponse.json(
          { error: '한도초과 또는 잔액부족입니다.' },
          { status: 400 }
        );
      }

      throw new Error(error.message);
    }

    const payment = await response.json();

    // 결제 성공 시 처리
    // TODO: DB 업데이트
    // - 결제 내역 저장
    // - 테스트 횟수 추가
    // - 다음 결제일 업데이트

    return NextResponse.json({
      success: true,
      paymentKey: payment.paymentKey,
      orderId: payment.orderId,
      amount: payment.totalAmount,
    });

  } catch (error: any) {
    console.error('자동결제 승인 실패:', error);
    return NextResponse.json(
      { error: error.message || '결제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
```

---

## 웹훅 설정

### 1. 웹훅 등록
개발자센터 > 웹훅 메뉴에서 등록:
- **웹훅 URL**: `https://your-domain.com/api/webhooks/tosspayments`
- **이벤트 타입**:
  - `PAYMENT_STATUS_CHANGED`
  - `BILLING_DELETED` (중요!)
  - `DEPOSIT_CALLBACK`

### 2. 웹훅 엔드포인트

`app/api/webhooks/tosspayments/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json();

    console.log(`웹훅 수신: ${webhook.eventType}`, webhook.data);

    switch (webhook.eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(webhook.data);
        break;

      case 'BILLING_DELETED':
        // 중요: 구매자가 카드를 삭제했거나 퀵계좌이체를 탈퇴한 경우
        await handleBillingDeleted(webhook.data);
        break;

      case 'DEPOSIT_CALLBACK':
        await handleDepositCallback(webhook.data);
        break;

      default:
        console.log('처리되지 않은 웹훅:', webhook.eventType);
    }

    // 10초 이내 200 응답 필수 (재전송 방지)
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('웹훅 처리 실패:', error);
    // 에러 시에도 200 반환 (재전송 방지)
    return NextResponse.json({ received: false });
  }
}

async function handleBillingDeleted(data: any) {
  const { billingKey } = data;

  // DB에서 해당 빌링키 비활성화
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      billing_key_deleted_at: new Date().toISOString()
    })
    .eq('billing_key', billingKey);

  if (error) {
    console.error('빌링키 삭제 처리 실패:', error);
  } else {
    console.log(`빌링키 삭제 완료: ${billingKey}`);
  }
}

async function handlePaymentStatusChanged(data: any) {
  // 결제 상태 변경 처리
  const { paymentKey, status } = data;
  console.log(`결제 상태 변경: ${paymentKey} -> ${status}`);
}

async function handleDepositCallback(data: any) {
  // 가상계좌 입금 처리
  const { orderId, status } = data;
  console.log(`가상계좌 입금: ${orderId} -> ${status}`);
}
```

---

## 환불 처리

### 결제 취소 API

`app/api/payments/cancel/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, cancelReason, cancelAmount } = await request.json();

    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');

    const body: any = { cancelReason };

    // 부분 취소 시 금액 지정
    if (cancelAmount) {
      body.cancelAmount = cancelAmount;
    }

    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      cancels: result.cancels,
    });

  } catch (error: any) {
    console.error('결제 취소 실패:', error);
    return NextResponse.json(
      { error: error.message || '결제 취소에 실패했습니다.' },
      { status: 500 }
    );
  }
}
```

---

## Supabase Cron 스케줄링

### 1. Migration 파일 생성

`supabase/migrations/20250126_create_subscription_cron.sql`:
```sql
-- 필요한 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 구독 테이블 생성
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(300) NOT NULL,
  billing_key VARCHAR(500) NOT NULL,
  customer_key VARCHAR(300) NOT NULL,
  card_number VARCHAR(20),
  card_type VARCHAR(20),
  card_company VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_billing_date TIMESTAMP WITH TIME ZONE,
  billing_key_deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Cron 시크릿 저장 (Vault 사용)
INSERT INTO vault.secrets (name, secret, description)
VALUES (
  'cron_secret',
  'your-secure-random-string',
  'Secret for authenticating cron jobs'
) ON CONFLICT (name) DO NOTHING;

-- Cron Job 함수 생성
CREATE OR REPLACE FUNCTION process_subscription_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Next.js API 호출
  PERFORM
    net.http_post(
      url := 'https://your-domain.com/api/subscription/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text
      )
    );
END;
$$;

-- Cron Job 등록 (매일 오전 2시)
SELECT cron.schedule(
  'process-subscription-payments',
  '0 2 * * *',
  'SELECT process_subscription_payments();'
);
```

### 2. Cron 처리 엔드포인트

`app/api/subscription/process/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  // 1. Cron 인증 검증
  const cronSecret = request.headers.get('x-cron-secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. 오늘이 결제일인 구독 조회
    const today = new Date().toISOString().split('T')[0];

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_billing_date', today);

    if (error) throw error;

    const results = [];

    // 3. 각 구독에 대해 결제 처리
    for (const subscription of subscriptions || []) {
      try {
        // 자동결제 API 호출
        const chargeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscription/charge`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              billingKey: subscription.billing_key,
              customerKey: subscription.customer_key,
              amount: 9900, // Pro 요금제 금액
            }),
          }
        );

        if (chargeResponse.ok) {
          // 결제 성공: 다음 결제일 업데이트
          await supabase
            .from('subscriptions')
            .update({
              last_billing_date: new Date().toISOString(),
              next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', subscription.id);

          // 테스트 횟수 추가
          await supabase
            .from('user_credits')
            .update({
              test_count: 10, // Pro 요금제 월 10회
            })
            .eq('user_id', subscription.user_id);

          results.push({
            subscriptionId: subscription.id,
            success: true,
          });
        } else {
          // 결제 실패: 구독 해지
          await supabase
            .from('subscriptions')
            .update({
              status: 'payment_failed',
              billing_key_deleted_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: 'Payment failed',
          });
        }
      } catch (error: any) {
        console.error(`구독 ${subscription.id} 처리 실패:`, error);
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });

  } catch (error: any) {
    console.error('정기 결제 처리 실패:', error);
    return NextResponse.json(
      { error: error.message || '정기 결제 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
```

---

## 에러 처리

### 주요 에러 코드 및 해결 방법

| 에러 코드 | 설명 | 해결 방법 |
|----------|------|-----------|
| `UNAUTHORIZED_KEY` | 잘못된 API 키 | 키 재확인, Base64 인코딩 확인 |
| `NOT_SUPPORTED_METHOD` | 자동결제 미계약 | 토스페이먼츠 계약 확인 |
| `NOT_MATCHES_CUSTOMER_KEY` | customerKey 불일치 | 빌링키와 customerKey 매핑 확인 |
| `REJECT_CARD_PAYMENT` | 한도초과/잔액부족 | 사용자에게 안내 |
| `PAY_PROCESS_CANCELED` | 사용자 취소 | 정상 처리 |
| `INVALID_BILLING_AUTH` | 빌링 인증 실패 | authKey 유효성 확인 |
| `NOT_FOUND_PAYMENT_SESSION` | 세션 만료 | 10분 이내 승인 필요 |

### 에러 처리 예시

```typescript
// 클라이언트 에러 처리
try {
  await payment.requestBillingAuth({...});
} catch (error: any) {
  switch (error.code) {
    case 'USER_CANCEL':
      console.log('사용자가 결제창을 닫았습니다.');
      break;
    case 'INVALID_CUSTOMER_KEY':
      console.error('customerKey 형식 오류');
      break;
    default:
      console.error('알 수 없는 에러:', error);
  }
}

// 서버 에러 처리
const response = await fetch(...);
if (!response.ok) {
  const error = await response.json();

  switch (error.code) {
    case 'UNAUTHORIZED_KEY':
      // API 키 확인
      break;
    case 'REJECT_CARD_PAYMENT':
      // 카드사 거절 (한도초과 등)
      break;
    default:
      // 기타 에러
  }
}
```

---

## 테스트 환경

### 테스트 카드 정보
- **카드번호**: 실제 카드번호 사용 가능 (앞 6자리만 유효해도 OK)
- **유효기간**: 미래 날짜
- **CVC**: 임의 3자리
- **비밀번호**: 임의 2자리
- **생년월일**: 6자리 (YYMMDD)
- **본인인증**: `000000` 입력

### 테스트 시 주의사항
1. 테스트 환경에서는 실제 결제 없음
2. 가상계좌는 앞에 'X' 붙음
3. 개발자센터에서 테스트 내역 확인 가능
4. 웹훅은 정상 동작

### 로컬 웹훅 테스트 (ngrok)
```bash
# ngrok 설치 후
ngrok http 3000

# 생성된 URL을 개발자센터에 등록
# 예: https://abc123.ngrok.io/api/webhooks/tosspayments
```

---

## 보안 및 베스트 프랙티스

### 필수 보안 사항
1. **customerKey**
   - UUID 사용 (유추 불가능한 값)
   - 이메일, 전화번호 사용 금지
   - 다른 사용자가 알 수 없도록 관리

2. **시크릿 키**
   - 서버에서만 사용
   - 환경 변수로 관리
   - GitHub 커밋 금지
   - 클라이언트 노출 절대 금지

3. **빌링키**
   - 안전하게 암호화하여 저장
   - 한 번 발급되면 재조회 불가
   - 로그에 노출 금지

4. **웹훅**
   - 10초 이내 200 응답
   - 재전송 대비 멱등성 보장
   - secret 값으로 검증

### 권장 사항
1. **금액 검증**: 클라이언트와 서버 금액 비교
2. **멱등키 사용**: 중복 결제 방지
3. **에러 로깅**: 모니터링 시스템 구축
4. **비동기 처리**: 웹훅은 큐 시스템 활용
5. **정기 백업**: 빌링키 및 구독 정보

---

## 체크리스트

### 개발 단계
- [ ] 토스페이먼츠 가입 및 테스트 키 발급
- [ ] 환경 변수 설정 (.env.local)
- [ ] SDK 패키지 설치
- [ ] 카드 등록 페이지 구현
- [ ] 빌링키 발급 API 구현
- [ ] 자동결제 승인 API 구현
- [ ] 웹훅 엔드포인트 구현
- [ ] Supabase 테이블 생성
- [ ] Cron Job 설정
- [ ] 에러 처리 구현
- [ ] 테스트 시나리오 작성

### 배포 전 확인
- [ ] 자동결제 계약 완료
- [ ] 라이브 API 키로 변경
- [ ] 웹훅 URL HTTPS 설정
- [ ] 방화벽 설정 (토스페이먼츠 IP)
- [ ] 금액 검증 로직 구현
- [ ] 에러 모니터링 설정
- [ ] 전체 플로우 테스트
- [ ] 보안 검토 완료

### 운영 중 모니터링
- [ ] 결제 성공률 모니터링
- [ ] 웹훅 수신 상태 확인
- [ ] 에러 로그 정기 점검
- [ ] Cron Job 실행 로그 확인
- [ ] 빌링키 삭제 알림 처리

---

## 관련 문서

### 공식 문서
- [토스페이먼츠 개발자센터](https://developers.tosspayments.com)
- [자동결제(빌링) 가이드 v2](https://docs.tosspayments.com/guides/v2/billing)
- [결제창 SDK 연동](https://docs.tosspayments.com/sdk/v2/js)
- [웹훅 가이드](https://docs.tosspayments.com/guides/webhook)
- [API 레퍼런스](https://docs.tosspayments.com/reference)
- [에러 코드](https://docs.tosspayments.com/reference/error-codes)

### 추가 리소스
- [구독 결제 구현하기 시리즈](https://www.tosspayments.com/blog/articles/22425)
- [GitHub 샘플](https://github.com/tosspayments/tosspayments-sample)
- [개발자 커뮤니티](https://techchat.tosspayments.com)

### 고객 지원
- 토스페이먼츠 고객센터: **1544-7772**
- 이메일: support@tosspayments.com
- 실시간 기술지원: 개발자센터 채팅

---

**작성일**: 2025-01-26
**버전**: 2.0
**최신 API 버전**: 2024-12-02
**호환성**: Next.js 15 App Router, Supabase, TypeScript