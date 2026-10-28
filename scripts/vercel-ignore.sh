#!/usr/bin/env bash
# Vercel ignoreCommand: exit 0 skips the build, exit 1 builds.
# Skip only when nothing outside mobile/ changed since the last deployed
# commit. Vercel clones shallowly, so the previous SHA may be missing; fall
# back to HEAD^ and never exit with anything but 0 or 1 (other codes fail
# the deployment instead of building it).
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  base="HEAD^"
fi
if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  exit 1
fi
if git diff --quiet "$base" HEAD -- . ':(exclude)mobile'; then
  exit 0
fi
exit 1
