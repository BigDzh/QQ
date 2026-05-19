export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatMemorySize(bytes: number): string {
  return formatBytes(bytes);
}

export function formatTime(ms: number): string {
  if (ms < 1000) return ms.toFixed(0) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}
