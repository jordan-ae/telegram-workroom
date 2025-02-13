import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import { createAdapters } from "./adapters";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { handleIssueOpened } from "./handlers/create_channel";
import { handleIssueClosed } from "./handlers/close_channel";

/**
 * How a worker executes the plugin.
 */
export async function telegramWorkRoom(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: {
      debug(message: unknown, ...optionalParams: unknown[]) {
        console.debug(message, ...optionalParams);
      },
      info(message: unknown, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams);
      },
      warn(message: unknown, ...optionalParams: unknown[]) {
        console.warn(message, ...optionalParams);
      },
      error(message: unknown, ...optionalParams: unknown[]) {
        console.error(message, ...optionalParams);
      },
      fatal(message: unknown, ...optionalParams: unknown[]) {
        console.error(message, ...optionalParams);
      },
    },
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  context.adapters = createAdapters(supabase, context);

  if (context.eventName === "issues.opened") {
    await handleIssueOpened(context);
  } else if (context.eventName === "issues.closed") {
    await handleIssueClosed(context);
  } else {
    context.logger.error(`Unsupported event: ${context.eventName}`);
  }
}
