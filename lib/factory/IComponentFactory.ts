export interface IComponentFactory {
    /**
     * @returns A new instance of the component.
     */
    create(): any;
}