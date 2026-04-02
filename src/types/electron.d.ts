export interface ElectronAPI {
  openMonitorWindow: () => Promise<{ success: boolean }>;
  closeMonitorWindow: () => Promise<{ success: boolean }>;
  toggleMonitorAlwaysOnTop: (value: boolean) => Promise<boolean>;
  isMonitorAlwaysOnTop: () => Promise<boolean>;
  onMonitorStatusChange: (callback: (status: boolean) => void) => void;
  setMonitorPosition: (x: number, y: number) => Promise<{ success: boolean }>;
  minimizeMonitorWindow: () => Promise<{ success: boolean }>;
  closeMonitorWindowIPC: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};