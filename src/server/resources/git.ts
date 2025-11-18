import { exec } from "child_process";
import { promisify } from "util";
import { GitLog } from "../../common/interface";

const execAsync = promisify(exec);

export const getGitLog = async (branchName:string, lines = 1) => {
  if (!branchName) {
    return [];
  }

  const delim = "|";
  const { stdout } = await execAsync(
    `git log -${lines} ${branchName} --pretty=format:"%H${delim}%aI${delim}%al${delim}%f"`,
  );
  const logs = stdout.split("\n");
  return logs.map((log) => {
    const [commitHash, commitDate, commitAuthor, ...commitMessage] =
      log.split(delim);

    return {
      commitHash,
      commitDate,
      commitAuthor,
      commitMessage: commitMessage.join(delim),
    } satisfies GitLog;
  });
};

export const getLocalBranches = async () => {
  const lines = new Set();
  const { stdout } = await execAsync(
    'git for-each-ref --format="%(refname:short)" refs/heads/',
  );

  stdout
    .split("\n")
    .filter((line) => line)
    .forEach((line) => lines.add(line));

  return Array.from(lines);
};
