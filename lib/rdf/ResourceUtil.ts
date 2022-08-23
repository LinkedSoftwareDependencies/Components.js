import type { Resource } from 'rdf-object';

/**
 * Filters duplicates from the types of the given {@link Resource} and returns all unique entries.
 * @param resource - The {@link Resource} to filter the types of.
 * @param componentResources - All the available component resources.
 */
export function uniqueTypes(resource: Resource, componentResources: Record<string, Resource>): Resource[] {
  const componentTypesIndex: Record<string, Resource> = {};
  for (const type of resource.properties.types) {
    const componentResource: Resource = componentResources[type.value];
    if (componentResource) {
      componentTypesIndex[componentResource.value] = componentResource;
    }
  }
  return Object.values(componentTypesIndex);
}
