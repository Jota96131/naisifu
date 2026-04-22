import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShiftNewPage from "@/app/shifts/new/page";
import { supabase } from "@/lib/supabase";

// ① Supabaseをまるごと偽物に差し替え
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// ② useRouterを偽物に差し替え
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ③ 型キャスト
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("シフト登録ページ（バリデーション）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // staffテーブル用
  const mockStaffChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  // girlsテーブル取得用
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

  // 初期表示セットアップ
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

  // ============================
  // テスト① 何も入力せずに登録ボタンを押してもinsertが呼ばれない
  // ============================
  test("何も入力せずに登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    // 穴埋め: 登録ボタンをクリック
    fireEvent.click(screen.getByText("登録"));

    // 穴埋め: mockFromが呼ばれていないことを確認
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ============================
  // テスト② 女の子だけ選択して日付・時間が空のまま登録してもinsertが呼ばれない
  // ============================
  test("女の子だけ選択して登録してもinsertが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 女の子を選択
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "girl-1" },
    });

    mockFrom.mockClear();

    // 穴埋め: 登録ボタンをクリック
    fireEvent.click(screen.getByText("登録"));

    // 穴埋め: mockFromが呼ばれていないことを確認
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ============================
  // テスト③ 全部入力して登録するとinsertが呼ばれる
  // ============================
  test("全項目入力して登録するとinsertが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 女の子を選択
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "girl-1" },
    });

    // 日付を入力（type="date" のinput）
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-04-22" } });

    // 時間を入力（type="time" のinput）
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "20:00" } });

    // 登録後のモックをセット
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

    // 穴埋め: 登録ボタンをクリック
    fireEvent.click(screen.getByText("登録"));

    // 穴埋め: shiftsテーブルのinsertが呼ばれたことを確認
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("shifts");
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

    render(<ShiftNewPage />);

    await waitFor(() => {
      expect(screen.getByText("シフト登録")).toBeInTheDocument();
    });
  });
});
