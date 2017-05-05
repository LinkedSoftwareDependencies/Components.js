export interface IComponentFactory {
    /**
     * @param shallow If no component constructors should recursively be called.
     * @returns New instantiations of the provided arguments.
     */
    makeArguments(shallow?: boolean): any[];
    /**
     * @returns A new instance of the component.
     */
    create(): any;
}