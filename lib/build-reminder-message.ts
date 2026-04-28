// 名前と時刻から、リマインドメッセージを組み立てる
export function buildReminderMessage(name: string, time: string): string {
  return `${name}さん、本日${time}から出勤予定です。\n出勤する場合は「出勤」、欠勤の場合は「欠勤」と返信してください。`;
}
