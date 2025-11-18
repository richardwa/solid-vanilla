
export const apiPath = '/api';

export const getBranches = async (handler: () => string[]) => handler();

export type GitLog = {
    commitHash: string;
    commitDate: string;
    commitAuthor: string;
    commitMessage: string;
}

export const gitBranchLog = async (handler: (branch:string) => GitLog[], branchName:string) => handler(branchName);

