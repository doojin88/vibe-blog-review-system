/**
 * 전화번호를 포맷팅합니다.
 * @param phone - 포맷팅할 전화번호 (숫자만 포함)
 * @returns "010-XXXX-XXXX" 형식의 문자열
 */
export function formatPhoneNumber(phone: string): string {
  // 숫자만 추출
  const cleaned = phone.replace(/\D/g, "");

  // 전화번호 형식에 맞게 포맷팅
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  // 형식에 맞지 않으면 그대로 반환
  return phone;
}

/**
 * 전화번호 유효성을 검증합니다.
 * @param phone - 검증할 전화번호
 * @returns 유효하면 true, 아니면 false
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  // 한국 휴대폰 번호: 010으로 시작하는 11자리 숫자
  const regex = /^010\d{8}$/;
  return regex.test(cleaned);
}

/**
 * 사업자등록번호를 포맷팅합니다.
 * @param bizNo - 포맷팅할 사업자등록번호 (숫자만 포함)
 * @returns "XXX-XX-XXXXX" 형식의 문자열
 */
export function formatBusinessNumber(bizNo: string): string {
  // 숫자만 추출
  const cleaned = bizNo.replace(/\D/g, "");

  // 사업자등록번호 형식에 맞게 포맷팅 (10자리)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  // 형식에 맞지 않으면 그대로 반환
  return bizNo;
}

/**
 * 사업자등록번호 유효성을 검증합니다.
 * @param bizNo - 검증할 사업자등록번호
 * @returns 유효하면 true, 아니면 false
 */
export function validateBusinessNumber(bizNo: string): boolean {
  const cleaned = bizNo.replace(/\D/g, "");

  // 사업자등록번호는 10자리 숫자
  if (cleaned.length !== 10) {
    return false;
  }

  // 체크섬 검증 (간단한 형식 검증만 수행)
  const regex = /^\d{10}$/;
  return regex.test(cleaned);
}

/**
 * 숫자를 천 단위 구분 기호로 포맷팅합니다.
 * @param num - 포맷팅할 숫자
 * @returns "1,000" 형식의 문자열
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR");
}
