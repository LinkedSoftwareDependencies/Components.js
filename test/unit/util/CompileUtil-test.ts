import { ComponentsManagerBuilder } from '../../../lib/loading/ComponentsManagerBuilder';
import { compileConfig } from '../../../lib/util/CompileUtil';

describe('CompileUtil', () => {
  beforeEach(() => {
    // Mock manager
    (<any> ComponentsManagerBuilder).prototype.build = jest.fn(function() {
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
      // @ts-ignore
      this.configLoader({ register: jest.fn() });
      return {
        instantiate: async() => 'INSTANCE',
        configRegistry: {
          register: jest.fn(),
        },
      };
    });
  });

  describe('compileConfig', () => {
    it('for direct compilation', async() => {
      expect(await compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI'))
        .toEqual(`
module.exports = INSTANCE;
`);
    });

    it('for compilation with exportVariableName', async() => {
      expect(await compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI', 'a:b'))
        .toEqual(`
module.exports = a_b;
`);
    });

    it('for compilation as function', async() => {
      expect(await compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI', undefined, true))
        .toEqual(`module.exports = function(variables) {
function getVariableValue(name) {
  if (!variables || !(name in variables)) {
    throw new Error('Undefined variable: ' + name);
  }
  return variables[name];
}

return INSTANCE;
}
`);
    });
  });
});
