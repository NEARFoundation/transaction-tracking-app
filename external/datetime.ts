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
 * @returns {string} like '2022-08-03'
 */
export const getFormattedUtcDatetime = (date: Date): string => {
  return dayjs(date).utc().format('YYYY-MM-DD'); // https://day.js.org/docs/en/manipulate/utc
};

export function getFormattedUtcDatetimeNow(): string {
  return getFormattedUtcDatetime(new Date());
}

export function formatDateFromNano(blockTimestamp: number): string {
  const timestampInMilliseconds = Number(blockTimestamp / 1_000_000);
  return getFormattedUtcDatetime(new Date(timestampInMilliseconds));
}
