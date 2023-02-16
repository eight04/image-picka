Build the extension
===================

Preparation
-----------

1. Install [Node.js](https://nodejs.org/en/). Make sure the `npm` binary is added to the `PATH` environment variable.

2. Test if the installation succeeded. Run `node --version && npm --version`. You should get version numbers like this:
    ```
    v18.7.0
    8.15.0
    ```
    
3. Go to the project root, run `npm install`.

Start building
--------------

Execute the following command:
```
npm run build
```
Extension will be ready under the `build` directory after the task completes.

Testing
--------

Currently, there are two types of tests in this project (`eslint` and `web-ext lint`). Execute them all with the following command:
```
npm test
```

Update translation
------------------

If you want to pull translation from https://www.transifex.com/, you have to install [transifex CLI](https://github.com/transifex/cli).

After `tx` CLI is prepared, run `npm run build-locales`.
  
Generate the ZIP file for AMO
-----------------------------

Before generating the ZIP file, you may want to:

1. Update translation - `npm run build-locales`.
2. Make sure there is no error in the extension - `npm test`.

To generate the ZIP file, run `npm run build-artifact`.

Push a new release to Github
----------------------------

A release is just a commit tagged with a version number. Before bumping the version, you should:

1. Make sure you are on the master branch.
2. Update the changelog in README.md.
3. Commit all the changes.

To bump the version, run [`npm version <newversion>` command](https://docs.npmjs.com/cli/version). After bumping the version, the script will push tag to remote. The script also generates a ZIP file that can be uploaded to AMO.
