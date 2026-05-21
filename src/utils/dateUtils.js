const { addDays, subDays, format, parseISO, startOfDay, endOfDay, getDay } = require('date-fns');
const { formatInTimeZone, toZonedTime } = require('date-fns-tz');

const TIMEZONE = 'Africa/Addis_Ababa';

function calculateOperationalDate(productionDate, shift) {
  if (!productionDate) {
    throw new Error('productionDate is required');
  }

  let date;
  if (productionDate instanceof Date) {
    date = productionDate;
  } else if (typeof productionDate === 'string') {
    const [y, m, d] = productionDate.split('-');
    date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
  } else {
    date = new Date(productionDate);
  }

  if (shift === 'NIGHT') {
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return nextDay;
  }

  return date;
}

function addOneDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

function getPreviousDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

function getMonday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = getDay(d);
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfDay(monday);
}

function getSunday(date) {
  const monday = getMonday(date);
  return addDays(monday, 6);
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

const EDIT_WINDOW_DAYS = 3;

function canEditOperationalRecord(operationalDate, maxDays = EDIT_WINDOW_DAYS) {
  if (!operationalDate) return false;
  let opDate;
  if (operationalDate instanceof Date) {
    opDate = new Date(Date.UTC(operationalDate.getUTCFullYear(), operationalDate.getUTCMonth(), operationalDate.getUTCDate()));
  } else if (typeof operationalDate === 'string') {
    const [y, m, d] = operationalDate.split('-');
    opDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
  } else {
    opDate = new Date(operationalDate);
  }
  const addisNow = getAddisAbabaDate();
  const today = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));
  const diffDays = Math.floor((today - opDate) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays < maxDays;
}

function getEditWindowDeadline(operationalDate, maxDays = EDIT_WINDOW_DAYS) {
  if (!operationalDate) return null;
  const opDate = startOfDay(operationalDate instanceof Date ? operationalDate : new Date(operationalDate));
  return addDays(opDate, maxDays);
}

module.exports = {
  TIMEZONE,
  calculateOperationalDate,
  addOneDay,
  getPreviousDay,
  getMonday,
  getSunday,
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
  canEditOperationalRecord,
  getEditWindowDeadline,
  EDIT_WINDOW_DAYS,
  startOfDay,
  subDays,
};