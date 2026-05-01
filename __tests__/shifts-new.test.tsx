import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShiftNewPage from "@/app/shifts/new/page";
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
}));

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("シフト登録ページ（バリデーション）", () => {
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

  const setupInitialMocks = () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom.mockReturnValueOnce(mockStaffChain()).mockReturnValueOnce(
      mockGirlsSelectChain([
        { id: "girl-1", name: "さくら" },
        { id: "girl-2", name: "ひなた" },
      ]),
    );
  };

  // ボトムシートで女の子を選択するヘルパー
  // 「女の子」「出勤予定時間」の2箇所に「選択してください」があるので、最初の方（女の子）を押す
  const selectGirl = async (name: string) => {
    const triggers = screen.getAllByRole("button", { name: "選択してください" });
    fireEvent.click(triggers[0]);
    await waitFor(() => {
      expect(screen.getByText("女の子を選択")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name }));
  };

  // 日付chipsから日付を選択するヘルパー（「今日」を選ぶ）
  const selectToday = () => {
    fireEvent.click(screen.getByRole("button", { name: /今日/ }));
  };

  // 時間ボトムシートから選択するヘルパー
  // selectGirl 後は女の子側のtriggerは選択済み名前に変わるので、残った「選択してください」が時間
  const selectTime = async (time: string) => {
    fireEvent.click(screen.getByRole("button", { name: "選択してください" }));
    await waitFor(() => {
      expect(screen.getByText("出勤予定時間を選択")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: time }));
  };

  test("何も入力せずに登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト登録")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("女の子だけ選択して登録してもinsertが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト登録")).toBeInTheDocument();
    });

    await selectGirl("さくら");

    mockFrom.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("全項目入力して登録するとinsertが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト登録")).toBeInTheDocument();
    });

    await selectGirl("さくら");
    selectToday();
    await selectTime("20:00");

    mockFrom
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "shift-1" },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("shifts");
    });
  });

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

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト登録")).toBeInTheDocument();
    });
  });
});
