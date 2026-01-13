export interface ParsedTimeQuery {
  date_from?: Date;
  date_to?: Date;
  original_query: string;
}

export class TimeParserService {
  parse(query: string): ParsedTimeQuery {
    const lowerQuery = query.toLowerCase().trim();
    const result: ParsedTimeQuery = { original_query: query };

    if (lowerQuery.includes('вчера')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      result.date_from = this.startOfDayUTC(yesterday);
      result.date_to = this.endOfDayUTC(yesterday);
    }

    if (lowerQuery.includes('позавчера')) {
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      result.date_from = this.startOfDayUTC(dayBefore);
      result.date_to = this.endOfDayUTC(dayBefore);
    }

    const lastDaysMatch = lowerQuery.match(/последни[ех]\s+(\d+)\s+дн/);
    if (lastDaysMatch) {
      const days = parseInt(lastDaysMatch[1], 10);
      const from = new Date();
      from.setDate(from.getDate() - days);
      result.date_from = this.startOfDayUTC(from);
      result.date_to = new Date();
    }

    const afterTimeMatch = lowerQuery.match(/после\s+(\d{1,2}):(\d{2})/);
    if (afterTimeMatch && result.date_from) {
      const hours = parseInt(afterTimeMatch[1], 10);
      const minutes = parseInt(afterTimeMatch[2], 10);
      result.date_from.setUTCHours(hours, minutes, 0, 0);
    }

    const beforeTimeMatch = lowerQuery.match(/до\s+(\d{1,2}):(\d{2})/);
    if (beforeTimeMatch && result.date_to) {
      const hours = parseInt(beforeTimeMatch[1], 10);
      const minutes = parseInt(beforeTimeMatch[2], 10);
      result.date_to.setUTCHours(hours, minutes, 0, 0);
    }

    if (!result.date_from && !result.date_to) {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      result.date_from = this.startOfDayUTC(from);
      result.date_to = new Date();
    }

    return result;
  }

  private startOfDayUTC(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  }

  private endOfDayUTC(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));
  }
}

export const timeParserService = new TimeParserService();
