
import React, { useMemo, useEffect } from 'react';
import { moneySum, moneySub } from '../utils/money';
import { normalizePersianDate } from '../utils/dateUtils';
import { useDataStore } from '../store/dataStore';
import { useWindowStore } from '../store/windowStore';
import { useUIStore } from '../store/uiStore';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    Wallet, TrendingUp, TrendingDown, AlertTriangle,
    PlusCircle, ShoppingCart, CreditCard, Users,
    ArrowUpRight, ArrowDownLeft, FileText, Package,
    Activity, CalendarClock, Archive, Clock, Star,
    CheckCircle, XCircle, Minus, ChevronUp, ChevronDown
} from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { transactions, bankAccounts, checks, products, invoices, customers } = useDataStore();
    const { openWindow, windows, currentPage } = useWindowStore();
    const { notifications } = useUIStore();

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            const hasOpenWindow = windows.some(w => !w.isMinimized);
            if (hasOpenWindow || currentPage !== 'dashboard') return;
            switch (e.key) {
                case 'F2': e.preventDefault(); openWindow('فاکتور فروش جدید', 'INVOICE_FORM', { type: 'SALE' }); break;
                case 'F3': e.preventDefault(); openWindow('ثبت هزینه / درآمد', 'BANK_TRANSACTION_FORM'); break;
                case 'F4': e.preventDefault(); openWindow('ثبت چک جدید', 'CHECK_FORM'); break;
                case 'F8': e.preventDefault(); openWindow('تعریف مشتری جدید', 'CUSTOMER_FORM'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [openWindow, windows, currentPage]);

    // --- Date helpers ---
    const today = new Date().toLocaleDateString('fa-IR-u-nu-latn');
    const todayParts = today.split('/');
    const currentYear  = todayParts[0];
    const currentMonth = todayParts[1];

    const prevMonthNum = parseInt(currentMonth) - 1;
    const prevMonthYear = prevMonthNum === 0 ? String(parseInt(currentYear) - 1) : currentYear;
    const prevMonth = prevMonthNum === 0 ? '12' : String(prevMonthNum);

    const isToday      = (d?: string) => !!d && normalizePersianDate(d) === normalizePersianDate(today);
    const isThisMonth  = (d?: string) => { if (!d) return false; const p = d.split('/'); return p[0] === currentYear && p[1] === currentMonth; };
    const isLastMonth  = (d?: string) => { if (!d) return false; const p = d.split('/'); return p[0] === prevMonthYear && p[1] === prevMonth; };

    // --- Core Stats ---
    const stats = useMemo(() => {
        const totalLiquidity = moneySum(bankAccounts.map(a => a.balance));

        const monthlySales     = invoices.filter(i => isThisMonth(i.date) && i.type === 'SALE');
        const lastMonthSales   = invoices.filter(i => isLastMonth(i.date)  && i.type === 'SALE');
        const monthlySaleAmt   = moneySum(monthlySales.map(i => i.totalAmount));
        const lastMonthSaleAmt = moneySum(lastMonthSales.map(i => i.totalAmount));
        const salesGrowth      = lastMonthSaleAmt > 0
            ? Math.round(((monthlySaleAmt - lastMonthSaleAmt) / lastMonthSaleAmt) * 100)
            : null;

        const monthlyProfit = moneySum(monthlySales.map(i => i.totalProfit ?? 0));
        const monthlyExpenses = moneySum(
            transactions.filter(t => isThisMonth(t.date) && t.type === 'expense').map(t => t.amount)
        );
        const netProfit = moneySub(monthlyProfit, monthlyExpenses);

        const todaySales   = invoices.filter(i => isToday(i.date) && i.type === 'SALE');
        const todaySaleAmt = moneySum(todaySales.map(i => i.totalAmount));
        const todayIncome  = moneySum(transactions.filter(t => isToday(t.date) && t.type === 'income').map(t => t.amount));
        const todayExpense = moneySum(transactions.filter(t => isToday(t.date) && t.type === 'expense').map(t => t.amount));

        const pendingReceivable = moneySum(checks.filter(c => c.status === 'PENDING' && c.type === 'receivable').map(c => c.amount));
        const pendingPayable    = moneySum(checks.filter(c => c.status === 'PENDING' && c.type === 'payable').map(c => c.amount));

        const totalDebt    = moneySum(customers.filter(c => c.balance > 0).map(c => c.balance));
        const lowStockCount = products.filter(p => p.stock > 0 && p.stock < (p.minStockAlert || 5)).length;
        const outOfStock    = products.filter(p => p.stock === 0).length;

        return {
            totalLiquidity, monthlySaleAmt, lastMonthSaleAmt, salesGrowth,
            netProfit, monthlySales: monthlySales.length,
            todaySaleAmt, todaySalesCount: todaySales.length,
            todayIncome, todayExpense,
            pendingReceivable, pendingPayable,
            totalDebt, lowStockCount, outOfStock,
        };
    }, [bankAccounts, invoices, transactions, checks, customers, products, today]);

    // --- 30-Day Chart ---
    const chartData = useMemo(() => {
        const data = [];
        const base = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(base);
            d.setDate(base.getDate() - i);
            const dateStr = d.toLocaleDateString('fa-IR-u-nu-latn');
            const label = dateStr.split('/').slice(1).join('/');
            const sales   = moneySum(invoices.filter(inv => inv.date === dateStr && inv.type === 'SALE').map(inv => inv.totalAmount));
            const income  = moneySum(transactions.filter(t => t.date === dateStr && t.type === 'income').map(t => t.amount));
            const expense = moneySum(transactions.filter(t => t.date === dateStr && t.type === 'expense').map(t => t.amount));
            if (sales > 0 || income > 0 || expense > 0) data.push({ name: label, sales, income, expense });
            else data.push({ name: label, sales: 0, income: 0, expense: 0 });
        }
        return data;
    }, [invoices, transactions]);

    // --- Monthly Bar Chart (Last 6 Months) ---
    const monthlyChart = useMemo(() => {
        const data = [];
        const base = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
            const ds = d.toLocaleDateString('fa-IR-u-nu-latn');
            const parts = ds.split('/');
            const y = parts[0]; const m = parts[1];
            const label = m + '/' + y.slice(2);
            const sales = moneySum(
                invoices.filter(inv => { const p = inv.date?.split('/'); return p && p[0] === y && p[1] === m && inv.type === 'SALE'; })
                    .map(inv => inv.totalAmount)
            );
            const purchases = moneySum(
                invoices.filter(inv => { const p = inv.date?.split('/'); return p && p[0] === y && p[1] === m && inv.type === 'PURCHASE'; })
                    .map(inv => inv.totalAmount)
            );
            data.push({ name: label, sales, purchases });
        }
        return data;
    }, [invoices]);

    // --- Top Debtors ---
    const topDebtors = useMemo(() =>
        customers.filter(c => c.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 6),
        [customers]
    );
    const maxDebt = topDebtors[0]?.balance || 1;

    // --- Top Selling Products This Month ---
    const topProducts = useMemo(() => {
        const map = new Map<string, { name: string; qty: number; revenue: number }>();
        invoices.filter(i => isThisMonth(i.date) && i.type === 'SALE').forEach(inv => {
            inv.items.forEach(item => {
                const key = item.productId || item.productName;
                const existing = map.get(key);
                if (existing) {
                    existing.qty += Number(item.quantity) || 0;
                    existing.revenue += item.total || 0;
                } else {
                    map.set(key, { name: item.productName, qty: Number(item.quantity) || 0, revenue: item.total || 0 });
                }
            });
        });
        return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [invoices]);

    // --- Low Stock ---
    const lowStockItems = useMemo(() =>
        products.filter(p => p.stock <= (p.minStockAlert || 5))
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 6),
        [products]
    );

    // --- Upcoming Checks (Next 14 days) ---
    const upcomingChecks = useMemo(() => {
        const todayNorm = normalizePersianDate(today);
        return checks
            .filter(c => c.status === 'PENDING' && c.dueDate)
            .filter(c => normalizePersianDate(c.dueDate) >= todayNorm)
            .sort((a, b) => normalizePersianDate(a.dueDate!).localeCompare(normalizePersianDate(b.dueDate!)))
            .slice(0, 6);
    }, [checks, today]);

    // --- Recent Activity ---
    const recentActivity = useMemo(() => {
        const mixed = [
            ...invoices.slice(0, 8).map(i => ({
                id: i.id, type: 'INVOICE',
                title: `${i.type === 'SALE' ? 'فروش' : i.type === 'PURCHASE' ? 'خرید' : i.type} #${i.number}`,
                sub: i.customerName || '—', amount: i.totalAmount, date: i.date,
                isPositive: i.type === 'SALE',
            })),
            ...transactions.slice(0, 8).map(t => ({
                id: t.id, type: 'TRX', title: t.description || t.category,
                sub: t.category, amount: t.amount, date: t.date,
                isPositive: t.type === 'income',
            }))
        ];
        return mixed.sort((a, b) => normalizePersianDate(b.date).localeCompare(normalizePersianDate(a.date))).slice(0, 8);
    }, [invoices, transactions]);

    const criticalAlerts = useMemo(() => notifications.filter(n => n.type === 'error' || n.type === 'warning').slice(0, 4), [notifications]);

    // --- Sub-components ---
    const fmt = (n: number) => n.toLocaleString('en-US');

    const KpiCard = ({ title, value, sub, icon: Icon, color, growth }: any) => (
        <div className={`bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 p-3 relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 right-0 w-1 h-full ${color}`} />
            <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider leading-tight">{title}</span>
                <div className={`p-1.5 rounded bg-gray-50 dark:bg-neutral-800 group-hover:scale-110 transition-transform ${color.replace('bg-', 'text-')}`}>
                    <Icon size={14} />
                </div>
            </div>
            <div className="text-lg font-black font-mono text-gray-900 dark:text-white leading-none mt-1">{value}</div>
            <div className="flex items-center justify-between mt-1">
                {sub && <div className="text-[9px] text-gray-400 font-medium truncate">{sub}</div>}
                {growth !== undefined && growth !== null && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold ${growth > 0 ? 'text-emerald-600' : growth < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {growth > 0 ? <ChevronUp size={10} /> : growth < 0 ? <ChevronDown size={10} /> : <Minus size={10} />}
                        {Math.abs(growth)}%
                    </div>
                )}
            </div>
        </div>
    );

    const SectionHeader = ({ icon: Icon, title, color = 'text-gray-700 dark:text-gray-300', bg = 'bg-gray-50 dark:bg-neutral-900' }: any) => (
        <div className={`px-3 py-2 ${bg} border-b border-gray-100 dark:border-neutral-800 flex items-center gap-2`}>
            <Icon size={13} className={color} />
            <span className={`text-xs font-black ${color}`}>{title}</span>
        </div>
    );

    const QuickAction = ({ label, shortcut, icon: Icon, onClick, colorClass }: any) => (
        <button onClick={onClick}
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 hover:border-primary dark:hover:border-white hover:shadow-md transition-all group relative overflow-hidden">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${colorClass}`} />
            <Icon size={20} className="text-gray-500 group-hover:text-primary dark:text-neutral-400 dark:group-hover:text-white transition-colors" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{label}</span>
            <span className="absolute top-1 right-1 text-[8px] font-mono text-gray-300 dark:text-neutral-600 border border-gray-100 dark:border-neutral-700 px-1">{shortcut}</span>
        </button>
    );

    return (
        <div className="space-y-3 pb-16">

            {/* ═══ ROW 1: 6 KPI Cards ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <KpiCard title="نقدینگی کل" value={fmt(stats.totalLiquidity)} sub="مجموع حساب‌ها" icon={Wallet} color="bg-blue-500" />
                <KpiCard title="فروش ماه جاری" value={fmt(stats.monthlySaleAmt)} sub={`${stats.monthlySales} فاکتور`} icon={ShoppingCart} color="bg-emerald-500" growth={stats.salesGrowth} />
                <KpiCard title="سود خالص ماه" value={fmt(stats.netProfit)} sub="درآمد − هزینه" icon={Activity} color={stats.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'} />
                <KpiCard title="چک دریافتی" value={fmt(stats.pendingReceivable)} sub="در جریان وصول" icon={ArrowDownLeft} color="bg-amber-500" />
                <KpiCard title="چک پرداختی" value={fmt(stats.pendingPayable)} sub="تعهدات آتی" icon={ArrowUpRight} color="bg-purple-500" />
                <KpiCard title="بدهی مشتریان" value={fmt(stats.totalDebt)} sub={`${customers.filter(c => c.balance > 0).length} بدهکار`} icon={Users} color="bg-rose-500" />
            </div>

            {/* ═══ ROW 2: امروز + Charts + Quick Actions ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

                {/* Today Snapshot */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Star} title="امروز" color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/20" />
                    <div className="p-3 space-y-2 flex-1">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-neutral-800">
                            <span className="text-xs text-gray-500">فروش</span>
                            <div className="text-left">
                                <div className="text-sm font-black font-mono text-emerald-600">{fmt(stats.todaySaleAmt)}</div>
                                <div className="text-[9px] text-gray-400">{stats.todaySalesCount} فاکتور</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-neutral-800">
                            <span className="text-xs text-gray-500">واریز بانکی</span>
                            <span className="text-sm font-bold font-mono text-blue-600">{fmt(stats.todayIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-neutral-800">
                            <span className="text-xs text-gray-500">هزینه</span>
                            <span className="text-sm font-bold font-mono text-red-500">{fmt(stats.todayExpense)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" />کم‌موجودی</span>
                            <div className="text-left">
                                <span className="text-sm font-bold font-mono text-amber-600">{stats.lowStockCount}</span>
                                {stats.outOfStock > 0 && <span className="text-[9px] text-red-500 block">{stats.outOfStock} ناموجود</span>}
                            </div>
                        </div>
                    </div>
                    {/* Quick Actions mini */}
                    <div className="grid grid-cols-2 gap-1 p-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                        <QuickAction label="فاکتور فروش" shortcut="F2" icon={ShoppingCart} colorClass="bg-emerald-500" onClick={() => openWindow('فاکتور فروش جدید', 'INVOICE_FORM', { type: 'SALE' })} />
                        <QuickAction label="هزینه/درآمد" shortcut="F3" icon={CreditCard} colorClass="bg-red-500" onClick={() => openWindow('ثبت تراکنش بانکی', 'BANK_TRANSACTION_FORM')} />
                        <QuickAction label="ثبت چک" shortcut="F4" icon={FileText} colorClass="bg-blue-500" onClick={() => openWindow('ثبت چک جدید', 'CHECK_FORM')} />
                        <QuickAction label="مشتری جدید" shortcut="F8" icon={Users} colorClass="bg-purple-500" onClick={() => openWindow('تعریف مشتری جدید', 'CUSTOMER_FORM')} />
                    </div>
                </div>

                {/* Main Area Chart (30 days) */}
                <div className="lg:col-span-2 bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={TrendingUp} title="جریان مالی ۳۰ روز اخیر" color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/10" />
                    <div className="p-3 flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)', fontSize: 11 }} />
                                <Area type="monotone" dataKey="sales"   stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gSales)"   name="فروش" />
                                <Area type="monotone" dataKey="income"  stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#gIncome)" name="واریز" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#gExpense)" name="هزینه" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Bar Chart (6 months) */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Activity} title="فروش ۶ ماه اخیر" color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/10" />
                    <div className="p-3 flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)', fontSize: 11 }} />
                                <Bar dataKey="sales"     name="فروش"  fill="#10b981" radius={[2,2,0,0]} />
                                <Bar dataKey="purchases" name="خرید"  fill="#3b82f6" radius={[2,2,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ═══ ROW 3: Debtors | Top Products | Low Stock ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Top Debtors */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Users} title="بدهکاران برتر" color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/10" />
                    <div className="p-3 space-y-2 flex-1">
                        {topDebtors.length === 0 ? (
                            <div className="flex items-center justify-center h-20 text-xs text-gray-400">همه حساب‌ها تسویه است</div>
                        ) : topDebtors.map(c => (
                            <div key={c.id} className="group">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[55%]">{c.name}</span>
                                    <span className="text-[11px] font-mono font-black text-rose-600">{fmt(c.balance)}</span>
                                </div>
                                <div className="h-1 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-400 dark:bg-rose-600 rounded-full transition-all"
                                         style={{ width: `${Math.min(100, (c.balance / maxDebt) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Selling Products This Month */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Star} title="پرفروش‌ترین کالاهای ماه" color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/10" />
                    <div className="flex-1 overflow-hidden">
                        {topProducts.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-xs text-gray-400">هنوز فروشی ثبت نشده</div>
                        ) : (
                            <table className="w-full text-right">
                                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                    {topProducts.map((p, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 flex items-center justify-center text-[9px] font-black rounded-full shrink-0
                                                        ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400 dark:bg-neutral-800'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-left">
                                                <div className="text-[10px] font-mono font-black text-emerald-600">{fmt(p.revenue)}</div>
                                                <div className="text-[9px] text-gray-400">×{p.qty}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Low Stock */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Archive} title="هشدار موجودی انبار" color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/10" />
                    <div className="flex-1 overflow-hidden">
                        {lowStockItems.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-xs text-gray-400 gap-1">
                                <CheckCircle size={14} className="text-emerald-500" /> موجودی همه کالاها کافی است
                            </div>
                        ) : (
                            <table className="w-full text-right">
                                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                    {lowStockItems.map(p => (
                                        <tr key={p.id}
                                            className="hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                                            onClick={() => openWindow(`ویرایش: ${p.name}`, 'PRODUCT_FORM', { product: p })}>
                                            <td className="px-3 py-2">
                                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{p.name}</div>
                                                <div className="text-[9px] text-gray-400">حداقل: {p.minStockAlert || 5}</div>
                                            </td>
                                            <td className="px-3 py-2 text-left">
                                                <span className={`text-sm font-black font-mono ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                                    {p.stock}
                                                </span>
                                                {p.stock === 0 && (
                                                    <div className="text-[9px] text-red-500 font-bold">ناموجود</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ ROW 4: Upcoming Checks | Recent Activity | Alerts ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Upcoming Checks */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={Clock} title="چک‌های پیش رو" color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/10" />
                    <div className="flex-1 overflow-hidden">
                        {upcomingChecks.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-xs text-gray-400">چکی در پیش رو ندارید</div>
                        ) : (
                            <table className="w-full text-right">
                                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                    {upcomingChecks.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{c.description || c.number}</div>
                                                <div className={`text-[9px] font-bold ${c.type === 'receivable' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {c.type === 'receivable' ? '↓ دریافتی' : '↑ پرداختی'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-left">
                                                <div className="text-[11px] font-mono font-black text-gray-800 dark:text-gray-200">{fmt(c.amount)}</div>
                                                <div className="text-[9px] text-gray-400 font-date">{c.dueDate}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={CalendarClock} title="فعالیت‌های اخیر" color="text-gray-600 dark:text-gray-400" />
                    <div className="flex-1 overflow-hidden">
                        <table className="w-full text-right">
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {recentActivity.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                                        <td className="px-3 py-1.5">
                                            <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{item.title}</div>
                                            <div className="text-[9px] text-gray-400 truncate">{item.sub}</div>
                                        </td>
                                        <td className="px-3 py-1.5 text-left whitespace-nowrap">
                                            <div className={`text-[11px] font-mono font-black ${item.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {item.isPositive ? '+' : '−'}{fmt(item.amount)}
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-date">{item.date}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Alerts */}
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col">
                    <SectionHeader icon={AlertTriangle} title="هشدارهای سیستم" color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-950/10" />
                    <div className="flex-1 p-2 space-y-1.5">
                        {/* Real-time low stock alerts */}
                        {stats.outOfStock > 0 && (
                            <div className="text-xs p-2 bg-red-50 dark:bg-red-950/20 border-r-2 border-red-500 flex items-start gap-2">
                                <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-red-700 dark:text-red-400">{stats.outOfStock} کالا ناموجود</div>
                                    <div className="text-red-500 text-[10px]">موجودی صفر رسیده</div>
                                </div>
                            </div>
                        )}
                        {stats.lowStockCount > 0 && (
                            <div className="text-xs p-2 bg-amber-50 dark:bg-amber-950/20 border-r-2 border-amber-400 flex items-start gap-2">
                                <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-amber-700 dark:text-amber-400">{stats.lowStockCount} کالا زیر حد هشدار</div>
                                    <div className="text-amber-600 text-[10px]">نیاز به سفارش مجدد</div>
                                </div>
                            </div>
                        )}
                        {upcomingChecks.filter(c => c.type === 'payable').length > 0 && (
                            <div className="text-xs p-2 bg-purple-50 dark:bg-purple-950/20 border-r-2 border-purple-400 flex items-start gap-2">
                                <ArrowUpRight size={12} className="text-purple-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-purple-700 dark:text-purple-400">
                                        {upcomingChecks.filter(c => c.type === 'payable').length} چک پرداختی پیش رو
                                    </div>
                                    <div className="text-purple-600 text-[10px]">
                                        {fmt(moneySum(upcomingChecks.filter(c => c.type === 'payable').map(c => c.amount)))} ریال
                                    </div>
                                </div>
                            </div>
                        )}
                        {criticalAlerts.map(a => (
                            <div key={a.id} className="text-xs p-2 bg-gray-50 dark:bg-neutral-900 border-r-2 border-red-400">
                                <div className="font-bold text-gray-800 dark:text-gray-200">{a.title}</div>
                                <div className="text-gray-500 text-[10px] truncate">{a.message}</div>
                            </div>
                        ))}
                        {stats.outOfStock === 0 && stats.lowStockCount === 0 && upcomingChecks.filter(c => c.type === 'payable').length === 0 && criticalAlerts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-20 text-xs text-gray-400 gap-1">
                                <CheckCircle size={16} className="text-emerald-500" />
                                همه چیز مرتب است
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
