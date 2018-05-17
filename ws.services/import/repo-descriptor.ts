export interface RepoDescriptor {
  repoNickname: string;
  branch: string;
  hash: string;
  isHEAD?: boolean;
  isDefault?: boolean;
}
