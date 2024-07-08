import { Context } from "../types";
import axios from "axios";

export async function handleIssueOpened(context: Context) {
  const issue = context.payload.issue;
  const chatTitle = `Task: ${issue.title}`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${context.env.TELEGRAM_BOT_TOKEN}/createChat`, {
      title: chatTitle,
    });
    const chatLink = response.data.result.invite_link;

    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: issue.number,
      body: `A new chat room has been created for this task: ${chatLink}`,
    });

    // Store chat ID and issue number in Supabase
    await context.adapters.supabase.from("chats").insert([{ issue_number: issue.number, chat_id: response.data.result.id }]);
  } catch (error) {
    context.logger.error("Error creating Telegram chat:", error);
  }
}
