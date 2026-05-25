import React, { useState, useMemo, useEffect } from 'react';
import { useWindowStore } from '../store/windowStore';
import { useDataStore } from '../store/dataStore';
import { RepairReceipt, RepairStatus } from '../types';
import { Plus, Search, FileText, Clock, CheckCircle, Truck, Eye, Edit2, Filter, ExternalLink } from 'lucide-react';
import { Pagination } from './ui/Pagination';
import { Select } from './ui/Select';
import { normalizeDateToPersian } from '../utils/dateUtils';

const ITEMS_PER_PAGE = 20;

export const RepairReceipts: React.FC = () => {
  const { openWindow } = useWindowStore();
  const { repairReceipts, invoices } = useDataStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepairStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to create new receipt
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openWindow('رسید تعمیرات جدید', 'REPAIR_RECEIPT_FORM');
        return;
      }

      // Focus search with Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredReceipts = useMemo(() => {
    return repairReceipts.filter(receipt => {
      const matchesSearch =
        receipt.customerName.includes(searchTerm) ||
        receipt.customerPhone.includes(searchTerm) ||
        receipt.deviceType.includes(searchTerm) ||
        receipt.receiptNumber.toString().includes(searchTerm);

      const matchesStatus = statusFilter === 'ALL' || receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [repairReceipts, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
  const paginatedReceipts = filteredReceipts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'IN_REPAIR':
        return <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
          <Clock size={12} /> در حال تعمیر
        </span>;
      case 'REPAIRED':
        return <span className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
          <CheckCircle size={12} /> تعمیر شده
        </span>;
      case 'DELIVERED':
        return <span className="px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 flex items-center gap-1">
          <Truck size={12} /> تحویل داده شده
        </span>;
    }
  };

  const stats = useMemo(() => {
    return {
      inRepair: repairReceipts.filter(r => r.status === 'IN_REPAIR').length,
      repaired: repairReceipts.filter(r => r.status === 'REPAIRED').length,
      delivered: repairReceipts.filter(r => r.status === 'DELIVERED').length,
      total: repairReceipts.length
    };
  }, [repairReceipts]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-neutral-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-500" />
              رسیدهای تعمیرات
            </h2>
            <p className="text-xs text-gray-500 mt-1">مدیریت رسیدهای دریافت و تحویل دستگاه‌های تعمیراتی</p>
          </div>
          <button
            onClick={() => openWindow('رسید تعمیرات جدید', 'REPAIR_RECEIPT_FORM')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded flex items-center gap-2 shadow-lg"
          >
            <Plus size={18} />
            رسید جدید
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-3 rounded border border-blue-200 dark:border-blue-900/30">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">در حال تعمیر</div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.inRepair}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 p-3 rounded border border-green-200 dark:border-green-900/30">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">تعمیر شده</div>
            <div className="text-2xl font-black text-green-700 dark:text-green-300">{stats.repaired}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-900/10 p-3 rounded border border-gray-200 dark:border-gray-900/30">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">تحویل داده شده</div>
            <div className="text-2xl font-black text-gray-700 dark:text-gray-300">{stats.delivered}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 p-3 rounded border border-purple-200 dark:border-purple-900/30">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">کل رسیدها</div>
            <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.total}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، شماره تلفن، نوع دستگاه یا شماره رسید..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm outline-none focus:border-blue-500"
            />
          </div>
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v as RepairStatus | 'ALL'); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'همه وضعیت‌ها' },
              { value: 'IN_REPAIR', label: 'در حال تعمیر' },
              { value: 'REPAIRED', label: 'تعمیر شده' },
              { value: 'DELIVERED', label: 'تحویل داده شده' },
            ]}
            icon={Filter}
            ariaLabel="فیلتر وضعیت"
          />
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-gray-500 flex items-center gap-3 mt-2">
          <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded">Ctrl+N</kbd> رسید جدید</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded">Ctrl+F</kbd> جستجو</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">هیچ رسیدی یافت نشد</p>
            <p className="text-sm mt-2">برای ثبت رسید جدید روی دکمه "رسید جدید" کلیک کنید</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface rounded border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900 text-xs text-gray-500 sticky top-0">
                <tr>
                  <th className="p-3">شماره رسید</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">تلفن</th>
                  <th className="p-3">دستگاه</th>
                  <th className="p-3">تاریخ دریافت</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 text-center">هزینه</th>
                  <th className="p-3 text-center">بیعانه</th>
                  <th className="p-3 text-center">مانده</th>
                  <th className="p-3 text-center w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {paginatedReceipts.map((receipt) => {
                  const finalCost = receipt.finalCost || receipt.estimatedCost;
                  const remaining = finalCost - receipt.depositAmount;

                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">#{receipt.receiptNumber}</td>
                      <td className="p-3 font-bold">{receipt.customerName}</td>
                      <td className="p-3 font-mono text-xs">{receipt.customerPhone}</td>
                      <td className="p-3">
                        <div className="text-sm font-bold">{receipt.deviceType}</div>
                        {(receipt.deviceBrand || receipt.deviceModel) && (
                          <div className="text-xs text-gray-500">
                            {receipt.deviceBrand} {receipt.deviceModel}
                          </div>
                        )}
                        {receipt.usedParts && receipt.usedParts.length > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {receipt.usedParts.length} قطعه مصرفی
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        <div>{normalizeDateToPersian(receipt.receiveDate)}</div>
                        <div className="text-gray-500">{receipt.receiveTime}</div>
                      </td>
                      <td className="p-3 text-center">{getStatusBadge(receipt.status)}</td>
                      <td className="p-3 text-center font-mono font-bold">{finalCost.toLocaleString()}</td>
                      <td className="p-3 text-center font-mono text-green-600 dark:text-green-400">{receipt.depositAmount.toLocaleString()}</td>
                      <td className="p-3 text-center font-mono font-bold text-orange-600 dark:text-orange-400">{remaining.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openWindow(`رسید #${receipt.receiptNumber}`, 'REPAIR_RECEIPT_FORM', { receiptId: receipt.id })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="مشاهده/ویرایش"
                          >
                            <Eye size={16} />
                          </button>
                          {receipt.invoiceId && (() => {
                            const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
                            return invoice ? (
                              <button
                                onClick={() => openWindow(`فاکتور #${invoice.number}`, 'INVOICE_FORM', { invoiceId: invoice.id })}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="مشاهده فاکتور"
                              >
                                <ExternalLink size={16} />
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-surface">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredReceipts.length}
          />
        </div>
      )}
    </div>
  );
};
