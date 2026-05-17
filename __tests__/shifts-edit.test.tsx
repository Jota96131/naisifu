import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShiftEditPage from "@/app/shifts/[id]/edit/page";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "shift-1" }),
}));

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("シフト編集ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStaffChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  const mockGirlsSelectChain = (girls: { id: string; name: string }[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: girls,
          error: null,
        }),
      }),
    }),
  });

  const mockShiftsSingleChain = (shift: {
    id: string;
    girl_id: string;
    scheduled_date: string;
    scheduled_time: string;
  } | null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: shift,
        }),
      }),
    }),
  });

  const mockShiftsUpdateChain = () => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const mockShiftsDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const mockAttendanceDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const setupInitialMocks = (overrides?: { scheduled_time?: string }) => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "girl-1", name: "さくら" },
          { id: "girl-2", name: "ひなた" },
        ]),
      )
      .mockReturnValueOnce(
        mockShiftsSingleChain({
          id: "shift-1",
          girl_id: "girl-1",
          scheduled_date: "2026-04-22",
          scheduled_time: overrides?.scheduled_time ?? "20:00:00",
        }),
      );
  };

  // 既存データが取得されてフォームに表示される（女の子=読み取り専用 / 時間=ボタン表示）
  test("既存データが取得されてフォームに表示される", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      // 女の子は読み取り専用textboxとして表示される
      const girlField = screen.getByRole("textbox", { name: /女の子/ });
      expect(girlField).toHaveTextContent("さくら");
      expect(girlField).toHaveAttribute("aria-readonly", "true");

      // 時間はボタン化されており、HH:MM形式で表示
      expect(
        screen.getByRole("button", { name: /出勤予定時間を選択/ }),
      ).toHaveTextContent("20:00");
    });
  });

  // 秒付きで返ってきた scheduled_time が HH:MM に整形される
  test("DBから返るHH:MM:SSの時刻はHH:MMに整形して表示される", async () => {
    setupInitialMocks({ scheduled_time: "19:45:00" });

    render(<ShiftEditPage />);

    await waitFor(() => {
      const timeBtn = screen.getByRole("button", { name: /出勤予定時間を選択/ });
      expect(timeBtn).toHaveTextContent("19:45");
      expect(timeBtn).not.toHaveTextContent("19:45:00");
    });
  });

  // 女の子のセレクトボックスは存在せず、変更できない
  test("女の子フィールドは読み取り専用で、選択肢を切り替えられない", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /女の子/ }),
      ).toBeInTheDocument();
    });

    // 旧UIの<select>は存在しない
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    // 「変更不可」の補助ラベルが表示されている
    expect(screen.getByText("変更不可")).toBeInTheDocument();
    expect(
      screen.getByText(
        /他の女の子に変更したい場合は、このシフトを削除して新規登録してください/,
      ),
    ).toBeInTheDocument();
  });

  // ボトムシートで時間を変更できる
  test("時間選択ボタンを押すとボトムシートが開き、選んだ時間が反映される", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /出勤予定時間を選択/ }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /出勤予定時間を選択/ }),
    );

    // シート内の「19:30」を選択（timeOptionsは19:00-22:00の15分刻み）
    fireEvent.click(screen.getByRole("button", { name: "19:30" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /出勤予定時間を選択/ }),
      ).toHaveTextContent("19:30");
    });
  });

  // 更新ボタンを押すとupdateが呼ばれる
  test("更新ボタンを押すとupdateが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /女の子/ }),
      ).toHaveTextContent("さくら");
    });

    mockFrom.mockReturnValueOnce(mockShiftsUpdateChain());

    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("shifts");
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  // バリデーション：必須項目が空ならupdateが呼ばれない
  test("必須項目が空のまま更新してもupdateが呼ばれない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([{ id: "girl-1", name: "さくら" }]),
      )
      .mockReturnValueOnce(
        mockShiftsSingleChain({
          id: "shift-1",
          girl_id: "",
          scheduled_date: "",
          scheduled_time: "",
        }),
      );

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト編集")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  // 削除ボタン→ダイアログの「削除する」でdeleteが呼ばれる
  test("削除ボタン→ダイアログの「削除する」でdeleteが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /女の子/ }),
      ).toHaveTextContent("さくら");
    });

    mockFrom
      .mockReturnValueOnce(mockAttendanceDeleteChain())
      .mockReturnValueOnce(mockShiftsDeleteChain());

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "削除する" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("attendance");
      expect(mockFrom).toHaveBeenCalledWith("shifts");
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  // 削除ボタン→ダイアログのキャンセルでdeleteが呼ばれない
  test("削除ボタン→ダイアログのキャンセルでdeleteが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /女の子/ }),
      ).toHaveTextContent("さくら");
    });

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "削除する" }),
      ).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith("/shifts");
    expect(
      screen.queryByRole("button", { name: "削除する" }),
    ).not.toBeInTheDocument();
  });

  // 削除時に attendance → shifts の順で呼ばれる
  test("削除時にattendanceが先に削除されてからshiftsが削除される", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /女の子/ }),
      ).toHaveTextContent("さくら");
    });

    const callOrder: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      callOrder.push(table);
      if (table === "attendance" || table === "shifts") {
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "削除する" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(callOrder).toEqual(["attendance", "shifts"]);
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  // バグ再発防止：staffDataがnullでもクラッシュしない
  test("staffテーブルにユーザーが未登録でもクラッシュしない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "unknown@example.com" } },
    });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
          }),
        }),
      }),
    });

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト編集")).toBeInTheDocument();
    });
  });

  // 防御：shiftDataがnullでもクラッシュしない
  test("該当シフトが存在しなくてもクラッシュしない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([{ id: "girl-1", name: "さくら" }]),
      )
      .mockReturnValueOnce(mockShiftsSingleChain(null));

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト編集")).toBeInTheDocument();
    });
  });
});
