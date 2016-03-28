'use strict';

let fs = require('fs');

let gulp = require('gulp');
let git = require('gulp-git');
let bump = require('gulp-bump');
let runSequence = require('run-sequence');
let tag_version = require('gulp-tag-version');
let conventionalChangelog = require('gulp-conventional-changelog');
let conventionalGithubReleaser = require('conventional-github-releaser');
let argv = require('yargs').argv;

const RELEASE_COMMIT_GROUP_NAME = 'Release';
const CONVENTIONAL_CHANGELOG_PRESET = 'angular';

let paths = {
  dest: '.',
  changelog: 'CHANGELOG.md',
  packageJson: 'package.json'
};

gulp.task('github-release', done => {
  conventionalGithubReleaser({
    type: "oauth",
    token: process.env.GITHUB_RELEASE_TOKEN,
    preset: CONVENTIONAL_CHANGELOG_PRESET
  }, null, null, null, null, {
    finalizeContext: context => {
      context.commitGroups = context.commitGroups.filter(group => group.title != RELEASE_COMMIT_GROUP_NAME);
      return context
    },
    headerPartial: ''
  }, done);
});

gulp.task('changelog', () => {
  return gulp.src(paths.changelog, {buffer: false})
    .pipe(conventionalChangelog({
      preset: CONVENTIONAL_CHANGELOG_PRESET,
    }))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('bump', () => {
  console.log(versioning());
  return gulp.src(paths.packageJson)
    .pipe(bump({type: versioning()}))
    .pipe(gulp.dest(paths.dest));

  function versioning() {
    if (argv.minor || argv.feature) {
      return 'minor';
    }
    if (argv.major) {
      return 'major';
    }
    return 'patch';
  }
});

gulp.task('tag-and-push', () => {
  return gulp.src(paths.packageJson)
    .pipe(tag_version())
    .pipe(git.push('origin', 'master', {args: '--tags'}));
});

gulp.task('commit', () => {
  let pkg = require('../package.json');
  const commitMessage = `${RELEASE_COMMIT_GROUP_NAME}: bumped version number to ${pkg.version}`;

  return gulp.src([paths.packageJson, paths.changelog])
    .pipe(git.add())
    .pipe(git.commit(commitMessage));
});

gulp.task('release', callback => {
  if (!process.env.GITHUB_RELEASE_TOKEN) {
    throw new Error('GITHUB_RELEASE_TOKEN was not provided, hence it is impossible to access github');
  }

  runSequence(
    'bump',
    'changelog',
    'commit',
    'tag-and-push',
    'github-release',
    error => {
      if (error) {
        console.log(error.message);
      } else {
        console.log('RELEASED SUCCESSFULLY ʕʘ̅͜ʘ̅ʔ');
      }
      callback(error);
    });
});
