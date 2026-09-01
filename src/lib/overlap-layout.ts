export type OverlapItem = { id: string; top: number; height: number };
export type OverlapSlot = { col: number; cols: number };

// 同一欄裡時間重疊的色塊要並排顯示（像 Google Calendar），不能疊在一起互相蓋住。
// 演算法：依開始時間排序 → 把「連鎖重疊」的分成一群（cluster）→ 群內用貪婪演算法塞欄位。
export function layoutOverlaps(items: OverlapItem[]): Map<string, OverlapSlot> {
  const result = new Map<string, OverlapSlot>();
  const sorted = [...items].sort((a, b) => a.top - b.top || b.height - a.height);

  let cluster: OverlapItem[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const placed: { item: OverlapItem; col: number }[] = [];

    for (const item of cluster) {
      let col = columnEnds.findIndex((end) => end <= item.top);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.top + item.height);
      } else {
        columnEnds[col] = item.top + item.height;
      }
      placed.push({ item, col });
    }

    const cols = columnEnds.length;
    for (const { item, col } of placed) result.set(item.id, { col, cols });
    cluster = [];
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.top >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.top + item.height);
  }
  flush();

  return result;
}
