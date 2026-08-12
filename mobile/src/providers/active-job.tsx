import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'duhat.active-job-id.v1';

type ActiveJobContextValue = {
  activeJobId: string | null;
  hydrated: boolean;
  setActiveJobId: (jobId: string | null) => Promise<void>;
};

const ActiveJobContext = createContext<ActiveJobContextValue | undefined>(undefined);

export function ActiveJobProvider({ children }: PropsWithChildren) {
  const [activeJobId, setJobId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (mounted) {
        setJobId(saved);
        setHydrated(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setActiveJobId = useCallback(async (jobId: string | null) => {
    setJobId(jobId);
    if (jobId) await AsyncStorage.setItem(STORAGE_KEY, jobId);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ activeJobId, hydrated, setActiveJobId }),
    [activeJobId, hydrated, setActiveJobId],
  );
  return <ActiveJobContext.Provider value={value}>{children}</ActiveJobContext.Provider>;
}

export function useActiveJob(): ActiveJobContextValue {
  const context = useContext(ActiveJobContext);
  if (!context) throw new Error('useActiveJob must be inside ActiveJobProvider');
  return context;
}
