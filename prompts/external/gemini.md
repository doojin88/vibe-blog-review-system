# 사주맛피아 프로젝트: AI 연동 최종 가이드

**작성일**: 2025년 10월 26일  
**버전**: 1.0 (최종 확정)  
**대상 프로젝트**: 사주맛피아 (Next.js 15 기반)  
**검증 완료**: Vercel AI SDK 공식 문서 기준

---

## 📋 목차

1. [연동 수단 개요](#1-연동-수단-개요)
2. [SDK: Vercel AI SDK](#2-sdk-vercel-ai-sdk)
3. [API: Google Gemini API](#3-api-google-gemini-api)
4. [Webhook](#4-webhook)
5. [구현 패턴 선택 가이드](#5-구현-패턴-선택-가이드)
6. [전체 구현 예제](#6-전체-구현-예제)
7. [트러블슈팅](#7-트러블슈팅)
8. [부록](#8-부록)

---

## 1. 연동 수단 개요

### 1.1 선택한 연동 방식

| 구분 | 선택 여부 | 역할 | 비고 |
|------|----------|------|------|
| **SDK** | ✅ 사용 | Vercel AI SDK로 프론트엔드-백엔드 통신 및 스트리밍 UI 구현 | 필수 |
| **API** | ✅ 사용 | Google Gemini API (SDK 내부에서 자동 호출) | 필수 |
| **Webhook** | ❌ 미사용 | 사주 분석 기능에서는 불필요 | 선택 |

### 1.2 전체 아키텍처

```
┌─────────────────┐
│  사용자 브라우저  │
└────────┬────────┘
         │ useCompletion/useChat
         ▼
┌─────────────────┐
│ Next.js API     │
│ /api/saju-      │
│ analysis        │
└────────┬────────┘
         │ streamText()
         ▼
┌─────────────────┐
│ Vercel AI SDK   │
│ (@ai-sdk/google)│
└────────┬────────┘
         │ HTTP Request
         ▼
┌─────────────────┐
│ Google Gemini   │
│ API             │
└────────┬────────┘
         │ Streaming Response
         ▼
┌─────────────────┐
│ 사용자 화면에    │
│ 실시간 표시     │
└─────────────────┘
```

### 1.3 데이터 흐름

1. **사용자 입력**: 생년월일, 출생시간 등 입력
2. **프론트엔드**: `useCompletion` 또는 `useChat` 훅이 API Route 호출
3. **백엔드**: Next.js API Route에서 `streamText()` 실행
4. **SDK**: Vercel AI SDK가 Gemini API에 HTTP 요청
5. **AI 응답**: Gemini가 텍스트를 실시간 스트리밍
6. **화면 표시**: SDK가 응답을 청크 단위로 UI에 전달

---

## 2. SDK: Vercel AI SDK

### 2.1 SDK 개요

**Vercel AI SDK**는 AI 모델 통합을 간소화하는 TypeScript/JavaScript 라이브러리입니다.

#### 2.1.1 주요 특징

- **통합 API**: 여러 AI 제공자(OpenAI, Anthropic, Google 등)를 하나의 인터페이스로 사용
- **자동 스트리밍**: 실시간 텍스트 스트리밍을 자동 처리
- **React 통합**: `useChat`, `useCompletion` 등 편리한 훅 제공
- **타입 안전성**: TypeScript 완전 지원
- **프레임워크 독립적**: React, Vue, Svelte, Solid 등 모두 지원

#### 2.1.2 현재 버전

- **AI SDK**: 5.0.x (2025년 7월 출시)
- **@ai-sdk/google**: 2.0.x

### 2.2 사용할 기능

| 기능 | 설명 | 사용 위치 | 공식 문서 |
|------|------|----------|-----------|
| `streamText()` | AI 모델 호출 및 스트리밍 응답 생성 | 백엔드 API Route | [Core](https://ai-sdk.dev/docs/ai-sdk-core/generating-text) |
| `useCompletion()` | 단일 텍스트 생성 UI 훅 | 프론트엔드 컴포넌트 | [UI](https://ai-sdk.dev/docs/ai-sdk-ui/use-completion) |
| `useChat()` | 대화형 채팅 UI 훅 (선택) | 프론트엔드 컴포넌트 | [UI](https://ai-sdk.dev/docs/ai-sdk-ui/use-chat) |
| `google()` | Google Gemini 모델 생성자 | 백엔드 API Route | [Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) |

### 2.3 설치 방법

#### 2.3.1 패키지 설치

프로젝트 루트에서 다음 명령어를 실행하세요:

```bash
npm install ai @ai-sdk/google
```

**⚠️ 중요한 주의사항**:
```bash
# ❌ 절대 설치하지 마세요
npm install @google/generative-ai  # 2025년 8월 31일 지원 종료

# ✅ 올바른 패키지
npm install @ai-sdk/google
```

#### 2.3.2 설치 확인

```bash
npm list ai @ai-sdk/google
```

**예상 출력**:
```
your-project@1.0.0
├── ai@5.0.77
└── @ai-sdk/google@2.0.20
```

### 2.4 세팅 방법

#### 2.4.1 프로젝트 구조 생성

```bash
# API Route 디렉토리 생성
mkdir -p app/api/saju-analysis

# 페이지 디렉토리 생성
mkdir -p app/saju/new-test
```

#### 2.4.2 TypeScript 설정 (선택사항)

`tsconfig.json`에 다음 설정이 있는지 확인:

```json
{
  "compilerOptions": {
    "lib": ["es2015", "dom"],
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2017",
    "strict": true
  }
}
```

### 2.5 인증 정보 관리

#### 2.5.1 로컬 개발 환경

**1단계**: `.env.local` 파일 생성

프로젝트 루트에 다음 파일을 생성하세요:

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
```

**보안 체크리스트**:
- [ ] `NEXT_PUBLIC_` 접두사를 붙이지 않았는가? (서버 전용)
- [ ] `.gitignore`에 `.env.local`이 포함되어 있는가?
- [ ] API 키가 GitHub에 커밋되지 않았는가?

**2단계**: `.gitignore` 확인

```bash
# .gitignore에 다음 항목이 있는지 확인
.env*.local
.env.local
```

#### 2.5.2 Vercel 배포 환경

**Vercel 대시보드 설정**:

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 해당 프로젝트 선택
3. **Settings** 탭 클릭
4. **Environment Variables** 메뉴 선택
5. 환경 변수 추가:
   - **Name**: `GOOGLE_GENERATIVE_AI_API_KEY`
   - **Value**: (발급받은 API 키)
   - **Environment**: Production, Preview, Development 모두 체크
6. **Save** 클릭
7. 재배포 (Deployments → 최신 배포 → **Redeploy**)

#### 2.5.3 환경 변수 접근

백엔드 코드에서 환경 변수에 접근:

```typescript
// ✅ 올바른 접근 (서버 컴포넌트/API Route)
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// ❌ 잘못된 접근 (클라이언트에 노출됨)
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;
```

### 2.6 SDK 호출 방법

#### 2.6.1 백엔드 API Route 구현

**파일 위치**: `app/api/saju-analysis/route.ts`

```typescript
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Edge Runtime으로 실행 (스트리밍 최적화)
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // useCompletion은 { prompt } 형식으로 전송
    const { prompt }: { prompt: string } = await req.json();

    // 사용자 구독 상태에 따른 모델 선택
    // TODO: 실제 환경에서는 DB에서 확인
    const modelName = 'gemini-2.5-flash'; // 또는 'gemini-2.5-pro'

    // 시스템 프롬프트 정의
    const systemPrompt = `
당신은 사주와 명리학에 정통한 최고의 전문가입니다.
사용자의 생년월일 정보를 바탕으로, 전통 명리학 이론에 근거하여 사주를 분석해야 합니다.

분석 원칙:
1. 항상 긍정적이고 희망적인 관점에서 서술합니다
2. 사용자가 자신의 삶을 더 나은 방향으로 이끌 수 있도록 조언합니다
3. 명확하고 이해하기 쉬운 문체로 작성합니다
4. 구체적인 근거와 함께 설명합니다

응답 구조:
- 전체 운세 개요
- 사주 팔자 분석
- 오행 균형 분석
- 성격 및 재능
- 연도별 운세
- 조언 및 권고사항
    `.trim();

    // Gemini API 호출 및 스트리밍 응답 생성
    const result = streamText({
      model: google(modelName),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.7,     // 창의성 조절 (0.0 ~ 2.0)
      maxTokens: 2000,      // 최대 응답 길이
    });

    // UI Message Stream 프로토콜로 응답 반환 (AI SDK 5 표준)
    return result.toUIMessageStreamResponse();
    
  } catch (error) {
    console.error('Saju analysis error:', error);
    
    // 에러 응답 반환
    return new Response(
      JSON.stringify({ 
        error: '사주 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
```

**코드 설명**:

- `export const runtime = 'edge'`: Edge Runtime에서 실행하여 스트리밍 성능 최적화
- `streamText()`: Gemini API를 호출하고 스트리밍 응답 생성
- `toUIMessageStreamResponse()`: AI SDK 5의 표준 UI 메시지 프로토콜 (툴 콜, 메타데이터 포함)
- `system`: AI의 역할과 응답 형식 정의
- `temperature`: 응답의 창의성 조절 (낮을수록 일관성 있고, 높을수록 창의적)
- `maxTokens`: 최대 생성할 토큰 수 (비용 제어)

#### 2.6.2 프론트엔드 컴포넌트 구현 (useCompletion)

**파일 위치**: `app/saju/new-test/page.tsx`

**✅ 권장 패턴: useCompletion (단일 텍스트 생성)**

```typescript
'use client';

import { useCompletion } from '@ai-sdk/react';
import { useState, FormEvent } from 'react';

export default function SajuAnalysisPage() {
  // useCompletion 훅으로 텍스트 생성 기능 초기화
  const { 
    completion,     // 생성된 텍스트
    complete,       // 생성 시작 함수
    isLoading,      // 로딩 상태
    error           // 에러 객체
  } = useCompletion({
    api: '/api/saju-analysis',
    onFinish: (prompt, completion) => {
      console.log('분석 완료:', completion);
      // TODO: 분석 결과를 DB에 저장하거나 추가 처리
    },
    onError: (error) => {
      console.error('분석 오류:', error);
      alert('사주 분석 중 오류가 발생했습니다.');
    },
  });

  // 사용자 입력 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',      // YYYY-MM-DD
    birthTime: '',      // HH:MM
    gender: 'male' as 'male' | 'female',
    isLunar: false,
  });

  // 입력 필드 변경 핸들러
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 입력값 검증
    if (!formData.name || !formData.birthDate || !formData.birthTime) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    // 사주 분석 프롬프트 구성
    const prompt = `
다음 정보로 사주를 분석해주세요:

이름: ${formData.name}
생년월일: ${formData.birthDate} ${formData.isLunar ? '(음력)' : '(양력)'}
출생시간: ${formData.birthTime}
성별: ${formData.gender === 'male' ? '남성' : '여성'}

위 정보를 바탕으로 상세한 사주 분석을 부탁드립니다.
    `.trim();

    // useCompletion의 complete 함수로 요청 전송
    await complete(prompt);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-8">새 사주 검사</h1>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 이름 입력 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="홍길동"
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 성별 선택 */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium mb-2">
              성별 <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          {/* 생년월일 입력 */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium mb-2">
              생년월일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 출생시간 입력 */}
          <div>
            <label htmlFor="birthTime" className="block text-sm font-medium mb-2">
              출생시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="birthTime"
              name="birthTime"
              value={formData.birthTime}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* 음력 여부 체크박스 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isLunar"
            name="isLunar"
            checked={formData.isLunar}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <label htmlFor="isLunar" className="ml-2 text-sm">
            음력 생일입니다
          </label>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg 
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              분석 중...
            </span>
          ) : (
            '사주 분석 시작'
          )}
        </button>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium mb-2">오류가 발생했습니다</h3>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {/* 분석 결과 표시 */}
      {completion && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">사주 분석 결과</h2>
          
          <div className="prose max-w-none">
            {/* 스트리밍 텍스트를 단락별로 렌더링 */}
            {completion.split('\n').map((paragraph, idx) => (
              paragraph.trim() && (
                <p 
                  key={idx} 
                  className="mb-3 text-gray-800 leading-relaxed"
                >
                  {paragraph}
                </p>
              )
            ))}
          </div>

          {/* 로딩 인디케이터 (스트리밍 중) */}
          {isLoading && (
            <div className="mt-4 flex items-center text-gray-500">
              <div className="animate-pulse flex items-center">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-bounce"></span>
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="ml-2">분석 중입니다...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**코드 설명**:

- `useCompletion()`: 단일 텍스트 생성에 최적화된 훅
- `completion`: 생성된 텍스트 (스트리밍으로 실시간 업데이트)
- `complete()`: 새로운 생성 요청 시작
- `isLoading`: 현재 생성 중인지 여부
- `error`: 에러 발생 시 에러 객체
- `onFinish`: 생성 완료 시 실행되는 콜백
- `onError`: 에러 발생 시 실행되는 콜백

---

## 3. API: Google Gemini API

### 3.1 API 개요

**Google Gemini API**는 Google의 최신 생성형 AI 모델을 제공하는 RESTful API입니다.

#### 3.1.1 특징

- **멀티모달**: 텍스트, 이미지, 비디오, 오디오 처리 가능
- **긴 컨텍스트**: 최대 1M 토큰 지원 (모델에 따라 다름)
- **실시간 스트리밍**: 서버-센트 이벤트(SSE) 지원
- **툴 호출**: Function calling 지원

#### 3.1.2 Vercel AI SDK와의 관계

Vercel AI SDK를 사용하면 Gemini API를 **직접 호출할 필요가 없습니다**. SDK가 다음을 자동으로 처리합니다:

- API 엔드포인트 주소
- HTTP 헤더 설정
- 요청 본문 구성
- 스트리밍 응답 파싱
- 에러 처리

### 3.2 사용할 기능

| 기능 | 설명 | SDK 함수 |
|------|------|----------|
| **텍스트 생성** | 프롬프트 기반 텍스트 생성 | `streamText()` |
| **스트리밍** | 실시간 응답 스트리밍 | 자동 처리 |
| **시스템 프롬프트** | AI 역할 및 규칙 정의 | `system` 파라미터 |
| **온도 조절** | 응답의 창의성 제어 | `temperature` 파라미터 |

### 3.3 API 키 발급 방법

#### 3.3.1 Google AI Studio 접속

1. [Google AI Studio](https://aistudio.google.com/) 방문
2. Google 계정으로 로그인
3. 서비스 약관 동의

#### 3.3.2 API 키 생성

**단계별 가이드**:

1. 좌측 메뉴에서 **"Get API key"** 클릭
2. **"Create API key"** 버튼 클릭
3. 다음 중 선택:
   - **Create API key in new project**: 새 프로젝트 생성 (권장)
   - **Create API key in existing project**: 기존 프로젝트 사용
4. API 키가 생성되면 **복사** 아이콘 클릭
5. 안전한 곳에 저장 (재발급 시 이전 키는 무효화됨)

**⚠️ 보안 주의사항**:
- API 키를 GitHub 등 공개 저장소에 절대 커밋하지 마세요
- 키가 유출된 경우 즉시 재발급하세요
- 프론트엔드 코드에 직접 포함하지 마세요

#### 3.3.3 API 키 사용 제한 설정 (권장)

보안 강화를 위해 API 키에 제한을 설정할 수 있습니다:

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **APIs & Services** → **Credentials** 메뉴
3. 생성한 API 키 클릭
4. **API restrictions**:
   - "Restrict key" 선택
   - "Generative Language API" 선택
5. **Application restrictions** (선택사항):
   - HTTP referrers: 허용할 도메인 지정
   - IP addresses: 허용할 IP 주소 지정
6. **Save** 클릭

### 3.4 사용 가능한 모델 (2025년 10월 기준)

#### 3.4.1 프로덕션 권장 모델

| 모델명 | 용도 | 컨텍스트 | 무료 tier | 특징 |
|--------|------|----------|-----------|------|
| `gemini-2.5-flash` | 일반 사용자 | 1M 토큰 | ✅ 지원 | 빠른 속도, 비용 효율적, 균형잡힌 성능 |
| `gemini-2.5-pro` | Pro 구독자 | 1M 토큰 | ❌ 유료 | 최고 성능, 복잡한 추론, 적응형 사고 |
| `gemini-2.0-flash` | 일반 사용자 | 1M 토큰 | ✅ 지원 | 차세대 기능, 멀티모달 생성 |
| `gemini-2.5-flash-lite` | 대량 처리 | 1M 토큰 | ✅ 지원 | 초저비용, 높은 처리량, 낮은 지연 |

#### 3.4.2 실험적 모델 (프로덕션 비권장)

- `gemini-2.5-pro-preview-XX-XX`: 최신 기능 테스트용
- `gemini-2.0-flash-exp`: 실험적 기능 포함

#### 3.4.3 폐기된 모델 (사용 불가)

**2025년 4월 29일 폐기**:
- ❌ `gemini-1.5-pro`
- ❌ `gemini-1.5-flash`
- ❌ `gemini-1.5-pro-latest`
- ❌ `gemini-1.5-flash-latest`
- ❌ 모든 Gemini 1.0 및 1.5 시리즈

### 3.5 API 요청 제한 (Rate Limits)

#### 3.5.1 무료 tier 제한

**Gemini 2.5 Flash**:
- 분당 요청: **15 RPM** (Requests Per Minute)
- 일일 요청: **1,500 RPD** (Requests Per Day)
- 분당 토큰: **1,000,000 TPM** (Tokens Per Minute)
- 일일 토큰: **50,000,000 TPD**

**Gemini 2.5 Pro**:
- 분당 요청: **2 RPM**
- 일일 요청: **50 RPD**
- 분당 토큰: **32,000 TPM**
- 일일 토큰: **500,000 TPD**

**Gemini 2.5 Flash-Lite**:
- 분당 요청: **15 RPM**
- 일일 요청: **1,500 RPD**
- 분당 토큰: **4,000,000 TPM**

#### 3.5.2 유료 tier (Pay-as-you-go)

Google Cloud Console에서 결제를 활성화하면 제한이 크게 증가합니다:
- 분당 요청: **1,000 RPM** 이상
- 일일 요청: 제한 없음
- 커스텀 할당량 요청 가능

#### 3.5.3 가격 (2025년 기준)

**Gemini 2.5 Flash**:
- 입력: $0.075 / 1M 토큰 (128K 이하)
- 출력: $0.30 / 1M 토큰 (128K 이하)

**Gemini 2.5 Pro**:
- 입력: $1.25 / 1M 토큰 (128K 이하)
- 출력: $5.00 / 1M 토큰 (128K 이하)

자세한 가격은 [Google AI Pricing](https://ai.google.dev/pricing) 참조

### 3.6 API 내부 동작 (참고용)

Vercel AI SDK를 사용하므로 직접 호출할 일은 없지만, 내부 동작을 이해하면 디버깅에 도움이 됩니다.

#### 3.6.1 엔드포인트

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
```

#### 3.6.2 요청 헤더

```http
Content-Type: application/json
x-goog-api-key: YOUR_API_KEY
```

#### 3.6.3 요청 본문 예시

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "사주를 분석해주세요"
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "당신은 사주 전문가입니다"
      }
    ]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2000
  }
}
```

#### 3.6.4 스트리밍 응답 형식

```
data: {"candidates":[{"content":{"parts":[{"text":"안녕"}]}}]}

data: {"candidates":[{"content":{"parts":[{"text":"하세요"}]}}]}

data: {"candidates":[{"content":{"parts":[{"text":"."}]}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"totalTokenCount":15}}
```

---

## 4. Webhook

### 4.1 개요

**Webhook은 사주 분석 기능에서 필요하지 않습니다.**

### 4.2 Webhook이란?

외부 서비스에서 특정 이벤트가 발생했을 때, 우리 서버로 HTTP POST 요청을 자동으로 보내는 방식입니다.

### 4.3 사용하지 않는 이유

사주 분석 기능의 특성:

1. **동기적 구조**: 사용자 요청 → 즉시 AI 응답
2. **실시간 스트리밍**: 응답이 실시간으로 전달됨
3. **SDK 통신 관리**: Vercel AI SDK가 모든 통신 자동 처리
4. **비동기 통보 불필요**: 별도의 이벤트 알림이 필요 없음

### 4.4 Webhook이 필요한 경우 (사주맛피아 다른 기능)

다음 기능을 구현할 때 Webhook이 필요합니다:

#### 4.4.1 결제 시스템 (TossPayments)

**사용 목적**: 결제 상태 통보 (완료, 취소, 환불 등)

```typescript
// app/api/webhooks/payment/route.ts
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: Request) {
  // 1. Webhook 서명 검증
  const headersList = headers();
  const signature = headersList.get('toss-signature');
  const body = await req.text();
  
  const isValid = verifyTossSignature(signature, body);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. 이벤트 처리
  const event = JSON.parse(body);
  
  switch (event.type) {
    case 'payment.completed':
      await handlePaymentCompleted(event.data);
      break;
    case 'payment.canceled':
      await handlePaymentCanceled(event.data);
      break;
  }
  
  return new Response('OK', { status: 200 });
}

function verifyTossSignature(signature: string | null, body: string): boolean {
  if (!signature) return false;
  
  const secret = process.env.TOSS_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}
```

#### 4.4.2 사용자 인증 (Clerk)

**사용 목적**: 사용자 생성, 업데이트, 삭제 동기화

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  // 1. Webhook 검증
  const headersList = headers();
  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing headers', { status: 400 });
  }
  
  const body = await req.text();
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  
  let event;
  try {
    event = webhook.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (error) {
    return new Response('Invalid signature', { status: 400 });
  }
  
  // 2. 이벤트 처리
  switch (event.type) {
    case 'user.created':
      await createUserInDatabase(event.data);
      break;
    case 'user.updated':
      await updateUserInDatabase(event.data);
      break;
    case 'user.deleted':
      await deleteUserFromDatabase(event.data);
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 5. 구현 패턴 선택 가이드

### 5.1 useCompletion vs useChat 비교

| 특징 | useCompletion | useChat |
|------|---------------|---------|
| **용도** | 단일 텍스트 생성 | 다중 턴 대화 |
| **상태 관리** | 단순 (프롬프트 → 완성) | 복잡 (메시지 히스토리) |
| **API 형식** | `{ prompt: string }` | `{ messages: Message[] }` |
| **UI 복잡도** | 낮음 | 높음 |
| **적합한 경우** | 일회성 요청 | 대화형 인터페이스 |
| **사주 분석 적합도** | ✅ 높음 (권장) | ⚠️ 중간 (과도한 기능) |

### 5.2 사주 분석에 대한 권장 사항

#### 5.2.1 현재 요구사항 (단일 분석)

**✅ 권장: useCompletion**

이유:
- 사주 분석은 일회성 요청-응답 구조
- 대화 컨텍스트 불필요
- 더 단순한 코드와 상태 관리
- 공식 문서의 권장 패턴에 부합

#### 5.2.2 향후 확장 (대화형 상담)

**✅ 권장: useChat**

다음 기능 추가 시 고려:
- "이 결과에 대해 더 자세히 알려주세요"
- "2025년 운세는 어떤가요?"
- "저와 어울리는 직업은?"

이 경우 대화 컨텍스트가 필요하므로 `useChat`이 적합합니다.

### 5.3 구현 단계별 전략

#### Phase 1: MVP (최소 기능 제품)
```
useCompletion → 단일 사주 분석
```

#### Phase 2: 기능 확장
```
useChat → 대화형 사주 상담 추가
```

#### Phase 3: 하이브리드
```
단일 분석: useCompletion
대화형 상담: useChat (별도 페이지)
```

---

## 6. 전체 구현 예제

### 6.1 디렉토리 구조

```
project-root/
├── .env.local                          # 환경 변수 (Git 제외)
├── .gitignore                          # Git 무시 파일
├── package.json                        # 의존성
├── tsconfig.json                       # TypeScript 설정
│
├── app/
│   ├── api/
│   │   └── saju-analysis/
│   │       └── route.ts               # 백엔드 API Route
│   │
│   └── saju/
│       └── new-test/
│           └── page.tsx               # 프론트엔드 페이지
│
└── components/                         # 재사용 컴포넌트 (선택)
    └── SajuForm.tsx
```

### 6.2 완전한 구현 체크리스트

#### 6.2.1 초기 설정

- [ ] Node.js 18 이상 설치
- [ ] Next.js 15 프로젝트 생성
- [ ] Git 저장소 초기화
- [ ] `.gitignore` 설정 확인

#### 6.2.2 패키지 설치

```bash
# AI SDK 설치
npm install ai @ai-sdk/google

# 설치 확인
npm list ai @ai-sdk/google
```

#### 6.2.3 환경 변수 설정

**로컬 개발**:
```bash
# .env.local 생성
echo 'GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"' > .env.local

# .gitignore 확인
grep -q ".env*.local" .gitignore || echo ".env*.local" >> .gitignore
```

**Vercel 배포**:
- Vercel 대시보드에서 환경 변수 추가

#### 6.2.4 백엔드 구현

```bash
# API Route 디렉토리 생성
mkdir -p app/api/saju-analysis

# route.ts 파일 생성 (위의 2.6.1 코드 참조)
```

#### 6.2.5 프론트엔드 구현

```bash
# 페이지 디렉토리 생성
mkdir -p app/saju/new-test

# page.tsx 파일 생성 (위의 2.6.2 코드 참조)
```

#### 6.2.6 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 접속
open http://localhost:3000/saju/new-test
```

### 6.3 배포 체크리스트

#### 6.3.1 배포 전 확인

- [ ] 환경 변수가 Vercel에 등록되었는가?
- [ ] API Route가 정상 작동하는가?
- [ ] 스트리밍이 제대로 표시되는가?
- [ ] 에러 처리가 적절한가?
- [ ] 로딩 상태가 표시되는가?
- [ ] API 키가 코드에 하드코딩되지 않았는가?
- [ ] `.env.local`이 Git에 커밋되지 않았는가?

#### 6.3.2 Vercel 배포

```bash
# Vercel CLI 설치 (처음만)
npm i -g vercel

# 배포
vercel --prod
```

#### 6.3.3 배포 후 확인

- [ ] 프로덕션 URL에서 정상 작동하는가?
- [ ] 환경 변수가 제대로 로드되는가?
- [ ] 스트리밍이 정상적으로 작동하는가?
- [ ] Vercel Functions 로그 확인

---

## 7. 트러블슈팅

### 7.1 자주 발생하는 문제

#### 문제 1: API 키 인식 실패

**증상**:
```
Error: Missing API key for Google Generative AI
```

**원인**:
- 환경 변수가 설정되지 않음
- Vercel 배포 시 환경 변수 미등록

**해결**:

1. **로컬 개발**:
```bash
# .env.local 파일 확인
cat .env.local

# 없다면 생성
echo 'GOOGLE_GENERATIVE_AI_API_KEY="your-key"' > .env.local

# 개발 서버 재시작
npm run dev
```

2. **Vercel 배포**:
- Vercel 대시보드 → Settings → Environment Variables
- `GOOGLE_GENERATIVE_AI_API_KEY` 추가
- 재배포 (Deployments → Redeploy)

#### 문제 2: 폐기된 모델 사용

**증상**:
```
Error: models/gemini-1.5-flash is not found
```

**원인**:
- Gemini 1.5 시리즈는 2025년 4월 29일 폐기됨

**해결**:
```typescript
// ❌ 잘못된 코드
const model = google('gemini-1.5-flash');

// ✅ 올바른 코드
const model = google('gemini-2.5-flash');
```

#### 문제 3: 스트리밍 미작동

**증상**:
- 텍스트가 한 번에 표시됨
- 실시간 스트리밍이 안 됨

**원인**:
- Edge Runtime이 설정되지 않음
- 잘못된 Response 메서드 사용

**해결**:
```typescript
// API Route 파일 상단에 추가
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 올바른 Response 메서드 사용
return result.toUIMessageStreamResponse(); // ✅
// return result.toDataStreamResponse(); // ⚠️ 레거시
```

#### 문제 4: Rate Limit 초과

**증상**:
```
Error: 429 Too Many Requests
Resource exhausted: quota exceeded
```

**원인**:
- 무료 tier 한도 초과 (gemini-2.5-flash: 15 RPM)

**해결**:

1. **개발 환경**: 요청 빈도 줄이기
2. **프로덕션**: Rate limiting 구현

```typescript
// 간단한 Rate Limiting 예제
const rateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1분
const MAX_REQUESTS = 10;

export async function POST(req: Request) {
  const userId = getUserId(req); // 실제 구현 필요
  const now = Date.now();
  const userRequests = rateLimit.get(userId) || 0;
  
  // 1분 이내 10회 이상 요청 차단
  if (userRequests >= MAX_REQUESTS) {
    return new Response('Too many requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    });
  }
  
  rateLimit.set(userId, userRequests + 1);
  
  // 1분 후 카운터 초기화
  setTimeout(() => {
    rateLimit.set(userId, 0);
  }, RATE_LIMIT_WINDOW);
  
  // 실제 API 호출...
}
```

3. **장기적 해결**: 유료 tier로 업그레이드

#### 문제 5: CORS 오류

**증상**:
```
Access to fetch has been blocked by CORS policy
```

**원인**:
- 외부 도메인에서 API 호출 (일반적으로 Next.js에서는 발생하지 않음)

**해결**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};
```

#### 문제 6: Vercel 타임아웃

**증상**:
```
Error: FUNCTION_INVOCATION_TIMEOUT
```

**원인**:
- Vercel Serverless Function 시간 제한 (무료: 10초, Pro: 60초)

**해결**:

1. **Edge Runtime 사용** (권장):
```typescript
export const runtime = 'edge'; // 무제한 실행 시간
```

2. **Pro 플랜 업그레이드**:
- Vercel Pro: 60초 제한
- Enterprise: 커스텀 제한

3. **maxTokens 조절**:
```typescript
const result = streamText({
  model: google('gemini-2.5-flash'),
  prompt: prompt,
  maxTokens: 1000, // 응답 길이 제한
});
```

### 7.2 디버깅 팁

#### 7.2.1 백엔드 로그 확인

```typescript
// app/api/saju-analysis/route.ts
export async function POST(req: Request) {
  console.log('🚀 API Route called');
  
  const { prompt } = await req.json();
  console.log('📩 Prompt:', prompt.substring(0, 100) + '...');
  
  const result = streamText({
    model: google('gemini-2.5-flash'),
    prompt: prompt,
  });
  
  console.log('✅ Streaming started');
  return result.toUIMessageStreamResponse();
}
```

**로그 확인**:
- **로컬**: 터미널 콘솔
- **Vercel**: Deployments → 해당 배포 → Functions 탭

#### 7.2.2 프론트엔드 로그 확인

```typescript
const { completion, complete, isLoading } = useCompletion({
  api: '/api/saju-analysis',
  onResponse: (response) => {
    console.log('📥 Response received:', response.status);
  },
  onFinish: (prompt, completion) => {
    console.log('✅ Completion finished');
    console.log('📝 Length:', completion.length);
  },
  onError: (error) => {
    console.error('❌ Error:', error);
  },
});
```

**로그 확인**:
- 브라우저 개발자 도구 (F12) → Console 탭

#### 7.2.3 네트워크 요청 모니터링

1. 브라우저 개발자 도구 (F12) 열기
2. **Network** 탭 선택
3. 폼 제출
4. `/api/saju-analysis` 요청 클릭
5. 확인 사항:
   - Status: 200 OK
   - Content-Type: `text/event-stream` 또는 `text/plain`
   - Response 탭에서 스트리밍 데이터 확인

#### 7.2.4 환경 변수 확인

```typescript
// API Route에서 확인
export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API key not found');
    return new Response('API key not configured', { status: 500 });
  }
  
  console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
  // 나머지 코드...
}
```

### 7.3 성능 최적화

#### 7.3.1 응답 시간 모니터링

```typescript
export async function POST(req: Request) {
  const startTime = Date.now();
  
  const result = streamText({...});
  
  const endTime = Date.now();
  console.log(`⏱️ Response time: ${endTime - startTime}ms`);
  
  return result.toUIMessageStreamResponse();
}
```

#### 7.3.2 캐싱 구현 (선택사항)

동일한 생년월일에 대한 반복 요청 방지:

```typescript
import { unstable_cache } from 'next/cache';

const getCachedAnalysis = unstable_cache(
  async (birthData: string) => {
    // 실제 API 호출
    return analysis;
  },
  ['saju-analysis'],
  {
    revalidate: 3600, // 1시간 캐시
    tags: ['saju']
  }
);
```

#### 7.3.3 모델 선택 최적화

```typescript
// 간단한 질문: Flash 모델
const simpleModel = google('gemini-2.5-flash');

// 복잡한 분석: Pro 모델
const complexModel = google('gemini-2.5-pro');
```

### 8.4 버전 정보

**사용 기술 스택**:
- Vercel AI SDK: 5.0.x
- @ai-sdk/google: 2.0.x

---

## 마무리

### 구현 순서 요약

1. ✅ 패키지 설치: `npm install ai @ai-sdk/google`
2. ✅ API 키 발급: Google AI Studio
3. ✅ 환경 변수 설정: `.env.local`
4. ✅ 백엔드 구현: `app/api/saju-analysis/route.ts`
5. ✅ 프론트엔드 구현: `app/saju/new-test/page.tsx`
6. ✅ 로컬 테스트: `npm run dev`
7. ✅ Vercel 배포: 환경 변수 등록 후 배포
