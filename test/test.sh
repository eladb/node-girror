#!/bin/bash
REMOTE=file://localhost$PWD/bare
../bin/girror --remote $REMOTE --worktree /tmp/girror-test-work-1 --verbose || exit 1
find /tmp/girror-test-work-1 || exit 1
../bin/girror --remote $REMOTE --worktree /tmp/girror-test-work-2 --verbose --branch branch1 || exit 1
find /tmp/girror-test-work-2 || exit 1
