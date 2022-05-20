# Changelog
All notable changes to this project will be documented in this file.

<a name="v5.2.0"></a>
## [v5.2.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.1.0...v5.2.0) - 2022-05-20

### Added
* [Preserve literal values for params with type unknown](https://github.com/LinkedSoftwareDependencies/Components.js/commit/ad52da8afc2340ddc63e8a45c4d560e11ecb3ceb)

<a name="v5.1.0"></a>
## [v5.1.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0...v5.1.0) - 2022-05-10

### Added
* [Expose instantiated resources from ComponentsManager](https://github.com/LinkedSoftwareDependencies/Components.js/commit/19c8d669a081dc413091a413d1c42c71b691cfbc)

<a name="v5.0.1"></a>
## [v5.0.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0...v5.0.1) - 2022-03-02

### Changed
* [Bump to rdf-parse 2](https://github.com/LinkedSoftwareDependencies/Components.js/commit/5957c21d9ea0d8e6086be09d67ee99e64f8b2960)

<a name="v5.0.0"></a>
## [v5.0.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.7...v5.0.0) - 2022-03-01

### Changed
* [Bump context URL to 5.0.0](https://github.com/LinkedSoftwareDependencies/Components.js/commit/495654fa70f559aaaa86a0960686fd1ca23f9546)
* [Add incorrect version number as possible cause for remote lookup failure (#67)](https://github.com/LinkedSoftwareDependencies/Components.js/commit/adf1d7e092b95a2fc47c7d2da3dfe191fdb741aa)

<a name="v5.0.0-beta.7"></a>
## [v5.0.0-beta.7](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.6...v5.0.0-beta.7) - 2022-02-21

### Changed
* [Lower log level of empty modules to debug](https://github.com/LinkedSoftwareDependencies/Components.js/commit/df119861bc12992e05af05b42f0a734069de6915)
* [Bump to rdf-object 1.13.1](https://github.com/LinkedSoftwareDependencies/Components.js/commit/264be522079f86bd47bea9fe5730eaed29bbe450)

### Fixed
* [Fix incorrect error logging when generics error occurs in extends clause](https://github.com/LinkedSoftwareDependencies/Components.js/commit/1ce62d39896ca498ecba7443c9c7c298c9db0301)
* [Fix minor context issues](https://github.com/LinkedSoftwareDependencies/Components.js/commit/7adcd5fe0de73a42c8225069752be40214f843f3)

<a name="v5.0.0-beta.6"></a>
## [v5.0.0-beta.6](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.5...v5.0.0-beta.6) - 2022-02-09

### Fixed
* [Fix generic errors still throwing during ignored type checking](https://github.com/LinkedSoftwareDependencies/Components.js/commit/c14adcf4757e5194db22c0f0285407bd03bf5635)

<a name="v5.0.0-beta.5"></a>
## [v5.0.0-beta.5](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.4...v5.0.0-beta.5) - 2022-02-08

### Added
* [Allow type-checking to be disabled via typeChecking](https://github.com/LinkedSoftwareDependencies/Components.js/commit/a55331085e4c5621832e6b23bc52b00068e8256a)

### Changed
* [Throw error on circular dependencies, Closes #53](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e7a28d1cf87d96d5b58bb6d1f19ce41d6e55aab6)

### Fixed
* [Fix seeAlso links not handling encoded URI components, Closes #43](https://github.com/LinkedSoftwareDependencies/Components.js/commit/2b72914d2720b2982d4570af55f9b5d7dc196c27)

<a name="v5.0.0-beta.4"></a>
## [v5.0.0-beta.4](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.3...v5.0.0-beta.4) - 2022-01-29

### Added
* [Support ParameterRangeIndexed for fixed literals](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0d97782a4a8dcca9fc5bbb3389a4213eca5a5205)

### Changed
* [Propagate original error messages to require calls, Closes #65](https://github.com/LinkedSoftwareDependencies/Components.js/commit/8934ec9b784def601730b3d3f2e60c4ff0b8776e)
* [Include config id in invalid param error message](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e724f44e2222eb9917da3b227e2ce0dc9cde15f9)
* [Update memberKeys to memberFields](https://github.com/LinkedSoftwareDependencies/Components.js/commit/2c7437e1519c1813fb1a29f50d7c20bdbdf7f06e)

<a name="v5.0.0-beta.3"></a>
## [v5.0.0-beta.3](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.2...v5.0.0-beta.3) - 2022-01-17

### Added
* [Add support for wildcard parameter ranges](https://github.com/LinkedSoftwareDependencies/Components.js/commit/83238a9fa08877f29326be562d7d3d5fff860c69)
* Improve error reporting:
  * [Add causes for param check failures in error messages](https://github.com/LinkedSoftwareDependencies/Components.js/commit/9be1fd0899ffb8a77ea99e5fb86e661526ef6d1a)
  * [Improve error message on invalid generic type instantiations](https://github.com/LinkedSoftwareDependencies/Components.js/commit/6ecb9798eeb84f09fece68b3a47454fa8c857ba4)
  * [Move error context to error state file](https://github.com/LinkedSoftwareDependencies/Components.js/commit/dbf26e072bdc63168814ef4d503777efaf4745eb)

### Fixed
* Resolve several issues related to generics:
  * [Throw error on invalid ParameterRangeGenericComponent](https://github.com/LinkedSoftwareDependencies/Components.js/commit/c692ab6175ce466fb32fbe38b973644e2601b2e6)
  * [Fix generic components not accepting specific types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/c7739182fddcb92d46a86fe3e33d6e29fd1134b6)
  * [Support generic type instantiation during component extension](https://github.com/LinkedSoftwareDependencies/Components.js/commit/98f70e350cc3f9bf8a4ea632db546f74624ddda7)
  * [Support generic components in params with fixed generics](https://github.com/LinkedSoftwareDependencies/Components.js/commit/d8b30972e1306e9fe9db391d4693aa6000917e60)
  * [Use GenericComponentExtension to refer to wrapped generic comp extensions](https://github.com/LinkedSoftwareDependencies/Components.js/commit/239895accfdb7f09a7ac8454928bd3e0be5e5f15)
  * [Fix invalid range display with multiple generics](https://github.com/LinkedSoftwareDependencies/Components.js/commit/b98baf0bcf4546b60299ae548f929693345292bc)
  * [Handle range merging if left or right is union](https://github.com/LinkedSoftwareDependencies/Components.js/commit/637e140106691b95f0f546cf88eb39f3f80dc61d)
  * [Handle sub-types when merging param ranges](https://github.com/LinkedSoftwareDependencies/Components.js/commit/43290525b2e244f5fbb6d5f344760b863329c31b)
  * [Allow merging of generic component param types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/ee8de7d9b8d18bf6968a17078e493946e5fca8cd)
  * [Allow param range merging with generic components](https://github.com/LinkedSoftwareDependencies/Components.js/commit/bcea7dcff288ce7068ee244c49c12134208c89da)
  * [Fix generics crash when doing repeated param type checking](https://github.com/LinkedSoftwareDependencies/Components.js/commit/237572cb8a9c546b098582041ccd7a457b41aecd)

<a name="v5.0.0-beta.2"></a>
## [v5.0.0-beta.2](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.1...v5.0.0-beta.2) - 2021-12-09

### Added
* [Handle keyof parameter ranges](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0f55ba05bff5311d111ca97256aaa2e7be7ae83b)

<a name="v5.0.0-beta.1"></a>
## [v5.0.0-beta.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v5.0.0-beta.0...v5.0.0-beta.1) - 2021-12-07

### Added
* [Handle generics in nested components](https://github.com/LinkedSoftwareDependencies/Components.js/commit/d33d4c2668974087873943b3d5c66300fa3df65b)
* [Handle generics in parameter ranges](https://github.com/LinkedSoftwareDependencies/Components.js/commit/d3358b74ab25a3aca13d6dfc97b16cfd836d4ba9)
* [Add generic vocabulary changes to context](https://github.com/LinkedSoftwareDependencies/Components.js/commit/b8af018bb8f344833c07d1ef795a6b08d414c2ad)

<a name="v5.0.0-beta.0"></a>
## [v5.0.0-beta.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.5.0...v5.0.0-beta.0) - 2021-11-30

### BREAKING CHANGES
* [Remove required and unique param flags in favor of parameter ranges](https://github.com/LinkedSoftwareDependencies/Components.js/commit/0df26318e4803b06660b3458fc75d565c4b60f67):
  This allows more complex ranges to be defined, such as nested arrays, or arrays of union types.
  **Because of this change, arrays now must always be explicitly defined within an RDF list (or @list in JSON-LD).**
  If one param value is provided, it is considered a singular value.
  If the param value contains an RDF list, it is considered an array.
  If multiple param values are provided without RDF list, an error is thrown.

### Added
* Validate parameter values by type:
  * [Validate param ranges with union and intersection types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/d08ecdb94051d3e88e7e1ea09f0f77518fb0debf)
  * [Validate types of resource-based param values](https://github.com/LinkedSoftwareDependencies/Components.js/commit/2be90ccb416215261ef9c785e89302f3c4ef9264)
  * [Validate param ranges with tuple types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/05d84c4c1d4bde6bcb5a99d53df4e66ca69536bf)
  * [Validate param ranges with literal types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/7373b0fc06bdaf95a8099b9f58b741cd6f4f1b9d)

### Changed
* [Allow IRIs to be casted to string params](https://github.com/LinkedSoftwareDependencies/Components.js/commit/978985684dcba67629d44bfd0e5cf75293c5ea7a)
* [Allow components to be registered to multiple modules](https://github.com/LinkedSoftwareDependencies/Components.js/commit/e575e64ebd26092a6bb005d837023e35877e9308)
* [Make relative IRIs make use of importPaths-based URLs if possible](https://github.com/LinkedSoftwareDependencies/Components.js/commit/6a2e18c3bf6a1b95f826b66ee0ef8b154f10c3cc)

### Fixed
* [Fix raw JSON values not being serializable to strings](https://github.com/LinkedSoftwareDependencies/Components.js/commit/96fe46eda1e153e87b29689196506ce6fbbdae58)

<a name="v4.5.0"></a>
## [v4.5.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.4.1...v4.5.0) - 2021-08-30

### Changed
* [Migrate to @rdfjs/types](https://github.com/LinkedSoftwareDependencies/Components.js/commit/b2f9f2e0c5512e743b324f48f332d96e4214ec84)

<a name="v4.4.1"></a>
## [v4.4.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.4.0...v4.4.1) - 2021-07-26

### Fixed
* [Fix RDF lists not being accepted for all params](https://github.com/LinkedSoftwareDependencies/Components.js/commit/a01e3c80a3a5ce28180f57e8358327c53774b9ba)

<a name="v4.4.0"></a>
## [v4.4.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.2.1...v4.4.0) - 2021-06-30

### Added
* [Accept RDF lists as argument values, #47](https://github.com/LinkedSoftwareDependencies/Components.js/commit/3501a0fe676d1bc43c2d3ad329fca0adef48c8cd)

### Changed
* [Allow arrays of resources to be passed to ErrorResourcesContext](https://github.com/LinkedSoftwareDependencies/Components.js/commit/aedd53a3e923e030bf0d8433c27f1259183a0a14)

<a name="v4.3.0"></a>
## [v4.3.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.2.1...v4.3.0) - 2021-06-14

### Added
* [Support JSON param ranges via rdf:JSON, Closes #37](https://github.com/LinkedSoftwareDependencies/Components.js/commit/339d2219915bc618991a42adcd8b63a3d6caa9b5)

<a name="v4.2.1"></a>
## [v4.2.1](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.2.0...v4.2.1) - 2021-05-26

### Fixed
* [Allow configs to have multiple identical types, comunica/examples#11](https://github.com/LinkedSoftwareDependencies/Components.js/commit/5285f8e68fefb13d46538c6949238200055a2047)

<a name="v4.2.0"></a>
## [v4.2.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.1.0...v4.2.0) - 2021-05-19

### Added
* [Expose RdfObjectLoader ctor from ComponentsManagerBuilder](https://github.com/LinkedSoftwareDependencies/Components.js/commit/1b1c85adb50855eed5b628788ccea3609aa841ca)

<a name="v4.1.0"></a>
## [v4.1.0](https://github.com/LinkedSoftwareDependencies/Components.js/compare/v4.0.6...v4.1.0) - 2021-04-27

### Added
* [Allow JSON-LD context validation to be skipped](https://github.com/LinkedSoftwareDependencies/Components.js/commit/40931625dc0a577800c60e0cb4aa12393eb26bab)

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
