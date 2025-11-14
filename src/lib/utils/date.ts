import { differenceInDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ko });
};

export const formatRelative = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const diff = differenceInDays(dateObj, today);

  if (diff < 0) {
    return '종료';
  } else if (diff === 0) {
    return 'D-Day';
  } else {
    return `D-${diff}`;
  }
};

export const isPast = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
};

export const isFuture = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > new Date();
};
