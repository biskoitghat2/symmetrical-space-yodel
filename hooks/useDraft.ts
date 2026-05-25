import { useState, useEffect, useCallback } from 'react';

export function useDraft<T>(windowId: string, initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const draftKey = `draft-${windowId}`;

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        setState(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, [draftKey]);

  // Save draft on change
  const setDraftState = useCallback((newState: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof newState === 'function' ? (newState as any)(prev) : newState;

      try {
        // Create a shallow copy to remove large fields (like base64 images) before saving to localStorage
        const draftToSave = { ...next } as any;
        if (draftToSave.images) delete draftToSave.images;
        if (draftToSave.photos) delete draftToSave.photos;
        if (draftToSave.logo) delete draftToSave.logo;

        localStorage.setItem(draftKey, JSON.stringify(draftToSave));
      } catch (e) {
        // If we still hit quota limits or other errors, warn but don't crash the app
        console.warn("Failed to save draft to localStorage:", e);
      }

      return next;
    });
  }, [draftKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
  }, [draftKey]);

  return [state, setDraftState, clearDraft] as const;
}