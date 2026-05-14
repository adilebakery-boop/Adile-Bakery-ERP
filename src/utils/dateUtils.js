const { addDays, subDays, format, parseISO, startOfDay, endOfDay } = require('date-fns');
const { formatInTimeZone, toZonedTime } = require('date-fns-tz');

const TIMEZONE = 'Africa/Addis_Ababa';

function calculateOperationalDate(productionDate, shift) {
  if (!productionDate) {
    throw new Error('productionDate is required');
  }
  
  const date = productionDate instanceof Date ? productionDate : new Date(productionDate);
  
  if (shift === 'NIGHT') {
    return addDays(startOfDay(date), 1);
  }
  
  return startOfDay(date);
}

function addOneDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return addDays(startOfDay(d), 1);
}

function getPreviousDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return subDays(startOfDay(d), 1);
}

function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return format(startOfDay(d), 'yyyy-MM-dd');
}

function toISODateString(date) {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

function getStartOfDayUTC(date, timezone = TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);
  const zonedDate = toZonedTime(d, timezone);
  const startOfZonedDay = startOfDay(zonedDate);
  return startOfZonedDay;
}

function getEndOfDayUTC(date, timezone = TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);
  const zonedDate = toZonedTime(d, timezone);
  const endOfZonedDay = endOfDay(zonedDate);
  return endOfZonedDay;
}

function getAddisAbabaDate(date = new Date()) {
  return toZonedTime(date, TIMEZONE);
}

function getAddisAbabaStartOfDay(date = new Date()) {
  return startOfDay(getAddisAbabaDate(date));
}

function toUTCString(date) {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function parseDate(dateString) {
  if (!dateString) return null;
  try {
    return parseISO(dateString);
  } catch {
    return null;
  }
}

function formatDateInTimezone(date, formatStr, timezone = TIMEZONE) {
  return formatInTimeZone(date, timezone, formatStr);
}

function isSameDay(date1, date2) {
  const d1 = startOfDay(date1 instanceof Date ? date1 : new Date(date1));
  const d2 = startOfDay(date2 instanceof Date ? date2 : new Date(date2));
  return d1.getTime() === d2.getTime();
}

function getDateRangeForOperationalDay(operationalDate) {
  const start = new Date(operationalDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(operationalDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

module.exports = {
  TIMEZONE,
  calculateOperationalDate,
  addOneDay,
  getPreviousDay,
  toDateString,
  toISODateString,
  getStartOfDayUTC,
  getEndOfDayUTC,
  getAddisAbabaDate,
  getAddisAbabaStartOfDay,
  toUTCString,
  parseDate,
  formatDateInTimezone,
  isSameDay,
  getDateRangeForOperationalDay,
};