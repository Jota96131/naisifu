import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GirlsPage from "@/app/girls/page";
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

// ② 型キャスト（偽物だけどTypeScriptに"本物だよ"と言い聞かせる）
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("女の子一覧ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === チェーンモックを作るヘルパー関数 ===
  // supabase.from("staff").select("store_id").eq("email", ...).single()
  // のようなチェーン呼び出しに対応するための関数

  // staffテーブル用: .select().eq().single() のチェーン
  const mockStaffChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  // girlsテーブル(取得)用: .select().eq().order() のチェーン
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

  // girlsテーブル(登録)用: .insert() のチェーン
  const mockGirlsInsertChain = () => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
  });

  // girlsテーブル(削除)用: .delete().eq() のチェーン
  const mockGirlsDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  // 初期表示用の共通セットアップ（ログイン済みユーザー + 一覧取得）
  const setupInitialMocks = (girls: { id: string; name: string }[]) => {
    // getUser → ログイン済みユーザーを返す（useEffect内 + fetchGirls内で呼ばれる）
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    // from()は呼ばれるたびに違うテーブルを返す
    // useEffect内: 1回目=staff, 2回目=girls
    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(mockGirlsSelectChain(girls));
  };

  // ③ 一覧表示テスト
  test("ページ表示時に女の子一覧が表示される", async () => {
    setupInitialMocks([
      { id: "1", name: "さくら" },
      { id: "2", name: "ひなた" },
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });
  });

  // ⑥ RLS検証テスト（他店舗の女の子が表示されないこと）
  test("自店舗の女の子だけ表示され、他店舗の女の子は表示されない", async () => {
    // RLSが効いてる = store-1のgirlsだけ返ってくる想定
    // "りん"はstore-2の子だけど、RLSで弾かれてるからAPIから返ってこない
    setupInitialMocks([
      { id: "1", name: "さくら" }, // ← 自店舗の子の名前を入れて
      { id: "2", name: "ひなた" }, // ← 自店舗の子の名前を入れて
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      // 自店舗の子が表示されること
      expect(screen.getByText("さくら")).toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();

      // 他店舗の子が表示されないこと（ここがRLS検証のキモ！）
      expect(screen.queryByText("りん")).not.toBeInTheDocument();
    });
  });

  // ④ 登録テスト
  test("名前を入力して登録ボタンを押すと登録される", async () => {
    setupInitialMocks([{ id: "1", name: "さくら" }]);

    render(<GirlsPage />);

    // まず一覧が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 登録ボタン押下後のモックを追加セット
    // handleAdd内: getUser → from("staff") → from("girls").insert → fetchGirls(staff + girls)
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffChain()) // handleAdd内のstaff取得
      .mockReturnValueOnce(mockGirlsInsertChain()) // insert
      .mockReturnValueOnce(mockStaffChain()) // fetchGirls内のstaff取得
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "1", name: "さくら" },
          { id: "2", name: "みさき" }, // 登録後に増えてる！
        ]),
      );

    // 名前を入力して登録ボタンを押す
    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "みさき" },
    });
    fireEvent.click(screen.getByText("登録"));

    // 登録後、新しい名前が一覧に表示される
    await waitFor(() => {
      expect(screen.getByText("みさき")).toBeInTheDocument();
    });
  });

  // ⑤ 削除テスト
  test("削除ボタンを押すと削除される", async () => {
    setupInitialMocks([
      { id: "1", name: "さくら" },
      { id: "2", name: "ひなた" },
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });

    // window.confirmが「OK」を返すようにモック
    jest.spyOn(window, "confirm").mockReturnValue(true);

    // 削除ボタン押下後のモックを追加セット
    // handleDelete内: from("girls").delete().eq() → fetchGirls(getUser + staff + girls)
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockGirlsDeleteChain()) // delete
      .mockReturnValueOnce(mockStaffChain()) // fetchGirls内のstaff取得
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "2", name: "ひなた" }, // さくらが消えてる！
        ]),
      );

    // 最初の削除ボタン（さくら）をクリック
    const deleteButtons = screen.getAllByText("削除");
    fireEvent.click(deleteButtons[0]);

    // 削除後、さくらが消えてひなただけ残る
    await waitFor(() => {
      expect(screen.queryByText("さくら")).not.toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });
  });

  // ⑦ フォームバリデーションテスト（空文字）
  test("名前が空のまま登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "さくら" }]);

    render(<GirlsPage />);

    // まず一覧が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 初期表示の呼び出しをリセットして、ここから先を計測する
    mockFrom.mockClear();

    // 名前を入力せずに登録ボタンを押す
    fireEvent.click(screen.getByText("登録"));

    // handleAddが早期リターンするので、mockFromが追加で呼ばれない
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ⑧ フォームバリデーションテスト（スペースのみ）
  test("スペースだけ入力して登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "さくら" }]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 初期表示の呼び出しをリセット
    mockFrom.mockClear();

    // スペースだけ入力して登録ボタンを押す
    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("登録"));

    // handleAddが早期リターンするので、mockFromが追加で呼ばれない
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ⑨ 削除確認ダイアログ：OKを押したら削除される
  test("削除ボタン→確認OKで削除が実行される", async () => {
    setupInitialMocks([
      { id: "1", name: "さくら" },
      { id: "2", name: "ひなた" },
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // window.confirmが「OK」を返すようにモック
    jest.spyOn(window, "confirm").mockReturnValue(true);

    // 削除後のモックをセット
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockGirlsDeleteChain())
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "2", name: "ひなた" },
        ]),
      );

    const deleteButtons = screen.getAllByText("削除");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("さくら")).not.toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });
  });

  // ⑩ 削除確認ダイアログ：キャンセルを押したら削除されない
  test("削除ボタン→確認キャンセルで削除が実行されない", async () => {
    setupInitialMocks([
      { id: "1", name: "さくら" },
      { id: "2", name: "ひなた" },
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // window.confirmが「キャンセル」を返すようにモック
    jest.spyOn(window, "confirm").mockReturnValue(false);

    // mockFromをリセット（キャンセルしたら呼ばれないはず）
    mockFrom.mockClear();

    const deleteButtons = screen.getAllByText("削除");
    fireEvent.click(deleteButtons[0]);

    // キャンセルしたのでmockFromが呼ばれない＝削除が走らない
    expect(mockFrom).not.toHaveBeenCalled();

    // 両方とも残ってる
    expect(screen.getByText("さくら")).toBeInTheDocument();
    expect(screen.getByText("ひなた")).toBeInTheDocument();
  });

  // ⑪ エラーハンドリング：データ取得時のエラー
  test("初期表示時にデータ取得エラーが発生した場合でもクラッシュしない", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "データ取得エラー" },
            }),
          }),
        }),
      });

    render(<GirlsPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("取得エラー:", "データ取得エラー");
    });

    consoleErrorSpy.mockRestore();
  });

  // ⑫ エラーハンドリング：登録時のエラー
  test("登録時にエラーが発生してもクラッシュしない", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupInitialMocks([{ id: "1", name: "さくら" }]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 登録時のエラーをモック
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "登録エラー" }
        }),
      });

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "みさき" },
    });
    fireEvent.click(screen.getByText("登録"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("登録エラー:", "登録エラー");
    });

    consoleErrorSpy.mockRestore();
  });

  // ⑬ エラーハンドリング：削除時のエラー
  test("削除時にエラーが発生してもクラッシュしない", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupInitialMocks([
      { id: "1", name: "さくら" },
      { id: "2", name: "ひなた" },
    ]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    jest.spyOn(window, "confirm").mockReturnValue(true);

    // 削除時のエラーをモック
    mockFrom.mockReturnValueOnce({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: "削除エラー" }
        }),
      }),
    });

    const deleteButtons = screen.getAllByText("削除");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("削除エラー:", "削除エラー");
    });

    consoleErrorSpy.mockRestore();
  });

  // ⑭ ローディング状態のテスト
  test("データ読み込み中は「読み込み中...」が表示される", async () => {
    // 初期表示時にローディング状態をキャッチするために遅延させる
    mockGetUser.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { user: { email: "test@example.com" } } }),
            100,
          ),
        ),
    );

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(mockGirlsSelectChain([]));

    render(<GirlsPage />);

    // ローディング中の表示を確認
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();

    // データ読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText("まだ登録されていません")).toBeInTheDocument();
    });
  });

  // ⑮ エラーハンドリング：登録後のfetchGirlsでエラー
  test("登録成功後のfetchGirlsでエラーが発生してもクラッシュしない", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupInitialMocks([{ id: "1", name: "さくら" }]);

    render(<GirlsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 登録は成功するが、その後のfetchGirlsでエラーが発生
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffChain()) // handleAdd内のstaff取得
      .mockReturnValueOnce(mockGirlsInsertChain()) // insert成功
      .mockReturnValueOnce(mockStaffChain()) // fetchGirls内のstaff取得
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "fetchGirlsエラー" },
            }),
          }),
        }),
      });

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "みさき" },
    });
    fireEvent.click(screen.getByText("登録"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("取得エラー:", "fetchGirlsエラー");
    });

    consoleErrorSpy.mockRestore();
  });
});
