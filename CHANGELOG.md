# Changelog
All notable changes to this project will be documented in this file.

<a name="v4.0.6"></a>
## [v4.0.6](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.5...v4.0.6) - 2021-01-27

### Fixed
* [Fix undefined root constructor args missing instead of being undefined](https://github.com/LinkedSoftwareDependencies/Components.js/commit/de14c611122ddb031d2973d4e667efa5b13bdf45)

<a name="v4.0.5"></a>
## [v4.0.5](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.4...v4.0.5) - 2021-01-18

### Fixed
* [Allow module discovery in packages without package.json](https://github.com/LinkedSoftwareDependencies/Components.js/commit/a0ac0cb47b2ed07ef7a88619133af15ba71f3577)

<a name="v4.0.4"></a>
## [v4.0.4](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.3...v4.0.4) - 2021-01-15

### Changed
* [Bump rdf-parse with updated components.js context URL](https://github.com/LinkedSoftwareDependencies/Components.js/commit/7525a027c683890f30f4e47402c89dcca7dd89d7)

<a name="v4.0.3"></a>
## [v4.0.3](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.2...v4.0.3) - 2021-01-15

### Fixed
* [Fix broken infinite recursion workaround, #31](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e9f2fdc78eca77f3070663c4dc360e93b1f4c0bb)

<a name="v4.0.2"></a>
## [v4.0.2](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.1...v4.0.2) - 2021-01-15

### Fixed
* [Fix instances being created multiple times, Closes #31](https://github.com/LinkedSoftwareDependencies/Components.js/commit/94ce08874b24bf9c64d7f722beb2d5556aa9c7e9)
* [Fix value inheritance happening multiple times](https://github.com/LinkedSoftwareDependencies/Components.js/commit/1855178930d2babd2c3a4c6cdad66087c1db79cd)

<a name="v4.0.1"></a>
## [v4.0.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.0...v4.0.1) - 2021-01-14

### Fixed
* [Fix module resolution failure when outside main module](https://github.com/LinkedSoftwareDependencies/Components.js/commit/2fb4de8abda5d5e91d39942edcc0bafd29acd8ce)

<a name="v4.0.0"></a>
## [v4.0.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.6.0...v4.0.0) - 2021-01-14

This release contains breaking changes in the programmatic API,
but module and configuration files remain backwards-compatible.

### Added
* Developer convenience
    * [Allow `lsd:module` to be set to true in package.json](https://github.com/LinkedSoftwareDependencies/Components.js/commit/afeac8ab11e801376d265d3e42b5df7e113bfce4)
    * [Emit warning when a remote context lookup is being done](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0f3968c26ff5c3d38e3cc8282c6039ff1221b4fd)
    * [Emit warning on potentially invalid parameters in config](https://github.com/LinkedSoftwareDependencies/Components.js/commit/a3ebb95a8d0e18ad062269c47b65cc2d9d1b603a)
    * [Emit warning on potentially invalid IRIs](https://github.com/LinkedSoftwareDependencies/Components.js/commit/18f9f974965d049fd3808ae3a725a36bf264183b)
    * [Generate componentsjs-error-state.json on error](https://github.com/LinkedSoftwareDependencies/Components.js/commit/bd47b17ba3fe82b2486e86bc678d950a9c478d18)
    * [Validate multiple key-value occurences in collectEntries](https://github.com/LinkedSoftwareDependencies/Components.js/commit/ab88b14aa5f2c0c18b34668d6ca1aed8d611de11)
    * [Improve printing of Resources in error reporting](https://github.com/LinkedSoftwareDependencies/Components.js/commit/48d2df7196a1e80e1bb55ac5c6518394b0942d4d)
    * [Rewrite injection of custom JSON-LD document loader](https://github.com/LinkedSoftwareDependencies/Components.js/commit/98ae62f9ddb6589a8651f3a4b9bac6b2bb6642b4)
    * [Migrate RDF loading logic to rdf-object](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e5eb9d27e04a4a333487d5805ce5b0d17cd578a7)

### Changed
* [Use rdfs:seeAlso instead of owl:imports for importing](https://github.com/LinkedSoftwareDependencies/Components.js/commit/4e4227cca2c588e008259440e211af90e6756949)
* [Handle semver on multiple occurrences of module packages](https://github.com/LinkedSoftwareDependencies/Components.js/commit/c8b2e3377d397179505064e43c4408e19447df6f)
* [Improve performance of module state loading through parallelization](https://github.com/LinkedSoftwareDependencies/Components.js/commit/4c475b0ee4d7fae31a818dc72fe28223827fd1f1)
* Refactoring
    * [Accept loading from RDF/JS streams, Closes #1](https://github.com/LinkedSoftwareDependencies/Components.js/commit/749a7e7b5166414f68b5aabd285e5fd747b4dac4)
    * [Add logger](https://github.com/LinkedSoftwareDependencies/Components.js/commit/a5497590d3dabf06c00831f53d95da1554305b10)
    * [Split up Loader into ComponentsManager and loading classes](https://github.com/LinkedSoftwareDependencies/Components.js/commit/687b15c61ea8766b49dadf132fd38b0151f7f6ac)
    * [Split parameter property handling into seperate handlers](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e60a2a8bddc8a89b834cc21db51964bb2f8c3a93)
    * [Create dedicated ParameterHandler component](https://github.com/LinkedSoftwareDependencies/Components.js/commit/408d299f77bc172e61a46d7dfbc4a6c931cecff6)
    * [Reorganize relevant classes into construction package](https://github.com/LinkedSoftwareDependencies/Components.js/commit/aa6b56328fd4442886a82fcad187bd7380c05f27)
    * [Split arguments creation into separate handlers](https://github.com/LinkedSoftwareDependencies/Components.js/commit/f3e995bd603369fb6e21d9be041ce96bec3b475b)
    * [Split constructor args handling into separate handlers](https://github.com/LinkedSoftwareDependencies/Components.js/commit/33f678c5e5df96277243feca893d46882ebdd927)
    * [Refactor component factories as config preprocessors](https://github.com/LinkedSoftwareDependencies/Components.js/commit/181b165f929cfcab206bc6d5ba22032f76d723c8)
    * [Remove Util.PREFIXES in favour if Iris](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0c0c671b18bd8fe2161d56fd39ee8645adc12c63)
    * [Decouple CommonJS instantiation and serialization into strategies](https://github.com/LinkedSoftwareDependencies/Components.js/commit/4756e0ce2f52711d7eb6df7afcc1011da210dbf0)
    * [Decouple instantiation logic from Loader class](https://github.com/LinkedSoftwareDependencies/Components.js/commit/02dd0e64e37c9961be68beba09f03a3b52d0c00f)
    * [Rewrite RdfStreamIncluder as Transform stream](https://github.com/LinkedSoftwareDependencies/Components.js/commit/edf6c61b28f06d2539bcdc8498f10586272a2632)
    * [Delay module registration until finalization phase](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0de3b7940277fd207d7729da4921e62063434e20)
    * [Refactor module loading into ModuleStateBuilder](https://github.com/LinkedSoftwareDependencies/Components.js/commit/6e6e54b498efb3e922466ef9868995926cd20ca8)

### Removed
* [Remove feature to use global modules](https://github.com/LinkedSoftwareDependencies/Components.js/commit/fc0f943ac7e1cda4f84b3a65e2ad05ad1c7c42dc)

### Fixed
* [Fix config compilation using wrong file path](https://github.com/LinkedSoftwareDependencies/Components.js/commit/fd3f806fe9cbb4f74a433e2a31212b5acdddf056)
* [Fix mapped components only keeping first element of root arrays](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0d33a9d88d473f930ce60c80949d13f5679b0df0)

<a name="v3.6.1"></a>
## [v3.6.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.6.0...v3.6.1) - 2020-11-25

### Fixed
* [Fix Array checks.](https://github.com/LinkedSoftwareDependencies/Components.js/commit/fdd48f6910ce395c72607992056f724953729f32)
* [Fix function check.](https://github.com/LinkedSoftwareDependencies/Components.js/commit/b685468cfc9de39c74207a1f79cc9efae2bffa4e)

<a name="v3.6.0"></a>
## [v3.6.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.5.0...v3.6.0) - 2020-09-14

### Added
* [Supporting variables in config compilation](https://github.com/LinkedSoftwareDependencies/Components.js/commit/5eb5def9d77b7755d9e121b07c9d23676684a5f1)

<a name="v3.5.0"></a>
## [v3.5.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.4.2...v3.5.0) - 2020-09-11

### Added
* [Accept variables as parameter values, that can be set at init](https://github.com/LinkedSoftwareDependencies/Components.js/commit/cbd6f115cabf2bfcdcc8466f434d5cf52a4c23d5)

<a name="v3.4.2"></a>
## [v3.4.2](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.4.1...v3.4.2) - 2020-08-27

### Fixed
* [Fix empty list class loading failure](https://github.com/LinkedSoftwareDependencies/Components.js/commit/3590171287d2d765417469ea85012b651c88064b)

<a name="v3.4.1"></a>
## [v3.4.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.4.0...v3.4.1) - 2020-07-01

### Changed
* [Make types proper dependencies](https://github.com/LinkedSoftwareDependencies/Components.js/commit/d50005517d606798de130a6cb2a4a4456683574c)

<a name="v3.4.0"></a>
## [v3.4.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.3.0...v3.4.0) - 2020-04-06

### Added
* [Add requireNoConstructor option for raw requireElements](https://github.com/LinkedSoftwareDependencies/Components.js/commit/2d3144b8baad1464d590b691da10b752f7b83342)

### Fixed
* [Fix incorrect error message for invalid dynamic entries](https://github.com/LinkedSoftwareDependencies/Components.js/commit/91b3a543973c06e3a0f3b6f667cc04a49e499103)

<a name="v3.3.0"></a>
## [v3.3.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.2.1...v3.3.0) - 2019-10-21

### Added
* [Allow requireName to be a relative path inside the module](https://github.com/LinkedSoftwareDependencies/Components.js/commit/562470dfbe6d3b1ab50e1202d8319adfafda024c)

### Changed
* [Return error code on failure to compile](https://github.com/LinkedSoftwareDependencies/Components.js/commit/06aa3420911a41963a97586cabbf34ae477084b1)

<a name="v3.2.1"></a>
## [v3.2.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v3.2.0...v3.2.1) - 2019-02-21

### Fixed
* [Fix issues where context and component files would conflict](https://github.com/LinkedSoftwareDependencies/Components.js/commit/9e4812b23f6bc70099672172d480fc4855775622)
* [Fix incorrect comment context entry](https://github.com/LinkedSoftwareDependencies/Components.js/commit/21873b34a0dfc366f02ee1ad7dbd580795254ba5)

<a name="v3.2.0"></a>
## [v3.2.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/2.0.0...v3.2.0) - 2018-11-13

### Changed
* [Prioritize main modules when instantiating](https://github.com/LinkedSoftwareDependencies/Components.js/commit/c97f104d101f8dac96b501def69698615f58385b)

<a name="v3.1.0"></a>
## [v3.1.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/2.0.0...v3.1.0) - 2018-11-13

_Start tracking of changelog_
