#!/bin/bash
TEMP=/tmp
REMOTE=file://localhost$PWD/bare
../bin/girror --remote $REMOTE --worktree $TEMP/girror-test-work-1 --verbose || exit 1
find $TEMP/girror-test-work-1 || exit 1
../bin/girror --remote $REMOTE --worktree $TEMP/girror-test-work-2 --verbose --branch branch1 || exit 1
find $TEMP/girror-test-work-2 || exit 1
../bin/girror $REMOTE#branch1 $TEMP/girror-test-work-3 || exit 1
node $PWD/test.js || exit 1
echo "All tests passed"
