import OpenAI from 'openai';
import { config } from 'dotenv';
import { createInterface } from 'readline';

// 環境変数の読み込み
config();

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ユーザー入力を受け付けるためのインターフェース設定
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// チャット履歴を保持する配列
const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: "system", content: "You are a helpful assistant." },
  {
    role: "user",
    content: "Write a haiku about recursion in programming.",
  }
];

// ユーザーからの入力を受け取る関数
const getUserInput = (): Promise<string> => {
  return new Promise((resolve) => {
    readline.question('あなた: ', (input) => {
      resolve(input);
    });
  });
};

// メインの対話ループ
async function main() {
  console.log('AIとの対話を開始します。終了するには "exit" と入力してください。');

  while (true) {
    // ユーザー入力を待機
    const userInput = await getUserInput();

    // exitが入力されたら終了
    if (userInput.toLowerCase() === 'exit') {
      console.log('対話を終了します。');
      readline.close();
      break;
    }

    // ユーザーメッセージをチャット履歴に追加
    messages.push({ role: 'user', content: userInput });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        store: true,
      });

      console.log(completion.choices[0].message);

      // AIの応答をチャット履歴に追加
      messages.push({ role: 'assistant', content: completion.choices[0].message.content });

    } catch (error) {
      console.error('エラーが発生しました:', error);
    }
  }
}

// プログラムの実行
main().catch(console.error);