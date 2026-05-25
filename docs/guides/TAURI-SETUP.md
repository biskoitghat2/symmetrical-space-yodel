# راهنمای راه‌اندازی و ساخت نسخه دسکتاپ HesabFlow

## پیش‌نیازها

### 1. نصب Rust
برای ویندوز، از لینک زیر Rust را نصب کنید:
https://www.rust-lang.org/tools/install

یا با دستور زیر:
```bash
winget install Rustlang.Rustup
```

### 2. نصب WebView2 (برای ویندوز)
WebView2 معمولا در ویندوز 10/11 نصب است. اگر نبود:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## دستورات

### اجرای برنامه در حالت توسعه
```bash
npm run tauri:dev
```

### ساخت فایل نصبی (Setup.exe)
```bash
npm run tauri:build
```

فایل نصبی در مسیر زیر ساخته می‌شود:
```
src-tauri/target/release/bundle/nsis/HesabFlow_1.0.0_x64-setup.exe
```

## ویژگی‌های نسخه دسکتاپ

✅ حجم کم (~3-5 MB)
✅ سرعت بالا
✅ ذخیره‌سازی محلی با IndexedDB
✅ پشتیبان‌گیری و بازیابی
✅ بازنشانی کارخانه
✅ نصب آسان با Setup.exe

## توضیحات فنی

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust)
- **Storage**: IndexedDB (idb-keyval)
- **State Management**: Zustand with persist
- **UI**: Tailwind CSS

## نکات مهم

1. برای اولین بار ساخت، Rust باید dependencies را دانلود کند (ممکن است چند دقیقه طول بکشد)
2. فایل نصبی شامل WebView2 نیست و باید جداگانه نصب شود
3. برای توزیع، می‌توانید WebView2 را در installer خود embed کنید

## مشکلات رایج

### خطای "cargo not found"
Rust نصب نشده است. از لینک بالا نصب کنید.

### خطای "WebView2 not found"
WebView2 Runtime را نصب کنید.

### خطای build
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri:build
```
