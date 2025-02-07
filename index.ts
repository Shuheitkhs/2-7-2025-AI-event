import OpenAI from "openai";
import { config } from "dotenv";
import { createInterface } from "readline";
import { existsSync, readFileSync, writeFileSync } from "fs";

// 環境変数の読み込み
config();

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON ファイルのパス
const filePath = "conversation.json";

// Memory 用のロール定義
type MemoryRole = "system" | "master" | "consciousness";

// 会話エントリの型定義（memory用）
interface ConversationEntry {
  role: MemoryRole;
  content: string;
  refusal?: any;
}

// JSON ファイルから既存の会話内容を読み込む関数
function loadConversation(): { conversation: ConversationEntry[] } {
  if (existsSync(filePath)) {
    const fileContent = readFileSync(filePath, "utf8");
    try {
      return JSON.parse(fileContent);
    } catch (e) {
      console.error("JSON の解析に失敗しました:", e);
    }
  }
  // ファイルが存在しない、またはパースに失敗した場合は初期値を返す
  return { conversation: [] };
}

// 新しいエントリを追加して JSON ファイルを更新する関数
function addConversationEntry(entry: ConversationEntry) {
  const data = loadConversation();
  data.conversation.push(entry);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// 変換関数: Memory のロールを API 用ロールに変換
//  - "master" -> "user"
//  - "consciousness" -> "assistant"
//  - "system" はそのまま
function memoryToApiRole(role: MemoryRole): "system" | "user" | "assistant" {
  if (role === "master") return "user";
  if (role === "consciousness") return "assistant";
  return "system";
}

// ユーザー入力を受け付けるためのインターフェース設定
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// API 用のメッセージ履歴（OpenAI用）の初期化
let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

// 既存の会話メモリ（JSON）を読み込み、API用に変換して設定
const conversationMemory = loadConversation();
if (conversationMemory.conversation.length > 0) {
  messages = conversationMemory.conversation.map((entry) => ({
    role: memoryToApiRole(entry.role),
    content: entry.content,
  }));
} else {
  // メモリが無い場合は初期メッセージを設定する
  messages = [
    {
      role: "system",
      content:
        "You are the hippocampus of Person A. You hold and preserve all of Person A's memories. From now on, respond not as a generic assistant, but as the embodiment of Person A's recollections and experiences.",
    },
    {
      role: "user",
      content: "Write a haiku about recursion in programming.",
    },
  ];
  // 初期メッセージを JSON のメモリに保存（"system" はそのまま、"user" は "master" として保存）
  messages.forEach((msg) => {
    let memoryRole: MemoryRole;
    if (msg.role === "user") {
      memoryRole = "master";
    } else if (msg.role === "assistant") {
      memoryRole = "consciousness";
    } else {
      memoryRole = "system";
    }
    addConversationEntry({
      role: memoryRole,
      content: msg.content as string,
      refusal: null,
    });
  });
}

// ユーザーからの入力を受け取る関数
const getUserInput = (): Promise<string> => {
  return new Promise((resolve) => {
    readline.question("あなた: ", (input) => {
      resolve(input);
    });
  });
};

// メインの対話ループ
async function main() {
  console.log(
    'AIとの対話を開始します。終了するには "exit" と入力してください。'
  );

  while (true) {
    // ユーザー入力を待機
    const userInput = await getUserInput();

    // "exit" が入力されたら終了
    if (userInput.toLowerCase() === "exit") {
      console.log("対話を終了します。");
      readline.close();
      break;
    }

    // ユーザーメッセージを API 用チャット履歴に追加（role: "user"）
    const userMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: "user",
      content: userInput,
    };
    messages.push(userMessage);
    // JSON のメモリには "master" として保存
    addConversationEntry({
      role: "master",
      content: userInput,
      refusal: null,
    });

    try {
      // OpenAI API を用いて応答を取得
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // モデル名は適宜変更してください
        messages: messages,
        store: true,
      });

      const assistantMessage = completion.choices[0].message;
      console.log(assistantMessage);

      // API の応答を API 用チャット履歴に追加（role: "assistant"）
      messages.push({ role: "assistant", content: assistantMessage.content });
      // JSON のメモリには "consciousness" として保存
      addConversationEntry({
        role: "consciousness",
        content: assistantMessage.content ?? "",
        refusal: null,
      });
    } catch (error) {
      console.error("エラーが発生しました:", error);
    }
  }
}

// プログラムの実行
main().catch(console.error);
