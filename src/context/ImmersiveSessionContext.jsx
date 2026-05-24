import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ImmersiveSessionContext = createContext(null);

export function ImmersiveSessionProvider({ children }) {
  const [immersive, setImmersive] = useState(false);

  const setImmersiveSession = useCallback((active) => {
    setImmersive(Boolean(active));
  }, []);

  const value = useMemo(
    () => ({ immersive, setImmersiveSession }),
    [immersive, setImmersiveSession],
  );

  return (
    <ImmersiveSessionContext.Provider value={value}>
      {children}
    </ImmersiveSessionContext.Provider>
  );
}

export function useImmersiveSession() {
  const ctx = useContext(ImmersiveSessionContext);
  if (!ctx) {
    return { immersive: false, setImmersiveSession: () => {} };
  }
  return ctx;
}
