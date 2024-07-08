import { Context } from "../types";
import axios from "axios";

export async function handleIssueClosed(context: Context) {
  const issue = context.payload.issue;

  try {
    // Fetch chat ID from Supabase
    const { data, error } = await context.adapters.supabase.from("chats").select("chat_id").eq("issue_number", issue.number).single();

    if (error) throw error;
    const chatId = data.chat_id;

    // Fetch chat history
    const response = await axios.post(`https://api.telegram.org/bot${context.env.TELEGRAM_BOT_TOKEN}/getChatHistory`, {
      chat_id: chatId,
    });
    const chatHistory = response.data.result.messages;

    // Summarize chat history using OpenAI API
    const summary = await getChatSummary(chatHistory, context.env.OPENAI_API_KEY);

    // Post summary to GitHub issue
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: issue.number,
      body: `Task Summary:\n${summary}`,
    });

    // Remove users from the chat and close it
    await closeTelegramChat(chatId, context.env.TELEGRAM_BOT_TOKEN);
  } catch (error) {
    context.logger.error("Error handling issue closed:", error);
  }
}

async function getChatSummary(chatHistory: string[], apiKey: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/engines/davinci-codex/completions",
    {
      prompt: `Summarize the following chat:\n${chatHistory.join("\n")}`,
      max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return response.data.choices[0].text.trim();
}

async function closeTelegramChat(chatId: string, botToken: string) {
  const membersResponse = await axios.post(`https://api.telegram.org/bot${botToken}/getChatMembers`, {
    chat_id: chatId,
  });

  for (const member of membersResponse.data.result) {
    if (member.user.is_bot) continue;
    await axios.post(`https://api.telegram.org/bot${botToken}/kickChatMember`, {
      chat_id: chatId,
      user_id: member.user.id,
    });
  }

  await axios.post(`https://api.telegram.org/bot${botToken}/leaveChat`, {
    chat_id: chatId,
  });
}
