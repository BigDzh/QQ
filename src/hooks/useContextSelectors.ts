import { useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

export function useSelector<T>(selector: (state: Record<string, unknown>) => T, equalityFn?: (a: T, b: T) => boolean): T {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useSelector must be used within AppProvider');
  }

  const { projects, tasks, borrowRecords, currentUser, isAuthenticated } = context as {
    projects: unknown;
    tasks: unknown;
    borrowRecords: unknown;
    currentUser: unknown;
    isAuthenticated: unknown;
  };

  const selectedValue = useMemo(() => selector({
    projects,
    tasks,
    borrowRecords,
    currentUser,
    isAuthenticated,
  }), [selector, projects, tasks, borrowRecords, currentUser, isAuthenticated]);

  const prevValueRef = useRef<T>(selectedValue);
  const prevValue = prevValueRef.current;

  const areEqual = equalityFn || ((a: T, b: T) => a === b);

  useEffect(() => {
    if (!areEqual(prevValue, selectedValue)) {
      prevValueRef.current = selectedValue;
    }
  }, [selectedValue, prevValue, areEqual]);

  return areEqual(prevValue, selectedValue) ? prevValue : selectedValue;
}

export function useProjects() {
  return useSelector(state => state.projects);
}

export function useTasks() {
  return useSelector(state => state.tasks);
}

export function useBorrowRecords() {
  return useSelector(state => state.borrowRecords);
}

export function useCurrentUser() {
  return useSelector(state => state.currentUser);
}

export function useIsAuthenticated() {
  return useSelector(state => state.isAuthenticated);
}

export function useProjectSelector<T>(selector: (projects: Record<string, unknown>[]) => T, equalityFn?: (a: T, b: T) => boolean) {
  return useSelector(state => selector(state.projects as Record<string, unknown>[]), equalityFn);
}

export function useTaskSelector<T>(selector: (tasks: Record<string, unknown>[]) => T, equalityFn?: (a: T, b: T) => boolean) {
  return useSelector(state => selector(state.tasks as Record<string, unknown>[]), equalityFn);
}
