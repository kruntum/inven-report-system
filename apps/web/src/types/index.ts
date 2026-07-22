export interface Company {
  id: string;
  companyTypeId: number;
  name: string;
  taxId: string;
  houseNo: string;
  soi?: string | null;
  road?: string | null;
  subDistrict: string;
  district: string;
  province: string;
  zipcode: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  authorizedPerson?: string | null;
  authorizedPosition?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface User {
  id: string;
  companyId?: string | null;
  companyIds?: string[];
  roleId: number;
  username: string;
  fullName: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Product {
  id: string;
  name: string;
  baseUnitId: number;
  baseUnitName?: string; // Joined field
  createdAt?: string;
  deletedAt?: string | null;
}

export interface StorageLocation {
  id: string;
  companyId: string;
  name: string;
  address: string;
  createdAt?: string;
  deletedAt?: string | null;
}

export interface Partner {
  id: string;
  companyId: string;
  name: string;
  partnerTypeId: number;
  partnerTypeName?: string; // Joined field
  regNo?: string | null;
  address?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

export interface StockTransaction {
  id: string;
  companyId: string;
  storageId: string;
  storageName?: string; // Joined field
  productId: string;
  productName?: string; // Joined field
  baseUnitName?: string; // Joined field
  transactionTypeId: number;
  transactionTypeName?: string; // Joined field
  transactionDate: string;
  quantity: string;
  unitPrice?: string | null;
  documentId?: string | null;
  partnerId?: string | null;
  partnerName?: string | null; // Joined field
  sourcePartnerId?: string | null;
  sourcePartnerName?: string | null; // Joined field
  saleType?: string | null; // 'domestic' | 'export'
  destinationCountry?: string | null;
  invoiceNo?: string | null;
  containerNo?: string | null;
  productionType?: string | null;
  grossWeight?: string | null;
  netWeight?: string | null;
  unit?: string | null;
  pricingType?: string | null; // 'per_unit' | 'per_weight'
  remarks?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

export interface MonthlyReport {
  id: string;
  companyId: string;
  productId: string;
  productName?: string; // Joined field
  storageId?: string | null;
  storageName?: string | null; // Joined field
  reportMonth: number;
  reportYear: number;
  totalPurchaseQty?: string | null;
  avgPurchasePrice?: string | null;
  totalSalesQty?: string | null;
  avgSalesPrice?: string | null;
  totalSalesDomesticQty?: string | null;
  avgSalesDomesticPrice?: string | null;
  totalSalesExportQty?: string | null;
  avgSalesExportPrice?: string | null;
  totalUsageQty?: string | null;
  endingBalanceQty: string;
  partnerDetailsJson?: string | null;
  remarks?: string | null;
  statusId: number;
  statusName?: string;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  
  // Joined Company Info
  companyName?: string;
  companyTaxId?: string;
  companyHouseNo?: string;
  companySoi?: string | null;
  companyRoad?: string | null;
  companySubDistrict?: string;
  companyDistrict?: string;
  companyProvince?: string;
  companyZipcode?: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
}
