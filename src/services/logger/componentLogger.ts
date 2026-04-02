import type {
  ComponentLogEntry,
  ComponentChangeType,
  LogLevel,
  LogFilter,
  LogListener,
} from './types';
import { getLogger } from './core';

export function logComponentCreate(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  reason?: string,
  initialState?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level: 'INFO',
    user: { ...user },
    componentId,
    componentName,
    changeType: 'CREATE',
    reason,
    currentState: initialState || {},
    changedProperties: initialState
      ? Object.keys(initialState).map(key => ({
          key,
          previousValue: undefined,
          newValue: initialState[key],
        }))
      : [],
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentUpdate(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  reason?: string,
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const changedProperties = Object.keys(newState).reduce<Array<{
    key: string;
    previousValue: unknown;
    newValue: unknown;
  }>>((acc, key) => {
    if (JSON.stringify(previousState[key]) !== JSON.stringify(newState[key])) {
      acc.push({
        key,
        previousValue: previousState[key],
        newValue: newState[key],
      });
    }
    return acc;
  }, []);

  const level: LogLevel = changedProperties.length > 5 ? 'WARN' : 'INFO';

  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level,
    user: { ...user },
    componentId,
    componentName,
    changeType: 'UPDATE',
    reason,
    previousState,
    currentState: newState,
    changedProperties,
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentDestroy(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  reason?: string,
  finalState?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level: 'WARN',
    user: { ...user },
    componentId,
    componentName,
    changeType: 'DESTROY',
    reason,
    previousState: finalState,
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentStateChange(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  changeType: ComponentChangeType,
  previousState: Record<string, unknown> | string,
  newState: Record<string, unknown> | string,
  reason?: string,
  level: LogLevel = 'INFO',
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const prevRecord = typeof previousState === 'string'
    ? { value: previousState }
    : previousState;
  const newRecord = typeof newState === 'string'
    ? { value: newState }
    : newState;

  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level,
    user: { ...user },
    componentId,
    componentName,
    changeType,
    reason,
    previousState: prevRecord,
    currentState: newRecord,
    changedProperties:
      typeof prevRecord === 'object' && typeof newRecord === 'object'
        ? Object.keys(newRecord).reduce<Array<{
            key: string;
            previousValue: unknown;
            newValue: unknown;
          }>>((acc, key) => {
            if (JSON.stringify(prevRecord[key]) !== JSON.stringify(newRecord[key])) {
              acc.push({
                key,
                previousValue: (prevRecord as Record<string, unknown>)[key],
                newValue: (newRecord as Record<string, unknown>)[key],
              });
            }
            return acc;
          }, [])
        : [
            {
              key: 'value',
              previousValue: previousState,
              newValue: newState,
            },
          ],
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentMount(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  props?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level: 'DEBUG' as LogLevel,
    user: { ...user },
    componentId,
    componentName,
    changeType: 'MOUNT',
    currentState: props,
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentUnmount(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level: 'DEBUG' as LogLevel,
    user: { ...user },
    componentId,
    componentName,
    changeType: 'UNMOUNT',
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function logComponentEvent(
  componentId: string,
  componentName: string,
  user: { id: string | null; username: string },
  eventType: string,
  eventData?: Record<string, unknown>,
  reason?: string,
  metadata?: Record<string, unknown>
): ComponentLogEntry {
  const entry: ComponentLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'COMPONENT',
    level: 'INFO',
    user: { ...user },
    componentId,
    componentName,
    changeType: 'EVENT_TRIGGER',
    reason,
    currentState: { eventType, eventData },
    metadata,
  };

  const logger = getLogger();
  logger.addComponentLog(entry as Parameters<typeof logger.addComponentLog>[0]);
  return entry;
}

export function getComponentLogs(filter?: LogFilter): ComponentLogEntry[] {
  const logger = getLogger();
  return logger.getComponentLogs(filter) as ComponentLogEntry[];
}

export function addComponentLogListener(
  listener: LogListener<ComponentLogEntry>
): () => void {
  const logger = getLogger();
  return logger.addGlobalListener(listener as LogListener<import('./types').HierarchicalLogEntry>);
}
