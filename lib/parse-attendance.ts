// 「出勤」or「欠勤」が来たらそのまま返す、それ以外はnull
export function parseAttendance(text: string): "出勤" | "欠勤" | null {
  if (text === "出勤") return "出勤";
  if (text === "欠勤") return "欠勤";
  return null;
}
