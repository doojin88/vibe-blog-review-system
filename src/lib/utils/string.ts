/**
 * 문자열을 지정된 길이로 자르고 말줄임표를 추가합니다.
 * @param text - 자를 문자열
 * @param maxLength - 최대 길이
 * @returns 잘린 문자열 (말줄임표 포함)
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * 개행 문자를 <br> 태그로 변환합니다 (React용).
 * @param text - 변환할 문자열
 * @returns 개행 문자가 <br>로 변환된 배열
 */
export function nl2br(text: string): string[] {
  return text.split("\n");
}

/**
 * 문자열의 앞뒤 공백을 제거합니다.
 * @param text - 공백을 제거할 문자열
 * @returns 공백이 제거된 문자열
 */
export function trimText(text: string): string {
  return text.trim();
}

/**
 * 문자열이 비어있는지 확인합니다 (null, undefined, 빈 문자열, 공백만 있는 경우).
 * @param text - 확인할 문자열
 * @returns 비어있으면 true, 아니면 false
 */
export function isEmpty(text: string | null | undefined): boolean {
  return !text || text.trim().length === 0;
}

/**
 * 문자열의 첫 글자를 대문자로 변환합니다.
 * @param text - 변환할 문자열
 * @returns 첫 글자가 대문자인 문자열
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 여러 클래스명을 조합합니다 (조건부 클래스 지원).
 * @param classes - 클래스명 배열
 * @returns 조합된 클래스명 문자열
 */
export function classNames(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}
