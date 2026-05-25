
import React, { useMemo, useEffect } from 'react';
import { moneySum, moneySub } from '../utils/money';
import { normalizePersianDate } from '../utils/dateUtils';
import { useDataStore } from '../store/dataStore';
import { useWindowStore } from '../store/windowStore';
import { useUIStore } from '../store/uiStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Wallet, TrendingUp, TrendingDown, AlertTriangle,
    PlusCircle, ShoppingCart, CreditCard, Users,
    ArrowUpRight, ArrowDownLeft, FileText, Package,
    Activity, CalendarClock
} from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { transactions, bankAccounts, checks, products, invoices, customers } = useDataStore();
    const { openWindow, windows, currentPage } = useWindowStore();
    const { notifications } = useUIStore();

    // --- Keyboard Shortcuts ---
    // F2/F3/F4/F8 are global by intent (open quick-create windows from anywhere
    // in the dashboard) but must NOT fire when another window is on top —
    // otherwise pressing F2 inside an open InvoiceForm spawns a second invoice.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip when typing in any input/textarea (basic guard)
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            // Skip when another window is open OR when a non-dashboard page is showing
            const hasOpenWindow = windows.some(w => !w.isMinimized);
            if (hasOpenWindow || currentPage !== 'dashboard') return;

            switch (e.key) {
                case 'F2':
                    e.preventDefault();
                    openWindow('فاکتور فروش جدید', 'INVOICE_FORM', { type: 'SALE' });
                    break;
                case 'F3':
                    e.preventDefault();
                    openWindow('ثبت هزینه / درآمد', 'BANK_TRANSACTION_FORM');
                    break;
                case 'F4':
                    e.preventDefault();
                    openWindow('ثبت چک جدید', 'CHECK_FORM');
                    break;
                case 'F8':
                    e.preventDefault();
                    openWindow('تعریف مشتری جدید', 'CUSTOMER_FORM');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [openWindow, windows, currentPage]);

    // --- Calculations ---
    const stats = useMemo(() => {
        const totalLiquidity = moneySum(bankAccounts.map(a => a.balance));

        // Monthly Profit Calculation (Simple: Invoices Profit - Expenses)
        const todayParts = new Date().toLocaleDateString('fa-IR-u-nu-latn').split('/');
        const currentYear = todayParts[0];
        const currentMonth = todayParts[1];

        const isCurrentMonth = (dateStr?: string) => {
            if (!dateStr) return false;
            const parts = dateStr.split('/');
            return parts[0] === currentYear && parts[1] === currentMonth;
        };

        const monthlyInvoices = invoices.filter(i => isCurrentMonth(i.date) && (i.type === 'SALE'));
        const monthlyProfit   = moneySum(monthlyInvoices.map(inv => inv.totalProfit ?? 0));
        const monthlyExpenses = moneySum(
            transactions.filter(t => isCurrentMonth(t.date) && t.type === 'expense').map(t => t.amount)
        );
        const netProfit = moneySub(monthlyProfit, monthlyExpenses);

        const pendingReceivable = moneySum(
            checks.filter(c => c.status === 'PENDING' && c.type === 'receivable').map(c => c.amount)
        );
        const pendingPayable = moneySum(
            checks.filter(c => c.status === 'PENDING' && c.type === 'payable').map(c => c.amount)
        );

        return { totalLiquidity, netProfit, pendingReceivable, pendingPayable };
    }, [bankAccounts, invoices, transactions, checks]);

    // --- Chart Data (Last 10 Days Cash Flow) ---
    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();

        for (let i = 9; i >= 0; i--) {
            try {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dateStr = d.toLocaleDateString('fa-IR-u-nu-latn');

                const dayIncome = moneySum(
                    transactions.filter(t => t.date === dateStr && t.type === 'income').map(t => t.amount)
                );
                const dayExpense = moneySum(
                    transactions.filter(t => t.date === dateStr && t.type === 'expense').map(t => t.amount)
                );

                data.push({
                    name: dateStr.split('/').slice(1).join('/'), // Remove Year safely
                    income: dayIncome,
                    expense: dayExpense
                });
            } catch (e) {
                console.error("Error generating chart date", e);
            }
        }
        return data;
    }, [transactions]);

    // --- Critical Alerts ---
    const criticalAlerts = useMemo(() => {
        return notifications.filter(n => n.type === 'error' || n.type === 'warning').slice(0, 5);
    }, [notifications]);

    // --- Recent Activity Feed (Merge Invoices & Transactions) ---
    const recentActivity = useMemo(() => {
        const mixed = [
            ...invoices.slice(0, 5).map(i => ({
                id: i.id,
                type: 'INVOICE',
                title: `${i.type === 'SALE' ? 'فاکتور فروش' : 'فاکتور خرید'} #${i.number}`,
                sub: i.customerName,
                amount: i.totalAmount,
                date: i.date,
                isPositive: i.type === 'SALE'
            })),
            ...transactions.slice(0, 5).map(t => ({
                id: t.id,
                type: 'TRX',
                title: t.description,
                sub: t.category,
                amount: t.amount,
                date: t.date,
                isPositive: t.type === 'income'
            }))
        ];
        // Sort desc — normalize Persian dates (Latin-unpadded "1404/2/5" vs
        // Persian-padded "۱۴۰۴/۰۲/۰۵") before comparing, otherwise "1404/12/5"
        // sorts wrong against "1404/2/15".
        return mixed.sort((a, b) =>
          normalizePersianDate(b.date).localeCompare(normalizePersianDate(a.date))
        ).slice(0, 7);
    }, [invoices, transactions]);

    // --- Components ---
    const KpiCard = ({ title, value, subValue, icon: Icon, color }: any) => (
        <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 p-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 right-0 w-1 h-full ${color}`}></div>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">{title}</span>
                <div className={`p-2 rounded-full bg-gray-50 dark:bg-neutral-800 group-hover:scale-110 transition-transform ${color.replace('bg-', 'text-')}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="text-xl font-black font-mono text-gray-900 dark:text-white mt-1">
                {value}
            </div>
            {subValue && (
                <div className="text-[10px] text-gray-400 mt-1 font-medium">{subValue}</div>
            )}
        </div>
    );

    const QuickAction = ({ label, shortcut, icon: Icon, onClick, colorClass }: any) => (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 hover:border-primary dark:hover:border-white hover:shadow-md transition-all group relative overflow-hidden"
        >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${colorClass}`}></div>
            <Icon size={24} className="text-gray-500 group-hover:text-primary dark:text-neutral-400 dark:group-hover:text-white transition-colors" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
            <span className="absolute top-1 right-1 text-[9px] font-mono text-gray-300 dark:text-neutral-600 border border-gray-100 dark:border-neutral-700 px-1 rounded">
                {shortcut}
            </span>
        </button>
    );

    return (
        <div className="space-y-4 pb-16">

            {/* 1. Top KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    title="نقدینگی کل"
                    value={stats.totalLiquidity.toLocaleString('en-US')}
                    subValue="مجموع بانک و صندوق"
                    icon={Wallet}
                    color="bg-blue-500"
                />
                <KpiCard
                    title="سود خالص ماه"
                    value={stats.netProfit.toLocaleString('en-US')}
                    subValue="درآمد - هزینه (ماه جاری)"
                    icon={Activity}
                    color={stats.netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
                />
                <KpiCard
                    title="چک‌های دریافتی"
                    value={stats.pendingReceivable.toLocaleString('en-US')}
                    subValue="اسناد در جریان وصول"
                    icon={ArrowDownLeft}
                    color="bg-amber-500"
                />
                <KpiCard
                    title="چک‌های پرداختی"
                    value={stats.pendingPayable.toLocaleString('en-US')}
                    subValue="تعهدات آتی"
                    icon={ArrowUpRight}
                    color="bg-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 2. Main Chart & Quick Actions (2/3 Width) */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Chart */}
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 p-4 h-64 shadow-sm relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-500" />
                                روند جریان نقدی (۱۰ روز اخیر)
                            </h3>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    labelStyle={{ color: '#666', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="درآمد" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="هزینه" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Command Center (Quick Actions) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <QuickAction
                            label="فاکتور فروش"
                            shortcut="F2"
                            icon={ShoppingCart}
                            colorClass="bg-emerald-500"
                            onClick={() => openWindow('فاکتور فروش جدید', 'INVOICE_FORM', { type: 'SALE' })}
                        />
                        <QuickAction
                            label="ثبت هزینه/درآمد"
                            shortcut="F3"
                            icon={CreditCard}
                            colorClass="bg-red-500"
                            onClick={() => openWindow('ثبت تراکنش بانکی', 'BANK_TRANSACTION_FORM')}
                        />
                        <QuickAction
                            label="ثبت چک"
                            shortcut="F4"
                            icon={FileText}
                            colorClass="bg-blue-500"
                            onClick={() => openWindow('ثبت چک جدید', 'CHECK_FORM')}
                        />
                        <QuickAction
                            label="مشتری جدید"
                            shortcut="F8"
                            icon={Users}
                            colorClass="bg-purple-500"
                            onClick={() => openWindow('تعریف مشتری جدید', 'CUSTOMER_FORM')}
                        />
                    </div>
                </div>

                {/* 3. Alerts & Feed (1/3 Width) */}
                <div className="flex flex-col gap-4">

                    {/* Critical Alerts Panel */}
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex-1 max-h-[300px] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-gray-100 dark:border-neutral-800 bg-red-50 dark:bg-red-900/10 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                هشدارهای سیستم
                            </h4>
                            <span className="text-[10px] bg-white dark:bg-black px-1.5 rounded text-red-500 font-mono">{criticalAlerts.length}</span>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-2 flex-1">
                            {criticalAlerts.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400">همه چیز مرتب است</div>
                            ) : (
                                criticalAlerts.map(alert => (
                                    <div key={alert.id} className="text-xs p-2 bg-gray-50 dark:bg-neutral-900 border-r-2 border-red-400">
                                        <div className="font-bold text-gray-800 dark:text-gray-200">{alert.title}</div>
                                        <div className="text-gray-500 truncate">{alert.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex-1 flex flex-col">
                        <div className="p-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <CalendarClock size={14} />
                                فعالیت‌های اخیر
                            </h4>
                        </div>
                        <div className="overflow-y-auto p-0 flex-1">
                            <table className="w-full text-right">
                                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                    {recentActivity.map(item => (
                                        <tr key={item.id} className="text-[10px] hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                                            <td className="p-2 text-gray-500 font-mono w-16">{item.date}</td>
                                            <td className="p-2">
                                                <div className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{item.title}</div>
                                                <div className="text-gray-400 truncate max-w-[120px]">{item.sub}</div>
                                            </td>
                                            <td className={`p-2 text-left font-mono font-bold ${item.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {item.isPositive ? '+' : '-'}{item.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
