
import React from 'react';
import { Invoice, InvoiceItem, SystemSettings, Customer } from '../types';

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  customer?: Customer;
  settings: SystemSettings;
  paperSize: 'A4' | 'A5';
  showBalance: boolean;
}

// First page has info boxes (seller/buyer) so fits fewer rows; subsequent pages have more room.
const FIRST_PAGE_A4 = 13;
const OTHER_PAGE_A4 = 16;
const FIRST_PAGE_A5 = 8;
const OTHER_PAGE_A5 = 10;

export const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({ invoice, customer, settings, paperSize, showBalance }) => {
  const isSale = invoice.type === 'SALE';
  const firstPageCount = paperSize === 'A4' ? FIRST_PAGE_A4 : FIRST_PAGE_A5;
  const otherPageCount = paperSize === 'A4' ? OTHER_PAGE_A4 : OTHER_PAGE_A5;
  
  // Calculate actual payment details
  const paidCash = invoice.paidCashAmount || 0;
  const paidCheck = invoice.paidCheckAmount || 0;
  const totalAmount = invoice.totalAmount || 0;
  // totalAmount is already after all discounts (net payable); don't subtract discount again
  const remainedAmount = totalAmount - paidCash - paidCheck;

  // Determine actual payment method
  const getPaymentMethodLabel = () => {
    const hasCash = paidCash > 0;
    const hasCheck = paidCheck > 0;
    const hasCredit = remainedAmount > 0;

    if (hasCash && !hasCheck && !hasCredit) return 'نقدی';
    if (!hasCash && hasCheck && !hasCredit) return 'چک';
    if (!hasCash && !hasCheck && hasCredit) return 'نسیه';
    if ((hasCash || hasCheck) && hasCredit) return 'ترکیبی';
    if (hasCash && hasCheck) return 'نقد + چک';
    
    return 'نامشخص';
  };
  
  const seller = isSale ? {
      name: settings.shopName,
      phone: settings.shopPhone,
      address: settings.shopAddress,
      taxId: settings.shopTaxId,
      postalCode: settings.shopPostalCode
  } : {
      name: customer?.name,
      phone: customer?.phone,
      address: customer?.address,
      taxId: '', 
      postalCode: ''
  };

  const buyer = isSale ? {
      name: customer?.name,
      phone: customer?.phone,
      address: customer?.address,
      taxId: '',
      postalCode: ''
  } : {
      name: settings.shopName,
      phone: settings.shopPhone,
      address: settings.shopAddress,
      taxId: settings.shopTaxId,
      postalCode: settings.shopPostalCode
  };

  // Balance Calculations (Cardex Based)
  const currentBalance = customer?.balance || 0;

  // Split items into pages — first page fits fewer rows (info boxes take space)
  const pages: { items: InvoiceItem[]; startIndex: number }[] = [];
  if (invoice.items.length > 0) {
    pages.push({ items: invoice.items.slice(0, firstPageCount), startIndex: 0 });
    for (let i = firstPageCount; i < invoice.items.length; i += otherPageCount) {
      pages.push({ items: invoice.items.slice(i, i + otherPageCount), startIndex: i });
    }
  }

  // Header Component (reusable)
  const InvoiceHeader = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-1">
          <span className="text-base font-black">HF</span>
        </div>
        <h1 className={`${paperSize === 'A5' ? 'text-sm' : 'text-base'} font-black text-center text-black`}>{settings.shopName}</h1>
      </div>
      
      <div className="text-center pt-1">
        <h2 className={`${paperSize === 'A5' ? 'text-base' : 'text-lg'} font-black mb-1 text-black`}>صورتحساب {isSale ? 'فروش' : 'خرید'} کالا و خدمات</h2>
        <span className="text-xs font-black bg-gray-200 px-3 py-1 border border-black text-black inline-block">
          {getPaymentMethodLabel()}
        </span>
        {totalPages > 1 && (
          <div className="text-[10px] font-bold text-gray-600 mt-1">
            صفحه {pageNum} از {totalPages}
          </div>
        )}
      </div>

      <div className={`text-left space-y-0.5 ${paperSize === 'A5' ? 'text-[10px]' : 'text-xs'} font-black`}>
        <div className="flex justify-between w-32 border-b border-gray-300 pb-0.5">
          <span className="text-gray-600">شماره:</span>
          <span className="text-sm text-black">{invoice.number}</span>
        </div>
        <div className="flex justify-between w-32 border-b border-gray-300 pb-0.5">
          <span className="text-gray-600">تاریخ:</span>
          <span className="text-black">{invoice.date}</span>
        </div>
        <div className="flex justify-between w-32">
          <span className="text-gray-600">پیگیری:</span>
          <span className="text-[9px] text-black">{invoice.id.slice(0, 6)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'A4' ? 'A4' : 'A5'};
            margin: 8mm;
          }
          
          body {
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Hide everything except print content */
          body * {
            visibility: hidden;
          }
          
          #invoice-print-node,
          #invoice-print-node * {
            visibility: visible;
          }
          
          #invoice-print-node {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Table page break rules */
          table {
            page-break-inside: auto;
            border-collapse: collapse;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          tbody tr {
            page-break-inside: avoid;
          }
        }
        
        @media screen {
          #invoice-print-node {
            max-width: ${paperSize === 'A4' ? '210mm' : '148mm'};
            margin: 0 auto;
            background: white;
          }
        }
      `}</style>
      
      <div id="invoice-print-node" className="bg-white">
        {pages.map((page, pageIndex) => {
          const { items: pageItems, startIndex } = page;
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div
              key={pageIndex}
              data-page={pageIndex + 1}
              className={`${paperSize === 'A4' ? 'w-[210mm] min-h-[297mm] p-5' : 'w-[148mm] min-h-[210mm] p-4'} mx-auto font-sans leading-tight relative bg-white text-black box-border flex flex-col`}
              style={{ 
                direction: 'rtl',
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                breakAfter: isLastPage ? 'auto' : 'page',
                fontSize: paperSize === 'A4' ? '9pt' : '8pt'
              }}
            >
              {/* Header - on every page */}
              <InvoiceHeader pageNum={pageIndex + 1} totalPages={pages.length} />

              {/* Info Boxes - only on first page */}
              {isFirstPage && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Seller Box */}
                  <div className="border border-black p-2 relative">
                    <span className="absolute -top-2 right-3 bg-white px-1 font-black text-[10px] text-black">فروشنده</span>
                    <div className={`grid grid-cols-1 gap-y-0.5 ${paperSize === 'A5' ? 'text-[9px]' : 'text-[10px]'} font-bold mt-0.5 text-black leading-tight`}>
                      <div><span className="text-gray-500 text-[9px]">نام:</span> {seller.name}</div>
                      <div><span className="text-gray-500 text-[9px]">کد ملی/اقتصادی:</span> <span>{seller.taxId || '-'}</span></div>
                      <div><span className="text-gray-500 text-[9px]">تلفن:</span> <span>{seller.phone}</span></div>
                      <div><span className="text-gray-500 text-[9px]">آدرس:</span> {seller.address}</div>
                    </div>
                  </div>

                  {/* Buyer Box */}
                  <div className="border border-black p-2 relative">
                    <span className="absolute -top-2 right-3 bg-white px-1 font-black text-[10px] text-black">خریدار</span>
                    <div className={`grid grid-cols-1 gap-y-0.5 ${paperSize === 'A5' ? 'text-[9px]' : 'text-[10px]'} font-bold mt-0.5 text-black leading-tight`}>
                      <div><span className="text-gray-500 text-[9px]">نام:</span> {buyer.name}</div>
                      <div><span className="text-gray-500 text-[9px]">کد ملی/اقتصادی:</span> <span>{buyer.taxId || '-'}</span></div>
                      <div><span className="text-gray-500 text-[9px]">تلفن:</span> <span>{buyer.phone}</span></div>
                      <div><span className="text-gray-500 text-[9px]">آدرس:</span> {buyer.address}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="flex-1 mb-2">
                <table className={`w-full border-collapse border border-black ${paperSize === 'A5' ? 'text-[9px]' : 'text-[10px]'}`}>
                  <thead>
                    <tr className="bg-black text-white print:bg-black print:text-white">
                      <th className="border border-black p-1 w-8 text-center font-black">#</th>
                      <th className="border border-black p-1 text-right font-black">شرح کالا / خدمات</th>
                      <th className="border border-black p-1 w-12 text-center font-black">تعداد</th>
                      <th className="border border-black p-1 w-20 text-center font-black">فی (ریال)</th>
                      <th className="border border-black p-1 w-16 text-center font-black">تخفیف</th>
                      <th className="border border-black p-1 w-24 text-center font-black">جمع کل (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold">
                    {pageItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="border border-black p-1 text-center font-black text-black">{startIndex + index + 1}</td>
                        <td className="border border-black p-1 font-black text-black">{item.productName}</td>
                        <td className="border border-black p-1 text-center font-black text-black">{item.quantity}</td>
                        <td className="border border-black p-1 text-center font-black text-black">{item.unitPrice.toLocaleString()}</td>
                        <td className="border border-black p-1 text-center font-black text-black">{item.discount > 0 ? item.discount.toLocaleString() : '-'}</td>
                        <td className="border border-black p-1 text-left pl-1 font-black bg-gray-50 text-black">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer - only on last page */}
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-gray-200 border-t-2 border-black">
                        <td colSpan={4} className="border border-black p-1.5 text-left font-black text-xs text-black">جمع کل فاکتور:</td>
                        <td className="border border-black p-1.5 text-center font-black text-black">{invoice.totalDiscount.toLocaleString()}</td>
                        <td className="border border-black p-1.5 text-left pl-1 font-black text-sm text-black">{invoice.totalAmount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Customer Balance Section - only on last page, only for registered non-guest customers */}
              {isLastPage && showBalance && customer && !customer.isGuest && invoice.customerId && (
                <div className="mb-2 border border-dashed border-gray-400 p-2 bg-gray-50 flex justify-between items-center text-[10px]">
                  <div className="font-bold text-gray-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
                    وضعیت حساب مشتری (طبق آخرین بروزرسانی کاردکس):
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">مانده کل حساب:</span>
                    <span className={`font-black text-base ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-emerald-600' : 'text-black'}`} dir="ltr">
                      {Math.abs(currentBalance).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-black">
                      {currentBalance > 0 ? 'بدهکار' : currentBalance < 0 ? 'بستانکار' : 'تسویه'}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Details Section - only on last page */}
              {isLastPage && (paidCash > 0 || paidCheck > 0 || remainedAmount > 0) && (
                <div className="mb-2 border border-black p-2 bg-white">
                  <h4 className="font-black text-[10px] mb-1 text-black">جزئیات پرداخت:</h4>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    {paidCash > 0 && (
                      <div className="flex flex-col items-center p-1.5 bg-emerald-50 border border-emerald-200">
                        <span className="text-[8px] text-gray-600 mb-0.5">نقدی</span>
                        <span className="font-black text-emerald-700">{paidCash.toLocaleString()} ریال</span>
                      </div>
                    )}
                    {paidCheck > 0 && (
                      <div className="flex flex-col items-center p-1.5 bg-blue-50 border border-blue-200">
                        <span className="text-[8px] text-gray-600 mb-0.5">چک</span>
                        <span className="font-black text-blue-700">{paidCheck.toLocaleString()} ریال</span>
                      </div>
                    )}
                    {remainedAmount > 0 && (
                      <div className="flex flex-col items-center p-1.5 bg-amber-50 border border-amber-200">
                        <span className="text-[8px] text-gray-600 mb-0.5">نسیه</span>
                        <span className="font-black text-amber-700">{remainedAmount.toLocaleString()} ریال</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Info & Signatures - only on last page */}
              {isLastPage && (
                <>
                  <div className="border border-black p-2 min-h-[35px] text-[10px] text-black mb-2">
                    <span className="font-black block mb-0.5">توضیحات:</span>
                    <span className="font-bold">{invoice.description || '...'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-black">
                    <div className="text-center">
                      <div className="h-16 border border-black mb-1 flex items-center justify-center opacity-10 text-[9px]">
                        محل مهر و امضا
                      </div>
                      <span className="font-black text-[10px]">فروشنده</span>
                    </div>
                    <div className="text-center">
                      <div className="h-16 border border-black mb-1 flex items-center justify-center opacity-10 text-[9px]">
                        محل مهر و امضا
                      </div>
                      <span className="font-black text-[10px]">خریدار</span>
                    </div>
                  </div>
                </>
              )}

              {/* Watermark/Footer */}
              <div className="text-center text-[8px] font-bold text-gray-400 mt-auto pt-2">
                تولید شده توسط نرم‌افزار حسابداری حساب فلو (HESAB FLOW)
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
