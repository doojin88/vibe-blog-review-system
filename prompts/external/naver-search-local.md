다음은 Next.js 15와 TypeScript 환경에서 네이버 지역 검색 API를 연동하는 방법에 대한 최종 문서입니다.

---

## 네이버 지역 검색 API 연동 가이드 (Next.js 15 + TypeScript)

본 문서는 Next.js 15와 TypeScript를 사용하여 네이버 검색 API의 '지역 검색' 기능을 연동하는 방법을 안내합니다.

### 1. 연동 수단

- **API (RESTful API)**
  - 네이버 지역 검색 기능은 RESTful API 형태로 제공됩니다.
  - SDK나 Webhook 방식은 공식적으로 지원하지 않으므로, HTTP 클라이언트를 통해 직접 API를 호출해야 합니다.

### 2. 사용할 기능

- **지역 검색**
  - 네이버 지역 서비스에 등록된 업체 및 기관 정보를 검색하는 기능입니다.
  - 검색어와 관련 조건을 파라미터로 전송하면, 검색 결과를 JSON 또는 XML 형식으로 반환받을 수 있습니다.
  - API 호출 당 하루 25,000회까지 호출이 가능합니다.

### 3. 설치 및 세팅 방법

#### 가. 사전 준비 사항: 애플리케이션 등록 및 인증 정보 발급

1.  **네이버 개발자 센터 접속**: [네이버 개발자 센터](https://developers.naver.com/)에 접속하여 로그인합니다.
2.  **애플리케이션 등록**:
    - **Application > 애플리케이션 등록** 메뉴로 이동합니다.
    - 애플리케이션 이름과 사용 API(여기서는 '검색')를 선택합니다.
    - 웹 서비스 환경이라면 서비스 URL(예: `http://localhost:3000`)을 등록합니다.
3.  **Client ID 및 Client Secret 확인**:
    - 애플리케이션 등록이 완료되면 **Client ID**와 **Client Secret**이 발급됩니다. 이 두 가지 값은 API 호출 시 인증을 위해 사용되므로 안전하게 보관해야 합니다.
4.  **API 설정 확인**:
    - 등록된 애플리케이션의 **API 설정** 탭에서 '검색' API가 체크되어 있는지 확인합니다. 만약 체크되어 있지 않으면 403 오류가 발생할 수 있습니다.

#### 나. Next.js 프로젝트 설정

별도의 라이브러리 설치는 필요하지 않습니다. Next.js에 내장된 `fetch` API를 사용하여 HTTP 요청을 처리할 수 있습니다.

### 4. 인증정보 관리 방법

네이버 검색 API는 비로그인 방식 오픈 API로, HTTP 요청 헤더에 Client ID와 Client Secret을 포함하여 인증합니다. 이 정보는 민감한 정보이므로 소스 코드에 직접 하드코딩하지 않는 것이 중요합니다.

**`.env.local` 파일을 이용한 환경 변수 관리**

Next.js 프로젝트 루트 디렉터리에 `.env.local` 파일을 생성하고 다음과 같이 인증 정보를 변수로 저장합니다.

```.env.local
NAVER_CLIENT_ID=애플리케이션_등록_시_발급받은_클라이언트_아이디_값
NAVER_CLIENT_SECRET=애플리케이션_등록_시_발급받은_클라이언트_시크릿_값
```

이렇게 설정하면 `process.env.NAVER_CLIENT_ID`와 같이 서버 측 코드에서 안전하게 값을 불러올 수 있습니다. `.env.local` 파일은 `.gitignore`에 자동으로 포함되어 Git에 업로드되지 않습니다.

### 5. 호출 방법

API 요청은 서버 컴포넌트나 API Route Handler에서 처리하는 것이 안전합니다. 클라이언트 컴포넌트에서 직접 호출하면 인증 정보가 외부에 노출될 위험이 있습니다.

#### 가. 데이터 타입 정의 (TypeScript)

API 응답 데이터의 타입을 미리 정의하여 코드의 안정성을 높입니다.

```typescript:src/types/naverSearch.ts
export interface LocalSearchItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

export interface LocalSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: LocalSearchItem[];
}
```

#### 나. API 호출 함수 작성 (Next.js 서버 컴포넌트 예시)

`fetch`를 사용하여 네이버 지역 검색 API를 호출하는 예제입니다.

```typescript:src/app/api/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'API credentials are not configured' }, { status: 500 });
  }

  const apiURL = `https://openapi.naver.com/v1/search/local.json?query=${encodeURI(query)}&display=5`;

  try {
    const response = await fetch(apiURL, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      // 오류 응답을 그대로 클라이언트에 전달할 수 있습니다.
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API call failed:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Naver API' }, { status: 500 });
  }
}
```

#### 다. 클라이언트 컴포넌트에서 API 호출 및 사용

위에서 만든 API Route를 클라이언트 컴포넌트에서 호출하여 사용합니다.

```tsx:src/app/page.tsx
'use client';

import { useState } from 'react';
import { LocalSearchItem, LocalSearchResponse } from '@/types/naverSearch';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`/api/search?query=${query}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errorMessage || '검색에 실패했습니다.');
      }
      const data: LocalSearchResponse = await response.json();
      setResults(data.items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>네이버 지역 검색</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? '검색 중...' : '검색'}
      </button>

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      <ul>
        {results.map((item, index) => (
          <li key={index}>
            <h3 dangerouslySetInnerHTML={{ __html: item.title }}></h3>
            <p>카테고리: {item.category}</p>
            <p>주소: {item.address}</p>
            <p>도로명 주소: {item.roadAddress}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

```
