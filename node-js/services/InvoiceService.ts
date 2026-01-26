import { InvoiceStatus, Invoice, Prisma } from '@prisma/client';
import prisma from '../client';
import { generateUniqueNumber } from '../utils/id.utils';
import SageService, { InvoiceUpsertRequest, InvoiceCancelRequest } from './SageService';
import config from '../config';
import { UserContext, applyRoleBasedInvoiceFilters } from '../utils/userContext';
import { Permission, OrganizationType, Role } from '../constants/rbac';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ExternalServiceError,
} from '../utils/error.util';

export type CreateInvoiceInput = {
  flightId: bigint | number | string;
  issueDate: Date;
  dueDate?: Date;
  status?: InvoiceStatus;

  // Customer info
  clientName: string;
  clientAddress?: string;

  // Flight / FIR metadata (F–P)
  mapHtml?: string;
  flightNumber?: string;
  originIcao?: string;
  destinationIcao?: string;
  originIata?: string;
  destinationIata?: string;
  registrationNumber?: string;
  aircraftModelName?: string;
  act?: string; // Aircraft Type ICAO code
  modeSHex?: string; // Mode S hex code (ICAO 24-bit address)
  alic?: string; // Aircraft License ICAO code
  flightDate?: Date;
  firName?: string;
  firCountry?: string;
  firEntryTimeUtc?: Date;
  firExitTimeUtc?: Date;

  // Fee breakdown / FX (Q–V)
  feeDescription?: string;
  feeAmount?: number;
  otherFeesAmount?: number;
  totalOriginalAmount?: number;
  originalCurrency?: string;
  fxRate?: number;
  totalUsdAmount?: number;

  // Presentation (W–X)
  qrCodeData?: string;
  logoKey?: string;
};

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export type GetInvoicesQuery = {
  page?: string;
  limit?: string;
  search?: string;
  status?: InvoiceStatus | 'OVERDUE';
  flightId?: string;

  // New filters
  operator?: string | string[]; // clientName
  fir?: string | string[]; // firCountry
  dateFrom?: string; // ISO string, issueDate >= dateFrom
  dateTo?: string; // ISO string, issueDate <= dateTo
};

export type InvoiceListResponse = {
  data: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
};

export type InvoiceAnalyticsQuery = {
  dateFrom?: string;
  dateTo?: string;
  operator?: string | string[];
  fir?: string | string[];
};

export type InvoiceAnalyticsResponse = {
  metrics: {
    totalInvoices: number;
    totalAmountUsd: number;
    statusCounts: {
      PAID: number;
      PENDING: number;
      OVERDUE: number;
      DRAFT: number;
      CANCELLED: number;
    };
  };
  firChart: { label: string; value: number }[];
  operatorChart: { label: string; value: number }[];
  completionByFir: { label: string; paidPct: number; averageDays: number }[];
  completionByOperator: { label: string; paidPct: number; averageDays: number }[];
};

export type InvoiceFiltersResponse = {
  operators: { name: string }[];
  firs: { name: string }[];
};

// Normalize query params that can be string, string[] or comma-separated values
function normalizeStringFilter(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  const split = values
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return split.length ? split : undefined;
}

// Helper function to serialize BigInt values to strings for JSON responses
function serializeInvoice(invoice: Invoice): Omit<Invoice, 'flightId'> & { flightId: string } {
  return {
    ...invoice,
    flightId: invoice.flightId.toString(),
  };
}

function serializeInvoices(
  invoices: Invoice[],
): Array<Omit<Invoice, 'flightId'> & { flightId: string }> {
  return invoices.map(serializeInvoice);
}

export class InvoiceService {
  async create(data: CreateInvoiceInput): Promise<Invoice> {
    const invoiceNumber = generateUniqueNumber('INV');

    // Convert flightId to BigInt (required field)
    const asBigInt =
      typeof data.flightId === 'bigint' ? data.flightId : BigInt(data.flightId as number | string);

    const invoiceData: Prisma.InvoiceCreateInput = {
      invoiceNumber,
      issueDate: data.issueDate,
      status: data.status || InvoiceStatus.DRAFT,
      clientName: data.clientName,
      flightId: asBigInt,
    };

    if (data.dueDate) {
      invoiceData.dueDate = data.dueDate;
    }
    if (data.clientAddress) {
      invoiceData.clientAddress = data.clientAddress;
    }

    // Flight / FIR metadata (F–P)
    if (data.mapHtml) invoiceData.mapHtml = data.mapHtml;
    if (data.flightNumber) invoiceData.flightNumber = data.flightNumber;
    if (data.originIcao) invoiceData.originIcao = data.originIcao;
    if (data.destinationIcao) invoiceData.destinationIcao = data.destinationIcao;
    if (data.originIata) invoiceData.originIata = data.originIata;
    if (data.destinationIata) invoiceData.destinationIata = data.destinationIata;
    if (data.registrationNumber) invoiceData.registrationNumber = data.registrationNumber;
    if (data.aircraftModelName) invoiceData.aircraftModelName = data.aircraftModelName;
    if (data.act) invoiceData.act = data.act;
    if (data.modeSHex) invoiceData.modeSHex = data.modeSHex;
    if (data.alic) invoiceData.alic = data.alic;
    if (data.flightDate) invoiceData.flightDate = data.flightDate;
    if (data.firName) invoiceData.firName = data.firName;
    if (data.firCountry) invoiceData.firCountry = data.firCountry;
    if (data.firEntryTimeUtc) invoiceData.firEntryTimeUtc = data.firEntryTimeUtc;
    if (data.firExitTimeUtc) invoiceData.firExitTimeUtc = data.firExitTimeUtc;

    // Fee breakdown / FX (Q–V)
    if (data.feeDescription) invoiceData.feeDescription = data.feeDescription;
    if (data.feeAmount !== undefined) invoiceData.feeAmount = data.feeAmount;
    if (data.otherFeesAmount !== undefined) invoiceData.otherFeesAmount = data.otherFeesAmount;
    if (data.totalOriginalAmount !== undefined)
      invoiceData.totalOriginalAmount = data.totalOriginalAmount;
    if (data.originalCurrency) invoiceData.originalCurrency = data.originalCurrency;
    if (data.fxRate !== undefined) invoiceData.fxRate = data.fxRate;
    if (data.totalUsdAmount !== undefined) invoiceData.totalUsdAmount = data.totalUsdAmount;

    // Presentation (W–X)
    if (data.qrCodeData) invoiceData.qrCodeData = data.qrCodeData;
    if (data.logoKey) invoiceData.logoKey = data.logoKey;

    const invoice = await prisma.invoice.create({
      data: invoiceData,
    });

    return serializeInvoice(invoice) as unknown as Invoice;
  }

  async getAll(query: GetInvoicesQuery, userContext?: UserContext): Promise<InvoiceListResponse> {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
      flightId,
      operator,
      fir,
      dateFrom,
      dateTo,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let where: Prisma.InvoiceWhereInput = {};

    // Apply role-based filters FIRST (before user-provided filters)
    if (userContext) {
      where = applyRoleBasedInvoiceFilters(where, userContext);
    }

    if (search) {
      const searchConditions: Prisma.InvoiceWhereInput[] = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { flightNumber: { contains: search, mode: 'insensitive' } },
      ];

      // If search is numeric, also search by flightId
      if (!isNaN(Number(search))) {
        try {
          searchConditions.push({ flightId: { equals: BigInt(search) } });
        } catch {
          // Invalid BigInt, skip
        }
      }

      where.OR = searchConditions;
    }

    // Filter by flightId if provided
    if (flightId) {
      try {
        where.flightId = { equals: BigInt(flightId) };
      } catch {
        // Invalid flightId format, ignore filter
      }
    }

    // Filter by operator (clientName) - but respect role-based scoping
    const operators = normalizeStringFilter(operator);
    if (operators && operators.length) {
      // If user is already scoped to specific operator, intersect
      if (
        userContext?.organizationType === OrganizationType.OPERATOR &&
        userContext.assignedOperator
      ) {
        // Only allow filtering by operator the user has access to
        const allowedOperators = operators.filter((op) => op === userContext.assignedOperator);
        if (allowedOperators.length === 0) {
          // No matching operators - return empty
          where = { ...where, id: -1 };
        } else {
          where.clientName = allowedOperators[0];
        }
      } else {
        // User can see all operators, apply filter normally
        where.clientName = operators.length === 1 ? operators[0] : { in: operators };
      }
    }

    // Filter by FIR - but respect role-based scoping
    const firs = normalizeStringFilter(fir);
    if (firs && firs.length) {
      // If user is already scoped to specific FIR country, intersect
      if (userContext?.organizationType === OrganizationType.FIR_OWNER && userContext.assignedFIR) {
        // Only allow filtering by FIR country the user has access to
        const allowedFIRs = firs.filter((firCountry) => firCountry === userContext.assignedFIR);
        if (allowedFIRs.length === 0) {
          // No matching FIR countries - return empty
          where = { ...where, id: -1 };
        } else {
          // Merge with existing FIR filter from role-based scoping
          if (where.AND) {
            const existingAnd = Array.isArray(where.AND) ? where.AND : [where.AND];
            const existingFirFilter = existingAnd.find(
              (condition): condition is Prisma.InvoiceWhereInput & { firCountry: unknown } =>
                typeof condition === 'object' && condition !== null && 'firCountry' in condition,
            );
            if (existingFirFilter) {
              // Already filtered by assignedFIR country, just ensure it matches
              if (existingFirFilter.firCountry !== allowedFIRs[0]) {
                where = { ...where, id: -1 };
              }
            }
          }
        }
      } else {
        // User can see all FIRs, apply filter normally (use firCountry for filtering)
        where.firCountry = firs.length === 1 ? firs[0] : { in: firs };
      }
    }

    // Date range on issueDate
    if (dateFrom || dateTo) {
      const issueDateFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) {
          issueDateFilter.gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) {
          issueDateFilter.lte = to;
        }
      }
      if (Object.keys(issueDateFilter).length > 0) {
        where.issueDate = issueDateFilter;
      }
    }

    // Handle status filter (but respect overdue-only restriction)
    if (status) {
      // If user can only view overdue, ignore other status filters
      if (userContext?.permissions.includes(Permission.INVOICE_VIEW_OVERDUE_ONLY)) {
        // Filter for overdue invoices only (status = OVERDUE in database)
        where.status = InvoiceStatus.OVERDUE;
      } else if (status === 'OVERDUE') {
        // Filter by OVERDUE status directly from database
        where.status = InvoiceStatus.OVERDUE;
      } else {
        where.status = status as InvoiceStatus;
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Return invoices as-is from database (no status modification based on dates)
    const processedInvoices = serializeInvoices(invoices);

    return {
      data: processedInvoices as unknown as Invoice[],
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  async getAnalytics(
    query: InvoiceAnalyticsQuery,
    userContext?: UserContext,
  ): Promise<InvoiceAnalyticsResponse> {
    const { dateFrom, dateTo, operator, fir } = query;

    // Build a single base filter used consistently across all aggregations
    let where: Prisma.InvoiceWhereInput = {};

    // Apply role-based filters FIRST
    if (userContext) {
      where = applyRoleBasedInvoiceFilters(where, userContext);
    }

    // Operators (clientName) - respect role-based scoping
    // SUPER_ADMIN can filter by any operator
    const operators = normalizeStringFilter(operator);
    if (operators && operators.length) {
      // SUPER_ADMIN can access all operators
      if (userContext?.role === Role.SUPER_ADMIN) {
        where.clientName = operators.length === 1 ? operators[0] : { in: operators };
      } else if (userContext?.organizationType === 'OPERATOR' && userContext.assignedOperator) {
        // Only allow filtering by the assigned operator
        const allowedOperators = operators.filter((op) => op === userContext.assignedOperator);
        if (allowedOperators.length === 0) {
          where = { ...where, id: -1 };
        } else {
          where.clientName = allowedOperators[0];
        }
      } else {
        // DAVINCI roles can filter by any operator
        where.clientName = operators.length === 1 ? operators[0] : { in: operators };
      }
    }

    // FIR countries (firCountry) - respect role-based scoping
    const firs = normalizeStringFilter(fir);
    if (firs && firs.length) {
      // SUPER_ADMIN can access all FIRs
      if (userContext?.role === Role.SUPER_ADMIN) {
        where.firCountry = firs.length === 1 ? firs[0] : { in: firs };
      } else if (userContext?.organizationType === 'FIR_OWNER' && userContext.assignedFIR) {
        // FIR_OWNER users are already filtered by assignedFIR in role-based filters
        // They can only filter by their assigned FIR's country if it matches
        // For now, we'll let the role-based filter handle it
        // Additional country filter would further restrict, but since they're already scoped, we can allow it
        where.firCountry = firs.length === 1 ? firs[0] : { in: firs };
      } else {
        // DAVINCI roles can filter by any country
        where.firCountry = firs.length === 1 ? firs[0] : { in: firs };
      }
    }

    // Date range on issueDate
    if (dateFrom || dateTo) {
      const issueDateFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) {
          issueDateFilter.gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) {
          issueDateFilter.lte = to;
        }
      }
      if (Object.keys(issueDateFilter).length > 0) {
        where.issueDate = issueDateFilter;
      }
    }

    // Pull the minimal data set once and compute analytics in memory to ensure
    // all metrics/charts/tables use the exact same filtered set.
    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        status: true,
        totalUsdAmount: true,
        firCountry: true,
        clientName: true,
        issueDate: true,
        dueDate: true,
      },
    });

    const totalInvoices = invoices.length;
    const totalAmountUsd = invoices.reduce((sum, inv) => sum + (inv.totalUsdAmount ?? 0), 0) || 0;

    // Status counts - only use status from database, no date checking
    let paid = 0;
    let pending = 0;
    let draft = 0;
    let cancelled = 0;
    let overdue = 0;

    for (const inv of invoices) {
      switch (inv.status) {
        case 'PAID':
          paid++;
          break;
        case 'PENDING':
          pending++;
          break;
        case 'DRAFT':
          draft++;
          break;
        case 'CANCELLED':
          cancelled++;
          break;
        case 'OVERDUE':
          overdue++;
          break;
        default:
          break;
      }
    }

    const metrics: InvoiceAnalyticsResponse['metrics'] = {
      totalInvoices,
      totalAmountUsd,
      statusCounts: {
        PAID: paid,
        PENDING: pending,
        OVERDUE: overdue,
        DRAFT: draft,
        CANCELLED: cancelled,
      },
    };

    // Group helpers
    const firMap = new Map<
      string,
      { count: number; paidCount: number; totalDays: number; paidWithDays: number }
    >();
    const operatorMap = new Map<
      string,
      { count: number; paidCount: number; totalDays: number; paidWithDays: number }
    >();

    const msPerDay = 1000 * 60 * 60 * 24;

    for (const inv of invoices) {
      const firLabel = inv.firCountry || 'Unknown';
      const opLabel = inv.clientName || 'Unknown';

      // Compute completion days for this invoice:
      // use (dueDate - issueDate) in days when both are available and dueDate >= issueDate.
      let days: number | null = null;
      if (inv.dueDate && inv.issueDate) {
        const diffMs = inv.dueDate.getTime() - inv.issueDate.getTime();
        if (!Number.isNaN(diffMs)) {
          days = diffMs / msPerDay;
        }
      }

      // FIR aggregation
      const firEntry = firMap.get(firLabel) || {
        count: 0,
        paidCount: 0,
        totalDays: 0,
        paidWithDays: 0,
      };
      firEntry.count++;
      if (inv.status === 'PAID') {
        firEntry.paidCount++;
        if (days !== null) {
          firEntry.totalDays += days;
          firEntry.paidWithDays++;
        }
      }
      firMap.set(firLabel, firEntry);

      // Operator aggregation
      const opEntry = operatorMap.get(opLabel) || {
        count: 0,
        paidCount: 0,
        totalDays: 0,
        paidWithDays: 0,
      };
      opEntry.count++;
      if (inv.status === 'PAID') {
        opEntry.paidCount++;
        if (days !== null) {
          opEntry.totalDays += days;
          opEntry.paidWithDays++;
        }
      }
      operatorMap.set(opLabel, opEntry);
    }

    // Charts: top 8 by invoice count after filters, sorted desc
    const firSorted = Array.from(firMap.entries())
      .map(([label, data]) => ({ label, value: data.count }))
      .sort((a, b) => b.value - a.value);
    const firTop8 = firSorted.slice(0, 8);
    const firRemaining = firSorted.slice(8);
    const firOthersCount = firRemaining.reduce((sum, item) => sum + item.value, 0);
    const firChart =
      firOthersCount > 0 ? [...firTop8, { label: 'Others', value: firOthersCount }] : firTop8;

    const operatorSorted = Array.from(operatorMap.entries())
      .map(([label, data]) => ({ label, value: data.count }))
      .sort((a, b) => b.value - a.value);
    const operatorTop8 = operatorSorted.slice(0, 8);
    const operatorRemaining = operatorSorted.slice(8);
    const operatorOthersCount = operatorRemaining.reduce((sum, item) => sum + item.value, 0);
    const operatorChart =
      operatorOthersCount > 0
        ? [...operatorTop8, { label: 'Others', value: operatorOthersCount }]
        : operatorTop8;

    // Completion tables: all FIRs/operators with paidPct and averageDays
    const completionByFir = Array.from(firMap.entries()).map(([label, data]) => {
      const paidPct = data.count > 0 ? Math.round((data.paidCount / data.count) * 100) : 0;
      const averageDays = data.paidWithDays > 0 ? data.totalDays / data.paidWithDays : 0;
      return { label, paidPct, averageDays };
    });

    const completionByOperator = Array.from(operatorMap.entries()).map(([label, data]) => {
      const paidPct = data.count > 0 ? Math.round((data.paidCount / data.count) * 100) : 0;
      const averageDays = data.paidWithDays > 0 ? data.totalDays / data.paidWithDays : 0;
      return { label, paidPct, averageDays };
    });

    return {
      metrics,
      firChart,
      operatorChart,
      completionByFir,
      completionByOperator,
    };
  }

  async getFilters(userContext?: UserContext): Promise<InvoiceFiltersResponse> {
    // For FIR_OWNER: Get operators that have invoices matching their FIR countryName
    // For OPERATOR: Get FIRs that have invoices matching their assigned operator
    // For SUPER_ADMIN and DAVINCI: Get all

    if (userContext?.organizationType === OrganizationType.FIR_OWNER && userContext.assignedFIR) {
      // FIR owners: Get operators from invoices matching their FIR countryName
      // FIRs should be based on their assigned FIR (not empty)
      const operatorRows = await prisma.invoice.findMany({
        where: {
          firCountry: userContext.assignedFIR,
        },
        distinct: ['clientName'],
        select: { clientName: true },
        orderBy: {
          clientName: 'asc',
        },
      });

      const operators = operatorRows
        .map((row) => row.clientName)
        .filter((name): name is string => !!name)
        .map((name) => ({ name }));

      // FIR owners get their assigned FIR country
      const firs = [{ name: userContext.assignedFIR }];

      return { operators, firs };
    }

    if (
      userContext?.organizationType === OrganizationType.OPERATOR &&
      userContext.assignedOperator
    ) {
      // Operators: Empty operators array, get FIRs from invoices matching their operator
      const firRows = await prisma.invoice.findMany({
        where: {
          clientName: userContext.assignedOperator,
        },
        distinct: ['firCountry'],
        select: { firCountry: true },
        orderBy: {
          firCountry: 'asc',
        },
      });

      const operators: { name: string }[] = []; // Empty array for operators

      const firs = firRows
        .map((row) => row.firCountry)
        .filter((name): name is string => !!name)
        .map((name) => ({ name }));

      return { operators, firs };
    }

    // SUPER_ADMIN and DAVINCI roles: Get all operators and FIRs
    const operatorRows = await prisma.invoice.findMany({
      distinct: ['clientName'],
      select: { clientName: true },
      orderBy: {
        clientName: 'asc',
      },
    });

    const firRows = await prisma.invoice.findMany({
      distinct: ['firCountry'],
      select: { firCountry: true },
      orderBy: {
        firCountry: 'asc',
      },
    });

    const operators = operatorRows
      .map((row) => row.clientName)
      .filter((name): name is string => !!name)
      .map((name) => ({ name }));

    const firs = firRows
      .map((row) => row.firCountry)
      .filter((name): name is string => !!name)
      .map((name) => ({ name }));

    return { operators, firs };
  }

  async getById(id: number | string): Promise<Invoice | null> {
    let whereClause;
    if (typeof id === 'string' && id.includes('INV-')) {
      whereClause = { invoiceNumber: id };
    } else {
      whereClause = { id: typeof id === 'string' ? parseInt(id) : id };
    }

    const invoice = await prisma.invoice.findUnique({
      where: whereClause,
    });

    return invoice ? (serializeInvoice(invoice) as unknown as Invoice) : null;
  }

  async getByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    return invoice ? (serializeInvoice(invoice) as unknown as Invoice) : null;
  }

  async update(
    id: number,
    data: UpdateInvoiceInput,
    userContext?: UserContext,
  ): Promise<Invoice | { data: Invoice; messages: string[] }> {
    // Check if user has permission to edit invoices
    if (userContext && !userContext.permissions.includes(Permission.INVOICE_EDIT)) {
      throw new ForbiddenError('You do not have permission to edit invoices');
    }

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice');
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    // Handle flightId update
    if (data.flightId !== undefined && data.flightId !== null) {
      const asBigInt =
        typeof data.flightId === 'bigint'
          ? data.flightId
          : BigInt(data.flightId as number | string);
      updateData.flightId = asBigInt;
    }

    if (data.issueDate !== undefined) {
      updateData.issueDate = data.issueDate;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    // Customer info
    if (data.clientName !== undefined) {
      updateData.clientName = data.clientName;
    }
    if (data.clientAddress !== undefined) {
      updateData.clientAddress = data.clientAddress;
    }

    // Flight / FIR metadata
    if (data.mapHtml !== undefined) {
      updateData.mapHtml = data.mapHtml;
    }
    if (data.flightNumber !== undefined) {
      updateData.flightNumber = data.flightNumber;
    }
    if (data.originIcao !== undefined) {
      updateData.originIcao = data.originIcao;
    }
    if (data.destinationIcao !== undefined) {
      updateData.destinationIcao = data.destinationIcao;
    }
    if (data.originIata !== undefined) {
      updateData.originIata = data.originIata;
    }
    if (data.destinationIata !== undefined) {
      updateData.destinationIata = data.destinationIata;
    }
    if (data.registrationNumber !== undefined) {
      updateData.registrationNumber = data.registrationNumber;
    }
    if (data.aircraftModelName !== undefined) {
      updateData.aircraftModelName = data.aircraftModelName;
    }
    if (data.act !== undefined) {
      updateData.act = data.act;
    }
    if (data.modeSHex !== undefined) {
      updateData.modeSHex = data.modeSHex;
    }
    if (data.alic !== undefined) {
      updateData.alic = data.alic;
    }
    if (data.flightDate !== undefined) {
      updateData.flightDate = data.flightDate;
    }
    if (data.firName !== undefined) {
      updateData.firName = data.firName;
    }
    if (data.firCountry !== undefined) {
      updateData.firCountry = data.firCountry;
    }
    if (data.firEntryTimeUtc !== undefined) {
      updateData.firEntryTimeUtc = data.firEntryTimeUtc;
    }
    if (data.firExitTimeUtc !== undefined) {
      updateData.firExitTimeUtc = data.firExitTimeUtc;
    }

    // Fee breakdown / FX
    if (data.feeDescription !== undefined) {
      updateData.feeDescription = data.feeDescription;
    }
    if (data.feeAmount !== undefined) {
      updateData.feeAmount = data.feeAmount;
    }
    if (data.otherFeesAmount !== undefined) {
      updateData.otherFeesAmount = data.otherFeesAmount;
    }
    if (data.totalOriginalAmount !== undefined) {
      updateData.totalOriginalAmount = data.totalOriginalAmount;
    }
    if (data.originalCurrency !== undefined) {
      updateData.originalCurrency = data.originalCurrency;
    }
    if (data.fxRate !== undefined) {
      updateData.fxRate = data.fxRate;
    }
    if (data.totalUsdAmount !== undefined) {
      updateData.totalUsdAmount = data.totalUsdAmount;
    }

    // Presentation
    if (data.qrCodeData !== undefined) {
      updateData.qrCodeData = data.qrCodeData;
    }
    if (data.logoKey !== undefined) {
      updateData.logoKey = data.logoKey;
    }

    const messages: string[] = [];

    // Prepare updated invoice data for Sage sync (merge existing with updates)
    // We need to sync to Sage FIRST before updating the database
    // Create a copy of existing invoice and apply updates
    const updatedInvoiceData = { ...existingInvoice } as Invoice;
    
    // Apply all updates from data to the invoice copy
    if (data.issueDate !== undefined) updatedInvoiceData.issueDate = data.issueDate;
    if (data.dueDate !== undefined) updatedInvoiceData.dueDate = data.dueDate;
    if (data.status !== undefined) updatedInvoiceData.status = data.status;
    if (data.clientName !== undefined) updatedInvoiceData.clientName = data.clientName;
    if (data.clientAddress !== undefined) updatedInvoiceData.clientAddress = data.clientAddress;
    if (data.mapHtml !== undefined) updatedInvoiceData.mapHtml = data.mapHtml;
    if (data.flightNumber !== undefined) updatedInvoiceData.flightNumber = data.flightNumber;
    if (data.originIcao !== undefined) updatedInvoiceData.originIcao = data.originIcao;
    if (data.destinationIcao !== undefined) updatedInvoiceData.destinationIcao = data.destinationIcao;
    if (data.originIata !== undefined) updatedInvoiceData.originIata = data.originIata;
    if (data.destinationIata !== undefined) updatedInvoiceData.destinationIata = data.destinationIata;
    if (data.registrationNumber !== undefined) updatedInvoiceData.registrationNumber = data.registrationNumber;
    if (data.aircraftModelName !== undefined) updatedInvoiceData.aircraftModelName = data.aircraftModelName;
    if (data.act !== undefined) updatedInvoiceData.act = data.act;
    if (data.modeSHex !== undefined) updatedInvoiceData.modeSHex = data.modeSHex;
    if (data.alic !== undefined) updatedInvoiceData.alic = data.alic;
    if (data.flightDate !== undefined) updatedInvoiceData.flightDate = data.flightDate;
    if (data.firName !== undefined) updatedInvoiceData.firName = data.firName;
    if (data.firCountry !== undefined) updatedInvoiceData.firCountry = data.firCountry;
    if (data.firEntryTimeUtc !== undefined) updatedInvoiceData.firEntryTimeUtc = data.firEntryTimeUtc;
    if (data.firExitTimeUtc !== undefined) updatedInvoiceData.firExitTimeUtc = data.firExitTimeUtc;
    if (data.feeDescription !== undefined) updatedInvoiceData.feeDescription = data.feeDescription;
    if (data.feeAmount !== undefined) updatedInvoiceData.feeAmount = data.feeAmount;
    if (data.otherFeesAmount !== undefined) updatedInvoiceData.otherFeesAmount = data.otherFeesAmount;
    if (data.totalOriginalAmount !== undefined) updatedInvoiceData.totalOriginalAmount = data.totalOriginalAmount;
    if (data.originalCurrency !== undefined) updatedInvoiceData.originalCurrency = data.originalCurrency;
    if (data.fxRate !== undefined) updatedInvoiceData.fxRate = data.fxRate;
    if (data.totalUsdAmount !== undefined) updatedInvoiceData.totalUsdAmount = data.totalUsdAmount;
    if (data.qrCodeData !== undefined) updatedInvoiceData.qrCodeData = data.qrCodeData;
    if (data.logoKey !== undefined) updatedInvoiceData.logoKey = data.logoKey;
    // Handle flightId conversion if it was updated
    if (data.flightId !== undefined) {
      updatedInvoiceData.flightId =
        typeof data.flightId === 'bigint'
          ? data.flightId
          : BigInt(data.flightId as number | string);
    }

    // If invoice is not in DRAFT or CANCELLED status, sync to Sage FIRST before updating database
    // Note: Status updates should use updateInvoiceStatus service instead
    if (
      updatedInvoiceData.status !== InvoiceStatus.DRAFT &&
      updatedInvoiceData.status !== InvoiceStatus.CANCELLED
    ) {
      try {
        // Sync updated invoice data to Sage with status code 6 BEFORE updating database
        // If this fails, we won't update the database
        await this.syncToSage(updatedInvoiceData, 6);
        messages.push('Invoice data synced to Sage successfully');
      } catch (error: unknown) {
        // If Sage sync fails, throw error to prevent database update
        console.error(`Failed to sync Invoice ${id} to Sage:`, error);
        
        // Re-throw ExternalServiceError as-is (error handler will clean it)
        if (error instanceof ExternalServiceError) {
          throw error;
        }
        
        // For other errors, wrap in ExternalServiceError
        const errorMsg =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Unable to update invoice in Sage';
        throw new ExternalServiceError('Sage', errorMsg);
      }
    }

    // Only update the invoice in database if Sage operation succeeded (or if invoice is DRAFT/CANCELLED)
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    // Check if invoice is part of any PENDING consolidated invoice and update it
    if (invoice.includedInConsolidatedInvoiceId) {
      try {
        const { default: ConsolidatedInvoiceGenerationService } =
          await import('./ConsolidatedInvoiceGenerationService');
        const generationService = new ConsolidatedInvoiceGenerationService();
        await generationService.recalculateConsolidatedInvoiceTotals(
          invoice.includedInConsolidatedInvoiceId,
        );

        // Update line item snapshot
        await prisma.consolidatedInvoiceLineItem.updateMany({
          where: {
            consolidatedInvoiceId: invoice.includedInConsolidatedInvoiceId,
            invoiceId: id,
          },
          data: {
            invoiceNumber: invoice.invoiceNumber,
            act: invoice.act || null,
            date: invoice.flightDate || invoice.issueDate,
            time: invoice.flightDate ? this.formatTime(invoice.flightDate) : null,
            url: this.buildInvoiceUrl(invoice.invoiceNumber),
            totalUsd: invoice.totalUsdAmount || 0,
          },
        });
      } catch (error) {
        // Log error but don't fail the invoice update
        console.error('Failed to update consolidated invoice:', error);
      }
    }

    // Return data with messages if status changed, otherwise just return invoice
    if (messages.length > 0) {
      return { data: serializeInvoice(invoice) as unknown as Invoice, messages };
    }

    return serializeInvoice(invoice) as unknown as Invoice;
  }

  /**
   * Format time from DateTime to string (HH:MM UTC)
   */
  private formatTime(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  }

  /**
   * Build invoice URL using the same method as invoice QR codes
   */
  private buildInvoiceUrl(invoiceNumber: string): string {
    const frontendUrl = config.pdf.frontendUrl || 'http://3.149.228.113:4173';
    return `${frontendUrl}/dashboard/invoices/${invoiceNumber}`;
  }

  async getByFlightId(flightId: string | number | bigint): Promise<Invoice[]> {
    try {
      const flightIdBigInt = typeof flightId === 'bigint' ? flightId : BigInt(flightId);
      const invoices = await prisma.invoice.findMany({
        where: { flightId: { equals: flightIdBigInt } },
        orderBy: { createdAt: 'desc' },
      });
      return serializeInvoices(invoices) as unknown as Invoice[];
    } catch {
      return [];
    }
  }

  async delete(id: number): Promise<void> {
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice');
    }

    await prisma.invoice.delete({
      where: { id },
    });
  }

  async updateInvoiceStatus(
    id: number,
    newStatus: InvoiceStatus,
  ): Promise<{ data: Invoice; messages: string[] }> {
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice');
    }

    const currentStatus = existingInvoice.status;

    // ✅ STRICT VALIDATION: Check if status transition is allowed
    const isValidTransition = this.validateStatusTransition(currentStatus, newStatus);

    if (!isValidTransition) {
      throw new ValidationError(
        `Invalid status transition. Cannot change invoice status from ${currentStatus} to ${newStatus}.`,
      );
    }

    const messages: string[] = [];

    // If status changed from DRAFT to PENDING, sync to Sage FIRST before updating status
    if (currentStatus === InvoiceStatus.DRAFT && newStatus === InvoiceStatus.PENDING) {
      try {
        // Sync to Sage before updating status - if this fails, we won't update the status
        await this.syncToSage(existingInvoice);
        messages.push('Sage invoice created successfully');
      } catch (error: unknown) {
        // If Sage sync fails, throw error to prevent status update
        console.error(`Failed to sync Invoice ${id} to Sage:`, error);
        
        // Re-throw ExternalServiceError as-is (error handler will clean it)
        if (error instanceof ExternalServiceError) {
          throw error;
        }
        
        // For other errors, wrap in ExternalServiceError
        const errorMsg =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Unable to update invoice status in Sage';
        throw new ExternalServiceError('Sage', errorMsg);
      }
    }

    // If status changed from PENDING to CANCELLED, cancel in Sage FIRST before updating status
    if (currentStatus === InvoiceStatus.PENDING && newStatus === InvoiceStatus.CANCELLED) {
      try {
        // Cancel in Sage before updating status - if this fails, we won't update the status
        await this.cancelInSage(existingInvoice);
        messages.push('Sage invoice cancelled successfully');
      } catch (error: unknown) {
        // If Sage cancellation fails, throw error to prevent status update
        console.error(`Failed to cancel Invoice ${id} in Sage:`, error);
        
        // Re-throw ExternalServiceError as-is (error handler will clean it)
        if (error instanceof ExternalServiceError) {
          throw error;
        }
        
        // For other errors, wrap in ExternalServiceError
        const errorMsg =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Unable to cancel invoice in Sage';
        throw new ExternalServiceError('Sage', errorMsg);
      }
    }

    // Only update the invoice status if Sage operation succeeded (or if not a transition that requires Sage)
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    // Add status update message
    messages.push(`Status updated from ${currentStatus} to ${newStatus}`);

    return { data: serializeInvoice(invoice) as unknown as Invoice, messages };
  }

  /**
   * Sync invoice data to Sage when status changes from DRAFT to PENDING
   * @param invoice - The invoice to sync
   * @param statusId - The status code to use (default: 3 for PENDING)
   */
  private async syncToSage(invoice: Invoice, statusId: number = 3): Promise<void> {
    // Calculate totals
    const totExcl = invoice.totalUsdAmount || 0;
    const totTax = 0.0;
    const totIncl = totExcl + totTax;
    const currency = 'USD';
    const fxRate = 3.67;

    // Construct invoice URL
    const frontendUrl = config.pdf.frontendUrl || 'http://3.149.228.113:4173';
    const invUrl = `${frontendUrl}/dashboard/invoices/${invoice.invoiceNumber}`;

    // Build route from invoice data
    const route =
      invoice.originIcao || invoice.originIata || invoice.destinationIcao || invoice.destinationIata
        ? {
            origin: {
              icao: invoice.originIcao || '',
              iata: invoice.originIata || '',
            },
            destination: {
              icao: invoice.destinationIcao || '',
              iata: invoice.destinationIata || '',
            },
          }
        : undefined;

    // Build line item with optional route
    const lineItem: {
      description: string;
      accntCode: string;
      qty: number;
      rate: number;
      totExcl: number;
      taxType: string;
      totTax: number;
      totIncl: number;
      route?: {
        origin: { icao: string; iata: string };
        destination: { icao: string; iata: string };
      };
    } = {
      description: invoice.flightNumber || 'Flight',
      accntCode: '2300-01-00-290-000', // Dummy value as requested
      qty: 1, // Dummy value as requested
      rate: 2000.0, // Dummy value as requested
      totExcl: totExcl, // Dummy value as requested
      taxType: 'TX4', // Dummy value as requested
      totTax: 0.0, // Dummy value as requested
      totIncl: totIncl, // Dummy value as requested
    };

    // Only include route if we have origin or destination data
    if (route) {
      lineItem.route = route;
    }

    // Map invoice to Sage invoice upsert format
    const sageInvoiceData: InvoiceUpsertRequest = {
      statusId: statusId,
      invoiceId: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : invoice.issueDate.toISOString(),
      total: {
        totExcl: totExcl,
        totTax: totTax,
        totIncl: totIncl,
        currency: currency,
        fxRate: fxRate,
      },
      customer: {
        customerId: 'PM104', // Dummy customer as requested
        customerName: 'Emirates Airlines', // Dummy customer as requested
        companyId: 'CON00', // Dummy customer as requested
      },
      notes: invoice.feeDescription || 'Optional free text.',
      invUrl: invUrl,
      lineItems: [lineItem],
    };

    // Call Sage invoice upsert
    await SageService.invoiceUpsert(sageInvoiceData);
  }

  /**
   * Cancel invoice in Sage when status changes from PENDING to CANCELLED
   */
  private async cancelInSage(invoice: Invoice): Promise<void> {
    // Build cancellation request data
    const cancelData: InvoiceCancelRequest = {
      statusId: 4,
      invoiceId: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      customer: {
        customerId: 'PM104', // Dummy customer as requested
        customerName: invoice.clientName || 'Emirate Airlines', // Use invoice client name or fallback
        companyId: 'CON00', // Dummy company as requested
      },
    };

    // Call Sage invoice cancel
    await SageService.invoiceCancel(cancelData);
  }

  private validateStatusTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
    // If status is the same, no change needed but it's valid
    if (from === to) {
      return true;
    }

    // Define allowed transitions
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: [InvoiceStatus.PENDING, InvoiceStatus.CANCELLED],
      PENDING: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
      OVERDUE: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      PAID: [], // Final state - no transitions allowed
      CANCELLED: [], // Final state - no transitions allowed
    };

    return allowedTransitions[from]?.includes(to) || false;
  }
}

export default new InvoiceService();
