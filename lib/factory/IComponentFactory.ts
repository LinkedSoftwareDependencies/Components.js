export interface IComponentFactory {
    /**
     * @param shallow If no component constructors should recursively be called.
     * @param resourceBlacklist The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
     * @returns New instantiations of the provided arguments.
     */
    makeArguments(shallow?: boolean, resourceBlacklist?: {[id: string]: boolean}): Promise<any[]>;
    /**
     * @param resourceBlacklist The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
     * @returns A new instance of the component.
     */
    create(resourceBlacklist?: {[id: string]: boolean}): Promise<any>;
}