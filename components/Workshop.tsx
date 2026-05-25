
import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { useDataStore } from '../store/dataStore';
import { useWindowStore } from '../store/windowStore';
import { useUIStore } from '../store/uiStore';
import { Hammer, Plus, Package, Clock, PlayCircle, HelpCircle, X, FlaskConical, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { normalizeDateToPersian } from '../utils/dateUtils';

const ITEMS_PER_PAGE = 20;

export const Workshop: React.FC = () => {
    const { productions } = useDataStore();
    const openWindow = useWindowStore((state) => state.openWindow);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [showHelp, setShowHelp] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const activeProjects = productions.filter(p => p.status === 'IN_PROGRESS');
    const historyProjects = productions.filter(p => p.status === 'COMPLETED');

    // Pagination for history
    const totalPages = Math.ceil(historyProjects.length / ITEMS_PER_PAGE);
    const paginatedHistory = historyProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) setCurrentPage(page);
    };

    return (
        <div className="space-y-4 pb-16 relative">
            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                    <div className="bg-white dark:bg-surface w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-pop-in" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={20} /></button>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600">
                            <HelpCircle size={20} />
                            راهنمای بخش کارگاه
                        </h3>
                        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p><strong>۱. ساخت محصول جدید:</strong> برای شروع تولید، دکمه "ساخت کالا" را بزنید.</p>
                            <p><strong>۲. انواع تولید:</strong>
                                <ul className="list-disc list-inside mt-1 pr-4">
                                    <li><b>تکمیل آنی:</b> تمام مواد اولیه کسر شده و محصول نهایی بلافاصله به انبار اضافه می‌شود.</li>
                                    <li><b>شروع پروژه:</b> مواد اولیه کسر می‌شود اما محصول به انبار اضافه نمی‌شود. پروژه در تب "پروژه‌های فعال" قرار می‌گیرد.</li>
                                </ul>
                            </p>
                            <p><strong>۳. مدیریت پروژه:</strong> در پروژه‌های فعال می‌توانید:
                                <ul className="list-disc list-inside mt-1 pr-4">
                                    <li>یادداشت روزانه بنویسید.</li>
                                    <li>عکس مراحل تولید را آپلود کنید.</li>
                                    <li>اگر متریال کم آمد، اضافه کنید (آنی از انبار کسر می‌شود).</li>
                                </ul>
                            </p>
                            <p><strong>۴. اتمام کار:</strong> پس از پایان تولید، دکمه "اتمام و ثبت نهایی" را بزنید تا محصول ساخته شده به موجودی انبار اضافه شود.</p>
                            <p><strong>۵. تست هزینه:</strong> با استفاده از دکمه شبیه‌ساز، می‌توانید قبل از ساخت، قیمت تمام شده محصول را تخمین بزنید.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white dark:bg-surface p-3 border border-gray-200 dark:border-neutral-800 shadow-sm">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`text-sm font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${activeTab === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <PlayCircle size={16} />
                        پروژه‌های فعال ({activeProjects.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`text-sm font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Package size={16} />
                        تاریخچه تولید
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => openWindow('شبیه‌ساز و تست هزینه', 'PRODUCTION_SIMULATION')}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 text-xs font-bold transition-colors rounded-none flex items-center gap-2"
                        title="تست هزینه بدون کسر از انبار"
                    >
                        <FlaskConical size={16} />
                        تست هزینه
                    </button>
                    <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                        <HelpCircle size={20} />
                    </button>
                    <button
                        onClick={() => openWindow('ساخت محصول جدید', 'PRODUCTION_FORM')}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md rounded-none uppercase tracking-wide flex items-center gap-2"
                    >
                        <Plus size={16} />
                        ساخت کالا
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'active' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProjects.map(prod => (
                        <div key={prod.id} className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{prod.productName}</h3>
                                    <span className="text-xs text-gray-500 font-mono">{prod.sku || 'No SKU'}</span>
                                </div>
                                <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded animate-pulse">
                                    در حال ساخت
                                </span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                                <div className="flex justify-between">
                                    <span>تعداد هدف:</span>
                                    <span className="font-bold">{prod.quantity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>شروع پروژه:</span>
                                    <span className="font-mono">{prod.date} - {prod.time}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>هزینه تاکنون:</span>
                                    <span className="font-mono font-bold">{new Decimal(prod.totalRawMaterialCost || 0).plus(prod.totalExternalCost || 0).toNumber().toLocaleString()}</span>
                                </div>
                                {prod.photos && prod.photos.length > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span>عکس‌های پروژه:</span>
                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                                            <ImageIcon size={12} />
                                            {prod.photos.length} عکس
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => openWindow(`مدیریت پروژه: ${prod.productName}`, 'PROJECT_MANAGER', { productionId: prod.id })}
                                className="w-full py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300 font-bold text-xs rounded transition-colors border border-gray-200 dark:border-neutral-700"
                            >
                                مدیریت و تکمیل پروژه
                            </button>
                        </div>
                    ))}
                    {activeProjects.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                            <PlayCircle size={48} className="mb-2 opacity-20" />
                            <p>هیچ پروژه فعالی وجود ندارد</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 text-[11px] uppercase font-bold border-b border-gray-200 dark:border-neutral-800">
                            <tr>
                                <th className="px-4 py-3 tracking-wider w-24">تاریخ اتمام</th>
                                <th className="px-4 py-3 tracking-wider">محصول</th>
                                <th className="px-4 py-3 tracking-wider text-center">تعداد</th>
                                <th className="px-4 py-3 tracking-wider text-center">مواد اولیه</th>
                                <th className="px-4 py-3 tracking-wider text-center w-10">عکس</th>
                                <th className="px-4 py-3 tracking-wider text-center">مدت زمان</th>
                                <th className="px-4 py-3 tracking-wider text-left">قیمت تمام شده</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {paginatedHistory.map((prod) => (
                                <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-neutral-400 font-mono">
                                        {prod.endDate ? normalizeDateToPersian(prod.endDate) : normalizeDateToPersian(prod.date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Package size={16} className="text-emerald-500" />
                                        {prod.productName}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-gray-800 dark:text-gray-200">
                                        {prod.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                        {prod.rawMaterials.length} قلم
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {prod.photos && prod.photos.length > 0 ? (
                                            <button
                                                onClick={() => openWindow(`مدیریت پروژه: ${prod.productName}`, 'PROJECT_MANAGER', { productionId: prod.id })}
                                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-bold"
                                                title="مشاهده عکس‌ها"
                                            >
                                                <ImageIcon size={14} />
                                                {prod.photos.length}
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-gray-300 dark:text-neutral-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs text-gray-500 font-mono">
                                        {prod.completionDuration || 'آنی'}
                                    </td>
                                    <td className="px-4 py-3 text-left font-mono font-black text-emerald-600 dark:text-emerald-400">
                                        {prod.finalCostPrice.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {paginatedHistory.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-neutral-600">
                                        <Hammer size={48} className="mx-auto mb-2 opacity-20" />
                                        <p>هنوز تولیدی تکمیل نشده است</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination for History Tab */}
            {activeTab === 'history' && totalPages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-surface p-3 border border-gray-200 dark:border-neutral-800">
                    <div className="text-xs text-gray-500 dark:text-neutral-500">
                        نمایش {((currentPage - 1) * ITEMS_PER_PAGE) + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, historyProjects.length)} از {historyProjects.length} تولید
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1 border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-800 dark:text-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 2) {
                                if (page === 2 || page === totalPages - 1) return <span key={page} className="px-1 text-gray-400">...</span>;
                                return null;
                            }
                            return (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold border ${currentPage === page
                                            ? 'bg-primary dark:bg-white text-white dark:text-primary border-primary dark:border-white'
                                            : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 dark:text-white'
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1 border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-800 dark:text-white"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
