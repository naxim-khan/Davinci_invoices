import { addDays, startOfDay, endOfDay, endOfMonth, startOfMonth, isSameDay, differenceInDays } from 'date-fns';
import { BillingPeriodType, ClientKYC } from '@prisma/client';
import { BillingPeriod } from '../types/billing-period.types';

/**
 * Billing Period Calculator
 *
 * Calculates billing period start/end dates based on customer configuration.
 * Supports both WEEKLY and MONTHLY billing periods with comprehensive edge case handling.
 */
export class BillingPeriodCalculator {
    /**
     * Calculate the billing period that contains the reference date
     */
    static calculateCurrentPeriod(customer: ClientKYC, referenceDate: Date = new Date()): BillingPeriod {
        if (customer.billingPeriodType === 'WEEKLY') {
            return this.calculateWeeklyPeriod(customer, referenceDate);
        } else if (customer.billingPeriodType === 'MONTHLY') {
            return this.calculateMonthlyPeriod(customer, referenceDate);
        }
        throw new Error(`Unsupported billing period type: ${customer.billingPeriodType}`);
    }

    /**
     * Calculate the previous billing period
     */
    static calculatePreviousPeriod(customer: ClientKYC, referenceDate: Date = new Date()): BillingPeriod {
        const currentPeriod = this.calculateCurrentPeriod(customer, referenceDate);

        if (customer.billingPeriodType === 'WEEKLY') {
            // Go back 7 days from current period start
            const previousPeriodEnd = addDays(currentPeriod.start, -1);
            return this.calculateWeeklyPeriod(customer, previousPeriodEnd);
        } else {
            // Go back to previous month
            const previousMonthDate = addDays(currentPeriod.start, -1);
            return this.calculateMonthlyPeriod(customer, previousMonthDate);
        }
    }

    /**
     * Check if the given date is the end of a billing period
     */
    static isPeriodEnd(customer: ClientKYC, date: Date = new Date()): boolean {
        const currentPeriod = this.calculateCurrentPeriod(customer, date);
        const dateOnly = startOfDay(date);
        const periodEndOnly = startOfDay(currentPeriod.end);

        return isSameDay(dateOnly, periodEndOnly);
    }

    /**
     * Get the next period start date
     */
    static getNextPeriodStart(customer: ClientKYC, currentPeriodEnd: Date): Date {
        return addDays(startOfDay(currentPeriodEnd), 1);
    }

    /**
     * Calculate weekly billing period
     * Period is 7 consecutive days starting from billingPeriodStartDay
     */
    private static calculateWeeklyPeriod(customer: ClientKYC, referenceDate: Date): BillingPeriod {
        const startDayOfWeek = customer.billingPeriodStartDay || 1; // Default to Monday (1)

        // Find the most recent occurrence of startDayOfWeek (on or before referenceDate)
        const periodStart = this.getLastDayOfWeek(referenceDate, startDayOfWeek);
        const periodEnd = addDays(periodStart, 6); // 7-day period (inclusive)

        // Get week number for description
        const weekNumber = this.getWeekNumber(periodStart);
        const year = periodStart.getFullYear();

        return {
            start: startOfDay(periodStart),
            end: endOfDay(periodEnd),
            type: 'WEEKLY',
            description: `Week ${weekNumber}, ${year}`,
        };
    }

    /**
     * Calculate monthly billing period
     * Period starts on billingPeriodStartDay and ends on last day of month
     */
    private static calculateMonthlyPeriod(customer: ClientKYC, referenceDate: Date): BillingPeriod {
        const startDay = customer.billingPeriodStartDay || 1; // Default to 1st of month
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        // Calculate period start
        let periodStart: Date;
        const daysInMonth = endOfMonth(referenceDate).getDate();

        // Handle case where startDay exceeds days in month (e.g., day 31 in February)
        const effectiveStartDay = Math.min(startDay, daysInMonth);
        periodStart = new Date(year, month, effectiveStartDay);

        // If reference date is before the start day of this month, use previous month
        if (referenceDate < periodStart) {
            const previousMonth = addDays(startOfMonth(referenceDate), -1);
            const prevMonthDaysInMonth = endOfMonth(previousMonth).getDate();
            const prevEffectiveStartDay = Math.min(startDay, prevMonthDaysInMonth);
            periodStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), prevEffectiveStartDay);
        }

        const periodEnd = endOfMonth(periodStart);

        // Format month name for description
        const monthName = periodStart.toLocaleString('default', { month: 'long' });
        const periodYear = periodStart.getFullYear();

        return {
            start: startOfDay(periodStart),
            end: endOfDay(periodEnd),
            type: 'MONTHLY',
            description: `${monthName} ${periodYear}`,
        };
    }

    /**
     * Get the last occurrence of a specific day of week (on or before the given date)
     * @param date - Reference date
     * @param targetDayOfWeek - 1 = Monday, 7 = Sunday
     */
    private static getLastDayOfWeek(date: Date, targetDayOfWeek: number): Date {
        const currentDayOfWeek = date.getDay();
        // Convert Sunday (0) to 7 for easier calculation
        const currentDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
        const target = targetDayOfWeek;

        let daysToSubtract = currentDay - target;
        if (daysToSubtract < 0) {
            daysToSubtract += 7;
        }

        return addDays(date, -daysToSubtract);
    }

    /**
     * Get ISO week number
     */
    private static getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = differenceInDays(date, firstDayOfYear);
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
}
