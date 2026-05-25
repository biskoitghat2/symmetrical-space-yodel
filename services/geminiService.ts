import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeFinances = async (transactions: Transaction[], userQuery: string): Promise<string> => {
  if (!apiKey) {
    return "لطفاً کلید API را تنظیم کنید.";
  }

  const transactionContext = transactions.map(t => 
    `- ${t.date}: ${t.description} (${t.type === 'income' ? 'درآمد' : 'هزینه'}) - ${t.amount.toLocaleString('en-US')} تومان`
  ).join('\n');

  const systemPrompt = `
    شما یک مشاور مالی هوشمند و حرفه‌ای هستید که به زبان فارسی صحبت می‌کنید.
    وظیفه شما تحلیل داده‌های مالی کاربر و پاسخ به سوالات اوست.
    پاسخ‌ها باید کوتاه، دقیق و با لحنی رسمی اما دوستانه باشند.
    از فرمت‌دهی Markdown برای خوانایی بهتر استفاده کنید.
    واحد پول تومان است.
    
    داده‌های تراکنش‌های اخیر:
    ${transactionContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text || "متاسفانه نتوانستم پاسخی تولید کنم.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "خطایی در ارتباط با هوش مصنوعی رخ داد. لطفاً دوباره تلاش کنید.";
  }
};