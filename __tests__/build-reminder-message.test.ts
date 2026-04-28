import { buildReminderMessage } from "@/lib/build-reminder-message";

describe("buildReminderMessage", () => {
  test("名前と時刻からリマインドメッセージを組み立てる", () => {
    const result = buildReminderMessage("きい", "19:00");
    expect(result).toBe(
      "きいさん、本日19:00から出勤予定です。\n出勤する場合は「出勤」、欠勤の場合は「欠勤」と返信してください。",
    );
  });

  test("別の名前と時刻でも正しく組み立てる", () => {
    const result = buildReminderMessage("みき", "20:30");
    expect(result).toBe(
      "みきさん、本日20:30から出勤予定です。\n出勤する場合は「出勤」、欠勤の場合は「欠勤」と返信してください。",
    );
  });
});
