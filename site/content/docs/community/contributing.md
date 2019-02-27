---
title: "Contributing"
---

__cli-kit__ is open source under the [MIT license](https://github.com/cb1kenobi/cli-kit/blob/master/LICENSE). You are welcome to use it as you see fit and should you want to contribute something back, then you've come to the right place.

## Issues and Bug Reporting

Found a bug? Feature request? Please create an new [issue](https://github.com/cb1kenobi/cli-kit/issues).

## Source Code

The source code can be found in the [GitHub repo](https://github.com/cb1kenobi/cli-kit). Fork the project to your account.

To get started, you need to install [yarn](https://yarnpkg.com) and [git](https://git-scm.com/).

To clone the repo and install the npm dependencies, run:

```keyvalue
git clone git@github.com:<YOUR_GITHUB_USERNAME>/cli-kit.git
cd cli-kit
git remote add git@github.com:cb1kenobi/cli-kit.git upstream
yarn
```

## Building __cli-kit__

__cli-kit__ uses the gulp task runner, version 4. You can either globally install [gulp](https://www.npmjs.com/package/gulp) or use `npx gulp <task>`.

To build __cli-kit__, simply run:

```keyvalue
gulp build
```

The files will be transpiled from the `./src` directory into the `./dist` directory.

## Testing __cli-kit__

To run the test suite, run:

```keyvalue
gulp test
```

To run the test suite and collect the code coverage report, run:

```keyvalue
gulp coverage
```

You'll find the HTML coverage report in the `./coverage` directory.

Generally, you will want to run the coverage tests to make sure the unit tests are hitting every line of code.

## Website

The entire __cli-kit__ website is also open source! You can find it in the repo's [`site`](https://github.com/cb1kenobi/cli-kit/tree/master/site) directory.

The website is uses [Gatsby.js](https://www.gatsbyjs.org/) and is hosted on GitHub Pages.

```keyvalue
site/
  assets/             Various assets not used directly on the site
  content/
    blog/             Blog posts
    docs/             Documentation
    examples/         Demo code examples
  public/             Contains the generated site; do not edit
  scripts/            Various scripts not used directly on the site
  src/
    components/       Self-contained UI components
    css/              Stylesheets
    images/           Images that are processed during build
    layouts/          Page layouts
    pages/            The homepage, blog post list page, and 404 page
    templates/        Blog and docs page content templates
    html.js           The top-level <html> template
  static/             Static assets such as robots.txt
  gatsby-browser.js   Gatsby.js browser lifecycle related config
  gatsby-config.js    The main Gatsby.js config containing site info and plugins
  gatsby-node.js      Generates the docs and blog pages, Webpack settings
  gatsby-ssr.js       Server-side rendering config
  site-nav.json       Primary and docs navigation structure
```

## Documentation

All of the docs are in the `./site/content/docs` directory and are in Markdown format. With the exception of the API docs, all of the docs are handwritten.

The API related docs are auto-generated from the JSDoc blocks in __cli-kit__'s source code.

If you find any typos or something, a pull request would be much appreciated!
