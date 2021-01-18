This page contains several pointers for people that want to contribute to this project.

## Setup development environment

This project requires [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/) to be installed.
After that, you can clone and install the project as follows:

```bash
$ git clone git@github.com:LinkedSoftwareDependencies/Components.js.git
$ yarn install
```

## Continuous integration

Given the critical nature of this project, we require a full (100%) test coverage.
Additionally, we have configured strict linting rules.

These checks are run automatically upon each commit, and via continuous integration.

You can run them manually as follows:
```bash
$ yarn run test
$ yarn run lint
```

## Code architecture

The architecture is decomposed into 5 main packages:

1. [`rdf`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/rdf): Interaction with RDF files.
2. [`loading`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/loading): Discovery and loading of components and configs.
3. [`preprocess`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/preprocess): Preprocessing steps on config files before construction.
4. [`construction`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/construction): Construction based on config files.
5. [`util`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/util): Various utilities.

Finally, the [`ComponentsManager`](https://github.com/LinkedSoftwareDependencies/Components.js/blob/master/lib/ComponentsManager.ts) class is the main entrypoint for users of this package.
