
import React, { useState, useEffect } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { Save, Store, MapPin, Phone, Hash, Download, Upload, RotateCcw, AlertTriangle, X, HardDrive } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { remove, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { DatabaseService } from '../../services/DatabaseService';

interface SettingsFormProps {
  windowId: string;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ windowId }) => {
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const { settings, updateSettings, getDatabasePath, createBackup, restoreBackup, clearAllData } = useDataStore();
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dbPath, setDbPath] = useState<string>('');
  const [resetConfirmText, setResetConfirmText] = useState('');

  useEffect(() => {
    // دریافت مسیر دیتابیس
    getDatabasePath().then(setDbPath).catch(console.error);
  }, [getDatabasePath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const oldScale = settings.uiScale;
    const newScale = formData.uiScale;
    
    updateSettings(formData);
    showToast('success', 'تنظیمات سیستم با موفقیت ذخیره شد');
    closeWindow(windowId);
    
    // If UI scale changed, reload the page to apply it
    if (oldScale !== newScale) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  // Backup: Create backup using Tauri dialog
  const handleBackup = async () => {
    try {
      const filePath = await save({
        filters: [{
          name: 'Database',
          extensions: ['db']
        }],
        defaultPath: `hesabflow-backup-${new Date().toISOString().split('T')[0]}.db`
      });

      if (filePath) {
        await createBackup(filePath);
        showToast('success', `نسخه پشتیبان ایجاد شد`);
      }
    } catch (error) {
      console.error('Backup error:', error);
      showToast('error', 'خطا در ایجاد نسخه پشتیبان');
    }
  };

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedRestorePath, setSelectedRestorePath] = useState<string | null>(null);

  // Restore: Load backup from user-selected file
  const handleRestore = async () => {
    try {
      const filePath = await open({
        filters: [{
          name: 'Database',
          extensions: ['db']
        }],
        multiple: false
      });

      if (filePath && typeof filePath === 'string') {
        setSelectedRestorePath(filePath);
        setShowRestoreConfirm(true); // Show warning before executing
      }
    } catch (error) {
      console.error('Restore error:', error);
      showToast('error', 'خطا در انتخاب فایل پشتیبان');
    }
  };

  const confirmRestore = async () => {
    if (!selectedRestorePath) return;

    setShowRestoreConfirm(false);
    showToast('warning', 'در حال بازگردانی اطلاعات...');
    try {
      await restoreBackup(selectedRestorePath);
      showToast('success', 'پشتیبان با موفقیت بازگردانی شد');
      setTimeout(async () => {
        try {
          await DatabaseService.close();
        } catch (e) {
          console.warn('Error closing db before reload:', e);
        }
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Restore execution error:', error);
      showToast('error', 'خطا در بازگردانی پشتیبان کشف شد');
    } finally {
      setSelectedRestorePath(null);
    }
  };

  // Factory Reset
  const handleFactoryReset = () => {
    console.log('🔵 [FACTORY RESET] handleFactoryReset called');
    console.log('🔵 [FACTORY RESET] clearAllData type:', typeof clearAllData);
    console.log('🔵 [FACTORY RESET] clearAllData function:', clearAllData);
    setResetConfirmText(''); // Reset input
    setShowResetConfirm(true);
    console.log('🔵 [FACTORY RESET] Modal should be visible now');
  };

  const confirmFactoryReset = async () => {
    console.log('🔵 [FACTORY RESET] confirmFactoryReset called - START');
    console.log('🔵 [FACTORY RESET] resetConfirmText:', resetConfirmText);

    // Double check
    if (resetConfirmText !== 'تایید') {
      console.log('❌ [FACTORY RESET] Confirmation text does not match!');
      showToast('error', 'لطفاً کلمه "تایید" را وارد کنید');
      return;
    }

    console.log('🔵 [FACTORY RESET] Closing modal...');
    setShowResetConfirm(false);

    console.log('🔵 [FACTORY RESET] Showing toast...');
    showToast('warning', 'در حال پاک‌سازی داده‌ها...');

    try {
      console.log('🔵 [FACTORY RESET] Step 1: About to call clearAllData...');
      console.log('🔵 [FACTORY RESET] clearAllData is:', clearAllData);

      // 1. Clear all data from database using the dataStore method
      await clearAllData();
      console.log('✅ [FACTORY RESET] Step 1 DONE: Database cleared');

      // 2. Remove photos folder
      console.log('🔵 [FACTORY RESET] Step 2: Removing photos folder...');
      try {
        const appData = await appDataDir();
        const photosDir = await join(appData, 'hesabflow_photos');
        console.log('🔵 [FACTORY RESET] Photos dir path:', photosDir);
        if (await exists(photosDir)) {
          await remove(photosDir, { recursive: true });
          console.log('✅ [FACTORY RESET] Step 2 DONE: Photos folder removed');
        } else {
          console.log('ℹ️ [FACTORY RESET] Step 2 SKIP: Photos folder does not exist');
        }
      } catch (e) {
        console.warn('⚠️ [FACTORY RESET] Step 2 WARNING: Could not remove photos folder:', e);
      }

      // 3. Clear localStorage (migration flags, setup flags, etc.)
      console.log('🔵 [FACTORY RESET] Step 3: Clearing localStorage...');
      localStorage.clear();
      console.log('✅ [FACTORY RESET] Step 3 DONE: localStorage cleared');

      // 4. Close database connection before reloading
      console.log('🔵 [FACTORY RESET] Step 4: Closing database connection...');
      try {
        await DatabaseService.close();
        console.log('✅ [FACTORY RESET] Step 4 DONE: Database connection closed');
      } catch (e) {
        console.warn('⚠️ [FACTORY RESET] Step 4 WARNING: Error closing database:', e);
      }

      console.log('✅ [FACTORY RESET] ALL STEPS COMPLETE');
      showToast('success', 'تمام داده‌ها پاک شد. در حال راه‌اندازی مجدد...');

      // 5. Reload the app after a short delay
      console.log('🔵 [FACTORY RESET] Scheduling reload in 1.2 seconds...');
      setTimeout(() => {
        console.log('🔵 [FACTORY RESET] RELOADING NOW...');
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error('❌ [FACTORY RESET] ERROR:', error);
      console.error('❌ [FACTORY RESET] Error type:', typeof error);
      console.error('❌ [FACTORY RESET] Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('❌ [FACTORY RESET] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [FACTORY RESET] Error stack:', error instanceof Error ? error.stack : 'No stack');
      showToast('error', `خطا در پاک‌سازی داده‌ها: ${error instanceof Error ? error.message : 'خطای نامشخص'}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-gray-50 dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Shop Identity */}
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
            <Store size={18} className="text-blue-600" />
            مشخصات کسب‌وکار (سربرگ فاکتور)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نام فروشگاه / شرکت</label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full p-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm focus:border-blue-500 outline-none"
                placeholder="نامی که در بالای فاکتور چاپ می‌شود"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">تلفن تماس</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.shopPhone}
                  onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                  className="w-full p-2 pl-8 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm font-mono focus:border-blue-500 outline-none"
                  placeholder="021-xxxxxxxx"
                />
                <Phone size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Legal Info */}
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
            <Hash size={18} className="text-emerald-600" />
            اطلاعات حقوقی و مالیاتی
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">کد اقتصادی (Tax ID)</label>
              <input
                type="text"
                value={formData.shopTaxId || ''}
                onChange={(e) => setFormData({ ...formData, shopTaxId: e.target.value })}
                className="w-full p-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">کد پستی</label>
              <input
                type="text"
                value={formData.shopPostalCode || ''}
                onChange={(e) => setFormData({ ...formData, shopPostalCode: e.target.value })}
                className="w-full p-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">درصد مالیات بر ارزش افزوده</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.vatPercent}
                  onChange={(e) => setFormData({ ...formData, vatPercent: Number(e.target.value) })}
                  className="w-full p-2 pl-8 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm font-mono text-center font-bold focus:border-blue-500 outline-none"
                />
                <span className="absolute left-3 top-2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
            <MapPin size={18} className="text-red-500" />
            آدرس
          </h3>
          <textarea
            value={formData.shopAddress}
            onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
            className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded text-sm h-24 resize-none focus:border-blue-500 outline-none"
            placeholder="آدرس دقیق پستی..."
          />
        </div>

        {/* UI Scale / Zoom */}
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            بزرگنمایی رابط کاربری (Zoom)
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">مقیاس نمایش:</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded">
                {formData.uiScale}%
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={formData.uiScale}
              onChange={(e) => setFormData({ ...formData, uiScale: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>50%</span>
              <span>75%</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">100%</span>
              <span>125%</span>
              <span>150%</span>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded p-3 text-xs text-indigo-800 dark:text-indigo-200">
              <strong>توضیح:</strong> این تنظیم برای صفحه‌نمایش‌های با وضوح پایین یا کاربرانی که نیاز به بزرگنمایی دارند مفید است. پس از ذخیره، صفحه به‌طور خودکار بارگذاری مجدد می‌شود.
              <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-900/30">
                <strong>میانبرهای کیبورد:</strong>
                <div className="flex gap-4 mt-1 flex-wrap">
                  <span className="bg-white dark:bg-indigo-900/20 px-2 py-1 rounded font-mono text-[10px]">Ctrl + +</span>
                  <span>بزرگنمایی</span>
                  <span className="bg-white dark:bg-indigo-900/20 px-2 py-1 rounded font-mono text-[10px]">Ctrl + -</span>
                  <span>کوچک‌نمایی</span>
                  <span className="bg-white dark:bg-indigo-900/20 px-2 py-1 rounded font-mono text-[10px]">Ctrl + 0</span>
                  <span>بازگشت به حالت عادی</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-white dark:bg-surface p-4 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
            <HardDrive size={18} className="text-purple-600" />
            مدیریت دیتا و پشتیبان‌گیری
          </h3>

          <div className="space-y-4">
            {/* Data Info */}
            <div className="bg-gray-50 dark:bg-neutral-900 p-3 rounded border border-gray-200 dark:border-neutral-800">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">مسیر دیتابیس:</span>
                  <span className="font-mono text-gray-900 dark:text-white text-[10px] bg-white dark:bg-black px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 max-w-md truncate" title={dbPath}>
                    {dbPath || 'در حال بارگذاری...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleBackup}
                className="px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors rounded shadow text-sm font-bold flex flex-col items-center justify-center gap-1"
              >
                <Download size={18} />
                <span className="text-xs">ایجاد پشتیبان</span>
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className="px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded shadow text-sm font-bold flex flex-col items-center justify-center gap-1"
              >
                <Upload size={18} />
                <span className="text-xs">بازگردانی</span>
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <div><strong>ایجاد پشتیبان:</strong> ذخیره کپی از دیتابیس در مسیر دلخواه</div>
              <div><strong>بازگردانی:</strong> بارگذاری دیتابیس از فایل پشتیبان</div>
            </div>
          </div>
        </div>

        {/* Factory Reset */}
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900/30 shadow-sm">
          <h3 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2 border-b border-red-200 dark:border-red-900/30 pb-2">
            <AlertTriangle size={18} />
            منطقه خطر
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-red-600 dark:text-red-300">
              بازنشانی کارخانه تمام اطلاعات برنامه را پاک می‌کند و به حالت اولیه برمی‌گرداند. این عملیات غیرقابل بازگشت است!
            </p>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="w-full px-4 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors rounded shadow text-sm font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              بازنشانی کارخانه
            </button>
          </div>
        </div>

      </div>

      {/* Confirm Modal for Factory Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-neutral-900 border-2 border-red-500 w-full max-w-md shadow-2xl p-6 rounded-lg z-10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">بازنشانی کارخانه</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  آیا مطمئن هستید؟ تمام اطلاعات برنامه (فاکتورها، محصولات، مشتریان، تراکنش‌ها و ...) پاک خواهد شد و این عملیات غیرقابل بازگشت است!
                </p>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                    برای تایید، کلمه <span className="text-red-600 bg-red-50 dark:bg-red-900/40 px-1 rounded">تایید</span> را وارد کنید:
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      console.log('🔵 [INPUT] User typed:', inputValue);
                      console.log('🔵 [INPUT] Comparing with: "تایید"');
                      console.log('🔵 [INPUT] Match:', inputValue === 'تایید');
                      setResetConfirmText(inputValue);
                    }}
                    className="w-full p-2 bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded text-sm focus:border-red-500 outline-none"
                    placeholder="تایید"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔵 [FACTORY RESET] Cancel button clicked');
                      setShowResetConfirm(false);
                      setResetConfirmText('');
                    }}
                    className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors rounded border border-gray-300 dark:border-neutral-700"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    disabled={resetConfirmText !== 'تایید'}
                    onClick={() => {
                      console.log('🔵 [FACTORY RESET] Confirm button clicked!');
                      console.log('🔵 [FACTORY RESET] resetConfirmText:', resetConfirmText);
                      confirmFactoryReset();
                    }}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors rounded shadow-md"
                  >
                    بله، پاک کن
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Restore Backup */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowRestoreConfirm(false);
              setSelectedRestorePath(null);
            }}
          />
          <div className="relative bg-white dark:bg-neutral-900 border-2 border-red-500 w-full max-w-md shadow-2xl p-6 rounded-lg z-10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">هشدار انتقال داده</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-bold text-justify">
                  با این کار <span className="text-red-600">تمامی اطلاعات فعلی</span> نرم افزار شما به طور کامل پاک شده و اطلاعات فایل بکاپ (پشتیبان) <span className="text-blue-600">جایگزین (Overwrite)</span> آن خواهد شد.
                  <br /><br />
                  آیا از این کار اطمینان دارید؟
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setSelectedRestorePath(null);
                    }}
                    className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors rounded border border-gray-300 dark:border-neutral-700"
                  >
                    خیر، انصراف
                  </button>
                  <button
                    type="button"
                    onClick={confirmRestore}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors rounded shadow-md"
                  >
                    بله، اطلاعات جایگزین شود
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded shadow-lg text-sm font-bold flex items-center gap-2"
        >
          <Save size={18} />
          ذخیره تغییرات
        </button>
      </div>
    </form>
  );
};
