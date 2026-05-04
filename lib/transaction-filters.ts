import { Prisma, TransactionStatus } from "@prisma/client";

export const TRANSACTION_PAGE_SIZE_OPTIONS = [10, 25, 50];

export type TransactionFilterParams = {
  q?: string | string[];
  status?: string | string[];
  doctorId?: string | string[];
  serviceId?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function toStatusFilter(value?: string) {
  if (value === TransactionStatus.LUNAS) return TransactionStatus.LUNAS;
  if (value === TransactionStatus.BELUM_LUNAS) return TransactionStatus.BELUM_LUNAS;
  if (value === TransactionStatus.BATAL) return TransactionStatus.BATAL;

  return null;
}

export function toPage(value?: string) {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

export function toPageSize(value?: string) {
  const pageSize = Number(value);
  if (TRANSACTION_PAGE_SIZE_OPTIONS.includes(pageSize)) return pageSize;
  return 10;
}

function toDateStart(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDateEnd(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

export function parseTransactionFilters(params?: TransactionFilterParams) {
  const searchQuery = getParam(params?.q).trim();
  const statusFilter = toStatusFilter(getParam(params?.status));
  const doctorFilter = getParam(params?.doctorId);
  const serviceFilter = getParam(params?.serviceId);
  const dateFrom = getParam(params?.dateFrom);
  const dateTo = getParam(params?.dateTo);
  const page = toPage(getParam(params?.page));
  const pageSize = toPageSize(getParam(params?.pageSize));
  const where: Prisma.TransactionWhereInput = {};

  if (searchQuery) {
    where.OR = [
      {
        code: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      {
        patientName: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      {
        service: {
          name: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      },
      {
        doctor: {
          name: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (doctorFilter) {
    where.doctorId = doctorFilter;
  }

  if (serviceFilter) {
    where.serviceId = serviceFilter;
  }

  const startDate = toDateStart(dateFrom);
  const endDate = toDateEnd(dateTo);
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  return {
    searchQuery,
    statusFilter,
    doctorFilter,
    serviceFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    where,
  };
}

export function appendTransactionFilterParams(
  params: URLSearchParams,
  filters: ReturnType<typeof parseTransactionFilters>
) {
  if (filters.searchQuery) params.set("q", filters.searchQuery);
  if (filters.statusFilter) params.set("status", filters.statusFilter);
  if (filters.doctorFilter) params.set("doctorId", filters.doctorFilter);
  if (filters.serviceFilter) params.set("serviceId", filters.serviceFilter);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
}
