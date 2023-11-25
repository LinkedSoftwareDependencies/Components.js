This page contains several pointers for people that want to contribute to this project.

## Setup development environment

Start by cloning this repository.

```bash
$ git clone git@github.com:LinkedSoftwareDependencies/Components.js.git
```

This project requires [Node.js](https://nodejs.org/en/) `>=16.9` and [Yarn](https://yarnpkg.com/) `>=3.2.4` to be installed. Preferable, use the Yarn version provided and managed by Node.js' integrated [CorePack](https://yarnpkg.com/corepack) by running `corepack enable`.

After that, you can install the project by running `yarn install`. This will automatically also run `yarn build`, which you can run again at any time to compile any changed code.

## Continuous integration

Given the critical nature of this project, we require a full (100%) test coverage.
Additionally, we have configured strict linting rules.

These checks are run automatically upon each commit, and via continuous integration.

You can run them manually as follows:
```bash
$ yarn test
$ yarn lint
```

## Code architecture

The architecture is decomposed into 5 main packages:

1. [`rdf`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/rdf): Interaction with RDF files.
2. [`loading`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/loading): Discovery and loading of components and configs.
3. [`preprocess`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/preprocess): Preprocessing steps on config files before construction.
4. [`construction`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/construction): Construction based on config files.
5. [`util`](https://github.com/LinkedSoftwareDependencies/Components.js/tree/master/lib/util): Various utilities.

Finally, the [`ComponentsManager`](https://github.com/LinkedSoftwareDependencies/Components.js/blob/master/lib/ComponentsManager.ts) class is the main entrypoint for users of this package.
