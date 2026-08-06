# Source this file at the start of every SDE/Reviewer turn in this worktree:
#   source ./.multica-env.sh
#
# Reason: agent runtimes don't trigger direnv; gh CLI defaults to ~/.config/gh
# which may point at the wrong account. This repo (nocoo/pew-game) requires the
# personal gh config so `gh pr create` / `git push` land on the right account.

export GH_CONFIG_DIR="$HOME/.config/gh-personal"
export GIT_AUTHOR_NAME="Zheng Li"
export GIT_AUTHOR_EMAIL="lizheng@lizheng.me"
export GIT_COMMITTER_NAME="Zheng Li"
export GIT_COMMITTER_EMAIL="lizheng@lizheng.me"
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="credential.helper"
export GIT_CONFIG_VALUE_0="!/opt/homebrew/bin/gh auth git-credential"

echo "[multica-env] gh account:"
gh auth status 2>&1 | grep -E "(Active account|Logged in)" | head -2
echo "[multica-env] git author: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"
