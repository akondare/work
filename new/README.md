# React Project Template

This is a project template for a React project that comes setup with the following:

-   [Typescript](https://www.typescriptlang.org/)
-   [Bootstrap](https://getbootstrap.com/docs/3.3/getting-started/)
-   [Sass](http://sass-lang.com/)
-   [Redux](https://redux.js.org/)

Also includes gulp scripts for setting up a development server and building a production WAR file.

## Creating a new project from this template

1.  Run `git clone git@cb-gitlab:common/react-ts-template.git my-new-project`

    This will create a new folder called `my-new-project` in the directory you ran the command from.

2.  Delete `.git` in the `my-new-project` folder
3.  `cd` into new folder then run `git init` to create your new git repository.
4.  Run `git remote add origin <url-to-new-gitlab-project>`
5.  `git add -A` to stage everything
6.  `git commit -m "Initial commit"`
7.  `git push -u origin master` to push to GitLab

## Setup

1.  Update the project name and description in `package.json`
2.  Change any desired settings (such as production WAR file name) in `config/gulp.config.js`
3.  If you don't have [Yarn](https://yarnpkg.com/en/), install it (run `yarn -v` to check the version).
4.  Run `yarn run setup` to install the necessary packages. This will also start the dev server.
5.  Navigate to `http://localhost:3000/` in your browser (assuming `devAddress` and `devPort` are unchanged in `config/gulp.config.js`)

## Development

Run `yarn start` to start the dev server

### Static files

Static files (such as images) should be placed in `assets/`

### External sources

Third party or standalone script files can either be placed in `assets/` or in `lib/`.

## Production

`yarn run build` will create a minified production .war file in the `dist` folder.

`yarn run build-unminified` will create an unminified production .war file (source maps included).

## Testing

Run `yarn run test` to run all tests in the project.

Jest configuration files are located in `config/`
