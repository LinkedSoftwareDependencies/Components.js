import { Loader } from '../../lib/Loader';
import type { IModuleState } from '../../lib/ModuleStateBuilder';

/**
 * A mocked loader for testing.
 * This skips module state loading to speedup unit tests.
 */
export class LoaderMocked extends Loader<any> {
  public async getModuleState(): Promise<IModuleState> {
    return <any> {};
  }
}
