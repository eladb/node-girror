#!/bin/bash
TEMP=/tmp
REMOTE=file://localhost$PWD/bare

# run a few command line tests
echo
echo "test: girror --remote <remote> --worktree <worktree> (deprecated)"
../bin/girror --remote $REMOTE --worktree $TEMP/girror-test-work-1 --verbose || exit 1
find $TEMP/girror-test-work-1 || exit 1

echo
echo "test: girror --remote <remote> --worktree <worktree> --branch <branch> (deprecated)"
../bin/girror --remote $REMOTE --worktree $TEMP/girror-test-work-2 --branch branch1 || exit 1
find $TEMP/girror-test-work-2 || exit 1

echo
echo "test: girror <remote>#<branch> <worktree>"
../bin/girror $REMOTE#branch1 $TEMP/girror-test-work-3 || exit 1

echo
echo "test: girror <remote>#<branch> <worktree> --shallow"
../bin/girror $REMOTE#branch1 $TEMP/girror-test-work-3 --shallow --verbose || exit 1


echo
echo "test: girror <worktree>"
../bin/girror $TEMP/girror-test-work-2 || exit 1

echo
echo "test: girror (from a worktree as cwd)"
PREV=$PWD
(cd $TEMP/girror-test-work-1 && $PREV/../bin/girror) || exit 1
cd $PREV

echo
echo "test: girror --find-remote <worktree>"
FOUND_REMOTE=`../bin/girror --find-remote $TEMP/girror-test-work-3`;
[ "xx${FOUND_REMOTE}xx" == "xx${REMOTE}#branch1xx" ] || exit 1

# run node.js tests
node $PWD/test.js || exit 1
echo "All tests passed"
