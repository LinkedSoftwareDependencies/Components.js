import { ComponentsManagerBuilder } from '../../../lib/loading/ComponentsManagerBuilder';
import { compileConfig } from '../../../lib/util/CompileUtil';

describe('CompileUtil', () => {
  beforeEach(() => {
    // Mock manager
    jest.spyOn((<any> ComponentsManagerBuilder).prototype, 'build').mockImplementation(function() {
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
      // @ts-expect-error
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
      await expect(compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI')).resolves
        .toBe(`
module.exports = INSTANCE;
`);
    });

    it('for compilation with exportVariableName', async() => {
      await expect(compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI', 'a:b')).resolves
        .toBe(`
module.exports = a_b;
`);
    });

    it('for compilation as function', async() => {
      await expect(compileConfig('MAINMODULEPATH', 'CONFIGPATH', 'CONFIGIRI', undefined, true)).resolves
        .toBe(`module.exports = function(variables) {
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
