import { parseAttendance } from "@/lib/parse-attendance";

describe("parseAttendance", () => {
  test("「出勤」が来たら「出勤」を返す", () => {
    expect(parseAttendance("出勤")).toBe("出勤");
  });

  test("「欠勤」が来たら「欠勤」を返す", () => {
    expect(parseAttendance("欠勤")).toBe("欠勤");
  });

  test("それ以外のメッセージは null を返す", () => {
    expect(parseAttendance("こんにちは")).toBe(null);
  });
});
