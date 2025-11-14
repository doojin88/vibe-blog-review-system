# 네이버 지도 API Next.js 15 풀스택 연동 가이드

> **작성일**: 2025년 10월 21일  
> **대상 프레임워크**: Next.js 15 (App Router)  
> **검증 완료**: 네이버 클라우드 플랫폼 공식 문서 기준

---

## 목차

1. [사전 준비: 네이버 클라우드 플랫폼 설정](#1-사전-준비-네이버-클라우드-플랫폼-설정)
2. [연동 수단 개요](#2-연동-수단-개요)
3. [Web Dynamic Map SDK 연동](#3-web-dynamic-map-sdk-연동)
4. [Geocoding REST API 연동](#4-geocoding-rest-api-연동)
5. [Next.js 15 통합 구현 예제](#5-nextjs-15-통합-구현-예제)
6. [중요 공지사항](#6-중요-공지사항)

---

## 1. 사전 준비: 네이버 클라우드 플랫폼 설정

모든 네이버 지도 기능을 사용하려면 네이버 클라우드 플랫폼에서 애플리케이션을 등록하고 인증 정보를 발급받아야 합니다.

### 1.1 회원가입 및 결제수단 등록

1. [네이버 클라우드 플랫폼](https://www.ncloud.com) 접속
2. 회원가입 진행 (개인 회원 또는 사업자 회원)
3. **결제수단 등록 필수** (신용카드 또는 체크카드)
   - 2025년 7월 1일부터 무료 이용량이 중단되어 모든 사용이 유료로 전환되었습니다
   - 지도 API 사용 시 호출당 과금이 발생합니다

### 1.2 애플리케이션 등록

1. 콘솔 접속: **Console > Services > AI·NAVER API > Application**
2. **[+ Application 등록]** 버튼 클릭
3. 애플리케이션 정보 입력:
   - **Application 이름**: 프로젝트를 식별할 수 있는 이름 입력
   - **Service 선택**:
     - `Web Dynamic Map` ✅ (지도 표시용)
     - `Geocoding` ✅ (주소 → 좌표 변환용)
   - **서비스 환경 등록**:
     - 개발 환경: `http://localhost:3000`
     - 배포 환경: 실제 서비스 도메인 추가 (예: `https://yourdomain.com`)
     - ⚠️ http와 https를 구분하여 별도로 등록해야 합니다

4. **[등록]** 버튼 클릭

### 1.3 인증 정보 확인

1. 생성된 애플리케이션의 **[인증 정보]** 버튼 클릭
2. 다음 정보 확인 및 안전한 곳에 보관:
   - **Client ID** (X-NCP-APIGW-API-KEY-ID)
   - **Client Secret** (X-NCP-APIGW-API-KEY)

---

## 2. 연동 수단 개요

이 가이드에서는 다음 두 가지 수단을 연동합니다:

### 2.1 Web Dynamic Map SDK (클라이언트)

| 항목 | 내용 |
|------|------|
| **연동 수단** | JavaScript SDK (Script 태그 로드) |
| **실행 환경** | 클라이언트(브라우저) |
| **사용 기능** | • 지도 표시<br>• 지도 이동/줌<br>• 마커 추가 및 표시 |
| **인증 방식** | URL 파라미터로 Client ID 전달 |
| **npm 설치** | 불필요 (CDN 스크립트 사용) |

### 2.2 Geocoding REST API (서버)

| 항목 | 내용 |
|------|------|
| **연동 수단** | REST API (HTTP GET) |
| **실행 환경** | 서버 (Next.js API Route) |
| **사용 기능** | • 장소명/주소 검색<br>• 좌표 변환 (주소 → 위도·경도) |
| **인증 방식** | HTTP 헤더에 Client ID/Secret 전달 |
| **npm 설치** | 불필요 (fetch API 사용) |

---

## 3. Web Dynamic Map SDK 연동

### 3.1 설치 방법

별도의 npm 패키지 설치는 필요하지 않습니다. Next.js의 `next/script` 컴포넌트를 사용하여 네이버 지도 스크립트를 동적으로 로드합니다.

### 3.2 인증정보 세팅

**프로젝트 루트**에 `.env.local` 파일 생성:

```env
# 브라우저에 노출되는 환경 변수 (NEXT_PUBLIC_ 접두사 필수)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=여기에_발급받은_Client_ID_입력
```

⚠️ **주의사항**:
- `NEXT_PUBLIC_` 접두사는 클라이언트에서 접근 가능한 환경 변수를 의미합니다
- Client ID는 브라우저에 노출되어도 보안상 문제가 없습니다
- `.env.local`은 `.gitignore`에 포함되어야 합니다

### 3.3 TypeScript 타입 정의 (선택사항)

TypeScript 프로젝트에서 타입 안정성을 위해 설치 권장:

```bash
npm install -D @types/navermaps
```

### 3.4 지도 컴포넌트 생성

**`app/components/NaverMap.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const NAVER_MAP_URL = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;

interface NaverMapProps {
  latitude: number;
  longitude: number;
}

export default function NaverMap({ latitude, longitude }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const initializeMap = () => {
    if (!mapRef.current || !window.naver) return;

    // 지도 옵션 설정
    const mapOptions = {
      center: new window.naver.maps.LatLng(latitude, longitude),
      zoom: 17,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    };

    // 지도 생성
    const map = new window.naver.maps.Map(mapRef.current, mapOptions);

    // 마커 생성 및 지도에 추가
    new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(latitude, longitude),
      map: map,
    });
  };

  return (
    <>
      {/* 네이버 지도 스크립트 로드 */}
      <Script
        strategy="afterInteractive"
        src={NAVER_MAP_URL}
        onReady={initializeMap}
      />
      
      {/* 지도가 표시될 DOM 요소 */}
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '500px' }} 
      />
    </>
  );
}
```

### 3.5 호출 방법 설명

**Script 컴포넌트 옵션**:
- `strategy="afterInteractive"`: 페이지가 인터랙티브 상태가 된 후 스크립트 로드
- `src`: 네이버 지도 SDK URL (Client ID 포함)
- `onReady`: 스크립트 로드 완료 후 실행할 콜백 함수

**지도 생성 프로세스**:
1. `window.naver` 객체가 로드될 때까지 대기
2. `naver.maps.Map` 생성자로 지도 인스턴스 생성
3. `naver.maps.Marker` 생성자로 마커 생성 및 지도에 추가

---

## 4. Geocoding REST API 연동

### 4.1 API 엔드포인트 정보

- **기본 URL**: `https://naveropenapi.apigw.ntruss.com`
- **Geocoding 경로**: `/map-geocode/v2/geocode`
- **메소드**: `GET`
- **공식 문서**: [Geocoding API 가이드](https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding-geocode)

### 4.2 인증정보 세팅

`.env.local` 파일에 Client Secret 추가:

```env
# 클라이언트 노출용
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=여기에_발급받은_Client_ID_입력

# 서버 전용 (NEXT_PUBLIC_ 접두사 없음)
NAVER_MAP_CLIENT_SECRET=여기에_발급받은_Client_Secret_입력
```

⚠️ **보안 주의사항**:
- Client Secret은 절대 클라이언트에 노출되면 안 됩니다
- `NEXT_PUBLIC_` 접두사를 붙이지 않아 서버에서만 접근 가능합니다

### 4.3 API Route 생성

**`app/api/search/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. 쿼리 파라미터 추출
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' }, 
      { status: 400 }
    );
  }

  // 2. 환경 변수에서 인증 정보 로드
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing API credentials' }, 
      { status: 500 }
    );
  }

  // 3. Geocoding API URL 구성
  const apiUrl = new URL(
    'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode'
  );
  apiUrl.searchParams.append('query', query);

  try {
    // 4. API 호출
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    });

    // 5. 에러 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Geocoding API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch geocoding data' }, 
        { status: response.status }
      );
    }

    // 6. 응답 데이터 파싱
    const data = await response.json();

    // 7. 주소 정보 확인 및 반환
    if (data.addresses && data.addresses.length > 0) {
      return NextResponse.json({
        latitude: parseFloat(data.addresses[0].y),
        longitude: parseFloat(data.addresses[0].x),
        address: data.addresses[0].roadAddress || data.addresses[0].jibunAddress,
      });
    } else {
      return NextResponse.json(
        { error: 'No results found' }, 
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
```

### 4.4 호출 방법 설명

**HTTP 헤더 인증**:
- `X-NCP-APIGW-API-KEY-ID`: Client ID
- `X-NCP-APIGW-API-KEY`: Client Secret

**요청 예시**:
```
GET /api/search?query=경복궁
```

**응답 예시** (성공):
```json
{
  "latitude": 37.5796,
  "longitude": 126.9770,
  "address": "서울특별시 종로구 사직로 161"
}
```

**응답 예시** (실패):
```json
{
  "error": "No results found"
}
```

---

## 5. Next.js 15 통합 구현 예제

### 5.1 메인 페이지 컴포넌트

**`app/page.tsx`**

```tsx
'use client';

import { useState, FormEvent } from 'react';
import NaverMap from './components/NaverMap';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export default function HomePage() {
  // 기본 위치: 서울 시청
  const [coords, setCoords] = useState<Coordinates>({
    latitude: 37.5665,
    longitude: 126.9780,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API Route 호출
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (response.ok) {
        // 좌표 업데이트 -> NaverMap 컴포넌트 리렌더링
        setCoords({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } else {
        setError(data.error || '검색 결과를 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>네이버 지도 연동 예제 (Next.js 15)</h1>
      
      {/* 검색 폼 */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="장소명을 입력하세요 (예: 경복궁)"
          style={{
            width: '300px',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#ccc' : '#03c75a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '검색 중...' : '검색'}
        </button>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
      )}

      {/* 지도 컴포넌트 */}
      <NaverMap latitude={coords.latitude} longitude={coords.longitude} />
    </div>
  );
}
```

### 5.2 전역 타입 선언 (TypeScript)

**`types/naver-maps.d.ts`**

```typescript
declare global {
  interface Window {
    naver: any;
  }
}

export {};
```

---

## 6. 중요 공지사항

### 6.1 무료 이용량 정책 변경 (2025년)

- **신규 신청 종료**: 2025년 5월 22일부터 신규 이용 신청 차단
- **무료 이용량 종료**: 2025년 7월 1일부터 무료 이용량 제공 중단
- **현재 상태**: 모든 사용이 유료로 전환됨
- **참고**: [공식 공지사항](https://www.ncloud.com/support/notice)

### 6.2 과금 정보

- Web Dynamic Map: 호출당 과금
- Geocoding API: 호출당 과금
- 상세 요금: [Maps API 요금 안내](https://www.ncloud.com/product/applicationService/maps)

### 6.3 Next.js 15 호환성

- ✅ Next.js 15 완벽 호환
- ✅ App Router 지원
- ✅ React 19 호환
- ✅ Server Components / Client Components 구분 지원

### 6.4 에러 코드

| 상태 코드 | 의미 | 해결 방법 |
|----------|------|----------|
| 400 | 잘못된 요청 | 쿼리 파라미터 확인 |
| 401 | 인증 실패 | Client ID/Secret 확인 |
| 404 | 검색 결과 없음 | 다른 검색어로 재시도 |
| 429 | 할당량 초과 | API 선택 확인 또는 사용량 확인 |
| 500 | 서버 오류 | 잠시 후 재시도 |

### 6.5 보안 체크리스트

- ✅ `.env.local` 파일을 `.gitignore`에 추가
- ✅ Client Secret은 서버 환경 변수로만 관리
- ✅ API Route를 통해 서버에서 Geocoding API 호출
- ✅ 프로덕션 배포 시 도메인을 네이버 클라우드 플랫폼에 등록

---

## 참고 자료

- [네이버 클라우드 플랫폼 Maps 가이드](https://guide.ncloud-docs.com/docs/maps-overview)
- [Geocoding API 문서](https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding-geocode)
- [Web Dynamic Map API 문서](https://navermaps.github.io/maps.js.ncp/)
- [Next.js 15 공식 문서](https://nextjs.org/docs)

---

**마지막 업데이트**: 2025년 10월 21일  
**문서 버전**: 1.0.0