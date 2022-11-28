import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
// eslint-disable-next-line import/order
import timezone from 'dayjs/plugin/timezone'; // dependent on utc plugin https://day.js.org/docs/en/plugin/timezone

dayjs.extend(utc); // https://day.js.org/docs/en/plugin/utc
dayjs.extend(relativeTime); // https://day.js.org/docs/en/plugin/relative-time
dayjs.extend(timezone);

/**
 *
 * @param {Date} date
 * @returns {string} like 2022-08-03 17:32:00 UTC
 */
export const getFormattedUtcDatetime = (date: Date): string => {
  return dayjs(date).utc().format('YYYY-MM-DD HH:mm:ss [UTC]'); // https://day.js.org/docs/en/manipulate/utc
};

export function getFormattedUtcDatetimeNow(): string {
  return getFormattedUtcDatetime(new Date());
}

export const getFormattedUtcDatetimeForFilename = (date: Date): string => {
  const formattedUtcDatetime = getFormattedUtcDatetime(date);
  return formattedUtcDatetime.replaceAll(' ', '_').replaceAll(':', '');
};

export function formatDateFromNano(blockTimestamp: number): string {
  return getFormattedUtcDatetime(new Date(blockTimestamp / 1_000_000));
}
